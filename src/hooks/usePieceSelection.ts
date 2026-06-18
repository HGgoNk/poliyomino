import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIZE } from "../constants/gameData";
import { getBombArea } from "../features/bombBlocks";
import { createPieceInstance } from "../utils/pieceUtils";
import {
  getClosestPlacement,
  getPlacementDistanceSquared,
  placePiece
} from "../utils/placement";
import type {
  AnchorOffset,
  Board,
  BoardMetrics,
  CellCoord,
  PieceInstance,
  PlacementPosition,
  PointerPoint
} from "../types";

const MAX_SNAP_DISTANCE = 1;

interface UsePieceSelectionParams {
  augmentChoiceOpen: boolean;
  availablePieces: PieceInstance[];
  board: Board;
  isPlaying: boolean;
}

export interface UsePieceSelectionResult {
  anchorCell: CellCoord | null;
  boardMetrics: BoardMetrics;
  boardRef: React.RefObject<HTMLDivElement | null>;
  clearSelection: () => void;
  closestPlacementCell: PlacementPosition | null;
  cursorAnchorOffset: AnchorOffset | null;
  cursorPiece: PieceInstance | null;
  cursorPoint: PointerPoint | null;
  handlePieceSelect: (
    piece: PieceInstance,
    event: React.MouseEvent<HTMLButtonElement>,
    nextAnchorCell: CellCoord
  ) => void;
  hoverCell: PlacementPosition | null;
  invalidPreview: boolean;
  previewCells: Set<string>;
  previewClearingCells: Set<string>;
  selectedPiece: PieceInstance | null;
  setHoverCell: React.Dispatch<React.SetStateAction<PlacementPosition | null>>;
}

export function usePieceSelection({
  augmentChoiceOpen,
  availablePieces,
  board,
  isPlaying
}: UsePieceSelectionParams): UsePieceSelectionResult {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursorPiece, setCursorPiece] = useState<PieceInstance | null>(null);
  const [anchorCell, setAnchorCell] = useState<CellCoord | null>(null);
  const [hoverCell, setHoverCell] = useState<PlacementPosition | null>(null);
  const [cursorPoint, setCursorPoint] = useState<PointerPoint | null>(null);
  const [boardMetrics, setBoardMetrics] = useState<BoardMetrics>({ cellGap: 2, cellSize: 26 });
  const boardRef = useRef<HTMLDivElement | null>(null);

  const selectedPiece = availablePieces.find((p) => p.uid === selectedId) ?? null;

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setCursorPiece(null);
    setAnchorCell(null);
    setHoverCell(null);
    setCursorPoint(null);
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;

    function updateBoardMetrics() {
      const el = boardRef.current;
      const firstCell = el?.querySelector(".board-cell");
      const secondCell = el?.querySelectorAll(".board-cell")[1];
      if (!firstCell) return;
      const firstRect = firstCell.getBoundingClientRect();
      const secondRect = secondCell?.getBoundingClientRect();
      const cellGap = secondRect ? Math.max(0, secondRect.left - firstRect.right) : 2;
      setBoardMetrics({ cellGap, cellSize: firstRect.width });
    }

    updateBoardMetrics();
    window.addEventListener("resize", updateBoardMetrics);
    return () => window.removeEventListener("resize", updateBoardMetrics);
  }, [isPlaying]);

  useEffect(() => {
    if (!selectedPiece) {
      setCursorPiece(null);
      setAnchorCell(null);
      setCursorPoint(null);
      return undefined;
    }

    function handlePointerMove(event: PointerEvent) {
      setCursorPoint({ x: event.clientX, y: event.clientY });
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        (event.target.closest(".board") || event.target.closest(".tray"))
      ) {
        return;
      }
      clearSelection();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedPiece, clearSelection]);

  const placementCell = useMemo<PlacementPosition | null>(() => {
    if (!selectedPiece || !hoverCell || !anchorCell) return null;
    return { row: hoverCell.row - anchorCell[0], col: hoverCell.col - anchorCell[1] };
  }, [selectedPiece, hoverCell, anchorCell]);

  const closestPlacementCell = useMemo(
    () => getClosestPlacement(board, selectedPiece, placementCell),
    [board, selectedPiece, placementCell]
  );

  const invalidPreview = Boolean(
    selectedPiece &&
      placementCell &&
      closestPlacementCell &&
      getPlacementDistanceSquared(placementCell, closestPlacementCell) > MAX_SNAP_DISTANCE ** 2
  );

  const cursorAnchorOffset: AnchorOffset | null = anchorCell
    ? {
        x: anchorCell[1] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2,
        y: anchorCell[0] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2
      }
    : null;

  const previewCells = useMemo<Set<string>>(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();
    return new Set(
      selectedPiece.cells.map(
        ([dr, dc]) => `${closestPlacementCell.row + dr}-${closestPlacementCell.col + dc}`
      )
    );
  }, [closestPlacementCell, invalidPreview, selectedPiece]);

  const previewClearingCells = useMemo<Set<string>>(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();

    if (selectedPiece.special === "line") {
      const cross = new Set<string>();
      for (let i = 0; i < SIZE; i += 1) {
        cross.add(`${closestPlacementCell.row}-${i}`);
        cross.add(`${i}-${closestPlacementCell.col}`);
      }
      return cross;
    }

    if (selectedPiece.special === "bomb") {
      return new Set(
        getBombArea(closestPlacementCell.row, closestPlacementCell.col).map(([r, c]) => `${r}-${c}`)
      );
    }

    const result = placePiece(board, selectedPiece, closestPlacementCell.row, closestPlacementCell.col);
    return new Set(result.clearedCells);
  }, [board, closestPlacementCell, invalidPreview, selectedPiece]);

  function handlePieceSelect(
    piece: PieceInstance,
    event: React.MouseEvent<HTMLButtonElement>,
    nextAnchorCell: CellCoord
  ) {
    event.preventDefault();
    if (augmentChoiceOpen) return;

    if (piece.uid === selectedId) {
      clearSelection();
      return;
    }

    setSelectedId(piece.uid);
    setCursorPiece(createPieceInstance(piece));
    setAnchorCell(nextAnchorCell);
    setCursorPoint({ x: event.clientX, y: event.clientY });
  }

  return {
    anchorCell,
    boardMetrics,
    boardRef,
    clearSelection,
    closestPlacementCell,
    cursorAnchorOffset,
    cursorPiece,
    cursorPoint,
    handlePieceSelect,
    hoverCell,
    invalidPreview,
    previewCells,
    previewClearingCells,
    selectedPiece,
    setHoverCell
  };
}

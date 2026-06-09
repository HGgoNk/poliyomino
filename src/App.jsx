import { useEffect, useMemo, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import PieceShape from "./components/PieceShape.jsx";
import PieceTray from "./components/PieceTray.jsx";
import ScoreBoard from "./components/ScoreBoard.jsx";
import { EMPTY_BOARD, SIZE } from "./constants/gameData.js";
import { getSavedItemState, ItemSlots, useItemSystem } from "./features/items.jsx";
import useBestScore from "./hooks/useBestScore.js";
import { cloneBoard } from "./utils/boardUtils.js";
import { createPieceInstance } from "./utils/pieceUtils.js";
import { canPlace, getPlacements, hasMove, placePiece } from "./utils/placement.js";
import { nextTray } from "./utils/tray.js";

const MAX_SNAP_DISTANCE = 1;
const CLEAR_HIGHLIGHT_MS = 260;
const SAVED_GAME_KEY = "block-blast-current-game";

function isValidBoard(board) {
  return (
    Array.isArray(board) &&
    board.length === SIZE &&
    board.every((row) => Array.isArray(row) && row.length === SIZE)
  );
}

function isValidPiece(piece) {
  return (
    piece &&
    typeof piece.uid === "string" &&
    typeof piece.id === "string" &&
    typeof piece.color === "string" &&
    Array.isArray(piece.cells) &&
    piece.cells.every(
      (cell) =>
        Array.isArray(cell) &&
        cell.length === 2 &&
        Number.isInteger(cell[0]) &&
        Number.isInteger(cell[1])
    )
  );
}

function isValidTray(tray) {
  return Array.isArray(tray) && tray.length === 3 && tray.every((piece) => piece === null || isValidPiece(piece));
}

function loadSavedGame() {
  try {
    const savedGame = JSON.parse(localStorage.getItem(SAVED_GAME_KEY));
    if (!savedGame || !isValidBoard(savedGame.board) || !isValidTray(savedGame.tray)) {
      return null;
    }

    return {
      board: cloneBoard(savedGame.board),
      score: Number.isFinite(savedGame.score) ? savedGame.score : 0,
      tray: savedGame.tray,
      ...getSavedItemState(savedGame, { isValidBoard, isValidTray })
    };
  } catch {
    return null;
  }
}

function getPlacementCell(piece, cursorCell, anchorCell) {
  if (!piece || !cursorCell || !anchorCell) return null;

  const [anchorRow, anchorCol] = anchorCell;
  return {
    row: cursorCell.row - anchorRow,
    col: cursorCell.col - anchorCol
  };
}

function getPlacementDistanceSquared(firstCell, secondCell) {
  if (!firstCell || !secondCell) return Infinity;
  return (firstCell.row - secondCell.row) ** 2 + (firstCell.col - secondCell.col) ** 2;
}

function getClosestPlacement(board, piece, targetCell) {
  if (!piece || !targetCell) return null;

  const placements = getPlacements(board, piece);
  if (!placements.length) return null;

  return placements.reduce((closest, placement) => {
    const closestDistance = getPlacementDistanceSquared(closest, targetCell);
    const placementDistance = getPlacementDistanceSquared(placement, targetCell);
    return placementDistance < closestDistance ? placement : closest;
  }, placements[0]);
}

function App() {
  const [initialGame] = useState(loadSavedGame);
  const [board, setBoard] = useState(() => initialGame?.board || cloneBoard(EMPTY_BOARD));
  const [tray, setTray] = useState(() => initialGame?.tray || nextTray(initialGame?.board || EMPTY_BOARD));
  const [selectedId, setSelectedId] = useState(null);
  const [cursorPiece, setCursorPiece] = useState(null);
  const [anchorCell, setAnchorCell] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [cursorPoint, setCursorPoint] = useState(null);
  const [boardMetrics, setBoardMetrics] = useState({ cellGap: 2, cellSize: 26 });
  const [clearingCells, setClearingCells] = useState(() => new Set());
  const [score, setScore] = useState(() => initialGame?.score || 0);
  const boardRef = useRef(null);
  const clearTimerRef = useRef(null);
  const best = useBestScore(score);
  const availablePieces = tray.filter(Boolean);
  const selectedPiece = availablePieces.find((piece) => piece.uid === selectedId) || null;
  const isClearing = clearingCells.size > 0;
  const {
    activeFillSlot,
    cancelFillMode,
    fillCellAt,
    fillCellsRemaining,
    handleItemClick,
    itemAwardLevel,
    itemSlots,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  } = useItemSystem({
    board,
    clearHighlightMs: CLEAR_HIGHLIGHT_MS,
    clearSelection,
    clearTimerRef,
    initialGame,
    isClearing,
    score,
    setBoard,
    setClearingCells,
    setScore,
    setTray,
    tray
  });
  const gameOver = !isClearing && (tray.length === 0 || (availablePieces.length > 0 && !hasMove(board, availablePieces)));
  const placementCell = getPlacementCell(selectedPiece, hoverCell, anchorCell);
  const closestPlacementCell = getClosestPlacement(board, selectedPiece, placementCell);
  const cursorAnchorOffset = anchorCell
    ? {
        x: anchorCell[1] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2,
        y: anchorCell[0] * (boardMetrics.cellSize + boardMetrics.cellGap) + boardMetrics.cellSize / 2
      }
    : null;
  const invalidPreview = Boolean(
    selectedPiece &&
      placementCell &&
      closestPlacementCell &&
      getPlacementDistanceSquared(placementCell, closestPlacementCell) > MAX_SNAP_DISTANCE ** 2
  );

  const previewCells = useMemo(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();
    return new Set(selectedPiece.cells.map(([dr, dc]) => `${closestPlacementCell.row + dr}-${closestPlacementCell.col + dc}`));
  }, [closestPlacementCell, invalidPreview, selectedPiece]);
  const previewClearingCells = useMemo(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return new Set();

    const result = placePiece(board, selectedPiece, closestPlacementCell.row, closestPlacementCell.col);
    return new Set(result.clearedCells);
  }, [board, closestPlacementCell, invalidPreview, selectedPiece]);

  useEffect(() => {
    localStorage.setItem(
      SAVED_GAME_KEY,
      JSON.stringify({
        activeFillSlot,
        board,
        fillCellsRemaining,
        itemAwardLevel,
        itemSlots,
        score,
        tray,
        undoSnapshot
      })
    );
  }, [
    activeFillSlot,
    board,
    fillCellsRemaining,
    itemAwardLevel,
    itemSlots,
    score,
    tray,
    undoSnapshot
  ]);

  useEffect(() => {
    function updateBoardMetrics() {
      const boardElement = boardRef.current;
      const firstCell = boardElement?.querySelector(".board-cell");
      const secondCell = boardElement?.querySelectorAll(".board-cell")[1];
      if (!firstCell) return;

      const firstRect = firstCell.getBoundingClientRect();
      const secondRect = secondCell?.getBoundingClientRect();
      const cellGap = secondRect ? Math.max(0, secondRect.left - firstRect.right) : 2;

      setBoardMetrics({ cellGap, cellSize: firstRect.width });
    }

    updateBoardMetrics();
    window.addEventListener("resize", updateBoardMetrics);
    return () => window.removeEventListener("resize", updateBoardMetrics);
  }, []);

  useEffect(() => {
    if (!selectedPiece) {
      setCursorPiece(null);
      setAnchorCell(null);
      setCursorPoint(null);
      return undefined;
    }

    function handlePointerMove(event) {
      setCursorPoint({ x: event.clientX, y: event.clientY });
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [selectedPiece]);

  useEffect(() => () => clearTimeout(clearTimerRef.current), []);

  function clearSelection() {
    setSelectedId(null);
    setCursorPiece(null);
    setAnchorCell(null);
    setHoverCell(null);
    setCursorPoint(null);
  }

  function resetGame() {
    clearTimeout(clearTimerRef.current);
    const nextBoard = cloneBoard(EMPTY_BOARD);
    setBoard(nextBoard);
    setTray(nextTray(nextBoard));
    clearSelection();
    setClearingCells(new Set());
    setScore(0);
    resetItems();
  }

  function placePieceAt(piece, row, col) {
    if (isClearing || !piece || !canPlace(board, piece, row, col)) return;

    const result = placePiece(board, piece, row, col);
    const nextClearingCells = new Set(result.clearedCells);

    setBoard(nextClearingCells.size ? result.placedBoard : result.board);
    setClearingCells(nextClearingCells);
    setScore((current) => current + piece.cells.length + result.cleared * 20 + Math.max(0, result.cleared - 1) * 15);

    const updatedTray = tray.map((trayPiece) => (trayPiece?.uid === piece.uid ? null : trayPiece));
    const refreshedTray = updatedTray.every((trayPiece) => !trayPiece) ? nextTray(result.board) : updatedTray;
    saveUndoSnapshot();
    setTray(refreshedTray);
    clearSelection();

    if (nextClearingCells.size) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(result.board);
        setClearingCells(new Set());
      }, CLEAR_HIGHLIGHT_MS);
    }
  }

  function handleCellClick(row, col) {
    if (fillCellsRemaining > 0) {
      fillCellAt(row, col);
      return;
    }

    const nextPlacementCell = getPlacementCell(selectedPiece, { row, col }, anchorCell);
    const nextClosestPlacementCell = getClosestPlacement(board, selectedPiece, nextPlacementCell);
    if (!nextClosestPlacementCell) return;
    if (getPlacementDistanceSquared(nextPlacementCell, nextClosestPlacementCell) > MAX_SNAP_DISTANCE ** 2) return;
    placePieceAt(selectedPiece, nextClosestPlacementCell.row, nextClosestPlacementCell.col);
  }

  function handlePieceSelect(piece, event, nextAnchorCell) {
    event.preventDefault();
    if (piece.uid === selectedId) {
      clearSelection();
      return;
    }

    setSelectedId(piece.uid);
    cancelFillMode();
    setCursorPiece(createPieceInstance(piece));
    setAnchorCell(nextAnchorCell);
    setCursorPoint({ x: event.clientX, y: event.clientY });
  }

  return (
    <main className={`app-shell ${selectedPiece ? "has-cursor-piece" : ""} ${fillCellsRemaining > 0 ? "has-fill-mode" : ""}`}>
      <section className="game-area">
        <ScoreBoard best={best} score={score} />
        <div className="board-layout">
          <div className="board-stack">
            <Board
              board={board}
              boardRef={boardRef}
              gameOver={gameOver}
              hoverCell={hoverCell}
              clearingCells={clearingCells}
              onCellClick={handleCellClick}
              onCellEnter={setHoverCell}
              onCellLeave={() => setHoverCell(null)}
              onReset={resetGame}
              previewClearingCells={previewClearingCells}
              previewCells={previewCells}
              selectedPiece={selectedPiece}
            />
            <PieceTray
              disabled={gameOver || isClearing || fillCellsRemaining > 0}
              onPieceSelect={handlePieceSelect}
              selectedId={selectedId}
              tray={tray}
            />
          </div>
          <ItemSlots
            activeFillSlot={activeFillSlot}
            fillCellsRemaining={fillCellsRemaining}
            isClearing={isClearing}
            itemSlots={itemSlots}
            onItemClick={handleItemClick}
            undoSnapshot={undoSnapshot}
          />
        </div>
        {cursorPiece && cursorPoint && cursorAnchorOffset && (
          <div
            className={`cursor-piece ${invalidPreview ? "invalid" : ""}`}
            style={{
              left: cursorPoint.x,
              top: cursorPoint.y,
              transform: `translate(-${cursorAnchorOffset.x}px, -${cursorAnchorOffset.y}px)`
            }}
          >
            <PieceShape
              cellGap={boardMetrics.cellGap}
              cellSize={boardMetrics.cellSize}
              className="cursor-piece-grid"
              piece={cursorPiece}
            />
          </div>
        )}
      </section>
    </main>
  );
}

export default App;

import { useEffect, useMemo, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import PieceShape from "./components/PieceShape.jsx";
import PieceTray from "./components/PieceTray.jsx";
import ScoreBoard from "./components/ScoreBoard.jsx";
import { EMPTY_BOARD } from "./constants/gameData.js";
import useBestScore from "./hooks/useBestScore.js";
import { createPieceInstance, pieceBounds } from "./utils/pieceUtils.js";
import { canPlace, getPlacements, hasMove, placePiece } from "./utils/placement.js";
import { nextTray } from "./utils/tray.js";

const MAX_SNAP_DISTANCE = 3;
const CLEAR_HIGHLIGHT_MS = 260;

function getPlacementCell(piece, cursorCell) {
  if (!piece || !cursorCell) return null;

  const bounds = pieceBounds(piece);
  return {
    row: cursorCell.row - Math.floor(bounds.rows / 2),
    col: cursorCell.col - Math.floor(bounds.cols / 2)
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
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [tray, setTray] = useState(() => nextTray(EMPTY_BOARD));
  const [selectedId, setSelectedId] = useState(null);
  const [cursorPiece, setCursorPiece] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [cursorPoint, setCursorPoint] = useState(null);
  const [boardMetrics, setBoardMetrics] = useState({ cellGap: 2, cellSize: 26 });
  const [clearingCells, setClearingCells] = useState(() => new Set());
  const [score, setScore] = useState(0);
  const boardRef = useRef(null);
  const clearTimerRef = useRef(null);
  const best = useBestScore(score);
  const availablePieces = tray.filter(Boolean);
  const selectedPiece = availablePieces.find((piece) => piece.uid === selectedId) || null;
  const isClearing = clearingCells.size > 0;
  const gameOver = !isClearing && (tray.length === 0 || (availablePieces.length > 0 && !hasMove(board, availablePieces)));
  const placementCell = getPlacementCell(selectedPiece, hoverCell);
  const closestPlacementCell = getClosestPlacement(board, selectedPiece, placementCell);
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

  function resetGame() {
    clearTimeout(clearTimerRef.current);
    setBoard(EMPTY_BOARD);
    setTray(nextTray(EMPTY_BOARD));
    setSelectedId(null);
    setCursorPiece(null);
    setHoverCell(null);
    setCursorPoint(null);
    setClearingCells(new Set());
    setScore(0);
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
    setTray(refreshedTray);
    setSelectedId(null);
    setCursorPiece(null);
    setHoverCell(null);
    setCursorPoint(null);

    if (nextClearingCells.size) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(result.board);
        setClearingCells(new Set());
      }, CLEAR_HIGHLIGHT_MS);
    }
  }

  function handleCellClick(row, col) {
    const nextPlacementCell = getPlacementCell(selectedPiece, { row, col });
    const nextClosestPlacementCell = getClosestPlacement(board, selectedPiece, nextPlacementCell);
    if (!nextClosestPlacementCell) return;
    if (getPlacementDistanceSquared(nextPlacementCell, nextClosestPlacementCell) > MAX_SNAP_DISTANCE ** 2) return;
    placePieceAt(selectedPiece, nextClosestPlacementCell.row, nextClosestPlacementCell.col);
  }

  function handlePieceSelect(piece, event) {
    event.preventDefault();
    setSelectedId(piece.uid);
    setCursorPiece(createPieceInstance(piece));
    setCursorPoint({ x: event.clientX, y: event.clientY });
  }

  return (
    <main className={`app-shell ${selectedPiece ? "has-cursor-piece" : ""}`}>
      <section className="game-area">
        <ScoreBoard best={best} score={score} />
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
          previewCells={previewCells}
          selectedPiece={selectedPiece}
        />
        <PieceTray
          disabled={gameOver || isClearing}
          onPieceSelect={handlePieceSelect}
          selectedId={selectedId}
          tray={tray}
        />
        {cursorPiece && cursorPoint && (
          <div
            className={`cursor-piece ${invalidPreview ? "invalid" : ""}`}
            style={{ left: cursorPoint.x, top: cursorPoint.y }}
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

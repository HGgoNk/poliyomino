import { useMemo, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import DragGhost from "./components/DragGhost.jsx";
import PieceTray from "./components/PieceTray.jsx";
import ScoreBoard from "./components/ScoreBoard.jsx";
import { EMPTY_BOARD, SIZE } from "./constants/gameData.js";
import useBestScore from "./hooks/useBestScore.js";
import { pieceBounds } from "./utils/pieceUtils.js";
import { canPlace, hasMove, placePiece } from "./utils/placement.js";
import { nextTray } from "./utils/tray.js";

function App() {
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [tray, setTray] = useState(() => nextTray(EMPTY_BOARD));
  const [selectedId, setSelectedId] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [score, setScore] = useState(0);
  const boardRef = useRef(null);
  const best = useBestScore(score);

  const availablePieces = tray.filter(Boolean);
  const selectedPiece = availablePieces.find((piece) => piece.uid === selectedId) || null;
  const activePiece = dragState?.piece || selectedPiece;
  const gameOver = tray.length === 0 || (availablePieces.length > 0 && !hasMove(board, availablePieces));

  const previewCells = useMemo(() => {
    if (!activePiece || !hoverCell) return new Set();
    if (!canPlace(board, activePiece, hoverCell.row, hoverCell.col)) return new Set();
    return new Set(activePiece.cells.map(([dr, dc]) => `${hoverCell.row + dr}-${hoverCell.col + dc}`));
  }, [activePiece, board, hoverCell]);

  const invalidPreview = Boolean(
    activePiece && hoverCell && !canPlace(board, activePiece, hoverCell.row, hoverCell.col)
  );

  function resetGame() {
    setBoard(EMPTY_BOARD);
    setTray(nextTray(EMPTY_BOARD));
    setSelectedId(null);
    setHoverCell(null);
    setDragState(null);
    setScore(0);
  }

  function placePieceAt(piece, row, col) {
    if (!piece || !canPlace(board, piece, row, col)) return;

    const result = placePiece(board, piece, row, col);
    setBoard(result.board);
    setScore((current) => current + piece.cells.length + result.cleared * 20 + Math.max(0, result.cleared - 1) * 15);

    const updatedTray = tray.map((trayPiece) => (trayPiece?.uid === piece.uid ? null : trayPiece));
    const refreshedTray = updatedTray.every((trayPiece) => !trayPiece) ? nextTray(result.board) : updatedTray;
    setTray(refreshedTray);
    setSelectedId(refreshedTray.find(Boolean)?.uid || null);
    setHoverCell(null);
    setDragState(null);
  }

  function getBoardPieceMetrics() {
    const boardElement = boardRef.current;
    const firstCell = boardElement?.querySelector(".board-cell");
    const secondCell = boardElement?.querySelectorAll(".board-cell")[1];
    if (!firstCell) return { cellSize: 26, cellGap: 2 };

    const firstRect = firstCell.getBoundingClientRect();
    const secondRect = secondCell?.getBoundingClientRect();
    const cellGap = secondRect ? Math.max(0, secondRect.left - firstRect.right) : 2;

    return {
      cellSize: firstRect.width,
      cellGap
    };
  }

  function getBoardCellFromPoint(clientX, clientY, piece = null, metrics = null) {
    const boardElement = boardRef.current;
    if (!boardElement) return null;

    const firstCell = boardElement.querySelector(".board-cell");
    if (!firstCell) return null;

    const activeMetrics = metrics || getBoardPieceMetrics();
    const firstRect = firstCell.getBoundingClientRect();
    const bounds = piece ? pieceBounds(piece) : { rows: 1, cols: 1 };
    const ghostWidth = bounds.cols * activeMetrics.cellSize + Math.max(0, bounds.cols - 1) * activeMetrics.cellGap;
    const ghostHeight = bounds.rows * activeMetrics.cellSize + Math.max(0, bounds.rows - 1) * activeMetrics.cellGap;
    const targetX = piece ? clientX - ghostWidth / 2 : clientX;
    const targetY = piece ? clientY - ghostHeight / 2 : clientY;
    const step = activeMetrics.cellSize + activeMetrics.cellGap;
    const col = Math.round((targetX - firstRect.left) / step);
    const row = Math.round((targetY - firstRect.top) / step);

    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    return { row, col };
  }

  function handleCellClick(row, col) {
    placePieceAt(selectedPiece, row, col);
  }

  function handlePieceSelect(piece) {
    setSelectedId(piece.uid);
  }

  function startDrag(piece, event) {
    if (gameOver) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const metrics = getBoardPieceMetrics();
    const nextDragState = { piece, pointerId: event.pointerId, x: event.clientX, y: event.clientY, ...metrics };
    setSelectedId(piece.uid);
    setDragState(nextDragState);
    setHoverCell(getBoardCellFromPoint(event.clientX, event.clientY, piece, nextDragState));
  }

  function continueDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    setDragState((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
    setHoverCell(getBoardCellFromPoint(event.clientX, event.clientY, dragState.piece, dragState));
  }

  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const dropCell = getBoardCellFromPoint(event.clientX, event.clientY, dragState.piece, dragState);
    if (dropCell) {
      placePieceAt(dragState.piece, dropCell.row, dropCell.col);
      return;
    }

    setDragState(null);
    setHoverCell(null);
  }

  return (
    <main className="app-shell">
      <section className="game-area">
        <ScoreBoard best={best} score={score} />
        <Board
          board={board}
          boardRef={boardRef}
          dragState={dragState}
          gameOver={gameOver}
          hoverCell={hoverCell}
          invalidPreview={invalidPreview}
          onCellClick={handleCellClick}
          onCellEnter={(cell) => !dragState && setHoverCell(cell)}
          onCellLeave={() => !dragState && setHoverCell(null)}
          onReset={resetGame}
          previewCells={previewCells}
          selectedPiece={activePiece}
        />
        <PieceTray
          disabled={gameOver}
          dragState={dragState}
          onPieceSelect={handlePieceSelect}
          onPointerDown={startDrag}
          onPointerMove={continueDrag}
          onPointerUp={endDrag}
          selectedId={selectedId}
          tray={tray}
        />
        {dragState && <DragGhost dragState={dragState} invalid={invalidPreview} />}
      </section>
    </main>
  );
}

export default App;

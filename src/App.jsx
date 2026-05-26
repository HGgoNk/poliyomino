import { useMemo, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import DragGhost from "./components/DragGhost.jsx";
import PieceTray from "./components/PieceTray.jsx";
import ScoreBoard from "./components/ScoreBoard.jsx";
import { EMPTY_BOARD } from "./constants/gameData.js";
import useBestScore from "./hooks/useBestScore.js";
import usePieceDrag from "./hooks/usePieceDrag.js";
import { canPlace, hasMove, placePiece } from "./utils/placement.js";
import { nextTray } from "./utils/tray.js";

function App() {
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [tray, setTray] = useState(() => nextTray(EMPTY_BOARD));
  const [selectedId, setSelectedId] = useState(null);
  const [score, setScore] = useState(0);
  const boardRef = useRef(null);
  const best = useBestScore(score);
  const availablePieces = tray.filter(Boolean);
  const selectedPiece = availablePieces.find((piece) => piece.uid === selectedId) || null;
  const gameOver = tray.length === 0 || (availablePieces.length > 0 && !hasMove(board, availablePieces));
  const { clearDrag, continueDrag, dragState, endDrag, hoverCell, setHoverCell, startDrag } = usePieceDrag({
    boardRef,
    gameOver,
    onDropPiece: placePieceAt,
    onSelectPiece: setSelectedId
  });
  const activePiece = dragState?.piece || selectedPiece;

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
    clearDrag();
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
    clearDrag();
  }

  function handleCellClick(row, col) {
    placePieceAt(selectedPiece, row, col);
  }

  function handlePieceSelect(piece) {
    setSelectedId(piece.uid);
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

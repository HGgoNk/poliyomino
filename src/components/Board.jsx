import { colorClass } from "../constants/gameData.js";
import { canPlace } from "../utils/placement.js";
import GameOver from "./GameOver.jsx";

function Board({
  board,
  boardRef,
  dragState,
  gameOver,
  hoverCell,
  invalidPreview,
  onCellClick,
  onCellEnter,
  onCellLeave,
  onReset,
  previewCells,
  selectedPiece
}) {
  return (
    <div className={`board ${gameOver ? "is-over" : ""} ${dragState ? "is-dragging" : ""}`} ref={boardRef}>
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const key = `${rowIndex}-${colIndex}`;
          const isPreview = previewCells.has(key);
          const isHoverCell = hoverCell?.row === rowIndex && hoverCell?.col === colIndex;
          const invalid = selectedPiece && isHoverCell && invalidPreview && !canPlace(board, selectedPiece, rowIndex, colIndex);

          return (
            <button
              aria-label={`${rowIndex + 1}행 ${colIndex + 1}열`}
              className={`board-cell ${cell ? colorClass[cell] : ""} ${isPreview ? "preview" : ""} ${invalid ? "invalid" : ""}`}
              key={key}
              onClick={() => onCellClick(rowIndex, colIndex)}
              onMouseEnter={() => onCellEnter({ row: rowIndex, col: colIndex })}
              onMouseLeave={onCellLeave}
              type="button"
            />
          );
        })
      )}
      {gameOver && <GameOver onReset={onReset} />}
    </div>
  );
}

export default Board;

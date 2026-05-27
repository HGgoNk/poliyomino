import { colorClass } from "../constants/gameData.js";
import GameOver from "./GameOver.jsx";

function Board({
  board,
  boardRef,
  clearingCells,
  gameOver,
  hoverCell,
  onCellClick,
  onCellEnter,
  onCellLeave,
  onReset,
  previewCells,
  selectedPiece
}) {
  return (
    <div className={`board ${gameOver ? "is-over" : ""}`} ref={boardRef}>
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const key = `${rowIndex}-${colIndex}`;
          const isPreview = previewCells.has(key);
          const isClearing = clearingCells.has(key);
          const previewClass = isPreview && selectedPiece ? colorClass[selectedPiece.color] : "";

          return (
            <button
              aria-label={`${rowIndex + 1} row ${colIndex + 1} column`}
              className={`board-cell ${cell ? colorClass[cell] : previewClass} ${isPreview ? "preview" : ""} ${isClearing ? "clearing" : ""}`}
              key={key}
              onClick={() => onCellClick(rowIndex, colIndex)}
              onMouseEnter={() => onCellEnter({ row: rowIndex, col: colIndex })}
              onMouseLeave={onCellLeave}
              onMouseUp={() => onCellClick(rowIndex, colIndex)}
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

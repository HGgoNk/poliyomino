import { colorClass } from "../constants/gameData.js";
import "../styles/PieceShape.css";
import { pieceBounds } from "../utils/pieceUtils.js";

function PieceShape({ piece, cellSize = 26, cellGap = 3, className = "" }) {
  const bounds = pieceBounds(piece);
  const filledColorClass = colorClass[piece.color] || colorClass.cyan;

  return (
    <span
      className={`mini-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${bounds.cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${bounds.rows}, ${cellSize}px)`,
        "--mini-cell-gap": `${cellGap}px`,
        "--mini-cell-size": `${cellSize}px`
      }}
    >
      {Array.from({ length: bounds.rows * bounds.cols }, (_, index) => {
        const row = Math.floor(index / bounds.cols);
        const col = index % bounds.cols;
        const filled = piece.cells.some(([r, c]) => r === row && c === col);
        return (
          <span
            className={`mini-cell ${filled ? filledColorClass : ""}`}
            data-col={col}
            data-filled={filled ? "true" : "false"}
            data-row={row}
            key={`${row}-${col}`}
          />
        );
      })}
    </span>
  );
}

export default PieceShape;

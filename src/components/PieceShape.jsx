import { colorClass } from "../constants/gameData.js";
import { pieceBounds } from "../utils/pieceUtils.js";

function PieceShape({ piece, cellSize = 22, cellGap = 2, className = "" }) {
  const bounds = pieceBounds(piece);

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
        return <span className={`mini-cell ${filled ? colorClass[piece.color] : ""}`} key={`${row}-${col}`} />;
      })}
    </span>
  );
}

export default PieceShape;

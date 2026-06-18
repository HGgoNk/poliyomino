import { colorClass } from "../constants/gameData";
import "../styles/Board.css";
import type { Board as BoardType, PieceInstance, PlacementPosition } from "../types";

interface BoardProps {
  board: BoardType;
  boardRef: React.RefObject<HTMLDivElement | null>;
  clearingCells: Set<string>;
  hoverCell: PlacementPosition | null;
  onCellClick: (row: number, col: number) => void;
  onCellEnter: (cell: PlacementPosition) => void;
  onCellLeave: () => void;
  previewClearingCells: Set<string>;
  previewCells: Set<string>;
  selectedPiece: PieceInstance | null;
}

function Board({
  board,
  boardRef,
  clearingCells,
  hoverCell: _hoverCell,
  onCellClick,
  onCellEnter,
  onCellLeave,
  previewClearingCells,
  previewCells,
  selectedPiece
}: BoardProps) {
  return (
    <div className="board" ref={boardRef}>
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const key = `${rowIndex}-${colIndex}`;
          const isPreview = previewCells.has(key);
          const isClearing = clearingCells.has(key);
          const isPreviewClearing = previewClearingCells.has(key);
          const previewClass = isPreview && selectedPiece ? colorClass[selectedPiece.color] : "";

          return (
            <button
              aria-label={`${rowIndex + 1} row ${colIndex + 1} column`}
              className={`board-cell ${cell ? colorClass[cell] : previewClass} ${isPreview ? "preview" : ""} ${isPreviewClearing ? "preview-clearing" : ""} ${isClearing ? "clearing" : ""}`}
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
    </div>
  );
}

export default Board;

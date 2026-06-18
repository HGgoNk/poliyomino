import PieceShape from "./PieceShape";
import type { PieceInstance, CellCoord } from "../types";

interface PiecePreviewProps {
  piece: PieceInstance;
  disabled: boolean;
  selected: boolean;
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>, anchorCell: CellCoord) => void;
}

function PiecePreview({ piece, disabled, selected, onMouseDown }: PiecePreviewProps) {
  function handleMouseDown(event: React.MouseEvent<HTMLButtonElement>) {
    const cell = event.target instanceof Element ? event.target.closest(".mini-cell") : null;
    const anchorCell: CellCoord =
      cell instanceof HTMLElement && cell.dataset.filled === "true"
        ? [Number(cell.dataset.row), Number(cell.dataset.col)]
        : piece.cells[0];

    onMouseDown(event, anchorCell);
  }

  return (
    <button
      className={`piece-preview ${selected ? "selected" : ""}`}
      disabled={disabled}
      onMouseDown={handleMouseDown}
      title="Select block"
      type="button"
    >
      <PieceShape piece={piece} />
    </button>
  );
}

export default PiecePreview;

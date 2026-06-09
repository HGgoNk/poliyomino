import PieceShape from "./PieceShape.jsx";

function PiecePreview({ piece, disabled, selected, onMouseDown }) {
  function handleMouseDown(event) {
    const cell = event.target.closest(".mini-cell");
    const anchorCell = cell?.dataset.filled === "true"
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

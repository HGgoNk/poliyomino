import PieceShape from "./PieceShape.jsx";

function PiecePreview({ piece, disabled, selected, onMouseDown }) {
  return (
    <button
      className={`piece-preview ${selected ? "selected" : ""}`}
      disabled={disabled}
      onMouseDown={onMouseDown}
      title="Select block"
      type="button"
    >
      <PieceShape piece={piece} />
    </button>
  );
}

export default PiecePreview;

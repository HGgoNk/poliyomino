import PieceShape from "./PieceShape.jsx";

function PiecePreview({ piece, disabled, selected, dragging, onClick, onPointerDown, onPointerMove, onPointerUp }) {
  return (
    <button
      className={`piece-preview ${selected ? "selected" : ""} ${dragging ? "dragging" : ""}`}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title="블록 선택"
      type="button"
    >
      <PieceShape piece={piece} />
    </button>
  );
}

export default PiecePreview;

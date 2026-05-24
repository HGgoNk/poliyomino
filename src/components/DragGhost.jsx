import PieceShape from "./PieceShape.jsx";

function DragGhost({ dragState, invalid }) {
  return (
    <div
      className={`drag-ghost ${invalid ? "invalid" : ""}`}
      style={{ left: dragState.x, top: dragState.y }}
    >
      <PieceShape
        cellGap={dragState.cellGap}
        cellSize={dragState.cellSize}
        className="ghost-grid"
        piece={dragState.piece}
      />
    </div>
  );
}

export default DragGhost;

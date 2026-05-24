import PiecePreview from "./PiecePreview.jsx";

function PieceTray({
  disabled,
  dragState,
  onPieceSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  selectedId,
  tray
}) {
  return (
    <div className="tray" aria-label="사용 가능한 블록">
      {tray.map((piece, index) =>
        piece ? (
          <PiecePreview
            dragging={dragState?.piece.uid === piece.uid}
            disabled={disabled}
            key={piece.uid}
            onClick={() => onPieceSelect(piece)}
            onPointerDown={(event) => onPointerDown(piece, event)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            piece={piece}
            selected={selectedId === piece.uid}
          />
        ) : (
          <div className="piece-preview empty" key={`empty-${index}`} />
        )
      )}
    </div>
  );
}

export default PieceTray;

import PiecePreview from "./PiecePreview.jsx";

function PieceTray({
  disabled,
  onPieceSelect,
  selectedId,
  tray
}) {
  return (
    <div className="tray" aria-label="사용 가능한 블록">
      {tray.map((piece, index) =>
        piece ? (
          <PiecePreview
            disabled={disabled}
            key={piece.uid}
            onMouseDown={(event, anchorCell) => onPieceSelect(piece, event, anchorCell)}
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

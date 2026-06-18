import PiecePreview from "./PiecePreview";
import "../styles/PieceTray.css";
import type { PieceInstance, Tray, CellCoord } from "../types";

interface PieceTrayProps {
  disabled: boolean;
  onEmptySlotClick: () => void;
  onPieceSelect: (piece: PieceInstance, event: React.MouseEvent<HTMLButtonElement>, anchorCell: CellCoord) => void;
  selectedId: string | null;
  tray: Tray;
}

function PieceTray({
  disabled,
  onEmptySlotClick,
  onPieceSelect,
  selectedId,
  tray
}: PieceTrayProps) {
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
          <div
            className="piece-preview empty"
            key={`empty-${index}`}
            onMouseDown={selectedId ? onEmptySlotClick : undefined}
          />
        )
      )}
    </div>
  );
}

export default PieceTray;

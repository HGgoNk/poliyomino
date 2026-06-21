import "../styles/ItemSlots.css";
import { itemDetails } from "../features/items";
import type { ItemSlots as ItemSlotsState, ItemType, UndoSnapshot } from "../types";

interface ItemSlotsProps {
  isClearing: boolean;
  itemSlots: ItemSlotsState;
  onItemClick: (item: ItemType | null, index: number) => void;
  undoSnapshot: UndoSnapshot | null;
}

export function ItemSlots({ isClearing, itemSlots, onItemClick, undoSnapshot }: ItemSlotsProps) {
  return (
    <section className="undo-items" aria-label="아이템 칸">
      <header className="undo-items-head">
        <strong>아이템</strong>
      </header>
      <div className="undo-item-row">
        {itemSlots.map((item, index) => {
          const details = item ? itemDetails[item] : null;
          const Icon = details?.Icon;
          const tooltipId = details ? `item-tooltip-${index}` : undefined;
          const isDisabled = !item || isClearing || (item === "undo" && !undoSnapshot);

          return (
            <button
              aria-describedby={tooltipId}
              aria-label={details ? details.label : `빈 아이템 칸 ${index + 1}`}
              className={`undo-item ${item ? "available" : "empty"}`}
              disabled={isDisabled}
              key={index}
              onClick={() => onItemClick(item, index)}
              type="button"
            >
              {details && (
                <>
                  <span className="undo-item-icon">{Icon && <Icon size={34} aria-hidden="true" />}</span>
                  <span className="undo-item-label">{details.label}</span>
                  <span className="undo-item-count">{details.quantity}</span>
                  <span className="undo-item-tooltip" id={tooltipId} role="tooltip">
                    <strong>{details.label}</strong>
                    <span>{details.description}</span>
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ItemSlots;

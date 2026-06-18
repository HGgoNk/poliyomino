import { useEffect, useState } from "react";
import "../styles/ItemSlots.css";
import { RefreshCw, Undo2 } from "lucide-react";
import {
  getAugmentLevel,
  getSavedAugmentState
} from "./augments.jsx";
import { cloneBoard } from "../utils/boardUtils.js";
import { rerollOnePiece } from "../utils/tray.js";

export const ITEM_SCORE_STEP = 10;
export const MAX_UNDO_ITEMS = 3;
export const MAX_REROLL_ITEMS = 3;
export const MAX_ITEM_SLOTS = 3;
export const ITEM_TYPES = ["undo", "reroll"];

export const itemDetails = {
  reroll: { Icon: RefreshCw, description: "\ud2b8\ub808\uc774 \ube14\ub85d\uc744 \uc0c8\ub85c \ubf51\uc2b5\ub2c8\ub2e4.", label: "\ub9ac\ub864", quantity: 1 },
  undo: { Icon: Undo2, description: "\uc9c1\uc804 \uc218\ub85c \ub418\ub3cc\ub9bd\ub2c8\ub2e4.", label: "\ub418\ub3cc\ub9ac\uae30", quantity: 1 }
};

export function createEmptyItemSlots() {
  return Array.from({ length: MAX_ITEM_SLOTS }, () => null);
}

function clampItemCount(count, max) {
  return Math.max(0, Math.min(max, Number.isFinite(count) ? count : 0));
}

function clampUndoItems(count) {
  return clampItemCount(count, MAX_UNDO_ITEMS);
}

function clampRerollItems(count) {
  return clampItemCount(count, MAX_REROLL_ITEMS);
}

export function isValidItemType(type) {
  return ITEM_TYPES.includes(type);
}

export function getRandomItemType() {
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
}

export function migrateItemSlots(savedGame) {
  if (Array.isArray(savedGame.itemSlots) && savedGame.itemSlots.length === MAX_ITEM_SLOTS) {
    return savedGame.itemSlots.map((item) => (isValidItemType(item) ? item : null));
  }

  const migrated = [];
  const legacyItems = [
    ["undo", clampUndoItems(savedGame.undoItems)],
    ["reroll", clampRerollItems(savedGame.rerollItems)]
  ];

  legacyItems.forEach(([type, count]) => {
    for (let index = 0; index < count && migrated.length < MAX_ITEM_SLOTS; index += 1) {
      migrated.push(type);
    }
  });

  return createEmptyItemSlots().map((_, index) => migrated[index] || null);
}

function isValidUndoSnapshot(snapshot, { isValidBoard, isValidTray }) {
  return Boolean(snapshot && isValidBoard(snapshot.board) && isValidTray(snapshot.tray) && Number.isFinite(snapshot.score));
}

export function getSavedItemState(savedGame, validators) {
  const savedScore = Number.isFinite(savedGame.score) ? savedGame.score : 0;
  const fallbackAwardLevel = Math.floor(savedScore / ITEM_SCORE_STEP);

  return {
    activeCellSlot: null,
    cellActionMode: null,
    cellActionsRemaining: 0,
    itemAwardLevel: Number.isFinite(savedGame.itemAwardLevel) ? savedGame.itemAwardLevel : fallbackAwardLevel,
    itemSlots: migrateItemSlots(savedGame),
    undoSnapshot: isValidUndoSnapshot(savedGame.undoSnapshot, validators)
      ? {
          board: cloneBoard(savedGame.undoSnapshot.board),
          augmentState: getSavedAugmentState(savedGame.undoSnapshot),
          ghostCells: Array.isArray(savedGame.undoSnapshot.ghostCells)
            ? savedGame.undoSnapshot.ghostCells.filter((key) => typeof key === "string")
            : [],
          score: savedGame.undoSnapshot.score,
          tray: savedGame.undoSnapshot.tray
        }
      : null
  };
}

export function useItemSystem({
  augmentState,
  board,
  clearHighlightMs,
  clearSelection,
  clearTimerRef,
  deckPieces,
  ghostCells,
  initialGame,
  isClearing,
  score,
  setBoard,
  setAugmentState,
  setClearingCells,
  setGhostCells,
  setScore,
  setTray,
  tray
}) {
  const [cellActionsRemaining, setCellActionsRemaining] = useState(() => initialGame?.cellActionsRemaining || 0);
  const [activeCellSlot, setActiveCellSlot] = useState(() => initialGame?.activeCellSlot ?? null);
  const [cellActionMode, setCellActionMode] = useState(() => initialGame?.cellActionMode ?? null);
  const [itemSlots, setItemSlots] = useState(() => initialGame?.itemSlots || createEmptyItemSlots());
  const [itemAwardLevel, setItemAwardLevel] = useState(
    () => initialGame?.itemAwardLevel || Math.floor((initialGame?.score || 0) / ITEM_SCORE_STEP)
  );
  const [undoSnapshot, setUndoSnapshot] = useState(() => initialGame?.undoSnapshot || null);
  // Item slot index of an in-progress augmented reroll (null when no reroll modal is open).
  const [rerollModalSlot, setRerollModalSlot] = useState(null);

  useEffect(() => {
    const nextAwardLevel = Math.floor(score / ITEM_SCORE_STEP);
    if (nextAwardLevel <= itemAwardLevel) return;

    setItemSlots((current) => {
      const nextSlots = [...current];
      let itemsToAward = nextAwardLevel - itemAwardLevel;

      for (let index = 0; index < nextSlots.length && itemsToAward > 0; index += 1) {
        if (!nextSlots[index]) {
          nextSlots[index] = getRandomItemType();
          itemsToAward -= 1;
        }
      }

      return nextSlots;
    });
    setItemAwardLevel(nextAwardLevel);
  }, [score, itemAwardLevel]);

  function clearItemSlot(slotIndex) {
    setItemSlots((current) => current.map((item, index) => (index === slotIndex ? null : item)));
  }

  function cancelCellMode() {
    setActiveCellSlot(null);
    setCellActionsRemaining(0);
    setCellActionMode(null);
  }

  function resetItems() {
    setCellActionsRemaining(0);
    setActiveCellSlot(null);
    setCellActionMode(null);
    setItemAwardLevel(0);
    setItemSlots(createEmptyItemSlots());
    setUndoSnapshot(null);
    setRerollModalSlot(null);
  }

  function saveUndoSnapshot() {
    setUndoSnapshot({
      augmentState,
      board: cloneBoard(board),
      ghostCells: [...ghostCells],
      score,
      tray
    });
  }

  function handleUndo(slotIndex) {
    if (isClearing || !undoSnapshot || itemSlots[slotIndex] !== "undo") return

    clearTimeout(clearTimerRef.current)
    setAugmentState(getSavedAugmentState(undoSnapshot))
    setBoard(cloneBoard(undoSnapshot.board))
    setTray(undoSnapshot.tray)
    setScore(undoSnapshot.score)
    setGhostCells(new Set(undoSnapshot.ghostCells || []))
    setClearingCells(new Set())
    cancelCellMode()
    clearItemSlot(slotIndex)
    setUndoSnapshot(null)
    clearSelection()
  }

  function handleReroll(slotIndex) {
    if (isClearing || itemSlots[slotIndex] !== "reroll" || !tray.some(Boolean)) return;

    const rerollLevel = getAugmentLevel(augmentState, "reroll-power");
    if (rerollLevel <= 0) {
      setTray(rerollOnePiece(board, tray, deckPieces));
      cancelCellMode();
      clearItemSlot(slotIndex);
      clearSelection();
      return;
    }

    // Augmented reroll runs through a dedicated modal; the item is consumed on apply.
    cancelCellMode();
    clearSelection();
    setRerollModalSlot(slotIndex);
  }

  function applyReroll(nextTrayPieces) {
    setTray(nextTrayPieces);
    if (rerollModalSlot !== null) {
      clearItemSlot(rerollModalSlot);
    }
    setRerollModalSlot(null);
  }

  function cancelReroll() {
    setRerollModalSlot(null);
  }

  function applyCellAction() {}

  function handleItemClick(item, slotIndex) {
    if (item === "undo") {
      handleUndo(slotIndex);
      return;
    }

    if (item === "reroll") {
      handleReroll(slotIndex);
      return;
    }

  }

  return {
    activeCellSlot,
    applyCellAction,
    applyReroll,
    cancelCellMode,
    cancelReroll,
    cellActionMode,
    cellActionsRemaining,
    handleItemClick,
    itemAwardLevel,
    itemSlots,
    rerollModalSlot,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  };
}

export function ItemSlots({
  activeCellSlot,
  cellActionsRemaining,
  isClearing,
  itemSlots,
  onItemClick,
  undoSnapshot
}) {
  return (
    <section className="undo-items" aria-label="Item slots">
      <header className="undo-items-head">
        <span>Item</span>
        <strong>아이템</strong>
      </header>
      <div className="undo-item-row">
        {itemSlots.map((item, index) => {
          const details = item ? itemDetails[item] : null;
          const Icon = details?.Icon;
          const isActiveCellSlot = cellActionsRemaining > 0 && activeCellSlot === index;
          const tooltipId = details ? `item-tooltip-${index}` : undefined;
          const isDisabled =
            !item ||
            isClearing ||
            (item === "undo" && !undoSnapshot) ||
            (cellActionsRemaining > 0 && !isActiveCellSlot);

          return (
            <button
              aria-describedby={tooltipId}
              aria-label={details ? `${details.label} item` : `Empty item slot ${index + 1}`}
              className={`undo-item ${item ? "available" : "empty"} ${isActiveCellSlot ? "active" : ""}`}
              disabled={isDisabled}
              key={index}
              onClick={() => onItemClick(item, index)}
              type="button"
            >
              {details && (
                <>
                  <span className="undo-item-icon">{Icon && <Icon size={34} aria-hidden="true" />}</span>
                  <span className="undo-item-label">{details.label}</span>
                  <span className="undo-item-count">
                    {isActiveCellSlot ? cellActionsRemaining : details.quantity}
                  </span>
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

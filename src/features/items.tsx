import { useEffect, useRef, useState } from "react";
import "../styles/ItemSlots.css";
import { RefreshCw, Undo2 } from "lucide-react";
import { getAugmentLevel, getSavedAugmentState } from "./augments";
import { cloneBoard } from "../utils/boardUtils";
import { rerollOnePiece } from "../utils/tray";
import type {
  AugmentState,
  Board,
  ItemDetails,
  ItemSlots,
  ItemType,
  SavedGame,
  Tray,
  UndoSnapshot,
  ItemStateValidators
} from "../types";

export const ITEM_SCORE_STEP = 10;
export const MAX_UNDO_ITEMS = 3;
export const MAX_REROLL_ITEMS = 3;
export const MAX_ITEM_SLOTS = 3;
export const ITEM_TYPES: ItemType[] = ["undo", "reroll"];

export const itemDetails: ItemDetails = {
  reroll: { Icon: RefreshCw, description: "트레이 블록을 새로 뽑습니다.", label: "리롤", quantity: 1 },
  undo: { Icon: Undo2, description: "직전 수로 되돌립니다.", label: "되돌리기", quantity: 1 }
};

export function createEmptyItemSlots(): ItemSlots {
  return [null, null, null];
}

function clampItemCount(count: unknown, max: number): number {
  return Math.max(0, Math.min(max, Number.isFinite(count) ? (count as number) : 0));
}

function clampUndoItems(count: unknown): number {
  return clampItemCount(count, MAX_UNDO_ITEMS);
}

function clampRerollItems(count: unknown): number {
  return clampItemCount(count, MAX_REROLL_ITEMS);
}

export function isValidItemType(type: unknown): type is ItemType {
  return ITEM_TYPES.includes(type as ItemType);
}

export function getRandomItemType(): ItemType {
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
}

export function migrateItemSlots(savedGame: SavedGame): ItemSlots {
  if (Array.isArray(savedGame.itemSlots) && savedGame.itemSlots.length === MAX_ITEM_SLOTS) {
    return savedGame.itemSlots.map((item) => (isValidItemType(item) ? item : null)) as ItemSlots;
  }

  const migrated: ItemType[] = [];
  const legacyItems: [ItemType, number][] = [
    ["undo", clampUndoItems(savedGame.undoItems)],
    ["reroll", clampRerollItems(savedGame.rerollItems)]
  ];

  legacyItems.forEach(([type, count]) => {
    for (let index = 0; index < count && migrated.length < MAX_ITEM_SLOTS; index += 1) {
      migrated.push(type);
    }
  });

  return createEmptyItemSlots().map((_, index) => migrated[index] ?? null) as ItemSlots;
}

function isValidUndoSnapshot(
  snapshot: unknown,
  { isValidBoard, isValidTray }: ItemStateValidators
): snapshot is UndoSnapshot {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      isValidBoard((snapshot as UndoSnapshot).board) &&
      isValidTray((snapshot as UndoSnapshot).tray) &&
      Number.isFinite((snapshot as UndoSnapshot).score)
  );
}

export interface SavedItemState {
  itemAwardLevel: number;
  itemSlots: ItemSlots;
  undoSnapshot: UndoSnapshot | null;
}

export function getSavedItemState(savedGame: SavedGame, validators: ItemStateValidators): SavedItemState {
  const savedScore = Number.isFinite(savedGame.score) ? (savedGame.score as number) : 0;
  const fallbackAwardLevel = Math.floor(savedScore / ITEM_SCORE_STEP);
  const rawSnapshot = savedGame.undoSnapshot;

  return {
    itemAwardLevel: Number.isFinite(savedGame.itemAwardLevel)
      ? (savedGame.itemAwardLevel as number)
      : fallbackAwardLevel,
    itemSlots: migrateItemSlots(savedGame),
    undoSnapshot: isValidUndoSnapshot(rawSnapshot, validators)
      ? {
          board: cloneBoard((rawSnapshot as UndoSnapshot).board),
          augmentState: getSavedAugmentState(rawSnapshot as SavedGame),
          ghostCells: Array.isArray((rawSnapshot as UndoSnapshot).ghostCells)
            ? (rawSnapshot as UndoSnapshot).ghostCells.filter((key) => typeof key === "string")
            : [],
          score: (rawSnapshot as UndoSnapshot).score,
          tray: (rawSnapshot as UndoSnapshot).tray
        }
      : null
  };
}

interface UseItemSystemArgs {
  augmentState: AugmentState;
  board: Board;
  clearHighlightMs: number;
  clearSelection: () => void;
  clearTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  deckPieces: import("../types").PieceTemplate[];
  ghostCells: Set<string>;
  initialGame: (SavedItemState & { score?: number }) | null;
  isClearing: boolean;
  score: number;
  setBoard: React.Dispatch<React.SetStateAction<Board>>;
  setAugmentState: React.Dispatch<React.SetStateAction<AugmentState>>;
  setClearingCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  setGhostCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setTray: React.Dispatch<React.SetStateAction<Tray>>;
  tray: Tray;
}

export function useItemSystem({
  augmentState,
  board,
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
}: UseItemSystemArgs) {
  const [itemSlots, setItemSlots] = useState<ItemSlots>(
    () => initialGame?.itemSlots ?? createEmptyItemSlots()
  );
  const [itemAwardLevel, setItemAwardLevel] = useState<number>(
    () => initialGame?.itemAwardLevel ?? Math.floor((initialGame?.score ?? 0) / ITEM_SCORE_STEP)
  );
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(
    () => initialGame?.undoSnapshot ?? null
  );
  // Item slot index of an in-progress augmented reroll (null when no reroll modal is open).
  const [rerollModalSlot, setRerollModalSlot] = useState<number | null>(null);

  useEffect(() => {
    const nextAwardLevel = Math.floor(score / ITEM_SCORE_STEP);
    if (nextAwardLevel <= itemAwardLevel) return;

    setItemSlots((current) => {
      const nextSlots = [...current] as ItemSlots;
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

  function clearItemSlot(slotIndex: number) {
    setItemSlots((current) =>
      current.map((item, index) => (index === slotIndex ? null : item)) as ItemSlots
    );
  }

  function resetItems() {
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

  function handleUndo(slotIndex: number) {
    if (isClearing || !undoSnapshot || itemSlots[slotIndex] !== "undo") return;

    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    setAugmentState(getSavedAugmentState(undoSnapshot as unknown as SavedGame));
    setBoard(cloneBoard(undoSnapshot.board));
    setTray(undoSnapshot.tray);
    setScore(undoSnapshot.score);
    setGhostCells(new Set(undoSnapshot.ghostCells ?? []));
    setClearingCells(new Set());
    clearItemSlot(slotIndex);
    setUndoSnapshot(null);
    clearSelection();
  }

  function handleReroll(slotIndex: number) {
    if (isClearing || itemSlots[slotIndex] !== "reroll" || !tray.some(Boolean)) return;

    const rerollLevel = getAugmentLevel(augmentState, "reroll-power");
    if (rerollLevel <= 0) {
      setTray(rerollOnePiece(board, tray, deckPieces));
      clearItemSlot(slotIndex);
      clearSelection();
      return;
    }

    // Augmented reroll runs through a dedicated modal; the item is consumed on apply.
    clearSelection();
    setRerollModalSlot(slotIndex);
  }

  function applyReroll(nextTrayPieces: Tray) {
    setTray(nextTrayPieces);
    if (rerollModalSlot !== null) {
      clearItemSlot(rerollModalSlot);
    }
    setRerollModalSlot(null);
  }

  function cancelReroll() {
    setRerollModalSlot(null);
  }

  function handleItemClick(item: ItemType | null, slotIndex: number) {
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
    applyReroll,
    cancelReroll,
    handleItemClick,
    itemAwardLevel,
    itemSlots,
    rerollModalSlot,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  };
}

interface ItemSlotsProps {
  isClearing: boolean;
  itemSlots: ItemSlots;
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

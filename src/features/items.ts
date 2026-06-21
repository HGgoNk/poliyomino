import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, RefreshCw, Undo2 } from "lucide-react";
import { getAugmentLevel, getSavedAugmentState } from "./augments";
import { cloneBoard, simulateGravity } from "../utils/boardUtils";
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

// One item is awarded each time the combo crosses a multiple of this number.
export const ITEM_COMBO_STEP = 10;
export const MAX_UNDO_ITEMS = 3;
export const MAX_REROLL_ITEMS = 3;
export const MAX_ITEM_SLOTS = 3;
export const ITEM_TYPES: ItemType[] = ["undo", "reroll", "gravity"];
// Milliseconds between gravity fall/clear animation frames.
export const GRAVITY_FRAME_MS = 70;

export const itemDetails: ItemDetails = {
  reroll: { Icon: RefreshCw, description: "트레이 블록을 새로 뽑습니다.", label: "리롤", quantity: 1 },
  undo: { Icon: Undo2, description: "직전 수로 되돌립니다.", label: "되돌리기", quantity: 1 },
  gravity: { Icon: ArrowDownToLine, description: "보드의 모든 블록을 바닥으로 내립니다.", label: "중력", quantity: 1 }
};

export function createEmptyItemSlots(): ItemSlots {
  return [null, null, null];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
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
  itemSlots: ItemSlots;
  undoSnapshot: UndoSnapshot | null;
}

export function getSavedItemState(savedGame: SavedGame, validators: ItemStateValidators): SavedItemState {
  const rawSnapshot = savedGame.undoSnapshot;

  return {
    itemSlots: migrateItemSlots(savedGame),
    undoSnapshot: isValidUndoSnapshot(rawSnapshot, validators)
      ? {
          board: cloneBoard((rawSnapshot as UndoSnapshot).board),
          augmentState: getSavedAugmentState(rawSnapshot as SavedGame),
          bombCells: toStringArray((rawSnapshot as UndoSnapshot).bombCells),
          boostCells: toStringArray((rawSnapshot as UndoSnapshot).boostCells),
          ghostCells: toStringArray((rawSnapshot as UndoSnapshot).ghostCells),
          goldenCells: toStringArray((rawSnapshot as UndoSnapshot).goldenCells),
          score: (rawSnapshot as UndoSnapshot).score,
          tray: (rawSnapshot as UndoSnapshot).tray
        }
      : null
  };
}

interface UseItemSystemArgs {
  augmentState: AugmentState;
  board: Board;
  bombCells: Set<string>;
  boostCells: Set<string>;
  clearHighlightMs: number;
  clearSelection: () => void;
  clearTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  deckPieces: import("../types").PieceTemplate[];
  ghostCells: Set<string>;
  goldenCells: Set<string>;
  initialGame: (SavedItemState & { score?: number }) | null;
  isClearing: boolean;
  score: number;
  setBoard: React.Dispatch<React.SetStateAction<Board>>;
  setAugmentState: React.Dispatch<React.SetStateAction<AugmentState>>;
  setBombCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  setBoostCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  setClearingCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  setGhostCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  setGoldenCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setTray: React.Dispatch<React.SetStateAction<Tray>>;
  tray: Tray;
}

export function useItemSystem({
  augmentState,
  board,
  bombCells,
  boostCells,
  clearSelection,
  clearTimerRef,
  deckPieces,
  ghostCells,
  goldenCells,
  initialGame,
  isClearing,
  score,
  setBoard,
  setAugmentState,
  setBombCells,
  setBoostCells,
  setClearingCells,
  setGhostCells,
  setGoldenCells,
  setScore,
  setTray,
  tray
}: UseItemSystemArgs) {
  const [itemSlots, setItemSlots] = useState<ItemSlots>(
    () => initialGame?.itemSlots ?? createEmptyItemSlots()
  );
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(
    () => initialGame?.undoSnapshot ?? null
  );
  // Item slot index of an in-progress augmented reroll (null when no reroll modal is open).
  const [rerollModalSlot, setRerollModalSlot] = useState<number | null>(null);
  // True while the gravity item's fall animation is playing (locks input meanwhile).
  const [gravityAnimating, setGravityAnimating] = useState(false);
  const gravityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Last combo value we awarded items for; seeded from the restored combo so resuming a
  // saved game does not re-award. Items drop each time the combo crosses a multiple of 10.
  const comboMilestoneRef = useRef(augmentState.combo);

  useEffect(() => () => {
    if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
  }, []);

  useEffect(() => {
    const combo = augmentState.combo;
    const prevCombo = comboMilestoneRef.current;
    comboMilestoneRef.current = combo;
    if (combo <= prevCombo) return; // combo reset or unchanged — nothing to award

    const itemsEarned =
      Math.floor(combo / ITEM_COMBO_STEP) - Math.floor(prevCombo / ITEM_COMBO_STEP);
    if (itemsEarned <= 0) return;

    setItemSlots((current) => {
      const nextSlots = [...current] as ItemSlots;
      let itemsToAward = itemsEarned;

      // Fill empty slots only. If more items are earned than there are free slots, the
      // overflow is dropped by design — slots are capped at MAX_ITEM_SLOTS.
      for (let index = 0; index < nextSlots.length && itemsToAward > 0; index += 1) {
        if (!nextSlots[index]) {
          nextSlots[index] = getRandomItemType();
          itemsToAward -= 1;
        }
      }

      return nextSlots;
    });
  }, [augmentState.combo]);

  function clearItemSlot(slotIndex: number) {
    setItemSlots((current) =>
      current.map((item, index) => (index === slotIndex ? null : item)) as ItemSlots
    );
  }

  function resetItems() {
    if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
    gravityTimerRef.current = null;
    setGravityAnimating(false);
    comboMilestoneRef.current = 0;
    setItemSlots(createEmptyItemSlots());
    setUndoSnapshot(null);
    setRerollModalSlot(null);
  }

  function saveUndoSnapshot() {
    setUndoSnapshot({
      augmentState,
      board: cloneBoard(board),
      bombCells: [...bombCells],
      boostCells: [...boostCells],
      ghostCells: [...ghostCells],
      goldenCells: [...goldenCells],
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
    setGoldenCells(new Set(undoSnapshot.goldenCells ?? []));
    setBombCells(new Set(undoSnapshot.bombCells ?? []));
    setBoostCells(new Set(undoSnapshot.boostCells ?? []));
    setClearingCells(new Set());
    clearItemSlot(slotIndex);
    setUndoSnapshot(null);
    clearSelection();
  }

  // True when an undo item could be auto-spent (an undo item is held and a snapshot exists).
  const canUndo = !isClearing && undoSnapshot !== null && itemSlots.includes("undo");

  // Spend a held undo item automatically (e.g. to rescue the player from game over).
  function autoUndo(): boolean {
    if (!canUndo) return false;
    const slotIndex = itemSlots.findIndex((item) => item === "undo");
    if (slotIndex === -1) return false;
    handleUndo(slotIndex);
    return true;
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

  function handleGravity(slotIndex: number) {
    if (isClearing || gravityAnimating || itemSlots[slotIndex] !== "gravity") return;

    const { frames, finalBoard, moved } = simulateGravity(board);
    if (!frames.length) return; // nothing falls or clears — keep the item

    clearSelection();
    clearItemSlot(slotIndex);
    setGravityAnimating(true);

    // Step through the fall/clear frames, then settle the board and relocate the marks.
    let frameIndex = 0;
    if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
    gravityTimerRef.current = setInterval(() => {
      if (frameIndex < frames.length) {
        setBoard(frames[frameIndex]);
        frameIndex += 1;
        return;
      }

      if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
      gravityTimerRef.current = null;

      // Marks follow their block to its final cell; marks on cleared cells are dropped.
      const remap = (cells: Set<string>) =>
        new Set([...cells].flatMap((key) => (moved.has(key) ? [moved.get(key)!] : [])));
      setBoard(finalBoard);
      setGhostCells(remap);
      setGoldenCells(remap);
      setBombCells(remap);
      setBoostCells(remap);
      setGravityAnimating(false);
    }, GRAVITY_FRAME_MS);
  }

  function handleItemClick(item: ItemType | null, slotIndex: number) {
    if (gravityAnimating) return;

    if (item === "undo") {
      handleUndo(slotIndex);
      return;
    }

    if (item === "reroll") {
      handleReroll(slotIndex);
      return;
    }

    if (item === "gravity") {
      handleGravity(slotIndex);
      return;
    }
  }

  return {
    applyReroll,
    autoUndo,
    canUndo,
    cancelReroll,
    gravityAnimating,
    handleItemClick,
    itemSlots,
    rerollModalSlot,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  };
}

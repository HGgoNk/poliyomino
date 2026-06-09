import { useEffect, useState } from "react";
import { PaintBucket, RefreshCw, Undo2 } from "lucide-react";
import { clearLines, cloneBoard } from "../utils/boardUtils.js";
import { nextTray } from "../utils/tray.js";

export const ITEM_SCORE_STEP = 10;
export const MAX_UNDO_ITEMS = 3;
export const MAX_REROLL_ITEMS = 3;
export const MAX_FILL_ITEMS = 3;
export const MAX_ITEM_SLOTS = 3;
export const FILL_ITEM_CELLS = 5;
export const ITEM_TYPES = ["undo", "reroll", "fill"];

export const itemDetails = {
  fill: { Icon: PaintBucket, label: "\ucc44\uc6b0\uae30" },
  reroll: { Icon: RefreshCw, label: "\ub9ac\ub864" },
  undo: { Icon: Undo2, label: "\ub418\ub3cc\ub9ac\uae30" }
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

function clampFillItems(count) {
  return clampItemCount(count, MAX_FILL_ITEMS);
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
    ["reroll", clampRerollItems(savedGame.rerollItems)],
    ["fill", clampFillItems(savedGame.fillItems)]
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
    activeFillSlot: Number.isInteger(savedGame.activeFillSlot) ? savedGame.activeFillSlot : null,
    fillCellsRemaining: Number.isFinite(savedGame.fillCellsRemaining)
      ? Math.max(0, Math.min(FILL_ITEM_CELLS, savedGame.fillCellsRemaining))
      : 0,
    itemAwardLevel: Number.isFinite(savedGame.itemAwardLevel) ? savedGame.itemAwardLevel : fallbackAwardLevel,
    itemSlots: migrateItemSlots(savedGame),
    undoSnapshot: isValidUndoSnapshot(savedGame.undoSnapshot, validators)
      ? {
          board: cloneBoard(savedGame.undoSnapshot.board),
          score: savedGame.undoSnapshot.score,
          tray: savedGame.undoSnapshot.tray
        }
      : null
  };
}

export function useItemSystem({
  board,
  clearHighlightMs,
  clearSelection,
  clearTimerRef,
  initialGame,
  isClearing,
  score,
  setBoard,
  setClearingCells,
  setScore,
  setTray,
  tray
}) {
  const [fillCellsRemaining, setFillCellsRemaining] = useState(() => initialGame?.fillCellsRemaining || 0);
  const [activeFillSlot, setActiveFillSlot] = useState(() => initialGame?.activeFillSlot ?? null);
  const [itemSlots, setItemSlots] = useState(() => initialGame?.itemSlots || createEmptyItemSlots());
  const [itemAwardLevel, setItemAwardLevel] = useState(
    () => initialGame?.itemAwardLevel || Math.floor((initialGame?.score || 0) / ITEM_SCORE_STEP)
  );
  const [undoSnapshot, setUndoSnapshot] = useState(() => initialGame?.undoSnapshot || null);

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

  function cancelFillMode() {
    if (activeFillSlot !== null) {
      clearItemSlot(activeFillSlot);
    }
    setActiveFillSlot(null);
    setFillCellsRemaining(0);
  }

  function resetItems() {
    setFillCellsRemaining(0);
    setActiveFillSlot(null);
    setItemAwardLevel(0);
    setItemSlots(createEmptyItemSlots());
    setUndoSnapshot(null);
  }

  function saveUndoSnapshot() {
    setUndoSnapshot({
      board: cloneBoard(board),
      score,
      tray
    });
  }

  function handleUndo(slotIndex) {
    if (isClearing || !undoSnapshot || itemSlots[slotIndex] !== "undo") return

    clearTimeout(clearTimerRef.current)
    setBoard(cloneBoard(undoSnapshot.board))
    setTray(undoSnapshot.tray)
    setScore(undoSnapshot.score)
    setClearingCells(new Set())
    cancelFillMode()
    clearItemSlot(slotIndex)
    setUndoSnapshot(null)
    clearSelection()
  }

  function handleReroll(slotIndex) {
    if (isClearing || itemSlots[slotIndex] !== "reroll") return
    setTray(nextTray(board))
    cancelFillMode()
    clearItemSlot(slotIndex)
    clearSelection()
  }

  function handleFillItem(slotIndex) {
    if (isClearing || fillCellsRemaining > 0 || itemSlots[slotIndex] !== "fill") return;

    setActiveFillSlot(slotIndex);
    setFillCellsRemaining(FILL_ITEM_CELLS);
    clearSelection();
  }

  function fillCellAt(row, col) {
    if (isClearing || fillCellsRemaining <= 0 || board[row][col]) return;

    const filledBoard = cloneBoard(board);
    filledBoard[row][col] = "cyan";
    const result = clearLines(filledBoard);
    const nextClearingCells = new Set(result.clearedCells);

    saveUndoSnapshot();
    setBoard(nextClearingCells.size ? filledBoard : result.board);
    setClearingCells(nextClearingCells);

    const nextFillCellsRemaining = Math.max(0, fillCellsRemaining - 1);
    setFillCellsRemaining(nextFillCellsRemaining);
    if (nextFillCellsRemaining === 0) {
      if (activeFillSlot !== null) {
        clearItemSlot(activeFillSlot);
      }
      setActiveFillSlot(null);
    }

    if (nextClearingCells.size) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(result.board);
        setClearingCells(new Set());
      }, clearHighlightMs);
    }
  }

  function handleItemClick(item, slotIndex) {
    if (item === "undo") {
      handleUndo(slotIndex);
      return;
    }

    if (item === "reroll") {
      handleReroll(slotIndex);
      return;
    }

    if (item === "fill") {
      handleFillItem(slotIndex);
    }
  }

  return {
    activeFillSlot,
    cancelFillMode,
    fillCellAt,
    fillCellsRemaining,
    handleItemClick,
    itemAwardLevel,
    itemSlots,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  };
}

export function ItemSlots({
  activeFillSlot,
  fillCellsRemaining,
  isClearing,
  itemSlots,
  onItemClick,
  undoSnapshot
}) {
  return (
    <div className="undo-items" aria-label="Item slots">
      {itemSlots.map((item, index) => {
        const details = item ? itemDetails[item] : null;
        const Icon = details?.Icon;
        const isActiveFillSlot = fillCellsRemaining > 0 && activeFillSlot === index;
        const isDisabled =
          !item ||
          isClearing ||
          (item === "undo" && !undoSnapshot) ||
          (fillCellsRemaining > 0 && !isActiveFillSlot);

        return (
          <button
            aria-label={details ? `${details.label} item` : `Empty item slot ${index + 1}`}
            className={`undo-item ${item ? "available" : "empty"} ${isActiveFillSlot ? "active" : ""}`}
            disabled={isDisabled}
            key={index}
            onClick={() => onItemClick(item, index)}
            type="button"
          >
            <span className="undo-item-icon">{Icon && <Icon size={30} aria-hidden="true" />}</span>
            <span className="undo-item-label">{details?.label || `\uc2ac\ub86f ${index + 1}`}</span>
            {isActiveFillSlot && <span className="undo-item-count">{fillCellsRemaining}</span>}
          </button>
        );
      })}
    </div>
  );
}

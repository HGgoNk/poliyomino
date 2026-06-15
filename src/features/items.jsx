import { useEffect, useState } from "react";
import "../styles/ItemSlots.css";
import { Eraser, PaintBucket, RefreshCw, Undo2 } from "lucide-react";
import {
  getAugmentedScore,
  getAugmentLevel,
  getEraseCellBonus,
  getEraseItemCells,
  getFillCellBonus,
  getFillItemCells,
  getSavedAugmentState,
  rollSpreadClear
} from "./augments.jsx";
import { applySpreadClear, clearLines, cloneBoard, isBoardEmpty } from "../utils/boardUtils.js";
import { rerollOnePiece } from "../utils/tray.js";

// Item-driven cell changes are scored as a single-cell placement, so augments and
// line-clear bonuses apply the same way they do for a normally placed piece.
const ITEM_CELL_PIECE = { cells: [[0, 0]] };

export const ITEM_SCORE_STEP = 10;
export const MAX_UNDO_ITEMS = 3;
export const MAX_REROLL_ITEMS = 3;
export const MAX_FILL_ITEMS = 3;
export const MAX_ITEM_SLOTS = 3;
export const FILL_ITEM_CELLS = 5;
export const ERASE_ITEM_CELLS = 5;
export const ITEM_TYPES = ["undo", "reroll", "fill", "erase"];

// Number of target cells each cell-targeting item consumes.
export const CELL_ACTION_CELLS = {
  fill: FILL_ITEM_CELLS,
  erase: ERASE_ITEM_CELLS
};

export const itemDetails = {
  fill: { Icon: PaintBucket, description: "\ube48 \uce78 5\uac1c\ub97c \ucc44\uc6c1\ub2c8\ub2e4.", label: "\ucc44\uc6b0\uae30" },
  erase: { Icon: Eraser, description: "\ucc44\uc6b4 \uce78 5\uac1c\ub97c \uc9c0\uc6c1\ub2c8\ub2e4.", label: "\uc9c0\uc6b0\uae30" },
  reroll: { Icon: RefreshCw, description: "\ud2b8\ub808\uc774 \ube14\ub85d\uc744 \uc0c8\ub85c \ubf51\uc2b5\ub2c8\ub2e4.", label: "\ub9ac\ub864" },
  undo: { Icon: Undo2, description: "\uc9c1\uc804 \uc218\ub85c \ub418\ub3cc\ub9bd\ub2c8\ub2e4.", label: "\ub418\ub3cc\ub9ac\uae30" }
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

function isCellActionMode(mode) {
  return mode === "fill" || mode === "erase";
}

export function getSavedItemState(savedGame, validators) {
  const savedScore = Number.isFinite(savedGame.score) ? savedGame.score : 0;
  const fallbackAwardLevel = Math.floor(savedScore / ITEM_SCORE_STEP);

  // Legacy saves only knew about the fill item; fall back to its fields.
  const legacyFillCells = Number.isFinite(savedGame.fillCellsRemaining) ? savedGame.fillCellsRemaining : 0;
  const cellActionMode = isCellActionMode(savedGame.cellActionMode)
    ? savedGame.cellActionMode
    : legacyFillCells > 0
      ? "fill"
      : null;
  const rawRemaining = Number.isFinite(savedGame.cellActionsRemaining)
    ? savedGame.cellActionsRemaining
    : legacyFillCells;
  const legacyActiveSlot = Number.isInteger(savedGame.activeFillSlot) ? savedGame.activeFillSlot : null;
  const savedAugment = getSavedAugmentState(savedGame);
  const maxCells =
    cellActionMode === "fill"
      ? getFillItemCells(savedAugment, FILL_ITEM_CELLS)
      : cellActionMode === "erase"
        ? getEraseItemCells(savedAugment, ERASE_ITEM_CELLS)
        : cellActionMode
          ? CELL_ACTION_CELLS[cellActionMode]
          : 0;

  return {
    activeCellSlot: Number.isInteger(savedGame.activeCellSlot) ? savedGame.activeCellSlot : legacyActiveSlot,
    cellActionMode,
    cellActionsRemaining: cellActionMode ? Math.max(0, Math.min(maxCells, rawRemaining)) : 0,
    itemAwardLevel: Number.isFinite(savedGame.itemAwardLevel) ? savedGame.itemAwardLevel : fallbackAwardLevel,
    itemSlots: migrateItemSlots(savedGame),
    undoSnapshot: isValidUndoSnapshot(savedGame.undoSnapshot, validators)
      ? {
          board: cloneBoard(savedGame.undoSnapshot.board),
          augmentState: getSavedAugmentState(savedGame.undoSnapshot),
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
  initialGame,
  isClearing,
  score,
  setBoard,
  setAugmentState,
  setClearingCells,
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
    if (activeCellSlot !== null) {
      clearItemSlot(activeCellSlot);
    }
    setActiveCellSlot(null);
    setCellActionsRemaining(0);
    setCellActionMode(null);
  }

  function consumeCellAction() {
    const next = Math.max(0, cellActionsRemaining - 1);
    setCellActionsRemaining(next);
    if (next === 0) {
      if (activeCellSlot !== null) {
        clearItemSlot(activeCellSlot);
      }
      setActiveCellSlot(null);
      setCellActionMode(null);
    }
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
      setTray(rerollOnePiece(board, tray));
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

  function startCellAction(slotIndex, mode) {
    if (isClearing || cellActionsRemaining > 0 || itemSlots[slotIndex] !== mode) return;

    const cellCount =
      mode === "fill"
        ? getFillItemCells(augmentState, FILL_ITEM_CELLS)
        : mode === "erase"
          ? getEraseItemCells(augmentState, ERASE_ITEM_CELLS)
          : CELL_ACTION_CELLS[mode];

    setActiveCellSlot(slotIndex);
    setCellActionsRemaining(cellCount);
    setCellActionMode(mode);
    clearSelection();
  }

  function fillCellAt(row, col) {
    if (board[row][col]) return;

    const filledBoard = cloneBoard(board);
    filledBoard[row][col] = "cyan";
    const result = applySpreadClear(clearLines(filledBoard), rollSpreadClear(augmentState));
    const nextClearingCells = new Set(result.clearedCells);
    const scoreGain = getAugmentedScore({
      augmentState,
      cleared: result.cleared,
      piece: ITEM_CELL_PIECE,
      allClear: isBoardEmpty(result.board)
    });
    const fillBonus = getFillCellBonus(augmentState);

    saveUndoSnapshot();
    setBoard(nextClearingCells.size ? filledBoard : result.board);
    setClearingCells(nextClearingCells);
    setScore((current) => current + scoreGain.total + fillBonus);
    consumeCellAction();

    if (nextClearingCells.size) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(result.board);
        setClearingCells(new Set());
      }, clearHighlightMs);
    }
  }

  function eraseCellAt(row, col) {
    if (!board[row][col]) return;

    const erasedBoard = cloneBoard(board);
    erasedBoard[row][col] = null;
    const scoreGain = getAugmentedScore({
      augmentState,
      cleared: 0,
      piece: ITEM_CELL_PIECE,
      allClear: isBoardEmpty(erasedBoard)
    });
    const eraseBonus = getEraseCellBonus(augmentState);

    saveUndoSnapshot();
    setBoard(erasedBoard);
    setScore((current) => current + scoreGain.total + eraseBonus);
    consumeCellAction();
  }

  function applyCellAction(row, col) {
    if (isClearing || cellActionsRemaining <= 0) return;

    if (cellActionMode === "fill") {
      fillCellAt(row, col);
    } else if (cellActionMode === "erase") {
      eraseCellAt(row, col);
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

    if (item === "fill" || item === "erase") {
      startCellAction(slotIndex, item);
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
    <div className="undo-items" aria-label="Item slots">
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
                <span className="undo-item-icon">{Icon && <Icon size={40} aria-hidden="true" />}</span>
                {isActiveCellSlot && <span className="undo-item-count">{cellActionsRemaining}</span>}
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
  );
}

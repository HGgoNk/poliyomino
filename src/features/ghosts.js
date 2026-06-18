import { PIECES } from "../constants/gameData.js";

// Special blocks share base shapes but trigger extra effects. The ghost block can be
// placed overlapping existing blocks; when an overlapped cell is later cleared, that
// destroyed block scores double — modelled here as a flat bonus per overlapped cell.
export const GHOST_CLEAR_BONUS = 20;

// A ghost is earned for every this-many augment choices and added to the deck for the
// current game only (cleared on reset).
export const GHOST_AUGMENT_INTERVAL = 3;

// Build a ghost piece template from a random base shape. The shape is fixed at
// acquisition time; the id encodes the shape so the tray solver caches it correctly.
export function createGhostTemplate() {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    id: `ghost-${base.id}`,
    baseId: base.id,
    cells: base.cells.map(([row, col]) => [row, col]),
    color: "ghost",
    special: "ghost"
  };
}

export function isGhostPiece(piece) {
  return piece?.special === "ghost";
}

// Given the currently-marked ghost cells, any cells newly overlapped by a ghost
// placement, and the cells cleared this turn, return the doubled-score bonus and the
// remaining marks (overlapped cells still on the board, awaiting a future clear).
export function resolveGhostClears(ghostCells, newOverlapCells, clearedCells) {
  const cleared = clearedCells instanceof Set ? clearedCells : new Set(clearedCells);
  const marked = new Set(ghostCells);
  newOverlapCells.forEach((key) => marked.add(key));

  let clearedCount = 0;
  const remaining = new Set();
  marked.forEach((key) => {
    if (cleared.has(key)) clearedCount += 1;
    else remaining.add(key);
  });

  return { bonus: clearedCount * GHOST_CLEAR_BONUS, ghostCells: remaining };
}

export function isValidGhostPiece(piece) {
  return (
    piece &&
    piece.special === "ghost" &&
    typeof piece.id === "string" &&
    Array.isArray(piece.cells) &&
    piece.cells.every((cell) => Array.isArray(cell) && cell.length === 2)
  );
}

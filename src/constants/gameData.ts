import type { PieceTemplate } from "../types";

export const SIZE = 8;

export const EMPTY_BOARD: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

// The standard polyomino set that makes up the default deck.
const BASE_PIECES: PieceTemplate[] = [
  { id: "big-square", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { id: "2x3", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "3x2", cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
  { id: "square", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: "V0", cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { id: "V90", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
  { id: "V180", cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
  { id: "V270", cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { id: "five-h", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: "five-v", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: "quad-h", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: "quad-v", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: "L0", cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: "L90", cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: "L180", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: "L270", cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "J0", cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
  { id: "J90", cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { id: "J180", cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { id: "J270", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: "Z0", cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: "Z90", cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: "S0", cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: "S90", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: "T0", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: "T90", cells: [[0, 0], [1, 0], [1, 1], [2, 0]] },
  { id: "T180", cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { id: "T270", cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: "single", cells: [[0, 0]] },
  { id: "duo-h", cells: [[0, 0], [0, 1]] },
  { id: "duo-v", cells: [[0, 0], [1, 0]] }
];

// Unusual extra shapes (diagonals, giant blocks). They are NOT in the default deck — the
// player opts into them from the start-screen deck builder.
const EXTRA_PIECES: PieceTemplate[] = [
  { id: "diag-2", cells: [[0, 0], [1, 1]] },
  { id: "anti-diag-2", cells: [[0, 1], [1, 0]] },
  { id: "diag-3", cells: [[0, 0], [1, 1], [2, 2]] },
  { id: "anti-diag-3", cells: [[0, 2], [1, 1], [2, 0]] },
  { id: "diag-4", cells: [[0, 0], [1, 1], [2, 2], [3, 3]] },
  { id: "big-3x4", cells: [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3]
  ] },
  { id: "big-4x3", cells: [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
    [3, 0], [3, 1], [3, 2]
  ] },
  { id: "big-4x4", cells: [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3]
  ] }
];

// Full catalog: standard pieces plus the opt-in extras (usable in any deck).
export const PIECES: PieceTemplate[] = [...BASE_PIECES, ...EXTRA_PIECES];

// The default deck is the tetromino set only (the four-cell connected pieces). Every other
// block — including diagonals and giant blocks — must be unlocked through play.
export const DEFAULT_DECK: string[] = [
  "square",
  "quad-h", "quad-v",
  "L0", "L90", "L180", "L270",
  "J0", "J90", "J180", "J270",
  "Z0", "Z90",
  "S0", "S90",
  "T0", "T90", "T180", "T270"
];

const DEFAULT_DECK_SET = new Set(DEFAULT_DECK);

// Non-tetromino base shapes that start locked and are unlocked like special blocks.
export const LOCKABLE_BLOCK_IDS: string[] = PIECES
  .map((piece) => piece.id)
  .filter((id) => !DEFAULT_DECK_SET.has(id));

const PIECE_BY_ID = new Map<string, PieceTemplate>(PIECES.map((piece) => [piece.id, piece]));

export function getPieceTemplate(id: string): PieceTemplate | undefined {
  return PIECE_BY_ID.get(id);
}

// Resolve a deck (list of piece ids) into its matching piece templates, dropping any
// unknown ids. Falls back to the full catalog when the deck is empty or invalid.
export function getDeckPieces(deckIds: unknown): PieceTemplate[] {
  if (!Array.isArray(deckIds)) return PIECES;
  const pieces = (deckIds as unknown[])
    .map((id) => (typeof id === "string" ? PIECE_BY_ID.get(id) : undefined))
    .filter((p): p is PieceTemplate => p !== undefined);
  return pieces.length ? pieces : PIECES;
}

export function isValidDeck(deckIds: unknown): deckIds is string[] {
  return Array.isArray(deckIds) && deckIds.length > 0 && deckIds.every((id) => typeof id === "string" && PIECE_BY_ID.has(id));
}

export const PIECE_COLORS: string[] = [
  "cyan", "lime", "amber", "rose", "violet", "blue", "teal", "orange", "pink", "green", "indigo"
];

export const SPECIAL_COLORS = new Set(["ghost", "line", "echo", "golden", "bomb", "fill", "boost"]);

export const colorClass: Record<string, string> = {
  cyan: "piece-cyan",
  lime: "piece-lime",
  amber: "piece-amber",
  rose: "piece-rose",
  violet: "piece-violet",
  blue: "piece-blue",
  teal: "piece-teal",
  orange: "piece-orange",
  pink: "piece-pink",
  green: "piece-green",
  indigo: "piece-indigo",
  ghost: "piece-ghost",
  line: "piece-line",
  echo: "piece-echo",
  golden: "piece-golden",
  bomb: "piece-bomb",
  fill: "piece-fill",
  boost: "piece-boost",
};

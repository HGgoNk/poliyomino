import { PIECES } from "../constants/gameData.js";
import { createPieceInstance, randomPiece, randomPieceTemplate } from "./pieceUtils.js";
import { getPlacements, placePiece } from "./placement.js";

const TRAY_SIZE = 3;
const RANDOM_TRAY_ATTEMPTS = 300;
const SIMULATION_COLOR = "cyan";

function boardKey(board) {
  return board.map((row) => row.map((cell) => (cell ? 1 : 0)).join("")).join("");
}

function canCompleteTrayMemo(board, pieces, memo) {
  if (!pieces.length) return true;

  // Order of remaining pieces doesn't change solvability, so sort ids for cache hits.
  const key = `${boardKey(board)}|${pieces.map((piece) => piece.id).sort().join(",")}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const result = pieces.some((piece, pieceIndex) => {
    const remainingPieces = pieces.filter((_, index) => index !== pieceIndex);
    const placements = getPlacements(board, piece);

    return placements.some(({ row, col }) => {
      const placed = placePiece(board, { ...piece, color: piece.color || SIMULATION_COLOR }, row, col);
      return canCompleteTrayMemo(placed.board, remainingPieces, memo);
    });
  });

  memo.set(key, result);
  return result;
}

export function canCompleteTray(board, pieces) {
  return canCompleteTrayMemo(board, pieces, new Map());
}

function findSolvableTray(board, memo, deck) {
  for (const first of deck) {
    for (const second of deck) {
      for (const third of deck) {
        const tray = [first, second, third];
        if (canCompleteTrayMemo(board, tray, memo)) {
          return tray;
        }
      }
    }
  }

  return [];
}

// Replace the given tray slots with new random pieces from the deck, keeping the tray solvable.
export function rerollSlots(board, tray, slotIndices, deck = PIECES) {
  const targets = new Set(slotIndices);

  for (let attempt = 0; attempt < RANDOM_TRAY_ATTEMPTS; attempt += 1) {
    const candidateTray = tray.map((piece, index) =>
      targets.has(index) && piece ? createPieceInstance(randomPieceTemplate(deck)) : piece
    );
    if (canCompleteTray(board, candidateTray.filter(Boolean))) {
      return candidateTray;
    }
  }

  // No solvable random fill found for those slots; reroll the whole tray instead.
  return nextTray(board, deck);
}

// Build `count` random piece instances (from the deck) to offer as reroll replacement candidates.
export function rerollCandidates(count, deck = PIECES) {
  return Array.from({ length: count }, () => createPieceInstance(randomPieceTemplate(deck)));
}

// Every deck piece template as a fresh instance, for the "pick from the deck" reroll level.
export function deckPieceInstances(deck = PIECES) {
  return deck.map(createPieceInstance);
}

// Replace a single random non-empty tray slot with a new deck piece, keeping the tray solvable.
export function rerollOnePiece(board, tray, deck = PIECES) {
  const filledSlots = tray.reduce((slots, piece, index) => {
    if (piece) slots.push(index);
    return slots;
  }, []);
  if (!filledSlots.length) return tray;

  const slotIndex = filledSlots[Math.floor(Math.random() * filledSlots.length)];
  const withCandidate = (template) =>
    tray.map((piece, index) => (index === slotIndex ? createPieceInstance(template) : piece));

  for (let attempt = 0; attempt < RANDOM_TRAY_ATTEMPTS; attempt += 1) {
    const candidateTray = withCandidate(randomPieceTemplate(deck));
    if (canCompleteTray(board, candidateTray.filter(Boolean))) {
      return candidateTray;
    }
  }

  // Exhaustively look for any deck template that keeps the tray completable.
  for (const template of deck) {
    const candidateTray = withCandidate(template);
    if (canCompleteTray(board, candidateTray.filter(Boolean))) {
      return candidateTray;
    }
  }

  // No single swap keeps it solvable; fall back to a fresh full tray.
  return nextTray(board, deck);
}

export function nextTray(board, deck = PIECES) {
  if (!board) return Array.from({ length: TRAY_SIZE }, () => randomPiece(deck));

  // The board is fixed for the duration of this call, so share one cache across
  // every random attempt and the exhaustive fallback to avoid recomputing subproblems.
  const memo = new Map();

  for (let attempt = 0; attempt < RANDOM_TRAY_ATTEMPTS; attempt += 1) {
    const tray = Array.from({ length: TRAY_SIZE }, () => randomPieceTemplate(deck));
    if (canCompleteTrayMemo(board, tray, memo)) {
      return tray.map(createPieceInstance);
    }
  }

  return findSolvableTray(board, memo, deck).map(createPieceInstance);
}

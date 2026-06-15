import { SIZE } from "../constants/gameData.js";
import { clearLines, cloneBoard } from "./boardUtils.js";

export function canPlace(board, piece, row, col) {
  return piece.cells.every(([dr, dc]) => {
    const nextRow = row + dr;
    const nextCol = col + dc;
    return nextRow >= 0 && nextRow < SIZE && nextCol >= 0 && nextCol < SIZE && !board[nextRow][nextCol];
  });
}

export function getPlacements(board, piece) {
  const placements = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (canPlace(board, piece, row, col)) {
        placements.push({ row, col });
      }
    }
  }

  return placements;
}

export function hasMove(board, pieces) {
  return pieces.some((piece) => getPlacements(board, piece).length > 0);
}

export function placePiece(board, piece, row, col) {
  const next = cloneBoard(board);
  piece.cells.forEach(([dr, dc]) => {
    next[row + dr][col + dc] = piece.color;
  });
  const result = clearLines(next);
  return { ...result, placedBoard: next };
}

const ADJACENT_DELTAS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

// Empty cells orthogonally adjacent to the just-placed piece (board should include the piece).
function findAdjacentEmptyCells(board, piece, row, col) {
  const seen = new Set();
  const cells = [];

  piece.cells.forEach(([dr, dc]) => {
    ADJACENT_DELTAS.forEach(([ddr, ddc]) => {
      const nextRow = row + dr + ddr;
      const nextCol = col + dc + ddc;
      const key = `${nextRow}-${nextCol}`;
      if (
        nextRow >= 0 &&
        nextRow < SIZE &&
        nextCol >= 0 &&
        nextCol < SIZE &&
        !board[nextRow][nextCol] &&
        !seen.has(key)
      ) {
        seen.add(key);
        cells.push({ row: nextRow, col: nextCol });
      }
    });
  });

  return cells;
}

// Pick up to `count` random empty cells next to the placed piece (for the spread-fill augment).
export function getSpreadFillCells(board, piece, row, col, count) {
  if (count <= 0) return [];

  const candidates = findAdjacentEmptyCells(board, piece, row, col);
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, count);
}

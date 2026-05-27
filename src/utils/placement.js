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

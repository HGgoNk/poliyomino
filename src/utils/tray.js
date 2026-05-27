import { PIECES } from "../constants/gameData.js";
import { createPieceInstance, randomPiece, randomPieceTemplate } from "./pieceUtils.js";
import { getPlacements, placePiece } from "./placement.js";

const TRAY_SIZE = 3;
const RANDOM_TRAY_ATTEMPTS = 300;

export function canCompleteTray(board, pieces) {
  if (!pieces.length) return true;

  return pieces.some((piece, pieceIndex) => {
    const remainingPieces = pieces.filter((_, index) => index !== pieceIndex);
    const placements = getPlacements(board, piece);

    return placements.some(({ row, col }) => {
      const result = placePiece(board, piece, row, col);
      return canCompleteTray(result.board, remainingPieces);
    });
  });
}

function findSolvableTray(board) {
  for (const first of PIECES) {
    for (const second of PIECES) {
      for (const third of PIECES) {
        const tray = [first, second, third];
        if (canCompleteTray(board, tray)) {
          return tray;
        }
      }
    }
  }

  return [];
}

export function nextTray(board) {
  if (!board) return Array.from({ length: TRAY_SIZE }, randomPiece);

  for (let attempt = 0; attempt < RANDOM_TRAY_ATTEMPTS; attempt += 1) {
    const tray = Array.from({ length: TRAY_SIZE }, randomPieceTemplate);
    if (canCompleteTray(board, tray)) {
      return tray.map(createPieceInstance);
    }
  }

  return findSolvableTray(board).map(createPieceInstance);
}

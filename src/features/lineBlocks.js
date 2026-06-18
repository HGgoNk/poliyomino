import { clearLineIndices } from "../utils/boardUtils.js";

// The line block exists only as a 1x1. When placed it clears every block in the same
// row and column (the cross through its cell, including itself).
export function createLineTemplate() {
  return {
    id: "line",
    cells: [[0, 0]],
    color: "line",
    special: "line"
  };
}

export function isLinePiece(piece) {
  return piece?.special === "line";
}

export function isValidLinePiece(piece) {
  return (
    piece &&
    piece.special === "line" &&
    typeof piece.id === "string" &&
    Array.isArray(piece.cells) &&
    piece.cells.length === 1
  );
}

// Clear the full row and column the line block landed on. Returns a result shaped like
// clearLines/placePiece output so it slots into the normal placement flow.
export function applyLineClear(placedBoard, row, col) {
  const { board, clearedCells } = clearLineIndices(placedBoard, [row], [col]);
  return {
    board,
    cleared: 2,
    clearedCells,
    clearedRows: [row],
    clearedCols: [col]
  };
}

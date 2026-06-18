import { clearLineIndices } from "../utils/boardUtils";
import type { Board, ClearedResult, PieceTemplate } from "../types";

export interface LineTemplate extends PieceTemplate {
  special: "line";
  color: "line";
}

// The line block exists only as a 1x1. When placed it clears every block in the same
// row and column (the cross through its cell, including itself).
export function createLineTemplate(): LineTemplate {
  return {
    id: "line",
    cells: [[0, 0]],
    color: "line",
    special: "line"
  };
}

export function isLinePiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "line";
}

export function isValidLinePiece(piece: unknown): piece is LineTemplate {
  return (
    piece !== null &&
    typeof piece === "object" &&
    (piece as PieceTemplate).special === "line" &&
    typeof (piece as PieceTemplate).id === "string" &&
    Array.isArray((piece as PieceTemplate).cells) &&
    (piece as PieceTemplate).cells.length === 1
  );
}

// Clear the full row and column the line block landed on. Returns a result shaped like
// clearLines/placePiece output so it slots into the normal placement flow.
export function applyLineClear(placedBoard: Board, row: number, col: number): ClearedResult {
  const { board, clearedCells } = clearLineIndices(placedBoard, [row], [col]);
  return {
    board,
    cleared: 2,
    clearedCells,
    clearedRows: [row],
    clearedCols: [col]
  };
}

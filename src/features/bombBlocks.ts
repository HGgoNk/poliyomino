import { SIZE } from "../constants/gameData";
import { cloneBoard } from "../utils/boardUtils";
import type { Board, ClearedResult, PieceTemplate } from "../types";

export interface BombTemplate extends PieceTemplate {
  special: "bomb";
  color: "bomb";
}

// The bomb block exists only as a 1x1. When placed it destroys every block in the
// surrounding 3x3 area (including itself) and disappears.
export function createBombTemplate(): BombTemplate {
  return {
    id: "bomb",
    cells: [[0, 0]],
    color: "bomb",
    special: "bomb"
  };
}

export function isBombPiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "bomb";
}

export function isValidBombPiece(piece: unknown): piece is BombTemplate {
  return (
    piece !== null &&
    typeof piece === "object" &&
    (piece as PieceTemplate).special === "bomb" &&
    typeof (piece as PieceTemplate).id === "string" &&
    Array.isArray((piece as PieceTemplate).cells) &&
    (piece as PieceTemplate).cells.length === 1
  );
}

// The cells of the 3x3 area centred on (row, col), clamped to the board.
export function getBombArea(row: number, col: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) cells.push([r, c]);
    }
  }
  return cells;
}

// Clear the 3x3 area around the bomb. Returns a result shaped like clearLines/placePiece
// output so it slots into the normal placement flow.
export function applyBombClear(placedBoard: Board, row: number, col: number): ClearedResult {
  const board = cloneBoard(placedBoard);
  const clearedCells: string[] = [];

  getBombArea(row, col).forEach(([r, c]) => {
    if (board[r][c]) clearedCells.push(`${r}-${c}`);
    board[r][c] = null;
  });

  return {
    board,
    cleared: clearedCells.length ? 1 : 0,
    clearedCells,
    clearedRows: [],
    clearedCols: []
  };
}

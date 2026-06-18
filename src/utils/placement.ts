import { SIZE } from "../constants/gameData";
import { clearLines, cloneBoard } from "./boardUtils";
import type { Board, PieceInstance, PieceTemplate, PlacementResult, PlacementPosition, CellCoord } from "../types";

export function canPlace(board: Board, piece: PieceTemplate, row: number, col: number): boolean {
  // Ghost blocks may overlap existing blocks; they only need to stay on the board.
  const allowOverlap = piece.special === "ghost";
  return piece.cells.every(([dr, dc]) => {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (nextRow < 0 || nextRow >= SIZE || nextCol < 0 || nextCol >= SIZE) return false;
    return allowOverlap || !board[nextRow][nextCol];
  });
}

export function getPlacements(board: Board, piece: PieceTemplate): PlacementPosition[] {
  const placements: PlacementPosition[] = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (canPlace(board, piece, row, col)) {
        placements.push({ row, col });
      }
    }
  }

  return placements;
}

export function hasMove(board: Board, pieces: PieceTemplate[]): boolean {
  return pieces.some((piece) => getPlacements(board, piece).length > 0);
}

export function placePiece(board: Board, piece: PieceInstance, row: number, col: number): PlacementResult {
  const next = cloneBoard(board);
  // Cells that already held a block before this piece landed on them (ghost overlap).
  const overlappedCells: string[] = [];
  piece.cells.forEach(([dr, dc]) => {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (board[nextRow][nextCol]) overlappedCells.push(`${nextRow}-${nextCol}`);
    next[nextRow][nextCol] = piece.color;
  });
  const result = clearLines(next);
  return { ...result, placedBoard: next, overlappedCells };
}

const ADJACENT_DELTAS: CellCoord[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

// Empty cells orthogonally adjacent to the just-placed piece (board should include the piece).
function findAdjacentEmptyCells(
  board: Board,
  piece: PieceTemplate,
  row: number,
  col: number
): PlacementPosition[] {
  const seen = new Set<string>();
  const cells: PlacementPosition[] = [];

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

export function getPlacementDistanceSquared(
  a: PlacementPosition | null,
  b: PlacementPosition | null
): number {
  if (!a || !b) return Infinity;
  return (a.row - b.row) ** 2 + (a.col - b.col) ** 2;
}

export function getClosestPlacement(
  board: Board,
  piece: PieceTemplate | null,
  target: PlacementPosition | null
): PlacementPosition | null {
  if (!piece || !target) return null;
  const placements = getPlacements(board, piece);
  if (!placements.length) return null;
  return placements.reduce((closest, p) =>
    getPlacementDistanceSquared(p, target) < getPlacementDistanceSquared(closest, target) ? p : closest,
    placements[0]
  );
}

// Pick up to `count` random empty cells next to the placed piece (for the spread-fill augment).
export function getSpreadFillCells(
  board: Board,
  piece: PieceTemplate,
  row: number,
  col: number,
  count: number
): PlacementPosition[] {
  if (count <= 0) return [];

  const candidates = findAdjacentEmptyCells(board, piece, row, col);
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, count);
}

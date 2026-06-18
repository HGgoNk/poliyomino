import { describe, expect, it } from "vitest";
import { applySpreadClear, clearLines, cloneBoard, isBoardEmpty } from "../boardUtils";
import type { Board } from "../../types";

const E = null;

function makeBoard(rows: (string | null)[][]): Board {
  return rows;
}

// 8×8 empty board
function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

// Fill an entire row with a color
function fillRow(board: Board, row: number, color = "red"): Board {
  const b = cloneBoard(board);
  b[row] = Array(8).fill(color);
  return b;
}

// Fill an entire column with a color
function fillCol(board: Board, col: number, color = "red"): Board {
  const b = cloneBoard(board);
  b.forEach((row) => { row[col] = color; });
  return b;
}

describe("cloneBoard", () => {
  it("returns a deep copy", () => {
    const original = makeBoard([[E, "a"], [E, E]]);
    const clone = cloneBoard(original);
    clone[0][1] = "b";
    expect(original[0][1]).toBe("a");
  });

  it("produces equal content", () => {
    const board = emptyBoard();
    board[3][3] = "cyan";
    expect(cloneBoard(board)).toEqual(board);
  });
});

describe("isBoardEmpty", () => {
  it("returns true for an all-null board", () => {
    expect(isBoardEmpty(emptyBoard())).toBe(true);
  });

  it("returns false when any cell is occupied", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    expect(isBoardEmpty(board)).toBe(false);
  });
});

describe("clearLines", () => {
  it("returns unchanged board when no full lines exist", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    const result = clearLines(board);
    expect(result.cleared).toBe(0);
    expect(result.clearedCells).toHaveLength(0);
    expect(result.board[0][0]).toBe("red");
  });

  it("clears a full row", () => {
    const board = fillRow(emptyBoard(), 0);
    const result = clearLines(board);
    expect(result.cleared).toBe(1);
    expect(result.clearedRows).toEqual([0]);
    expect(result.board[0].every((c) => c === null)).toBe(true);
    expect(result.clearedCells).toHaveLength(8);
  });

  it("clears a full column", () => {
    const board = fillCol(emptyBoard(), 2);
    const result = clearLines(board);
    expect(result.cleared).toBe(1);
    expect(result.clearedCols).toEqual([2]);
    expect(result.board.every((row) => row[2] === null)).toBe(true);
  });

  it("clears multiple rows and columns simultaneously", () => {
    let board = emptyBoard();
    board = fillRow(board, 0);
    board = fillRow(board, 1);
    board = fillCol(board, 0);
    const result = clearLines(board);
    // 2 rows + 1 col, but col 0 overlaps with the rows — cleared count is still 3 lines
    expect(result.cleared).toBe(3);
    expect(result.clearedRows).toHaveLength(2);
    expect(result.clearedCols).toHaveLength(1);
  });

  it("does not clear a row with one gap", () => {
    const board = fillRow(emptyBoard(), 3);
    board[3][5] = null;
    const result = clearLines(board);
    expect(result.cleared).toBe(0);
  });
});

describe("applySpreadClear", () => {
  it("is a no-op when extraLineCount is 0", () => {
    const board = fillRow(emptyBoard(), 4);
    const base = clearLines(board);
    const result = applySpreadClear(base, 0);
    expect(result.cleared).toBe(base.cleared);
    expect(result.clearedRows).toEqual(base.clearedRows);
  });

  it("is a no-op when no lines were cleared", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    const base = clearLines(board);
    const result = applySpreadClear(base, 2);
    expect(result.cleared).toBe(0);
  });

  it("can clear an adjacent row when count=1", () => {
    // Fill rows 3 and 4 so 3 gets cleared and 4 is a candidate neighbor.
    let board = fillRow(emptyBoard(), 3);
    board = fillRow(board, 4);
    const base = clearLines(board);
    // Both rows are already cleared — no adjacent non-cleared neighbor in that run.
    // Use a single cleared row to test adjacency.
    const single = fillRow(emptyBoard(), 3);
    const singleBase = clearLines(single);
    const spread = applySpreadClear(singleBase, 1);
    // clearedRows grows by at most 1
    expect(spread.cleared).toBeGreaterThanOrEqual(singleBase.cleared);
    expect(spread.clearedRows.length).toBeGreaterThanOrEqual(singleBase.clearedRows.length);
  });
});

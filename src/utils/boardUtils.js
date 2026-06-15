import { SIZE } from "../constants/gameData.js";

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function isBoardEmpty(board) {
  return board.every((row) => row.every((cell) => !cell));
}

export function clearLines(board) {
  const fullRows = board.map((row, index) => (row.every(Boolean) ? index : null)).filter((row) => row !== null);
  const fullCols = Array.from({ length: SIZE }, (_, col) =>
    board.every((row) => row[col]) ? col : null
  ).filter((col) => col !== null);
  const clearedCells = new Set();

  if (!fullRows.length && !fullCols.length) {
    return { board, cleared: 0, clearedCells: [], clearedRows: [], clearedCols: [] };
  }

  const next = cloneBoard(board);
  fullRows.forEach((row) => {
    for (let col = 0; col < SIZE; col += 1) {
      clearedCells.add(`${row}-${col}`);
      next[row][col] = null;
    }
  });
  fullCols.forEach((col) => {
    for (let row = 0; row < SIZE; row += 1) {
      clearedCells.add(`${row}-${col}`);
      next[row][col] = null;
    }
  });

  return {
    board: next,
    cleared: fullRows.length + fullCols.length,
    clearedCells: [...clearedCells],
    clearedRows: fullRows,
    clearedCols: fullCols
  };
}

// Null out the given row/col indices entirely; returns the new board and the cells that held blocks.
export function clearLineIndices(board, rows, cols) {
  const next = cloneBoard(board);
  const clearedCells = [];

  rows.forEach((row) => {
    for (let col = 0; col < SIZE; col += 1) {
      if (next[row][col]) clearedCells.push(`${row}-${col}`);
      next[row][col] = null;
    }
  });
  cols.forEach((col) => {
    for (let row = 0; row < SIZE; row += 1) {
      if (next[row][col]) clearedCells.push(`${row}-${col}`);
      next[row][col] = null;
    }
  });

  return { board: next, clearedCells };
}

// Choose up to `count` lines adjacent to the already-cleared rows/cols (for the spread-clear augment).
export function pickAdjacentLines(clearedRows, clearedCols, count) {
  if (count <= 0) return { rows: [], cols: [] };

  const clearedRowSet = new Set(clearedRows);
  const clearedColSet = new Set(clearedCols);
  const seen = new Set();
  const candidates = [];

  clearedRows.forEach((row) => {
    [row - 1, row + 1].forEach((nextRow) => {
      const key = `row-${nextRow}`;
      if (nextRow >= 0 && nextRow < SIZE && !clearedRowSet.has(nextRow) && !seen.has(key)) {
        seen.add(key);
        candidates.push({ type: "row", index: nextRow });
      }
    });
  });
  clearedCols.forEach((col) => {
    [col - 1, col + 1].forEach((nextCol) => {
      const key = `col-${nextCol}`;
      if (nextCol >= 0 && nextCol < SIZE && !clearedColSet.has(nextCol) && !seen.has(key)) {
        seen.add(key);
        candidates.push({ type: "col", index: nextCol });
      }
    });
  });

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const chosen = candidates.slice(0, count);
  return {
    rows: chosen.filter((line) => line.type === "row").map((line) => line.index),
    cols: chosen.filter((line) => line.type === "col").map((line) => line.index)
  };
}

// Extend a clear result by also clearing `extraLineCount` lines next to the cleared ones.
export function applySpreadClear(result, extraLineCount) {
  if (extraLineCount <= 0 || (!result.clearedRows.length && !result.clearedCols.length)) {
    return result;
  }

  const { rows, cols } = pickAdjacentLines(result.clearedRows, result.clearedCols, extraLineCount);
  if (!rows.length && !cols.length) return result;

  const extra = clearLineIndices(result.board, rows, cols);
  return {
    ...result,
    board: extra.board,
    cleared: result.cleared + rows.length + cols.length,
    clearedCells: [...result.clearedCells, ...extra.clearedCells],
    clearedRows: [...result.clearedRows, ...rows],
    clearedCols: [...result.clearedCols, ...cols]
  };
}

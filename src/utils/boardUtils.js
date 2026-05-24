import { SIZE } from "../constants/gameData.js";

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function clearLines(board) {
  const fullRows = board.map((row, index) => (row.every(Boolean) ? index : null)).filter((row) => row !== null);
  const fullCols = Array.from({ length: SIZE }, (_, col) =>
    board.every((row) => row[col]) ? col : null
  ).filter((col) => col !== null);

  if (!fullRows.length && !fullCols.length) {
    return { board, cleared: 0 };
  }

  const next = cloneBoard(board);
  fullRows.forEach((row) => {
    for (let col = 0; col < SIZE; col += 1) next[row][col] = null;
  });
  fullCols.forEach((col) => {
    for (let row = 0; row < SIZE; row += 1) next[row][col] = null;
  });

  return { board: next, cleared: fullRows.length + fullCols.length };
}

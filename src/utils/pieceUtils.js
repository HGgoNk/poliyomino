import { PIECES } from "../constants/gameData.js";

export function createPieceInstance(piece) {
  return {
    ...piece,
    cells: piece.cells.map(([row, col]) => [row, col]),
    uid: crypto.randomUUID()
  };
}

export function randomPieceTemplate() {
  return PIECES[Math.floor(Math.random() * PIECES.length)];
}

export function randomPiece() {
  return createPieceInstance(randomPieceTemplate());
}

export function pieceBounds(piece) {
  return piece.cells.reduce(
    (box, [r, c]) => ({
      rows: Math.max(box.rows, r + 1),
      cols: Math.max(box.cols, c + 1)
    }),
    { rows: 0, cols: 0 }
  );
}

import { PIECES } from "../constants/gameData.js";

export function createPieceInstance(piece) {
  return { ...piece, uid: crypto.randomUUID() };
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

export function shuffle(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

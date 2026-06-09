import { PIECES, PIECE_COLORS } from "../constants/gameData.js";

function randomPieceColor() {
  return PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
}

export function createPieceInstance(piece) {
  return {
    ...piece,
    color: piece.color || randomPieceColor(),
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

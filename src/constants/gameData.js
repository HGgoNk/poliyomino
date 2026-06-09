export const SIZE = 8;

export const EMPTY_BOARD = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

export const PIECES = [
  { id: "big-square", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { id: "2x3", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "3x2", cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
  { id: "square", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: "V0", cells: [[0, 0], [1, 0], [2, 0], [2, 0], [2, 1]]},
  { id: "V0", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]]},
  { id: "V0", cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]},
  { id: "V0", cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]]},
  { id: "five-h", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: "five-v", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: "quad-h", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: "quad-v", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: "L0", cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: "L90", cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: "L180", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: "L270", cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "J0", cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
  { id: "J90", cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { id: "J180", cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { id: "J270", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: "Z0", cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: "Z90", cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: "S0", cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: "S90", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: "T0", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: "T90", cells: [[0, 0], [1, 0], [1, 1], [2, 0]] },
  { id: "T180", cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { id: "T270", cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: "single", cells: [[0, 0]] },
  { id: "duo-h", cells: [[0, 0], [0, 1]] },
  { id: "duo-v", cells: [[0, 0], [1, 0]] }
];

export const PIECE_COLORS = ["cyan", "lime", "amber", "rose", "violet", "blue", "teal", "orange", "pink", "green", "indigo"];

export const colorClass = {
  cyan: "piece-cyan",
  lime: "piece-lime",
  amber: "piece-amber",
  rose: "piece-rose",
  violet: "piece-violet",
  blue: "piece-blue",
  teal: "piece-teal",
  orange: "piece-orange",
  pink: "piece-pink",
  green: "piece-green",
  indigo: "piece-indigo"
};

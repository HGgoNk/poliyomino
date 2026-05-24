export const SIZE = 8;

export const EMPTY_BOARD = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

export const PIECES = [
  { id: "big-square", color: "indigo", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { id: "2x3", color: "blue", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "3x2", color: "blue", cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
  { id: "square", color: "blue", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: "V0", color: "indigo", cells: [[0, 0], [1, 0], [2, 0], [2, 0], [2, 1]]},
  { id: "V0", color: "indigo", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]]},
  { id: "V0", color: "indigo", cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]},
  { id: "V0", color: "indigo", cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]]},
  { id: "five-h", color: "violet", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: "five-v", color: "violet", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: "quad-h", color: "rose", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: "quad-v", color: "rose", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: "L0", color: "orange", cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: "L90", color: "orange", cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: "L180", color: "orange", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: "L270", color: "orange", cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "J0", color: "amber", cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
  { id: "J90", color: "amber", cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { id: "J180", color: "amber", cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { id: "J270", color: "amber", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: "Z0", color: "green", cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: "Z90", color: "green", cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: "S0", color: "teal", cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: "S90", color: "teal", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: "T0", color: "pink", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: "T90", color: "pink", cells: [[0, 0], [1, 0], [1, 1], [2, 0]] },
  { id: "T180", color: "pink", cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { id: "T270", color: "pink", cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: "single", color: "cyan", cells: [[0, 0]] },
  { id: "duo-h", color: "lime", cells: [[0, 0], [0, 1]] },
  { id: "duo-v", color: "lime", cells: [[0, 0], [1, 0]] }
];

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

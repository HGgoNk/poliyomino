import { createBombTemplate, isValidBombPiece } from "./bombBlocks.js";
import { createGhostTemplate, isValidGhostPiece } from "./ghosts.js";
import { createLineTemplate, isValidLinePiece } from "./lineBlocks.js";

// Display names for special blocks, shown in the reward modal.
export const SPECIAL_LABELS = {
  ghost: "고스트 블록",
  line: "라인 블록",
  bomb: "폭탄 블록"
};

// Each earned special is one of these, chosen at random.
const SPECIAL_FACTORIES = [createGhostTemplate, createLineTemplate, createBombTemplate];

export function createRandomSpecialTemplate() {
  const factory = SPECIAL_FACTORIES[Math.floor(Math.random() * SPECIAL_FACTORIES.length)];
  return factory();
}

export function isValidSpecialPiece(piece) {
  return isValidGhostPiece(piece) || isValidLinePiece(piece) || isValidBombPiece(piece);
}

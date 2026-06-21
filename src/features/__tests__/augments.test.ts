import { describe, expect, it } from "vitest";
import {
  advanceAugmentSchedule,
  chooseAugment,
  createInitialAugmentState,
  getAugmentedScore,
  getAugmentLevel,
  getNextAugmentScore,
  getNextAugmentStateAfterPlacement,
  getRerollCount,
  getRerollReplacementMode,
  REROLL_MAX_LEVEL
} from "../augments";
import type { PieceInstance } from "../../types";

function piece(cellCount: number): PieceInstance {
  return {
    id: "test",
    uid: "uid",
    color: "cyan",
    cells: Array.from({ length: cellCount }, (_, i) => [0, i] as [number, number])
  };
}

describe("getAugmentedScore", () => {
  it("scores placement + line + multi-line with base (level 0) values", () => {
    const state = createInitialAugmentState();
    const breakdown = getAugmentedScore({ augmentState: state, cleared: 2, piece: piece(4) });
    expect(breakdown.placementScore).toBe(4); // 4 cells
    expect(breakdown.clearScore).toBe(40); // 2 lines × 20
    expect(breakdown.multiLineScore).toBe(15); // (2-1) × 15
    expect(breakdown.comboScore).toBe(0); // combo 0
    expect(breakdown.total).toBe(59);
  });

  it("adds combo score scaled by the running combo", () => {
    const state = { ...createInitialAugmentState(), combo: 3 };
    const breakdown = getAugmentedScore({ augmentState: state, cleared: 1, piece: piece(1) });
    expect(breakdown.comboScore).toBe(15); // 1 × 3 × 5
  });

  it("only awards all-clear score when the augment is owned", () => {
    const base = getAugmentedScore({ augmentState: createInitialAugmentState(), cleared: 1, piece: piece(1), allClear: true });
    expect(base.allClearScore).toBe(0);
    const owned = chooseAugment(createInitialAugmentState(), "all-clear", 0);
    const withAugment = getAugmentedScore({ augmentState: owned, cleared: 1, piece: piece(1), allClear: true });
    expect(withAugment.allClearScore).toBe(50);
  });
});

describe("getNextAugmentScore", () => {
  it("targets +50 plus 10% of the score at the last choice", () => {
    expect(getNextAugmentScore(0)).toBe(50);
    expect(getNextAugmentScore(100)).toBe(160);
  });

  it("shrinks the gap by 10% per augment-discount level", () => {
    // base gap at score 100 is 60; one discount level → 54, so target 154
    expect(getNextAugmentScore(100, 1)).toBe(154);
    // five levels → 50% off the 50 base gap → 25
    expect(getNextAugmentScore(0, 5)).toBe(25);
    // discount is capped, and the target never drops below score + 1
    expect(getNextAugmentScore(0, 50)).toBeGreaterThanOrEqual(1);
  });
});

describe("advanceAugmentSchedule", () => {
  it("advances the next-augment target without changing any levels", () => {
    const state = chooseAugment(createInitialAugmentState(), "placement-score", 40);
    const advanced = advanceAugmentSchedule(state, 200);
    expect(advanced.levels).toEqual(state.levels); // no level changed
    expect(advanced.scoreAtLastChoice).toBe(200);
    expect(advanced.nextChoiceScore).toBe(getNextAugmentScore(200));
  });
});

describe("augment-discount", () => {
  it("applies the chosen discount level to the next threshold", () => {
    const state = chooseAugment(createInitialAugmentState(), "augment-discount", 100);
    expect(getAugmentLevel(state, "augment-discount")).toBe(1);
    // next threshold computed with one discount level: 100 + ceil(60 * 0.9) = 154
    expect(state.nextChoiceScore).toBe(154);
  });
});

describe("chooseAugment", () => {
  it("increments the chosen level", () => {
    const state = chooseAugment(createInitialAugmentState(), "placement-score", 10);
    expect(getAugmentLevel(state, "placement-score")).toBe(1);
  });

  it("caps reroll-power at its max level", () => {
    let state = createInitialAugmentState();
    for (let i = 0; i < REROLL_MAX_LEVEL + 3; i += 1) {
      state = chooseAugment(state, "reroll-power", i);
    }
    expect(getAugmentLevel(state, "reroll-power")).toBe(REROLL_MAX_LEVEL);
  });
});

describe("getRerollCount / getRerollReplacementMode", () => {
  it("scales count and mode with level", () => {
    expect(getRerollCount(0)).toBe(1);
    expect(getRerollCount(2)).toBe(2);
    expect(getRerollCount(9)).toBe(3);
    expect(getRerollReplacementMode(1)).toBe("random");
    expect(getRerollReplacementMode(4)).toBe("candidates");
    expect(getRerollReplacementMode(5)).toBe("deck");
  });
});

describe("getNextAugmentStateAfterPlacement", () => {
  it("raises combo when a line is cleared", () => {
    const state = { ...createInitialAugmentState(), combo: 2 };
    const next = getNextAugmentStateAfterPlacement(state, { cleared: 1, trayCompleted: false });
    expect(next.combo).toBe(3);
    expect(next.trayClearedLine).toBe(true);
  });

  it("resets combo when a tray empties without clearing a line", () => {
    const state = { ...createInitialAugmentState(), combo: 5, trayClearedLine: false };
    const next = getNextAugmentStateAfterPlacement(state, { cleared: 0, trayCompleted: true });
    expect(next.combo).toBe(0);
    expect(next.trayClearedLine).toBe(false);
  });

  it("keeps combo while the tray still has pieces", () => {
    const state = { ...createInitialAugmentState(), combo: 5, trayClearedLine: false };
    const next = getNextAugmentStateAfterPlacement(state, { cleared: 0, trayCompleted: false });
    expect(next.combo).toBe(5);
  });
});

import { Bomb, Boxes, Eraser, Flame, Gauge, Gift, HandCoins, Layers, Link, Pickaxe, Plus, RefreshCw, Rocket, Shield, Shuffle, Sparkles, Star, Tag, Thermometer, TrendingUp, Zap } from "lucide-react";
import type {
  AugmentDetail,
  AugmentId,
  AugmentLevels,
  AugmentState,
  AugmentType,
  RerollReplacementMode,
  SavedGame,
  ScoreBreakdown
} from "../types";
import type { PieceInstance } from "../types";

export const AUGMENT_CHOICE_COUNT = 3;

// 배치/제거는 기본 점수에 곱연산(레벨당 +10%). 칸 보너스는 칸마다 합연산.
export const PLACEMENT_MULT_PER_LEVEL = 0.1;
export const CLEAR_MULT_PER_LEVEL = 0.1;
export const CELL_PLACEMENT_BONUS = 1;
export const CELL_CLEAR_BONUS = 2;
export const CRACK_CLEAR_BONUS = 2;
// 콤보 가속: 콤보 1당, 레벨당 점수 배율 +1%.
export const COMBO_ACCEL_PER_COMBO = 0.01;
export const COMBO_BASE_BONUS = 5;
export const COMBO_CLEAR_SCORE_BONUS = 5;
// 과열: 줄 제거 없이 쌓인 배치 1회당, 레벨당 제거 점수 +3.
export const OVERHEAT_BONUS = 3;
// 아이템 연계: 아이템 사용 후 다음 배치 점수 배율 레벨당 +25%.
export const ITEM_CHAIN_RATE = 0.25;
// 콤보 보정: 레벨당 작은 블록 가중치 강도 +0.15 (최대 0.9).
export const COMBO_CORRECTION_PER_LEVEL = 0.15;
export const COMBO_CORRECTION_MAX = 0.9;
export const AUGMENT_BASE_SCORE = 50;
export const AUGMENT_SCORE_RATE = 0.1;
export const REROLL_MAX_LEVEL = 5;
export const MULTI_LINE_BASE_BONUS = 15;
export const MULTI_LINE_SCORE_BONUS = 10;
export const ALL_CLEAR_SCORE_BONUS = 50;
export const SPREAD_FILL_CHANCE_PER_LEVEL = 0.04;
export const SPREAD_CLEAR_CHANCE_PER_LEVEL = 0.04;
// Each level cuts the points needed for the next augment by this fraction.
export const AUGMENT_DISCOUNT_PER_LEVEL = 0.1;
export const BOARD_PRESSURE_SCORE_BONUS = 10;
export const BOARD_PRESSURE_THRESHOLD = 0.8;
// Never discount the requirement below this fraction of the base gap.
export const AUGMENT_DISCOUNT_MAX = 0.9;

export const AUGMENT_IDS: AugmentId[] = [
  "placement-score",
  "clear-score",
  "tray-combo",
  "reroll-power",
  "multi-line",
  "all-clear",
  "spread-fill",
  "spread-clear",
  "augment-discount",
  "board-pressure",
  "cell-placement-bonus",
  "cell-clear-bonus",
  "crack-clear",
  "combo-accel",
  "combo-retain",
  "combo-correction",
  "overheat",
  "item-discount",
  "item-gain-score",
  "item-use-score",
  "item-chain"
];

// Human-readable label for each augment category.
export const AUGMENT_TYPE_LABEL: Record<AugmentType, string> = {
  combo: "콤보형",
  item: "아이템형",
  clear: "줄 제거형",
  multiline: "멀티라인형",
  placement: "안정 배치형",
  etc: "기타"
};

// Augments that cap out at a fixed level (others can be leveled indefinitely).
const AUGMENT_MAX_LEVELS: Partial<Record<AugmentId, number>> = {
  "reroll-power": REROLL_MAX_LEVEL
};

export const augmentDetails: AugmentDetail[] = [
  // ── 안정 배치형 ──
  {
    Icon: Plus,
    id: "placement-score",
    type: "placement",
    label: "배치",
    summary: "블록을 배치할 때 얻는 점수가 곱연산으로 증가합니다."
  },
  {
    Icon: Boxes,
    id: "cell-placement-bonus",
    type: "placement",
    label: "칸 배치 보너스",
    summary: "배치한 칸 수에 비례해 추가 점수를 얻습니다(칸마다 합연산)."
  },
  {
    Icon: Zap,
    id: "spread-fill",
    type: "placement",
    label: "확산",
    summary: "블록 설치 시 일정 확률로 근처 빈 칸을 채웁니다. 레벨업 시 확률과 칸 수가 증가합니다."
  },
  {
    Icon: Star,
    id: "all-clear",
    type: "placement",
    label: "올클리어",
    summary: "보드를 완전히 비우면 추가 점수를 얻습니다."
  },
  // ── 줄 제거형 ──
  {
    Icon: Sparkles,
    id: "clear-score",
    type: "clear",
    label: "제거",
    summary: "줄을 제거할 때 얻는 점수가 곱연산으로 증가합니다."
  },
  {
    Icon: Eraser,
    id: "cell-clear-bonus",
    type: "clear",
    label: "칸 제거 보너스",
    summary: "제거된 칸 수에 비례해 추가 점수를 얻습니다(칸마다 합연산)."
  },
  {
    Icon: Bomb,
    id: "spread-clear",
    type: "clear",
    label: "연쇄 제거",
    summary: "줄 제거 시 일정 확률로 근처 줄도 함께 제거됩니다. 레벨업 시 확률과 줄 수가 증가합니다."
  },
  {
    Icon: Pickaxe,
    id: "crack-clear",
    type: "clear",
    label: "균열 제거",
    summary: "제거된 줄과 인접한 블록 수에 비례해 추가 점수를 얻습니다."
  },
  // ── 콤보형 ──
  {
    Icon: Flame,
    id: "tray-combo",
    type: "combo",
    label: "콤보",
    summary: "줄을 지울 때마다 콤보가 오르고, 콤보 추가 점수가 증가합니다."
  },
  {
    Icon: TrendingUp,
    id: "combo-accel",
    type: "combo",
    label: "콤보 가속",
    summary: "콤보가 높을수록 획득 점수 배율이 증가합니다."
  },
  {
    Icon: Shield,
    id: "combo-retain",
    type: "combo",
    label: "콤보 유지",
    summary: "콤보가 끊길 상황에서 일정 횟수 콤보를 유지합니다(줄 제거 시 충전)."
  },
  {
    Icon: Shuffle,
    id: "combo-correction",
    type: "combo",
    label: "콤보 보정",
    summary: "트레이에 콤보를 이어가기 쉬운 작은 블록이 나올 확률이 증가합니다."
  },
  // ── 멀티라인형 ──
  {
    Icon: Layers,
    id: "multi-line",
    type: "multiline",
    label: "멀티라인",
    summary: "여러 줄을 한 번에 제거하면 추가 점수를 얻습니다."
  },
  {
    Icon: Gauge,
    id: "board-pressure",
    type: "multiline",
    label: "포화",
    summary: "보드가 80% 이상 채워진 상태에서 블록을 배치하면 추가 점수를 얻습니다."
  },
  {
    Icon: Thermometer,
    id: "overheat",
    type: "multiline",
    label: "과열",
    summary: "줄 제거 없이 배치할수록 다음 줄 제거 점수가 증가합니다."
  },
  // ── 아이템형 ──
  {
    Icon: RefreshCw,
    id: "reroll-power",
    type: "item",
    label: "다시뽑기",
    summary: "다시뽑기 아이템이 강화됩니다. 레벨에 따라 바꿀 블록을 직접 고르고, 개수가 늘며, 새 블록도 선택할 수 있습니다."
  },
  {
    Icon: Tag,
    id: "item-discount",
    type: "item",
    label: "아이템 조건 약화",
    summary: "아이템 획득에 필요한 콤보 간격이 줄어듭니다."
  },
  {
    Icon: Gift,
    id: "item-gain-score",
    type: "item",
    label: "보급 점수",
    summary: "아이템을 획득할 때마다 추가 점수를 얻습니다."
  },
  {
    Icon: HandCoins,
    id: "item-use-score",
    type: "item",
    label: "사용 보너스",
    summary: "아이템을 사용할 때마다 추가 점수를 얻습니다."
  },
  {
    Icon: Link,
    id: "item-chain",
    type: "item",
    label: "아이템 연계",
    summary: "아이템 사용 후 다음 배치 점수가 증가합니다."
  },
  // ── 기타 ──
  {
    Icon: Rocket,
    id: "augment-discount",
    type: "etc",
    label: "가속",
    summary: "다음 증강을 얻는 데 필요한 점수가 레벨당 10% 줄어듭니다."
  }
];

export function getAugmentMaxLevel(id: AugmentId): number {
  return AUGMENT_MAX_LEVELS[id] ?? Infinity;
}

function createAugmentLevels(): AugmentLevels {
  return Object.fromEntries(AUGMENT_IDS.map((id) => [id, 0])) as AugmentLevels;
}

function normalizeAugmentLevels(levels: Partial<AugmentLevels> | null | undefined): AugmentLevels {
  return Object.fromEntries(
    AUGMENT_IDS.map((id) => {
      const raw = Number.isFinite(levels?.[id]) ? Math.max(0, levels![id]!) : 0;
      return [id, Math.min(getAugmentMaxLevel(id), raw)];
    })
  ) as AugmentLevels;
}

// Reroll-power level → how many tray blocks a reroll affects (Lv1:1, Lv2:2, Lv3+:3).
export function getRerollCount(level: number): number {
  return Math.min(3, Math.max(1, level));
}

// Reroll-power level → how the replacement blocks are chosen.
export function getRerollReplacementMode(level: number): RerollReplacementMode {
  if (level >= 5) return "deck";
  if (level >= 4) return "candidates";
  return "random";
}

export function getAugmentLevel(augmentState: AugmentState | null | undefined, id: AugmentId): number {
  return normalizeAugmentLevels(augmentState?.levels)[id] || 0;
}

// Fraction (0–AUGMENT_DISCOUNT_MAX) by which the augment-discount augment lowers the gap.
export function getAugmentDiscount(discountLevel: number): number {
  return Math.min(AUGMENT_DISCOUNT_MAX, Math.max(0, discountLevel) * AUGMENT_DISCOUNT_PER_LEVEL);
}

// The next augment is offered after gaining another (50 + 10% of the score at the last
// choice) points on top of that score — so the gap always stays ahead of the current
// score. The very first augment needs AUGMENT_BASE_SCORE (50), since last = 0. The
// augment-discount augment shrinks that extra gap by 10% per level.
export function getNextAugmentScore(scoreAtLastChoice: number, discountLevel = 0): number {
  const gap = AUGMENT_BASE_SCORE + Math.ceil(scoreAtLastChoice * AUGMENT_SCORE_RATE);
  const discounted = Math.ceil(gap * (1 - getAugmentDiscount(discountLevel)));
  return scoreAtLastChoice + Math.max(1, discounted);
}

export function createInitialAugmentState(): AugmentState {
  return {
    combo: 0,
    levels: createAugmentLevels(),
    nextChoiceScore: getNextAugmentScore(0),
    scoreAtLastChoice: 0,
    trayClearedLine: false,
    comboRetainCharges: 0,
    placementsSinceClear: 0,
    itemChainPending: false
  };
}

// Fraction (0–COMBO_CORRECTION_MAX) controlling how strongly the tray favors small blocks.
export function getComboCorrectionBias(augmentState: AugmentState): number {
  return Math.min(
    COMBO_CORRECTION_MAX,
    getAugmentLevel(augmentState, "combo-correction") * COMBO_CORRECTION_PER_LEVEL
  );
}

export function getSavedAugmentState(savedGame: SavedGame | UndoSnapshotLike): AugmentState {
  const augmentSaved = (savedGame as SavedGame).augmentState;
  const scoreAtLastChoice = Number.isFinite(augmentSaved?.scoreAtLastChoice)
    ? Math.max(0, augmentSaved!.scoreAtLastChoice!)
    : 0;
  const levels = normalizeAugmentLevels(augmentSaved?.levels as Partial<AugmentLevels> | undefined);

  return {
    combo: Number.isFinite(augmentSaved?.combo) ? Math.max(0, augmentSaved!.combo!) : 0,
    levels,
    nextChoiceScore: Number.isFinite(augmentSaved?.nextChoiceScore)
      ? Math.max(0, augmentSaved!.nextChoiceScore!)
      : getNextAugmentScore(scoreAtLastChoice, levels["augment-discount"]),
    scoreAtLastChoice,
    trayClearedLine: Boolean(augmentSaved?.trayClearedLine),
    comboRetainCharges: Number.isFinite(augmentSaved?.comboRetainCharges)
      ? Math.max(0, augmentSaved!.comboRetainCharges!)
      : 0,
    placementsSinceClear: Number.isFinite(augmentSaved?.placementsSinceClear)
      ? Math.max(0, augmentSaved!.placementsSinceClear!)
      : 0,
    itemChainPending: Boolean(augmentSaved?.itemChainPending)
  };
}

// Local interface for the undo snapshot shape passed into getSavedAugmentState
interface UndoSnapshotLike {
  augmentState?: Partial<AugmentState> & { levels?: Partial<AugmentLevels> };
}

export function getTotalAugmentLevels(augmentState: AugmentState): number {
  return AUGMENT_IDS.reduce((total, id) => total + getAugmentLevel(augmentState, id), 0);
}

// Chance (0–1) that placing a block spreads fill into nearby empty cells.
export function getSpreadFillChance(augmentState: AugmentState): number {
  return Math.min(1, getAugmentLevel(augmentState, "spread-fill") * SPREAD_FILL_CHANCE_PER_LEVEL);
}

// How many nearby empty cells get filled when spread-fill triggers (level-based: 1, +1 every 3 levels).
export function getSpreadFillCellCount(augmentState: AugmentState): number {
  const level = getAugmentLevel(augmentState, "spread-fill");
  return level <= 0 ? 0 : 1 + Math.floor((level - 1) / 3);
}

// Roll the spread-fill effect for a placement; returns the number of cells to fill (0 = no effect).
export function rollSpreadFill(augmentState: AugmentState): number {
  if (getAugmentLevel(augmentState, "spread-fill") <= 0) return 0;
  if (Math.random() >= getSpreadFillChance(augmentState)) return 0;
  return getSpreadFillCellCount(augmentState);
}

// Chance (0–1) that clearing a line also clears nearby lines.
export function getSpreadClearChance(augmentState: AugmentState): number {
  return Math.min(1, getAugmentLevel(augmentState, "spread-clear") * SPREAD_CLEAR_CHANCE_PER_LEVEL);
}

// How many nearby lines get cleared when spread-clear triggers.
export function getSpreadClearCount(augmentState: AugmentState): number {
  return 1 + Math.floor((getAugmentLevel(augmentState, "spread-clear") - 1) / 3);
}

// Roll the spread-clear effect after a line clear; returns the number of extra lines (0 = no effect).
export function rollSpreadClear(augmentState: AugmentState): number {
  if (getAugmentLevel(augmentState, "spread-clear") <= 0) return 0;
  if (Math.random() >= getSpreadClearChance(augmentState)) return 0;
  return getSpreadClearCount(augmentState);
}

export function shouldOfferAugmentChoice(augmentState: AugmentState, score: number): boolean {
  return score >= augmentState.nextChoiceScore;
}

export function chooseAugment(augmentState: AugmentState, augmentId: AugmentId, score: number): AugmentState {
  const levels = normalizeAugmentLevels(augmentState.levels);
  const nextLevels = {
    ...levels,
    [augmentId]: Math.min(getAugmentMaxLevel(augmentId), levels[augmentId] + 1)
  };

  return {
    ...augmentState,
    levels: nextLevels,
    // The just-chosen discount level applies to the next threshold.
    nextChoiceScore: getNextAugmentScore(score, nextLevels["augment-discount"]),
    scoreAtLastChoice: score
  };
}

// Advance the next-augment target without changing any levels — used when a choice slot is
// spent on something else (e.g. a special-block pick) instead of leveling an augment.
export function advanceAugmentSchedule(augmentState: AugmentState, score: number): AugmentState {
  const levels = normalizeAugmentLevels(augmentState.levels);
  return {
    ...augmentState,
    nextChoiceScore: getNextAugmentScore(score, levels["augment-discount"]),
    scoreAtLastChoice: score
  };
}

export function resetAugmentTrayProgress(augmentState: AugmentState): AugmentState {
  return {
    ...augmentState,
    trayClearedLine: false
  };
}

export function getNextAugmentStateAfterPlacement(
  augmentState: AugmentState,
  { cleared, trayCompleted }: { cleared: number; trayCompleted: boolean }
): AugmentState {
  const retainLevel = getAugmentLevel(augmentState, "combo-retain");
  const trayClearedLine = augmentState.trayClearedLine || cleared > 0;
  const nextCombo = augmentState.combo + Math.max(0, cleared);

  // combo-retain: top charges back to full on a clear; spend one to survive a break.
  let comboRetainCharges = cleared > 0 ? retainLevel : augmentState.comboRetainCharges;
  let combo: number;
  if (trayCompleted && !trayClearedLine) {
    if (comboRetainCharges > 0) {
      combo = nextCombo; // keep the combo alive
      comboRetainCharges -= 1;
    } else {
      combo = 0;
    }
  } else {
    combo = nextCombo;
  }

  return {
    ...augmentState,
    combo,
    comboRetainCharges,
    // overheat: count placements that did not clear a line.
    placementsSinceClear: cleared > 0 ? 0 : augmentState.placementsSinceClear + 1,
    // item-chain bonus is consumed by this placement.
    itemChainPending: false,
    trayClearedLine: trayCompleted ? false : trayClearedLine
  };
}

export function getAugmentEffectText(id: AugmentId, level: number): string {
  if (id === "placement-score") {
    return `블록 배치 점수 +${Math.round(level * PLACEMENT_MULT_PER_LEVEL * 100)}%`;
  }

  if (id === "clear-score") {
    return `줄 제거 점수 +${Math.round(level * CLEAR_MULT_PER_LEVEL * 100)}%`;
  }

  if (id === "cell-placement-bonus") {
    return `배치한 칸당 +${level * CELL_PLACEMENT_BONUS}`;
  }

  if (id === "cell-clear-bonus") {
    return `제거된 칸당 +${level * CELL_CLEAR_BONUS}`;
  }

  if (id === "crack-clear") {
    return `인접 블록당 +${level * CRACK_CLEAR_BONUS}`;
  }

  if (id === "combo-accel") {
    return `콤보 1당 점수 배율 +${Math.round(level * COMBO_ACCEL_PER_COMBO * 100)}%`;
  }

  if (id === "combo-retain") {
    return `콤보 끊김 방지 ${level}회`;
  }

  if (id === "combo-correction") {
    return `작은 블록 등장 확률 +${Math.round(Math.min(COMBO_CORRECTION_MAX, level * COMBO_CORRECTION_PER_LEVEL) * 100)}%`;
  }

  if (id === "overheat") {
    return `무제거 배치당 다음 제거 점수 +${level * OVERHEAT_BONUS}`;
  }

  if (id === "item-discount") {
    return `아이템 콤보 간격 -${level * 2}`;
  }

  if (id === "item-gain-score") {
    return `아이템 획득 시 +${level * 20}`;
  }

  if (id === "item-use-score") {
    return `아이템 사용 시 +${level * 15}`;
  }

  if (id === "item-chain") {
    return `사용 후 다음 배치 점수 +${Math.round(level * ITEM_CHAIN_RATE * 100)}%`;
  }

  if (id === "reroll-power") {
    if (level <= 1) return "바꿀 블록 직접 선택";
    if (level === 2) return "리롤 블록 2개";
    if (level === 3) return "리롤 블록 3개";
    if (level === 4) return "새 블록 후보 3개 중 선택";
    return "새 블록을 덱에서 직접 선택";
  }

  if (id === "multi-line") {
    return `여러 줄 동시 제거 점수 +${level * MULTI_LINE_SCORE_BONUS}/줄`;
  }

  if (id === "all-clear") {
    return `보드 올 클리어 점수 +${level * ALL_CLEAR_SCORE_BONUS}`;
  }

  if (id === "spread-fill") {
    const chance = Math.min(100, Math.round(level * SPREAD_FILL_CHANCE_PER_LEVEL * 100));
    const cells = 1 + Math.floor((level - 1) / 3);
    return `설치 시 ${chance}% 확률로 근처 ${cells}칸 채움`;
  }

  if (id === "spread-clear") {
    const chance = Math.min(100, Math.round(level * SPREAD_CLEAR_CHANCE_PER_LEVEL * 100));
    const lines = 1 + Math.floor((level - 1) / 3);
    return `줄 제거 시 ${chance}% 확률로 근처 ${lines}줄 제거`;
  }

  if (id === "augment-discount") {
    return `다음 증강 필요 점수 -${Math.round(getAugmentDiscount(level) * 100)}%`;
  }

  if (id === "board-pressure") {
    return `보드 80% 이상 시 배치 점수 +${level * BOARD_PRESSURE_SCORE_BONUS}`;
  }

  return `콤보 추가 점수 +${level * COMBO_CLEAR_SCORE_BONUS}/콤보·줄`;
}

export function getAugmentedScore({
  augmentState,
  cleared,
  piece,
  allClear = false,
  extraCells = 0,
  boardFillRatio = 0,
  clearedCellCount = 0,
  crackCount = 0
}: {
  augmentState: AugmentState;
  cleared: number;
  piece: PieceInstance;
  allClear?: boolean;
  extraCells?: number;
  boardFillRatio?: number;
  /** Cells removed by line clears this placement (for 칸 제거 보너스). */
  clearedCellCount?: number;
  /** Blocks adjacent to the cleared lines (for 균열 제거). */
  crackCount?: number;
}): ScoreBreakdown {
  const placementLevel = getAugmentLevel(augmentState, "placement-score");
  const cellPlacementLevel = getAugmentLevel(augmentState, "cell-placement-bonus");
  const clearLevel = getAugmentLevel(augmentState, "clear-score");
  const cellClearLevel = getAugmentLevel(augmentState, "cell-clear-bonus");
  const crackLevel = getAugmentLevel(augmentState, "crack-clear");
  const comboLevel = getAugmentLevel(augmentState, "tray-combo");
  const comboAccelLevel = getAugmentLevel(augmentState, "combo-accel");
  const multiLineLevel = getAugmentLevel(augmentState, "multi-line");
  const allClearLevel = getAugmentLevel(augmentState, "all-clear");
  const pressureLevel = getAugmentLevel(augmentState, "board-pressure");
  const overheatLevel = getAugmentLevel(augmentState, "overheat");
  const itemChainLevel = getAugmentLevel(augmentState, "item-chain");

  const placedCells = piece.cells.length + extraCells;
  // 배치: 기본 점수(칸 수)에 곱연산. 칸 배치 보너스: 칸마다 합연산.
  const placementScore =
    placedCells * (1 + placementLevel * PLACEMENT_MULT_PER_LEVEL)
    + cellPlacementLevel * placedCells * CELL_PLACEMENT_BONUS;
  // 제거: 기본 점수에 곱연산. 칸 제거 보너스/균열 제거/과열: 합연산.
  const overheatBonus =
    cleared > 0 ? overheatLevel * OVERHEAT_BONUS * augmentState.placementsSinceClear : 0;
  const clearScore =
    cleared * 20 * (1 + clearLevel * CLEAR_MULT_PER_LEVEL)
    + cellClearLevel * clearedCellCount * CELL_CLEAR_BONUS
    + crackLevel * crackCount * CRACK_CLEAR_BONUS
    + overheatBonus;
  const multiLineScore =
    Math.max(0, cleared - 1) * (MULTI_LINE_BASE_BONUS + multiLineLevel * MULTI_LINE_SCORE_BONUS);
  const comboScore =
    cleared * augmentState.combo * (COMBO_BASE_BONUS + comboLevel * COMBO_CLEAR_SCORE_BONUS);
  const allClearScore = allClear ? allClearLevel * ALL_CLEAR_SCORE_BONUS : 0;
  const boardPressureScore =
    pressureLevel > 0 && boardFillRatio >= BOARD_PRESSURE_THRESHOLD
      ? pressureLevel * BOARD_PRESSURE_SCORE_BONUS
      : 0;

  const subtotal =
    placementScore + clearScore + multiLineScore + comboScore + allClearScore + boardPressureScore;
  // 콤보 가속: 콤보가 높을수록 전체 점수 배율 증가.
  const comboAccelMult = 1 + comboAccelLevel * COMBO_ACCEL_PER_COMBO * augmentState.combo;
  // 아이템 연계: 아이템 사용 직후 배치면 점수 배율 증가.
  const itemChainMult =
    augmentState.itemChainPending && itemChainLevel > 0 ? 1 + itemChainLevel * ITEM_CHAIN_RATE : 1;

  return {
    allClearScore,
    boardPressureScore,
    clearScore,
    comboScore,
    multiLineScore,
    placementScore,
    total: Math.round(subtotal * comboAccelMult * itemChainMult)
  };
}

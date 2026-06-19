import { useState } from "react";
import { Bomb, Flame, Layers, Plus, RefreshCw, Sparkles, Star, Zap } from "lucide-react";
import "../styles/AugmentPanel.css";
import "../styles/AugmentChoiceModal.css";
import type {
  AugmentDetail,
  AugmentDetailWithLevel,
  AugmentId,
  AugmentLevels,
  AugmentState,
  RerollReplacementMode,
  SavedGame,
  ScoreBreakdown
} from "../types";
import type { PieceInstance } from "../types";

export const AUGMENT_CHOICE_COUNT = 3;

export const PLACEMENT_SCORE_BONUS = 2;
export const CLEAR_SCORE_BONUS_PER_LINE = 10;
export const COMBO_BASE_BONUS = 5;
export const COMBO_CLEAR_SCORE_BONUS = 5;
export const AUGMENT_BASE_SCORE = 50;
export const AUGMENT_SCORE_RATE = 0.1;
export const REROLL_MAX_LEVEL = 5;
export const MULTI_LINE_BASE_BONUS = 15;
export const MULTI_LINE_SCORE_BONUS = 10;
export const ALL_CLEAR_SCORE_BONUS = 50;
export const SPREAD_FILL_CHANCE_PER_LEVEL = 0.04;
export const SPREAD_CLEAR_CHANCE_PER_LEVEL = 0.04;

export const AUGMENT_IDS: AugmentId[] = [
  "placement-score",
  "clear-score",
  "tray-combo",
  "reroll-power",
  "multi-line",
  "all-clear",
  "spread-fill",
  "spread-clear"
];

// Augments that cap out at a fixed level (others can be leveled indefinitely).
const AUGMENT_MAX_LEVELS: Partial<Record<AugmentId, number>> = {
  "reroll-power": REROLL_MAX_LEVEL
};

export const augmentDetails: AugmentDetail[] = [
  {
    Icon: Plus,
    id: "placement-score",
    label: "배치",
    summary: "블록을 배치시 추가 점수를 얻습니다."
  },
  {
    Icon: Sparkles,
    id: "clear-score",
    label: "제거",
    summary: "블럭 제거시 추가 점수를 얻습니다."
  },
  {
    Icon: Flame,
    id: "tray-combo",
    label: "콤보",
    summary: "줄을 지울 때마다 콤보가 오르고, 콤보 추가 점수가 증가합니다."
  },
  {
    Icon: RefreshCw,
    id: "reroll-power",
    label: "다시뽑기",
    summary: "다시뽑기 아이템이 강화됩니다. 레벨에 따라 바꿀 블록을 직접 고르고, 개수가 늘며, 새 블록도 선택할 수 있습니다."
  },
  {
    Icon: Layers,
    id: "multi-line",
    label: "멀티라인",
    summary: "여러 줄을 한 번에 제거하면 추가 점수를 얻습니다."
  },
  {
    Icon: Star,
    id: "all-clear",
    label: "올클리어",
    summary: "보드를 완전히 비우면 추가 점수를 얻습니다."
  },
  {
    Icon: Zap,
    id: "spread-fill",
    label: "확산",
    summary: "블록 설치 시 일정 확률로 근처 빈 칸을 채웁니다. 레벨업 시 확률과 칸 수가 증가합니다."
  },
  {
    Icon: Bomb,
    id: "spread-clear",
    label: "연쇄 제거",
    summary: "줄 제거 시 일정 확률로 근처 줄도 함께 제거됩니다. 레벨업 시 확률과 줄 수가 증가합니다."
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

// The next augment is offered after gaining another (50 + 10% of the score at the last
// choice) points on top of that score — so the gap always stays ahead of the current
// score. The very first augment needs AUGMENT_BASE_SCORE (50), since last = 0.
export function getNextAugmentScore(scoreAtLastChoice: number): number {
  return scoreAtLastChoice + AUGMENT_BASE_SCORE + Math.ceil(scoreAtLastChoice * AUGMENT_SCORE_RATE);
}

export function createInitialAugmentState(): AugmentState {
  return {
    combo: 0,
    levels: createAugmentLevels(),
    nextChoiceScore: getNextAugmentScore(0),
    scoreAtLastChoice: 0,
    trayClearedLine: false
  };
}

export function getSavedAugmentState(savedGame: SavedGame | UndoSnapshotLike): AugmentState {
  const augmentSaved = (savedGame as SavedGame).augmentState;
  const scoreAtLastChoice = Number.isFinite(augmentSaved?.scoreAtLastChoice)
    ? Math.max(0, augmentSaved!.scoreAtLastChoice!)
    : 0;

  return {
    combo: Number.isFinite(augmentSaved?.combo) ? Math.max(0, augmentSaved!.combo!) : 0,
    levels: normalizeAugmentLevels(augmentSaved?.levels as Partial<AugmentLevels> | undefined),
    nextChoiceScore: Number.isFinite(augmentSaved?.nextChoiceScore)
      ? Math.max(0, augmentSaved!.nextChoiceScore!)
      : getNextAugmentScore(scoreAtLastChoice),
    scoreAtLastChoice,
    trayClearedLine: Boolean(augmentSaved?.trayClearedLine)
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

  return {
    ...augmentState,
    levels: {
      ...levels,
      [augmentId]: Math.min(getAugmentMaxLevel(augmentId), levels[augmentId] + 1)
    },
    nextChoiceScore: getNextAugmentScore(score),
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
  const trayClearedLine = augmentState.trayClearedLine || cleared > 0;
  const nextCombo = augmentState.combo + Math.max(0, cleared);

  return {
    ...augmentState,
    combo: trayCompleted && !trayClearedLine ? 0 : nextCombo,
    trayClearedLine: trayCompleted ? false : trayClearedLine
  };
}

export function getAugmentEffectText(id: AugmentId, level: number): string {
  if (id === "placement-score") {
    return `블록 설치 점수 +${level * PLACEMENT_SCORE_BONUS}`;
  }

  if (id === "clear-score") {
    return `줄 제거 점수 +${level * CLEAR_SCORE_BONUS_PER_LINE}`;
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

  return `콤보 추가 점수 +${level * COMBO_CLEAR_SCORE_BONUS}/콤보·줄`;
}

export function getAugmentedScore({
  augmentState,
  cleared,
  piece,
  allClear = false,
  extraCells = 0
}: {
  augmentState: AugmentState;
  cleared: number;
  piece: PieceInstance;
  allClear?: boolean;
  extraCells?: number;
}): ScoreBreakdown {
  const placementLevel = getAugmentLevel(augmentState, "placement-score");
  const clearLevel = getAugmentLevel(augmentState, "clear-score");
  const comboLevel = getAugmentLevel(augmentState, "tray-combo");
  const multiLineLevel = getAugmentLevel(augmentState, "multi-line");
  const allClearLevel = getAugmentLevel(augmentState, "all-clear");
  const placementScore = piece.cells.length + extraCells + placementLevel * PLACEMENT_SCORE_BONUS;
  const clearScore = cleared * (20 + clearLevel * CLEAR_SCORE_BONUS_PER_LINE);
  const multiLineScore =
    Math.max(0, cleared - 1) * (MULTI_LINE_BASE_BONUS + multiLineLevel * MULTI_LINE_SCORE_BONUS);
  const comboScore =
    cleared * augmentState.combo * (COMBO_BASE_BONUS + comboLevel * COMBO_CLEAR_SCORE_BONUS);
  const allClearScore = allClear ? allClearLevel * ALL_CLEAR_SCORE_BONUS : 0;

  return {
    allClearScore,
    clearScore,
    comboScore,
    multiLineScore,
    placementScore,
    total: placementScore + clearScore + multiLineScore + comboScore + allClearScore
  };
}

interface AugmentPanelProps {
  augmentState: AugmentState;
}

export function AugmentPanel({ augmentState }: AugmentPanelProps) {
  const [activeAugmentId, setActiveAugmentId] = useState<AugmentId | null>(null);
  const ownedAugments: AugmentDetailWithLevel[] = augmentDetails
    .map((augment) => ({
      ...augment,
      level: getAugmentLevel(augmentState, augment.id)
    }))
    .filter(({ level }) => level > 0);
  const activeAugment = ownedAugments.find(({ id }) => id === activeAugmentId);
  const ActiveIcon = activeAugment?.Icon;

  return (
    <section className="augment-panel" aria-label="증강" onMouseLeave={() => setActiveAugmentId(null)}>
      <header className="augment-panel-head">
        <strong>증강</strong>
      </header>
      <ul className="augment-list">
        {ownedAugments.map(({ Icon, id, label, level, summary }) => (
          <li
            aria-describedby={activeAugmentId === id ? "augment-detail" : undefined}
            aria-label={`${label} ${level}레벨`}
            className="augment-card"
            key={id}
            onBlur={() => setActiveAugmentId(null)}
            onFocus={() => setActiveAugmentId(id)}
            onMouseEnter={() => setActiveAugmentId(id)}
            tabIndex={0}
          >
            <span className="augment-card-icon">
              <Icon size={35} aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
      {activeAugment && ActiveIcon && (
        <aside className="augment-detail-panel" id="augment-detail">
          <span className="augment-detail-icon">
            <ActiveIcon size={54} aria-hidden="true" />
          </span>
          <div className="augment-detail-copy">
            <strong>{activeAugment.label}</strong>
            <span>{activeAugment.level}레벨</span>
            <p>{activeAugment.summary}</p>
          </div>
        </aside>
      )}
    </section>
  );
}

// Pick `count` distinct augments at random (Fisher-Yates shuffle, then slice),
// excluding any augment that has already reached its max level.
function pickRandomAugments(count: number, augmentState: AugmentState): AugmentDetail[] {
  const pool = augmentDetails.filter(
    (augment) => getAugmentLevel(augmentState, augment.id) < getAugmentMaxLevel(augment.id)
  );
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

interface AugmentChoiceModalProps {
  augmentState: AugmentState;
  onChoose: (id: AugmentId) => void;
  score: number;
}

export function AugmentChoiceModal({ augmentState, onChoose, score }: AugmentChoiceModalProps) {
  // Roll the offered augments once per modal mount so they stay stable while open.
  const [choices] = useState<AugmentDetail[]>(() => pickRandomAugments(AUGMENT_CHOICE_COUNT, augmentState));

  return (
    <div className="augment-choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="augment-choice-title">
      <section className="augment-choice-panel">
        <div className="augment-choice-heading">
          <strong id="augment-choice-title">증강 선택</strong>
        </div>
        <div className="augment-choice-list">
          {choices.map(({ Icon, id, label, summary }) => {
            const currentLevel = getAugmentLevel(augmentState, id);
            const nextLevel = currentLevel + 1;
            const isNewAugment = currentLevel === 0;

            return (
              <button
                className={`augment-choice-card ${isNewAugment ? "new" : ""}`}
                key={id}
                onClick={() => onChoose(id)}
                type="button"
              >
                {isNewAugment && <span className="augment-choice-new">new</span>}
                <span className="augment-choice-icon">
                  <Icon size={48} aria-hidden="true" />
                </span>
                <span className="augment-choice-title">
                  {label} {nextLevel > 1 ? `${nextLevel}레벨` : ""}
                </span>
                <span className="augment-choice-summary">{summary}</span>
                <span className="augment-choice-effect">{getAugmentEffectText(id, nextLevel)}</span>
              </button>
            );
          })}
        </div>
        <p className="augment-choice-progress">
          다음 증강까지 목표 점수: {getNextAugmentScore(score)}
        </p>
      </section>
    </div>
  );
}

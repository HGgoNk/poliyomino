import { useState } from "react";
import { Bomb, Eraser, Flame, Layers, PaintBucket, Plus, RefreshCw, Sparkles, Star, Zap } from "lucide-react";
import "../styles/AugmentPanel.css";
import "../styles/AugmentChoiceModal.css";

export const AUGMENT_CHOICE_COUNT = 3;

export const PLACEMENT_SCORE_BONUS = 2;
export const CLEAR_SCORE_BONUS_PER_LINE = 10;
export const COMBO_BASE_BONUS = 5;
export const COMBO_CLEAR_SCORE_BONUS = 5;
export const MIN_AUGMENT_SCORE_STEP = 10;
export const FILL_SCORE_BONUS = 2;
export const FILL_CELLS_PER_BONUS = 5;
export const ERASE_SCORE_BONUS = 2;
export const ERASE_CELLS_PER_BONUS = 5;
export const REROLL_MAX_LEVEL = 5;
export const MULTI_LINE_BASE_BONUS = 15;
export const MULTI_LINE_SCORE_BONUS = 10;
export const ALL_CLEAR_SCORE_BONUS = 50;
export const SPREAD_FILL_CHANCE_PER_LEVEL = 0.04;
export const SPREAD_CLEAR_CHANCE_PER_LEVEL = 0.04;

export const AUGMENT_IDS = [
  "placement-score",
  "clear-score",
  "tray-combo",
  "fill-power",
  "erase-power",
  "reroll-power",
  "multi-line",
  "all-clear",
  "spread-fill",
  "spread-clear"
];

// Augments that cap out at a fixed level (others can be leveled indefinitely).
const AUGMENT_MAX_LEVELS = {
  "reroll-power": REROLL_MAX_LEVEL
};

export const augmentDetails = [
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
    summary: "콤보가 쌓였을 때 얻는 추가 점수가 증가합니다."
  },
  {
    Icon: PaintBucket,
    id: "fill-power",
    label: "채우기",
    summary: "채우기 아이템이 강화됩니다. 5레벨마다 채울 수 있는 칸이 1개 늘어납니다."
  },
  {
    Icon: Eraser,
    id: "erase-power",
    label: "지우기",
    summary: "지우기 아이템이 강화됩니다. 5레벨마다 지울 수 있는 칸이 1개 늘어납니다."
  },
  {
    Icon: RefreshCw,
    id: "reroll-power",
    label: "리롤",
    summary: "리롤 아이템이 강화됩니다. 레벨에 따라 바꿀 블록을 직접 고르고, 개수가 늘며, 새 블록도 선택할 수 있습니다."
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

export function getAugmentMaxLevel(id) {
  return AUGMENT_MAX_LEVELS[id] ?? Infinity;
}

function createAugmentLevels() {
  return Object.fromEntries(AUGMENT_IDS.map((id) => [id, 0]));
}

function normalizeAugmentLevels(levels) {
  return Object.fromEntries(
    AUGMENT_IDS.map((id) => {
      const raw = Number.isFinite(levels?.[id]) ? Math.max(0, levels[id]) : 0;
      return [id, Math.min(getAugmentMaxLevel(id), raw)];
    })
  );
}

// Reroll-power level → how many tray blocks a reroll affects (Lv1:1, Lv2:2, Lv3+:3).
export function getRerollCount(level) {
  return Math.min(3, Math.max(1, level));
}

// Reroll-power level → how the replacement blocks are chosen.
export function getRerollReplacementMode(level) {
  if (level >= 5) return "deck";
  if (level >= 4) return "candidates";
  return "random";
}

export function getAugmentLevel(augmentState, id) {
  return normalizeAugmentLevels(augmentState?.levels)[id] || 0;
}

export function getAugmentScoreStep(score) {
  return Math.max(MIN_AUGMENT_SCORE_STEP, Math.ceil(score * 0.1));
}

export function getNextAugmentScore(score) {
  return score + getAugmentScoreStep(score);
}

export function createInitialAugmentState() {
  return {
    combo: 0,
    levels: createAugmentLevels(),
    nextChoiceScore: 0,
    scoreAtLastChoice: 0,
    trayClearedLine: false
  };
}

export function getSavedAugmentState(savedGame) {
  const scoreAtLastChoice = Number.isFinite(savedGame?.augmentState?.scoreAtLastChoice)
    ? Math.max(0, savedGame.augmentState.scoreAtLastChoice)
    : 0;

  return {
    combo: Number.isFinite(savedGame?.augmentState?.combo) ? Math.max(0, savedGame.augmentState.combo) : 0,
    levels: normalizeAugmentLevels(savedGame?.augmentState?.levels),
    nextChoiceScore: Number.isFinite(savedGame?.augmentState?.nextChoiceScore)
      ? Math.max(0, savedGame.augmentState.nextChoiceScore)
      : getNextAugmentScore(scoreAtLastChoice),
    scoreAtLastChoice,
    trayClearedLine: Boolean(savedGame?.augmentState?.trayClearedLine)
  };
}

export function getTotalAugmentLevels(augmentState) {
  return AUGMENT_IDS.reduce((total, id) => total + getAugmentLevel(augmentState, id), 0);
}

// Extra score granted to every cell painted by the fill item (per fill-power level).
export function getFillCellBonus(augmentState) {
  return getAugmentLevel(augmentState, "fill-power") * FILL_SCORE_BONUS;
}

// How many cells the fill item can paint, given its base count plus fill-power upgrades.
export function getFillItemCells(augmentState, baseCells) {
  return baseCells + Math.floor(getAugmentLevel(augmentState, "fill-power") / FILL_CELLS_PER_BONUS);
}

// Extra score granted to every cell removed by the erase item (per erase-power level).
export function getEraseCellBonus(augmentState) {
  return getAugmentLevel(augmentState, "erase-power") * ERASE_SCORE_BONUS;
}

// How many cells the erase item can remove, given its base count plus erase-power upgrades.
export function getEraseItemCells(augmentState, baseCells) {
  return baseCells + Math.floor(getAugmentLevel(augmentState, "erase-power") / ERASE_CELLS_PER_BONUS);
}

// Chance (0–1) that placing a block spreads fill into nearby empty cells.
export function getSpreadFillChance(augmentState) {
  return Math.min(1, getAugmentLevel(augmentState, "spread-fill") * SPREAD_FILL_CHANCE_PER_LEVEL);
}

// How many nearby empty cells get filled when spread-fill triggers (level-based: 1, +1 every 3 levels).
export function getSpreadFillCellCount(augmentState) {
  const level = getAugmentLevel(augmentState, "spread-fill");
  return level <= 0 ? 0 : 1 + Math.floor((level - 1) / 3);
}

// Roll the spread-fill effect for a placement; returns the number of cells to fill (0 = no effect).
export function rollSpreadFill(augmentState) {
  if (getAugmentLevel(augmentState, "spread-fill") <= 0) return 0;
  if (Math.random() >= getSpreadFillChance(augmentState)) return 0;
  return getSpreadFillCellCount(augmentState);
}

// Chance (0–1) that clearing a line also clears nearby lines.
export function getSpreadClearChance(augmentState) {
  return Math.min(1, getAugmentLevel(augmentState, "spread-clear") * SPREAD_CLEAR_CHANCE_PER_LEVEL);
}

// How many nearby lines get cleared when spread-clear triggers.
export function getSpreadClearCount(augmentState) {
  return 1 + Math.floor((getAugmentLevel(augmentState, "spread-clear") - 1) / 3);
}

// Roll the spread-clear effect after a line clear; returns the number of extra lines (0 = no effect).
export function rollSpreadClear(augmentState) {
  if (getAugmentLevel(augmentState, "spread-clear") <= 0) return 0;
  if (Math.random() >= getSpreadClearChance(augmentState)) return 0;
  return getSpreadClearCount(augmentState);
}

export function shouldOfferAugmentChoice(augmentState, score) {
  return getTotalAugmentLevels(augmentState) === 0 || score >= augmentState.nextChoiceScore;
}

export function chooseAugment(augmentState, augmentId, score) {
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

export function resetAugmentTrayProgress(augmentState) {
  return {
    ...augmentState,
    trayClearedLine: false
  };
}

export function getNextAugmentStateAfterPlacement(augmentState, { cleared, trayCompleted }) {
  // Combo is a base mechanic now: it always advances regardless of the combo augment.
  const trayClearedLine = augmentState.trayClearedLine || cleared > 0;

  if (!trayCompleted) {
    return {
      ...augmentState,
      trayClearedLine
    };
  }

  return {
    ...augmentState,
    combo: trayClearedLine ? augmentState.combo + 1 : 0,
    trayClearedLine: false
  };
}

export function getAugmentEffectText(id, level) {
  if (id === "placement-score") {
    return `블록 설치 점수 +${level * PLACEMENT_SCORE_BONUS}`;
  }

  if (id === "clear-score") {
    return `줄 제거 점수 +${level * CLEAR_SCORE_BONUS_PER_LINE}`;
  }

  if (id === "fill-power") {
    const extraCells = Math.floor(level / FILL_CELLS_PER_BONUS);
    const cellText = extraCells > 0 ? `, 채우는 칸 +${extraCells}` : "";
    return `채우는 칸 점수 +${level * FILL_SCORE_BONUS}${cellText}`;
  }

  if (id === "erase-power") {
    const extraCells = Math.floor(level / ERASE_CELLS_PER_BONUS);
    const cellText = extraCells > 0 ? `, 지우는 칸 +${extraCells}` : "";
    return `지우는 칸 점수 +${level * ERASE_SCORE_BONUS}${cellText}`;
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

export function getAugmentedScore({ augmentState, cleared, piece, allClear = false, extraCells = 0 }) {
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

export function AugmentPanel({ augmentState }) {
  const columns = Math.min(3, augmentDetails.length);

  return (
    <section className="augment-panel" aria-label="Augments">
      <div className="augment-list" style={{ "--augment-columns": columns }}>
        {augmentDetails.map(({ Icon, id, label, summary }, index) => {
          const level = getAugmentLevel(augmentState, id);
          const tooltipId = `augment-tooltip-${id}`;

          if (level <= 0) {
            return <div aria-label={`Empty augment slot ${index + 1}`} className="augment-item empty" key={id} />;
          }

          return (
            <div
              aria-describedby={tooltipId}
              aria-label={`${label} level ${level}`}
              className="augment-item owned"
              key={id}
              role="img"
              tabIndex={0}
            >
              <span className="augment-flip-card">
                <span className="augment-front">
                  <span className="augment-icon">
                    <Icon size={30} aria-hidden="true" />
                  </span>
                </span>
                <span className="augment-tooltip" id={tooltipId} role="tooltip">
                  <span className="augment-tooltip-level">lv {level}</span>
                  <strong className="augment-tooltip-name">{label}</strong>
                  <span className="augment-tooltip-body">{summary}</span>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Pick `count` distinct augments at random (Fisher-Yates shuffle, then slice),
// excluding any augment that has already reached its max level.
function pickRandomAugments(count, augmentState) {
  const pool = augmentDetails.filter((augment) => getAugmentLevel(augmentState, augment.id) < getAugmentMaxLevel(augment.id));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function AugmentChoiceModal({ augmentState, onChoose, score }) {
  // Roll the offered augments once per modal mount so they stay stable while open.
  const [choices] = useState(() => pickRandomAugments(AUGMENT_CHOICE_COUNT, augmentState));

  return (
    <div className="augment-choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="augment-choice-title">
      <section className="augment-choice-panel">
        <div className="augment-choice-heading">
          <span>Augment</span>
          <strong id="augment-choice-title">증강 선택</strong>
        </div>
        <div className="augment-choice-list">
          {choices.map(({ Icon, id, label, summary }) => {
            const currentLevel = getAugmentLevel(augmentState, id);
            const nextLevel = currentLevel + 1;

            return (
              <button className="augment-choice-card" key={id} onClick={() => onChoose(id)} type="button">
                <span className="augment-choice-icon">
                  <Icon size={48} aria-hidden="true" />
                </span>
                <span className="augment-choice-title">
                  {label} {nextLevel > 1 ? `Lv.${nextLevel}` : ""}
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

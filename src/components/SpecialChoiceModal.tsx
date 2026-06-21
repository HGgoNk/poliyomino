import "../styles/AugmentChoiceModal.css";
import PieceShape from "./PieceShape";
import { SPECIAL_LABELS, SPECIAL_SUMMARIES } from "../features/specials";
import { createPieceInstance } from "../utils/pieceUtils";
import type { PieceTemplate, SpecialType } from "../types";

interface SpecialChoiceModalProps {
  choices: PieceTemplate[];
  onChoose: (template: PieceTemplate) => void;
}

function SpecialChoiceModal({ choices, onChoose }: SpecialChoiceModalProps) {
  return (
    <div className="augment-choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="special-choice-title">
      <section className="augment-choice-panel">
        <div className="augment-choice-heading">
          <strong id="special-choice-title">블록 해금</strong>
        </div>
        <div className="augment-choice-list">
          {choices.map((template) => {
            const special = template.special as SpecialType | undefined;
            // Render with a real instance so PieceShape gets a uid and the assigned color.
            const preview = createPieceInstance(template);
            return (
              <button
                className="augment-choice-card new"
                key={preview.uid}
                onClick={() => onChoose(template)}
                type="button"
              >
                <span className="augment-choice-new">new</span>
                <span className="augment-choice-icon special-choice-shape">
                  <PieceShape cellSize={20} cellGap={3} piece={preview} />
                </span>
                <span className="augment-choice-title">{special ? SPECIAL_LABELS[special] : "기본 블록"}</span>
                <span className="augment-choice-summary">
                  {special ? SPECIAL_SUMMARIES[special] : "이 모양의 기본 블록을 덱에 해금합니다."}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default SpecialChoiceModal;

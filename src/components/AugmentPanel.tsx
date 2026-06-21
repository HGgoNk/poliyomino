import { useState } from "react";
import "../styles/AugmentPanel.css";
import { augmentDetails, getAugmentLevel } from "../features/augments";
import type { AugmentDetailWithLevel, AugmentId, AugmentState } from "../types";

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
        {ownedAugments.map(({ Icon, id, label, level }) => (
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

export default AugmentPanel;

"use client";

import type { CSSProperties } from "react";

interface PreludeCard {
  label: string;
  value: string;
  note: string;
}

interface Props {
  cards: PreludeCard[];
  activeAgentLabel?: string | null;
}

export default function HQPreludePostureGrid({ cards, activeAgentLabel }: Props) {
  const slotForIndex = (index: number) => {
    if (index === 0) return "doctrine";
    if (index === 1) return "sanction";
    if (index === 2) return "theater";
    if (index === 3) return "tempo";
    return "handoff";
  };

  return (
    <aside
      className="nexus-hq-prelude__tower nexus-motion-enter nexus-motion-enter--support"
      aria-label="HQ posture"
    >
      <div className="nexus-hq-prelude__towerHeader">
        <span className="nexus-shell-eyebrow">Sanctum doctrine</span>
        <p className="nexus-hq-prelude__towerCopy">
          {activeAgentLabel
            ? `${activeAgentLabel} holds the active station while runtime, theater, and handoff posture stay stacked beside the proclamation chamber.`
            : "Runtime, theater, and handoff posture stay stacked beside the proclamation chamber so the room reads at a glance."}
        </p>
      </div>
      <div className="nexus-hq-prelude__grid">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className="nexus-hq-prelude__card"
            data-card-slot={slotForIndex(index)}
            style={{ "--nexus-card-order": index } as CSSProperties}
          >
            <span className="nexus-hq-prelude__label">{card.label}</span>
            <span className="nexus-hq-prelude__value">{card.value}</span>
            <p className="nexus-hq-prelude__note" title={card.note}>
              {card.note}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}

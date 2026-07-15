"use client";

interface PreludeCard {
  label: string;
  value: string;
  note: string;
}

interface Props {
  cards: PreludeCard[];
  activeAgentLabel?: string | null;
}

export default function HQPreludePostureGrid({
  cards,
  activeAgentLabel,
}: Props) {
  const summaryCards = cards.slice(0, 4);
  const recallCard = cards[4] ?? null;

  return (
    <section
      className="nexus-hq-tacticalRail__statusRail nexus-motion-enter nexus-motion-enter--support"
      aria-label="Pinned telemetry rail"
    >
      <div className="nexus-hq-tacticalRail__statusIntro">
        <span className="nexus-shell-eyebrow">Pinned telemetry</span>
        <p className="nexus-hq-tacticalRail__statusCopy">
          {activeAgentLabel
            ? `${activeAgentLabel} holds the station while runtime, privilege, front pressure, and recall stay pinned beside the chronicle.`
            : "Runtime, privilege, front pressure, and recall stay pinned beside the chronicle."}
        </p>
      </div>

      <div className="nexus-hq-tacticalRail__statusStrips">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="nexus-hq-tacticalRail__statusStrip"
            data-strip-kind="summary"
          >
            <span className="nexus-hq-tacticalRail__statusLabel">
              {card.label}
            </span>
            <span className="nexus-hq-tacticalRail__statusValue">
              {card.value}
            </span>
            <p className="nexus-hq-tacticalRail__statusNote" title={card.note}>
              {card.note}
            </p>
          </div>
        ))}

        {recallCard ? (
          <div
            className="nexus-hq-tacticalRail__statusStrip nexus-hq-tacticalRail__statusStrip--recall"
            data-strip-kind="recall"
          >
            <span className="nexus-hq-tacticalRail__statusLabel">
              {recallCard.label}
            </span>
            <span className="nexus-hq-tacticalRail__statusValue">
              {recallCard.value}
            </span>
            <p
              className="nexus-hq-tacticalRail__statusNote"
              title={recallCard.note}
            >
              {recallCard.note}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

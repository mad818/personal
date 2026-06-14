"use client";

import {
  HOMEFRONT_SOURCE_ACTIVE_QUEUE,
  HOMEFRONT_SOURCE_GOVERNANCE_STEPS,
  HOMEFRONT_SOURCE_INTAKE,
  HOMEFRONT_SOURCE_INTELLIGENCE_LANES,
  HOMEFRONT_SOURCE_LEDGER,
  HOMEFRONT_SOURCE_OPERATOR_GUARDRAILS,
} from "@/lib/homefrontSourceIntelligence";

const STATUS_LABELS: Record<
  (typeof HOMEFRONT_SOURCE_ACTIVE_QUEUE)[number]["status"],
  string
> = {
  active: "Active",
  guarded: "Guarded",
  staged: "Staged",
};

const LEDGER_STATUS_LABELS: Record<
  (typeof HOMEFRONT_SOURCE_LEDGER)[number]["status"],
  string
> = {
  mapped: "Mapped",
  candidate: "Candidate",
  blocked: "Blocked",
  rejected: "Rejected",
  "private-lane": "Private lane",
};

export default function SourceIntelligenceConsole() {
  const activeCount = HOMEFRONT_SOURCE_ACTIVE_QUEUE.filter(
    (item) => item.status === "active",
  ).length;
  const mappedCount = HOMEFRONT_SOURCE_LEDGER.filter(
    (item) => item.status === "mapped",
  ).length;
  const gatedCount = HOMEFRONT_SOURCE_LEDGER.filter((item) =>
    ["blocked", "rejected", "private-lane"].includes(item.status),
  ).length;

  return (
    <div
      className="nexus-source-intel-console"
      data-testid="resources-source-intelligence"
    >
      <section className="nexus-source-intel-console__hero">
        <div>
          <span className="nexus-source-intel-console__eyebrow">
            Source intelligence
          </span>
          <h2>Outside ideas become governed work, not hidden drift.</h2>
          <p>
            This lane is the operator-facing version of the external link
            intake: map the idea, decide the surface, preserve public/private
            boundaries, and only then promote work into Nexus.
          </p>
        </div>
        <div className="nexus-source-intel-console__readouts">
          <span>
            <em>Active lanes</em>
            <strong>{activeCount}</strong>
          </span>
          <span>
            <em>Posture</em>
            <strong>No vendoring</strong>
          </span>
          <span>
            <em>Boundary</em>
            <strong>Passive-first</strong>
          </span>
          <span>
            <em>Mapped sources</em>
            <strong>{mappedCount}</strong>
          </span>
          <span>
            <em>Gated / private</em>
            <strong>{gatedCount}</strong>
          </span>
        </div>
      </section>

      <section className="nexus-source-intel-console__grid">
        {HOMEFRONT_SOURCE_INTELLIGENCE_LANES.map((lane) => (
          <article key={lane.title} className="nexus-source-intel-card">
            <div className="nexus-shell-resource-card__meta">
              <span className="nexus-shell-resource-card__chip">
                {lane.label}
              </span>
              <span className="nexus-shell-resource-card__external">
                {lane.posture}
              </span>
            </div>
            <h3>{lane.title}</h3>
            <p>{lane.body}</p>
            <div className="nexus-source-intel-card__refs">
              {lane.references.map((reference) => (
                <span key={reference}>{reference}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="nexus-source-intel-console__twoColumn">
        <div className="nexus-source-intel-panel">
          <div className="nexus-shell-resource-section__header">
            <h3 className="nexus-shell-resource-section__title">Intake rail</h3>
            <span className="nexus-shell-resource-section__count">
              Shell posture
            </span>
          </div>
          <div className="nexus-source-intel-panel__stack">
            {HOMEFRONT_SOURCE_INTAKE.map((item) => (
              <span key={item.value} className="nexus-source-intel-signal">
                <em>{item.label}</em>
                <strong>{item.value}</strong>
                <span>{item.detail}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="nexus-source-intel-panel">
          <div className="nexus-shell-resource-section__header">
            <h3 className="nexus-shell-resource-section__title">
              Promotion gate
            </h3>
            <span className="nexus-shell-resource-section__count">4 steps</span>
          </div>
          <div className="nexus-source-intel-steps">
            {HOMEFRONT_SOURCE_GOVERNANCE_STEPS.map((step, index) => (
              <div key={step.step} className="nexus-source-intel-step">
                <span>0{index + 1}</span>
                <div>
                  <strong>{step.step}</strong>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="nexus-source-intel-panel">
        <div className="nexus-shell-resource-section__header">
          <h3 className="nexus-shell-resource-section__title">
            Active intake queue
          </h3>
          <span className="nexus-shell-resource-section__count">
            {HOMEFRONT_SOURCE_ACTIVE_QUEUE.length} lanes
          </span>
        </div>
        <div className="nexus-source-intel-queue">
          {HOMEFRONT_SOURCE_ACTIVE_QUEUE.map((item) => (
            <article key={item.lane} className="nexus-source-intel-queueCard">
              <div className="nexus-shell-resource-card__meta">
                <span className="nexus-shell-resource-card__chip">
                  {item.lane}
                </span>
                <span className="nexus-shell-resource-card__external">
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              <strong>{item.source}</strong>
              <p>{item.next}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="nexus-source-intel-panel"
        data-testid="resources-source-ledger"
      >
        <div className="nexus-shell-resource-section__header">
          <h3 className="nexus-shell-resource-section__title">
            Governed source ledger
          </h3>
          <span className="nexus-shell-resource-section__count">
            {HOMEFRONT_SOURCE_LEDGER.length} decisions
          </span>
        </div>
        <div className="nexus-source-intel-ledger">
          {HOMEFRONT_SOURCE_LEDGER.map((item) => (
            <article
              key={`${item.sourceType}-${item.href}`}
              className="nexus-source-intel-ledgerCard"
              data-status={item.status}
            >
              <div className="nexus-shell-resource-card__meta">
                <span className="nexus-shell-resource-card__chip">
                  {item.surface}
                </span>
                <span className="nexus-shell-resource-card__external">
                  {LEDGER_STATUS_LABELS[item.status]}
                </span>
              </div>
              <div className="nexus-source-intel-ledgerCard__title">
                <strong>{item.label}</strong>
                <span>{item.sourceType}</span>
              </div>
              <p>{item.decisionReason}</p>
              <span className="nexus-source-intel-ledgerCard__next">
                {item.nextAction}
              </span>
              <div className="nexus-source-intel-ledgerCard__actions">
                <a href={item.href} target="_blank" rel="noreferrer">
                  Open source
                </a>
                <a href={item.vaultHref}>File to VAULT</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="nexus-source-intel-panel">
        <div className="nexus-shell-resource-section__header">
          <h3 className="nexus-shell-resource-section__title">Guardrails</h3>
          <span className="nexus-shell-resource-section__count">
            Review before absorb
          </span>
        </div>
        <ul className="nexus-source-intel-guardrails">
          {HOMEFRONT_SOURCE_OPERATOR_GUARDRAILS.map((guardrail) => (
            <li key={guardrail}>{guardrail}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

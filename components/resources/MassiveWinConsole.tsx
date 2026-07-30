import { ShellBadge, ShellPanel } from "@/components/ui/shell";
import { MASSIVE_WIN_PLANS, MASSIVE_WIN_SUMMARY } from "@/lib/massiveWinPlan";

const STATUS_LABELS = {
  active: "Active",
  planned: "Planned",
  ready: "Ready",
} as const;

const PHASE_LABELS = {
  done: "Done",
  current: "Current",
  next: "Next",
} as const;

export default function MassiveWinConsole() {
  return (
    <div className="nexus-massive-win-console">
      <section className="nexus-massive-win-console__hero">
        <div>
          <span className="nexus-massive-win-console__eyebrow">
            Massive wins
          </span>
          <h2>Massive Win Console</h2>
          <p>
            Big requests become bounded win lanes: large fixes, improvements,
            upgrades, design adaptation, and verification gates without losing
            the local-first operating posture.
          </p>
        </div>
        <div
          className="nexus-massive-win-console__stats"
          aria-label="Massive win summary"
        >
          <span>
            <strong>{MASSIVE_WIN_SUMMARY.activePlans}</strong>
            <span>active</span>
          </span>
          <span>
            <strong>{MASSIVE_WIN_SUMMARY.plannedPlans}</strong>
            <span>planned</span>
          </span>
          <span>
            <strong>{MASSIVE_WIN_SUMMARY.routeTargets}</strong>
            <span>routes</span>
          </span>
          <span>
            <strong>{MASSIVE_WIN_SUMMARY.verificationGates}</strong>
            <span>gates</span>
          </span>
        </div>
      </section>

      <div className="nexus-massive-win-console__grid">
        {MASSIVE_WIN_PLANS.map((plan) => (
          <ShellPanel key={plan.id} dense className="nexus-massive-win-card">
            <div className="nexus-massive-win-card__header">
              <div>
                <ShellBadge
                  tone={plan.status === "active" ? "accent" : "muted"}
                >
                  {STATUS_LABELS[plan.status]}
                </ShellBadge>
                <h3>{plan.title}</h3>
              </div>
              <a href={plan.nextAction.href} className="nexus-shell-button">
                {plan.nextAction.label}
              </a>
            </div>

            <p className="nexus-massive-win-card__summary">{plan.summary}</p>

            <div
              className="nexus-massive-win-card__routes"
              aria-label={`${plan.title} route targets`}
            >
              {plan.routeTargets.map((route) => (
                <span key={route}>{route}</span>
              ))}
            </div>

            <div className="nexus-massive-win-card__posture">
              <span>Design posture</span>
              <p>{plan.designPosture}</p>
            </div>

            <div
              className="nexus-massive-win-card__phases"
              aria-label={`${plan.title} phases`}
            >
              {plan.phases.map((phase) => (
                <div
                  key={`${plan.id}-${phase.label}`}
                  className={`nexus-massive-win-card__phase nexus-massive-win-card__phase--${phase.status}`}
                >
                  <span>{PHASE_LABELS[phase.status]}</span>
                  <strong>{phase.label}</strong>
                  <p>{phase.detail}</p>
                </div>
              ))}
            </div>

            <details className="nexus-massive-win-card__verification">
              <summary>Verification gates</summary>
              <div>
                {plan.verification.map((gate) => (
                  <code key={`${plan.id}-${gate}`}>{gate}</code>
                ))}
              </div>
            </details>

            <p className="nexus-massive-win-card__note">
              {plan.nextAction.note}
            </p>
          </ShellPanel>
        ))}
      </div>
    </div>
  );
}

import { clsx } from "clsx";
import type {
  OperationalLight,
  OperationalLightGridModel,
  OperationalLightGroup,
} from "@/lib/operationalLights";

type OperationalLightGridVariant = "toprail" | "compact" | "panel";

interface OperationalLightGridProps {
  grid: OperationalLightGridModel;
  variant?: OperationalLightGridVariant;
  maxLights?: number;
  showLabels?: boolean;
  title?: string;
}

function flattenGroups(groups: OperationalLightGroup[]) {
  return groups.flatMap((group) => group.lights);
}

function limitGroups(
  groups: OperationalLightGroup[],
  maxLights: number | undefined,
) {
  if (!maxLights) return groups;
  const lights = flattenGroups(groups).slice(0, maxLights);
  return [
    {
      id: "core" as const,
      label: "Ops",
      lights,
    },
  ];
}

function LightPill({
  light,
  showLabels,
}: {
  light: OperationalLight;
  showLabels: boolean;
}) {
  const title = `${light.label}: ${light.detail} ${light.proof}`;
  return (
    <span
      className="nexus-operational-lights__light"
      data-state={light.state}
      title={title}
      aria-label={`${light.label}: ${light.state}. ${light.detail}`}
    >
      <span className="nexus-operational-lights__dot" aria-hidden="true" />
      <span className="nexus-operational-lights__short">
        {light.shortLabel}
      </span>
      {showLabels ? (
        <span className="nexus-operational-lights__label">{light.label}</span>
      ) : null}
    </span>
  );
}

export default function OperationalLightGrid({
  grid,
  variant = "compact",
  maxLights,
  showLabels,
  title,
}: OperationalLightGridProps) {
  const visibleGroups = limitGroups(grid.groups, maxLights);
  const labelsVisible = showLabels ?? variant === "panel";

  return (
    <section
      className={clsx(
        "nexus-operational-lights",
        `nexus-operational-lights--${variant}`,
      )}
      data-state={grid.overallState}
      data-testid="operational-light-grid"
      aria-label={`${title ?? grid.headline}: ${grid.summary}`}
    >
      {variant !== "toprail" ? (
        <div className="nexus-operational-lights__head">
          <div>
            <div className="nexus-operational-lights__eyebrow">
              {title ?? grid.headline}
            </div>
            <div className="nexus-operational-lights__summary">
              {grid.summary}
            </div>
          </div>
          <span
            className="nexus-operational-lights__state"
            data-state={grid.overallState}
          >
            {grid.overallState}
          </span>
        </div>
      ) : null}

      <div className="nexus-operational-lights__groups">
        {visibleGroups.map((group) => (
          <div
            key={`${variant}-${group.id}-${group.label}`}
            className="nexus-operational-lights__group"
            aria-label={`${group.label} lights`}
          >
            {variant === "panel" ? (
              <div className="nexus-operational-lights__groupLabel">
                {group.label}
              </div>
            ) : null}
            <div className="nexus-operational-lights__row">
              {group.lights.map((light) => (
                <LightPill
                  key={light.id}
                  light={light}
                  showLabels={labelsVisible}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

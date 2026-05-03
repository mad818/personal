"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DeveloperFieldManual from "@/components/resources/DeveloperFieldManual";
import MassiveWinConsole from "@/components/resources/MassiveWinConsole";
import PlaybooksConsole from "@/components/resources/PlaybooksConsole";
import ProjectImpactConsole from "@/components/resources/ProjectImpactConsole";
import RegistryConsole from "@/components/resources/RegistryConsole";
import SessionFinderConsole from "@/components/resources/SessionFinderConsole";
import SpecDrivenConsole from "@/components/resources/SpecDrivenConsole";
import StudyWorkbenchConsole from "@/components/resources/StudyWorkbenchConsole";
import SurfaceCapabilitiesConsole from "@/components/resources/SurfaceCapabilitiesConsole";
import SystemDesignConsole from "@/components/resources/SystemDesignConsole";
import VoiceLabConsole from "@/components/resources/VoiceLabConsole";
import OperatorReadinessLane from "@/components/ui/OperatorReadinessLane";
import {
  OpsField,
  OpsRail,
  OpsWorkplane,
  ShellBadge,
  ShellSegmentedTabs,
  ShellStack,
} from "@/components/ui/shell";
import { useSessionHrefAutoHeal } from "@/hooks/useSessionHrefAutoHeal";
import {
  DEVELOPER_RESOURCE_FIT_LABELS,
  DEVELOPER_RESOURCE_CATEGORIES,
  DEVELOPER_RESOURCES,
  type ResourceCategory,
} from "@/lib/developerResources";
import {
  resolveResourcesChamber,
  resolveResourcesViewForChamber,
  type ResourcesChamberId,
} from "@/lib/surfaceCondensationRegistry";
import { getOpsLayoutDescriptor } from "@/lib/opsLayoutRegistry";
import type { SurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import { getResourcesWorkbenchViewSpec, getSurfaceModuleSpec } from "@/lib/surfaceRedesignRegistry";
import { useStore } from "@/store/useStore";

type View =
  | "finder"
  | "manual"
  | "study"
  | "surfaces"
  | "playbooks"
  | "specs"
  | "system"
  | "registry"
  | "kits"
  | "impact"
  | "voice-lab"
  | "wins";

const CHAMBERS: Array<{ id: ResourcesChamberId; label: string }> = [
  { id: "finder", label: "Find lane" },
  { id: "start", label: "Start safely" },
  { id: "study", label: "Study" },
  { id: "system", label: "System" },
  { id: "launch", label: "Open session" },
  { id: "utilities", label: "Utilities" },
  { id: "wins", label: "Massive wins" },
];

const START_VIEWS: Array<{ id: Extract<View, "manual" | "playbooks" | "specs">; label: string }> = [
  { id: "playbooks", label: "Playbooks" },
  { id: "specs", label: "Specs" },
  { id: "manual", label: "Manual" },
];

const SYSTEM_VIEWS: Array<{ id: Extract<View, "surfaces" | "system">; label: string }> = [
  { id: "system", label: "System design" },
  { id: "surfaces", label: "Surfaces" },
];

const UTILITY_VIEWS: Array<{ id: Extract<View, "registry" | "kits">; label: string }> = [
  { id: "registry", label: "Registry" },
  { id: "kits", label: "Kits" },
];

const LAUNCH_VIEWS: Array<{ id: Extract<View, "impact" | "voice-lab">; label: string }> = [
  { id: "impact", label: "Impact" },
  { id: "voice-lab", label: "Voice Lab" },
];

const CATEGORY_ORDER: ResourceCategory[] = [
  "certification",
  "study",
  "tooling",
  "ecosystem",
];

function buildModuleSpec(
  id: string,
  title: string,
  detail: string,
  summary: string,
  role: SurfaceModuleSpec["role"],
): SurfaceModuleSpec {
  return { id, title, detail, summary, role };
}

function resolvePanelModuleId(view: View) {
  switch (view) {
    case "finder":
    case "impact":
      return "open-exact-session";
    case "wins":
      return "massive-win-plans";
    case "playbooks":
    case "specs":
    case "study":
    case "manual":
      return "start-safely";
    case "surfaces":
    case "system":
      return "understand-system";
    case "registry":
    case "kits":
      return "supporting-utilities";
    default:
      return "supporting-utilities";
  }
}

function renderPanelContent(
  view: View,
  opts?: {
    prefillFile?: string | null;
    projectId?: string | null;
    impactMode?: "blast" | "graph" | "ownership" | "hotspots" | "security" | null;
  },
): ReactNode {
  switch (view) {
    case "finder":
      return <SessionFinderConsole />;
    case "manual":
      return <DeveloperFieldManual />;
    case "study":
      return <StudyWorkbenchConsole />;
    case "surfaces":
      return <SurfaceCapabilitiesConsole />;
    case "playbooks":
      return <PlaybooksConsole />;
    case "specs":
      return <SpecDrivenConsole />;
    case "system":
      return <SystemDesignConsole />;
    case "registry":
      return <RegistryConsole view="items" />;
    case "kits":
      return <RegistryConsole view="kits" />;
    case "impact":
      return (
        <ProjectImpactConsole
          prefillFile={opts?.prefillFile}
          initialMode={opts?.impactMode ?? "blast"}
        />
      );
    case "voice-lab":
      return <VoiceLabConsole projectId={opts?.projectId} />;
    case "wins":
      return <MassiveWinConsole />;
    default:
      return null;
  }
}

export default function ResourcesWorkbench() {
  const router = useRouter();
  const view = useStore((s) => s.resourcesWorkbenchView);
  const setView = useStore((s) => s.setResourcesWorkbenchView);
  const { normalizedParams } = useSessionHrefAutoHeal();

  const counts = useMemo(
    () =>
      DEVELOPER_RESOURCES.reduce<Record<ResourceCategory, number>>(
        (acc, resource) => {
          acc[resource.category] = (acc[resource.category] ?? 0) + 1;
          return acc;
        },
        {
          certification: 0,
          study: 0,
          tooling: 0,
          ecosystem: 0,
        },
      ),
    [],
  );

  const urlView = useMemo(() => {
    const value = (normalizedParams.get("view") ?? "").toLowerCase() as View;
    return (
      value === "finder" ||
      value === "manual" ||
      value === "study" ||
      value === "surfaces" ||
      value === "playbooks" ||
      value === "specs" ||
      value === "system" ||
      value === "registry" ||
      value === "kits" ||
      value === "impact" ||
      value === "voice-lab" ||
      value === "wins"
    )
      ? value
      : null;
  }, [normalizedParams]);

  useEffect(() => {
    if (!urlView) return;
    setView(urlView);
  }, [setView, urlView]);

  const resolvedView = urlView ?? view;

  const chamber = useMemo(() => resolveResourcesChamber(resolvedView), [resolvedView]);
  const activeView = useMemo(
    () => resolveResourcesViewForChamber(chamber, resolvedView),
    [chamber, resolvedView],
  );
  const [stackExpanded, setStackExpanded] = useState(false);
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const chamberIntegrationHighlights = useMemo(
    () =>
      DEVELOPER_RESOURCES.filter(
        (resource) =>
          resource.integrationFit &&
          resource.integrationFit !== "defer" &&
          resource.recommendedChambers?.includes(chamber),
      ).slice(0, 4),
    [chamber],
  );

  const handleChamberChange = (nextChamber: ResourcesChamberId) => {
    const nextView = resolveResourcesViewForChamber(nextChamber, activeView);
    setView(nextView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextView);
    router.replace(`/resources?${params.toString()}`);
  };

  const handleSubviewChange = (nextView: View) => {
    setView(nextView);
    const params = new URLSearchParams(normalizedParams.toString());
    params.set("view", nextView);
    router.replace(`/resources?${params.toString()}`);
  };

  const activeViewSpec = getResourcesWorkbenchViewSpec(activeView);
  const introRole =
    getSurfaceModuleSpec("resources", activeViewSpec.jobId)?.role ?? "workspace";
  const panelRole =
    getSurfaceModuleSpec("resources", resolvePanelModuleId(activeView))?.role ??
    "workspace";
  const introSpec = buildModuleSpec(
    `${activeView}-intro`,
    activeViewSpec.introTitle,
    activeViewSpec.introDetail,
    activeViewSpec.introSummary,
    introRole,
  );
  const panelSpec = buildModuleSpec(
    `${activeView}-panel`,
    activeViewSpec.panelTitle,
    activeViewSpec.panelDetail,
    activeViewSpec.panelSummary,
    panelRole,
  );
  const howThisHelpsSpec = getSurfaceModuleSpec("resources", "how-this-helps");
  const resourcesLayout = getOpsLayoutDescriptor("resources");
  const stackSpec = buildModuleSpec(
    `${chamber}-integration-stack`,
    "External stack",
    "What we can absorb next",
    "Curated repos that sharpen this chamber without widening the shell.",
    "guidance",
  );
  const activeChamberLabel =
    CHAMBERS.find((entry) => entry.id === chamber)?.label ?? activeViewSpec.introTitle;
  const stackCountLabel = `${chamberIntegrationHighlights.length} fit${
    chamberIntegrationHighlights.length === 1 ? "" : "s"
  }`;
  const categorySignals = CATEGORY_ORDER.map((category) => ({
    category,
    label: DEVELOPER_RESOURCE_CATEGORIES[category],
    count: counts[category],
  }));

  return (
    <ShellStack>
      <ShellSegmentedTabs
        items={CHAMBERS}
        active={chamber}
        onChange={handleChamberChange}
        minButtonWidth={118}
        className="nexus-shell-segmented--compactLane"
      />

      <div className="nexus-resources-mission-strip" aria-label="Resources chamber orientation">
        <div className="nexus-resources-mission-strip__lead">
          <span className="nexus-resources-mission-strip__eyebrow">
            Active chamber
          </span>
          <strong>{activeChamberLabel}</strong>
          <p>{activeViewSpec.introSummary}</p>
        </div>
        <div className="nexus-resources-mission-strip__signals" aria-label="Resources quick status">
          <span>
            <span>View</span>
            <strong>{activeViewSpec.introTitle}</strong>
          </span>
          <span>
            <span>Support</span>
            <strong>{activeViewSpec.introDetail}</strong>
          </span>
          <span>
            <span>Stack</span>
            <strong>{stackCountLabel}</strong>
          </span>
        </div>
        {howThisHelpsSpec ? (
          <details className="nexus-resources-mission-strip__detail">
            <summary>{howThisHelpsSpec.title}</summary>
            <div className="nexus-resources-mission-strip__detailBody">
              <p>{howThisHelpsSpec.summary}</p>
              <div className="nexus-resources-mission-strip__coverage">
                {categorySignals.map((signal) => (
                  <span key={signal.category}>
                    <strong>{signal.count}</strong>
                    <span>{signal.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </details>
        ) : null}
      </div>

      <div className="nexus-surface-chamber-shell">
        <div className="nexus-surface-chamber-shell__body">
          <OpsRail className={`nexus-surface-chamber-shell__support nexus-ops-rail--sticky ${resourcesLayout.railClass}`}>
            <OpsField title={introSpec.title} detail={introSpec.detail} tone="muted" compact className="nexus-resources-support-field">
              <div className="nexus-resources-support-summary">
                <p>{activeViewSpec.introSummary}</p>
                <div className="nexus-shell-actions">
                  <ShellBadge tone="accent">{activeViewSpec.introTitle}</ShellBadge>
                  <ShellBadge tone="muted">{activeViewSpec.introDetail}</ShellBadge>
                </div>
              </div>
            </OpsField>

            {chamberIntegrationHighlights.length ? (
              <OpsField title={stackSpec.title} detail={stackSpec.detail} tone="muted" compact>
                <div className="nexus-resources-rail-preview" aria-label="External stack preview">
                  <span>{stackCountLabel}</span>
                  <span>{activeChamberLabel}</span>
                </div>
                <details
                  className="nexus-surface-disclosure"
                  open={stackExpanded}
                  onToggle={(event) => setStackExpanded(event.currentTarget.open)}
                >
                  <summary>Open external stack</summary>
                  <div className="nexus-surface-disclosure__body">
                    <div className="nexus-shell-copy nexus-shell-copy--compact">
                      <p>
                        These upstream projects map cleanly onto the current chamber, so
                        we can absorb their runtime, memory, browser-ops, or skill ideas
                        without breaking the Satellite Ops workplane.
                      </p>
                    </div>
                    <div className="nexus-resources-external-stack">
                      {chamberIntegrationHighlights.map((resource) => (
                        <a
                          key={resource.href}
                          href={resource.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nexus-shell-resource-card"
                        >
                          <div className="nexus-shell-resource-card__meta">
                            <span className="nexus-shell-resource-card__chip">
                              {DEVELOPER_RESOURCE_CATEGORIES[resource.category]}
                            </span>
                            {resource.integrationFit ? (
                              <span className="nexus-shell-resource-card__chip">
                                {DEVELOPER_RESOURCE_FIT_LABELS[resource.integrationFit]}
                              </span>
                            ) : null}
                            <span className="nexus-shell-resource-card__external">
                              External ↗
                            </span>
                          </div>
                          <div className="nexus-shell-resource-card__title">
                            {resource.title}
                          </div>
                          <p className="nexus-shell-resource-card__description">
                            {resource.description}
                          </p>
                          {resource.note ? (
                            <p className="nexus-shell-resource-card__note">{resource.note}</p>
                          ) : null}
                        </a>
                      ))}
                    </div>
                  </div>
                </details>
              </OpsField>
            ) : null}

            <OpsField
              title="Operator readiness"
              detail="Security, capability, and browser posture"
              tone="muted"
              compact
            >
              <div className="nexus-resources-rail-preview" aria-label="Operator readiness preview">
                <span>Secrets local</span>
                <span>Governed</span>
                <span>Browser-aware</span>
              </div>
              <details
                className="nexus-surface-disclosure"
                open={readinessExpanded}
                onToggle={(event) =>
                  setReadinessExpanded(event.currentTarget.open)
                }
              >
                <summary>Open readiness detail</summary>
                <div className="nexus-surface-disclosure__body">
                  <OperatorReadinessLane
                    surfaceId="resources"
                    detail="Use this rail to confirm secret hygiene, governance posture, browser readiness, memory strength, and capability coverage before opening external workflows."
                  />
                </div>
              </details>
            </OpsField>
          </OpsRail>

          <OpsWorkplane className={`nexus-surface-chamber-shell__lead ${resourcesLayout.workplaneClass}`}>
            <OpsField title={panelSpec.title} detail={panelSpec.detail}>
              <div className="nexus-surface-subtabs">
                {chamber === "start" ? (
                  <ShellSegmentedTabs
                    items={START_VIEWS}
                    active={activeView as Extract<View, "manual" | "playbooks" | "specs">}
                    onChange={handleSubviewChange}
                    minButtonWidth={110}
                  />
                ) : null}
                {chamber === "system" ? (
                  <ShellSegmentedTabs
                    items={SYSTEM_VIEWS}
                    active={activeView as Extract<View, "surfaces" | "system">}
                    onChange={handleSubviewChange}
                    minButtonWidth={120}
                  />
                ) : null}
                {chamber === "utilities" ? (
                  <ShellSegmentedTabs
                    items={UTILITY_VIEWS}
                    active={activeView as Extract<View, "registry" | "kits">}
                    onChange={handleSubviewChange}
                    minButtonWidth={110}
                  />
                ) : null}
                {chamber === "launch" ? (
                  <ShellSegmentedTabs
                    items={LAUNCH_VIEWS}
                    active={activeView as Extract<View, "impact" | "voice-lab">}
                    onChange={handleSubviewChange}
                    minButtonWidth={110}
                  />
                ) : null}

                {renderPanelContent(activeView, {
                  prefillFile: normalizedParams.get("file"),
                  projectId: normalizedParams.get("voiceProject"),
                  impactMode:
                    (normalizedParams.get("impactMode") as
                      | "blast"
                      | "graph"
                      | "ownership"
                      | "hotspots"
                      | "security"
                      | null) ?? "blast",
                })}
              </div>
            </OpsField>
          </OpsWorkplane>
        </div>
      </div>
    </ShellStack>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { SectionLabel, ShellBadge, ShellSegmentedTabs } from "@/components/ui/shell";
import { SurfaceCallout, SurfaceEmpty } from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import {
  formatArtifactParserHintLabel,
  formatArtifactTypeLabel,
  type ArtifactClassification,
} from "@/lib/artifactClassification";
import { getImpactRepairSession } from "@/lib/impactRepairSessions";
import type {
  ProjectGraphResult,
  ProjectHotspotResult,
  ProjectOwnershipResult,
  ProjectSecurityResult,
} from "@/lib/projectArchitecture";
import type { ProjectImpactResult } from "@/lib/projectImpact";

export type ImpactConsoleMode =
  | "blast"
  | "graph"
  | "ownership"
  | "hotspots"
  | "security";

const DEFAULT_FILE = "components/home/office/OfficeCommandCenter.tsx";
const IMPACT_EXAMPLES = [
  "components/home/office/OfficeCommandCenter.tsx",
  "components/ui/CronSchedulerPanel.tsx",
  "app/vault/page.tsx",
  "components/resources/ResourcesWorkbench.tsx",
] as const;

const MODE_LABELS: Array<{ id: ImpactConsoleMode; label: string }> = [
  { id: "blast", label: "Blast radius" },
  { id: "graph", label: "Graph" },
  { id: "ownership", label: "Ownership" },
  { id: "hotspots", label: "Hotspots" },
  { id: "security", label: "Security" },
];

const SECTION_BY_MODE: Record<ImpactConsoleMode, string> = {
  blast: "impact",
  graph: "graph",
  ownership: "ownership",
  hotspots: "hotspots",
  security: "security",
};

function compactButtonStyle(active = false) {
  return {
    padding: "8px 10px",
    borderRadius: "999px",
    border: active ? "1px solid rgba(120, 196, 255, 0.55)" : "1px solid var(--border)",
    background: active ? "rgba(56, 122, 255, 0.18)" : "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "11px",
    cursor: "pointer",
  } as const;
}

function cardStyle() {
  return {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(10, 15, 30, 0.62)",
  } as const;
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "Project analysis is temporarily unavailable.";
  } catch {
    return "Project analysis is temporarily unavailable.";
  }
}

function formatIsoTime(value: string | null | undefined) {
  if (!value) return "Unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function renderArtifactBadges(classification: ArtifactClassification) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
      <ShellBadge
        tone={
          classification.sensitivity === "restricted"
            ? "accent"
            : classification.sensitivity === "internal"
              ? "muted"
              : "success"
        }
      >
        {formatArtifactTypeLabel(classification.artifactType)}
      </ShellBadge>
      <ShellBadge tone="muted">
        {formatArtifactParserHintLabel(classification.parserHint)}
      </ShellBadge>
      <ShellBadge tone="muted">{classification.sensitivity}</ShellBadge>
    </div>
  );
}

export default function ProjectImpactConsole({
  prefillFile,
  initialMode = "blast",
}: {
  prefillFile?: string | null;
  initialMode?: ImpactConsoleMode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(DEFAULT_FILE);
  const [mode, setMode] = useState<ImpactConsoleMode>(initialMode);
  const [impact, setImpact] = useState<ProjectImpactResult | null>(null);
  const [graph, setGraph] = useState<ProjectGraphResult | null>(null);
  const [ownership, setOwnership] = useState<ProjectOwnershipResult | null>(null);
  const [hotspots, setHotspots] = useState<ProjectHotspotResult | null>(null);
  const [security, setSecurity] = useState<ProjectSecurityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [treeFiles, setTreeFiles] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);
  const routedPrefillRef = useRef("");
  const mountedDefaultRef = useRef(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await apiFetch("/api/project?section=tree", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { tree?: string[] };
        if (!active) return;
        setTreeFiles(
          (payload.tree ?? []).filter((entry) =>
            /\.(ts|tsx|js|jsx)$/i.test(entry),
          ),
        );
      } catch {
        // Suggestions are non-critical.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const runAnalysis = useCallback(
    async (target = deferredQuery.trim(), nextMode = mode) => {
      if (!target) {
        setLoadError("Choose a repo-relative file path before running analysis.");
        return;
      }

      setLoading(true);
      try {
        const response = await apiFetch(
          `/api/project?section=${SECTION_BY_MODE[nextMode]}&file=${encodeURIComponent(target)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          setLoadError(await readErrorMessage(response));
          return;
        }
        const payload = (await response.json()) as {
          impact?: ProjectImpactResult;
          graph?: ProjectGraphResult;
          ownership?: ProjectOwnershipResult;
          hotspots?: ProjectHotspotResult;
          security?: ProjectSecurityResult;
        };
        setQuery(target);
        setLoadError("");
        if (payload.impact) setImpact(payload.impact);
        if (payload.graph) setGraph(payload.graph);
        if (payload.ownership) setOwnership(payload.ownership);
        if (payload.hotspots) setHotspots(payload.hotspots);
        if (payload.security) setSecurity(payload.security);
      } catch {
        setLoadError("Project analysis is temporarily unavailable right now.");
      } finally {
        setLoading(false);
      }
    },
    [deferredQuery, mode],
  );

  useEffect(() => {
    if (mountedDefaultRef.current) return;
    mountedDefaultRef.current = true;
    void runAnalysis(DEFAULT_FILE, initialMode);
  }, [initialMode, runAnalysis]);

  useEffect(() => {
    const nextPrefill = (prefillFile ?? "").trim();
    if (!nextPrefill || routedPrefillRef.current === nextPrefill) return;
    routedPrefillRef.current = nextPrefill;
    setQuery(nextPrefill);
    void runAnalysis(nextPrefill, mode);
  }, [mode, prefillFile, runAnalysis]);

  const suggestedMatches = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    if (!term) return treeFiles.slice(0, 40);
    return treeFiles
      .filter((entry) => entry.toLowerCase().includes(term))
      .slice(0, 40);
  }, [deferredQuery, treeFiles]);

  const repairSessions = useMemo(() => {
    const targetPath =
      impact?.target ??
      graph?.target ??
      security?.target ??
      ownership?.owners[0]?.path ??
      hotspots?.hotspots[0]?.path ??
      null;
    const seen = new Set<string>();
    const sessions: Array<{ href: string; label: string; detail: string; context: string }> = [];
    const reviewPack =
      impact?.reviewPack ??
      graph?.reviewPack ??
      (targetPath ? [targetPath] : []);
    for (const path of reviewPack) {
      const session = getImpactRepairSession(path);
      if (!session || seen.has(session.href)) continue;
      seen.add(session.href);
      sessions.push({
        href: session.href,
        label: session.label,
        detail: session.detail,
        context: `From ${path}`,
      });
      if (sessions.length >= 6) break;
    }
    return sessions;
  }, [graph, hotspots?.hotspots, impact, ownership?.owners, security]);

  const activeSummary = useMemo(() => {
    if (mode === "blast" && impact) {
      return {
        title: impact.target,
        badges: [
          `${impact.stats.directImports} imports`,
          `${impact.stats.importers} importers`,
          `${impact.stats.likelyTouched} likely touched`,
        ],
      };
    }
    if (mode === "graph" && graph) {
      return {
        title: graph.target ?? "Whole-repo graph",
        badges: [
          `${graph.stats.edgeCount} edges`,
          `${graph.stats.cycleCount} cycles`,
          `${graph.highCouplingFiles.length} high coupling`,
        ],
      };
    }
    if (mode === "ownership" && ownership) {
      return {
        title: "Recent ownership",
        badges: [
          `${ownership.owners.length} files`,
          `${ownership.recentAuthors.length} authors`,
        ],
      };
    }
    if (mode === "hotspots" && hotspots) {
      return {
        title: "Repo hotspots",
        badges: [`${hotspots.hotspots.length} ranked files`],
      };
    }
    if (mode === "security" && security) {
      return {
        title: security.target ?? "Local security scan",
        badges: [
          `${security.stats.findingCount} findings`,
          `${security.stats.highSeverityCount} high severity`,
          `${security.highCouplingFiles.length} coupling risks`,
        ],
      };
    }
    return null;
  }, [graph, hotspots, impact, mode, ownership, security]);

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="⌁"
        title="Local-first architecture intelligence"
        description="Impact now expands into one bounded workbench: blast radius, dependency graph, ownership, hotspots, and security heuristics stay local to the repo and do not upload code anywhere."
      />

      <div style={{ display: "grid", gap: "10px" }}>
        <label style={{ display: "grid", gap: "6px" }}>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Repo-relative file path
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: "10px",
            }}
          >
            <input
              list="project-impact-files"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="components/home/office/OfficeCommandCenter.tsx"
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surf2)",
                color: "var(--text)",
              }}
            />
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={loading}
              style={compactButtonStyle(loading)}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </label>
        <datalist id="project-impact-files">
          {suggestedMatches.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
        <ShellSegmentedTabs
          items={MODE_LABELS}
          active={mode}
          onChange={(nextMode) => {
            setMode(nextMode);
            const params = new URLSearchParams(window.location.search);
            params.set("view", "impact");
            params.set("impactMode", nextMode);
            if (query.trim()) params.set("file", query.trim());
            router.replace(`/resources?${params.toString()}`);
            void runAnalysis(query.trim(), nextMode);
          }}
          minButtonWidth={110}
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {IMPACT_EXAMPLES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => {
                setQuery(entry);
                void runAnalysis(entry, mode);
              }}
              style={compactButtonStyle(query === entry)}
            >
              {entry.split("/").slice(-2).join("/")}
            </button>
          ))}
          {query.trim() ? (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/cyber?view=vuln-review&focus=cyber-vuln-review&target=${encodeURIComponent(
                    query.trim(),
                  )}`,
                )
              }
              style={compactButtonStyle(mode === "security")}
            >
              Open defensive review
            </button>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="↺"
          title="Analysis route unavailable"
          description={loadError}
        />
      ) : null}

      {activeSummary ? (
        <div style={{ ...cardStyle(), display: "grid", gap: "10px" }}>
          <div style={{ display: "grid", gap: "6px" }}>
            <SectionLabel detail={`${mode} mode`}>Current analysis</SectionLabel>
            <div style={{ fontSize: "12px", color: "var(--text2)", wordBreak: "break-word" }}>
              {activeSummary.title}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {activeSummary.badges.map((badge) => (
              <ShellBadge key={badge} tone="muted">
                {badge}
              </ShellBadge>
            ))}
          </div>
          {repairSessions.length > 0 ? (
            <ActionSessionCluster
              items={repairSessions}
              onOpen={(href) => router.push(href)}
              buttonStyle={compactButtonStyle()}
              maxPrimaryItems={1}
              showPrimaryCards={false}
            />
          ) : null}
        </div>
      ) : null}

      {mode === "blast" ? (
        impact ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={`${impact.directImports.length} files`}>Direct imports</SectionLabel>
              {impact.directImports.length ? (
                impact.directImports.map((path) => (
                  <div key={path} style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {path}
                  </div>
                ))
              ) : (
                <SurfaceEmpty title="No direct imports" description="Leaf modules or entry files can legitimately have no local imports." />
              )}
            </div>
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={`${impact.importers.length} files`}>Importers</SectionLabel>
              {impact.importers.length ? (
                impact.importers.map((path) => (
                  <div key={path} style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {path}
                  </div>
                ))
              ) : (
                <SurfaceEmpty title="No importers" description="Entry points, dynamic loads, and isolated helpers can be importer-free." />
              )}
            </div>
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={`${impact.reviewPack.length} likely reads`}>Review pack</SectionLabel>
              {impact.reviewPack.map((path) => (
                <div key={path} style={{ fontSize: "12px", color: "var(--text2)" }}>
                  {path}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <SurfaceEmpty
            title="Run a blast-radius check"
            description="Choose a repo-relative file path, then use Impact to open the likely touched repair lane before editing."
          />
        )
      ) : null}

      {mode === "graph" ? (
        graph ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={`${graph.nodes.length} ranked nodes`}>High-coupling files</SectionLabel>
              {graph.nodes.slice(0, 10).map((node) => (
                <div key={node.path} style={{ fontSize: "12px", color: "var(--text2)" }}>
                  <div>
                    {node.path}
                    <span style={{ color: "var(--text3)" }}> · coupling {node.coupling}</span>
                  </div>
                  {renderArtifactBadges(node.artifactClassification)}
                </div>
              ))}
            </div>
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={`${graph.circularDependencies.length} cycles`}>Circular dependencies</SectionLabel>
              {graph.circularDependencies.length ? (
                graph.circularDependencies.slice(0, 6).map((cycle, index) => (
                  <div key={`${cycle.join("->")}-${index}`} style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {cycle.join(" -> ")}
                  </div>
                ))
              ) : (
                <SurfaceEmpty title="No local cycles detected" description="The current import graph did not surface any circular dependency loops." />
              )}
            </div>
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={`${graph.isolatedFiles.length} isolated`}>Isolated files</SectionLabel>
              {graph.isolatedFiles.length ? (
                graph.isolatedFiles.slice(0, 10).map((path) => (
                  <div key={path} style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {path}
                  </div>
                ))
              ) : (
                <SurfaceEmpty title="No isolated files" description="Every scanned source file participates in at least one local import edge." />
              )}
            </div>
          </div>
        ) : (
          <SurfaceEmpty title="Run the graph scan" description="Graph mode ranks local coupling, circular dependencies, and isolation before a refactor spreads." />
        )
      ) : null}

      {mode === "ownership" ? (
        ownership ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={ownership.detail}>Likely owners</SectionLabel>
              {ownership.owners.slice(0, 10).map((entry) => (
                <div key={entry.path} style={{ display: "grid", gap: "2px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry.path}</div>
                  <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                    {entry.lastAuthor} · {formatIsoTime(entry.lastTouchedAt)} · {entry.changeCount} changes
                  </div>
                  {renderArtifactBadges(entry.artifactClassification)}
                </div>
              ))}
            </div>
            <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
              <SectionLabel detail={`${ownership.recentAuthors.length} authors`}>Recent activity</SectionLabel>
              {ownership.recentAuthors.map((entry) => (
                <div key={entry.author} style={{ fontSize: "12px", color: "var(--text2)" }}>
                  {entry.author}
                  <span style={{ color: "var(--text3)" }}> · {entry.count} commits</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <SurfaceEmpty title="Run the ownership pass" description="Ownership mode keeps recent editors and change history close to the current review pack." />
        )
      ) : null}

      {mode === "hotspots" ? (
        hotspots ? (
          <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
            <SectionLabel detail={hotspots.detail}>Hotspot ranking</SectionLabel>
            {hotspots.hotspots.map((entry) => (
              <div key={entry.path} style={{ display: "grid", gap: "2px" }}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  {entry.path}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text3)" }}>
                  score {entry.hotspotScore} · coupling {entry.coupling} · {entry.changeCount} changes · {formatIsoTime(entry.lastTouchedAt)}
                </div>
                {renderArtifactBadges(entry.artifactClassification)}
              </div>
            ))}
          </div>
        ) : (
          <SurfaceEmpty title="Run the hotspot pass" description="Hotspots combine coupling with recent activity so the riskiest files surface early." />
        )
      ) : null}

      {mode === "security" ? (
        security ? (
          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
                <SectionLabel detail={`${security.findings.length} findings`}>Security heuristics</SectionLabel>
                {security.findings.length ? (
                  security.findings.map((finding) => (
                    <div key={finding.id} style={{ display: "grid", gap: "2px" }}>
                      <div style={{ fontSize: "12px", color: "var(--text)" }}>
                        {finding.label}
                        <span style={{ color: "var(--text3)" }}> · {finding.severity}</span>
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text3)" }}>{finding.path}</div>
                      {renderArtifactBadges(finding.artifactClassification)}
                      <div style={{ fontSize: "11px", color: "var(--text2)" }}>{finding.detail}</div>
                    </div>
                  ))
                ) : (
                  <SurfaceEmpty title="No heuristic findings" description="The current local scan did not hit any of the bounded secret or sink patterns." />
                )}
              </div>
              <div style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
                <SectionLabel detail={`${security.circularDependencies.length} cycles`}>Structural risks</SectionLabel>
                {security.circularDependencies.slice(0, 4).map((cycle, index) => (
                  <div key={`${cycle.join("->")}-${index}`} style={{ fontSize: "12px", color: "var(--text2)" }}>
                    {cycle.join(" -> ")}
                  </div>
                ))}
                {security.highCouplingFiles.slice(0, 6).map((path) => (
                  <div key={path} style={{ fontSize: "12px", color: "var(--text2)" }}>
                    High coupling: {path}
                  </div>
                ))}
                {security.isolatedFiles.slice(0, 6).map((path) => (
                  <div key={path} style={{ fontSize: "12px", color: "var(--text2)" }}>
                    Isolated: {path}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <SurfaceEmpty title="Run the security pass" description="Security mode scans for hardcoded secrets, dynamic execution sinks, HTML injection, and shell-composition risks." />
        )
      ) : null}
    </div>
  );
}

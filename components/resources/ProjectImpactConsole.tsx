"use client";

import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ActionSessionCluster from "@/components/ui/ActionSessionCluster";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout, SurfaceEmpty } from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import { getImpactRepairSession } from "@/lib/impactRepairSessions";

type ProjectImpactBlastRadius = "narrow" | "moderate" | "wide";
type ProjectImpactReason = "target" | "depends_on" | "depended_on_by";

interface ProjectImpactPath {
  path: string;
  reasons: ProjectImpactReason[];
}

interface ProjectImpactResult {
  target: string;
  directImports: string[];
  importers: string[];
  likelyTouched: ProjectImpactPath[];
  reviewPack: string[];
  blastRadius: ProjectImpactBlastRadius;
  warnings: string[];
  stats: {
    scannedFiles: number;
    directImports: number;
    importers: number;
    likelyTouched: number;
  };
}

const DEFAULT_FILE = "components/home/office/OfficeCommandCenter.tsx";
const IMPACT_EXAMPLES = [
  "components/home/office/OfficeCommandCenter.tsx",
  "components/ui/CronSchedulerPanel.tsx",
  "app/vault/page.tsx",
  "components/resources/ResourcesWorkbench.tsx",
] as const;

const BLAST_RADIUS_LABELS: Record<ProjectImpactBlastRadius, string> = {
  narrow: "Narrow",
  moderate: "Moderate",
  wide: "Wide",
};

const BLAST_RADIUS_TONES: Record<
  ProjectImpactBlastRadius,
  "success" | "accent" | "default"
> = {
  narrow: "success",
  moderate: "accent",
  wide: "default",
};

const REASON_LABELS: Record<ProjectImpactReason, string> = {
  target: "Target",
  depends_on: "Depends on",
  depended_on_by: "Imported by",
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
    return payload.error || "Project impact is temporarily unavailable.";
  } catch {
    return "Project impact is temporarily unavailable.";
  }
}

export default function ProjectImpactConsole({
  prefillFile,
}: {
  prefillFile?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(DEFAULT_FILE);
  const [impact, setImpact] = useState<ProjectImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [copyStatus, setCopyStatus] = useState<"" | "copied" | "failed">("");
  const [treeFiles, setTreeFiles] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);
  const routedPrefillRef = useRef("");
  const mountedDefaultRef = useRef(false);

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
        // Suggestion loading is non-critical.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const runImpact = useCallback(
    async (target = deferredQuery.trim()) => {
      if (!target) {
        setLoadError("Choose a repo-relative file path before running impact analysis.");
        return;
      }

      setLoading(true);
      setCopyStatus("");
      try {
        const response = await apiFetch(
          `/api/project?section=impact&file=${encodeURIComponent(target)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          setLoadError(await readErrorMessage(response));
          return;
        }
        const payload = (await response.json()) as { impact?: ProjectImpactResult };
        if (!payload.impact) {
          setLoadError("Project impact returned no usable result.");
          return;
        }
        setImpact(payload.impact);
        setQuery(payload.impact.target);
        setLoadError("");
      } catch {
        setLoadError(
          impact
            ? "Project impact is temporarily unavailable. Retained local results stay visible until the route recovers."
            : "Project impact is temporarily unavailable right now.",
        );
      } finally {
        setLoading(false);
      }
    },
    [deferredQuery, impact],
  );

  useEffect(() => {
    if (mountedDefaultRef.current) return;
    mountedDefaultRef.current = true;
    void runImpact(DEFAULT_FILE);
  }, [runImpact]);

  useEffect(() => {
    const nextPrefill = (prefillFile ?? "").trim();
    if (!nextPrefill || routedPrefillRef.current === nextPrefill) return;
    routedPrefillRef.current = nextPrefill;
    setQuery(nextPrefill);
    void runImpact(nextPrefill);
  }, [prefillFile, runImpact]);

  const suggestedMatches = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    if (!term) return treeFiles.slice(0, 40);
    return treeFiles
      .filter((entry) => entry.toLowerCase().includes(term))
      .slice(0, 40);
  }, [deferredQuery, treeFiles]);

  const repairSessions = useMemo(() => {
    if (!impact) return [];
    const seen = new Set<string>();
    const sessions: Array<{
      href: string;
      label: string;
      detail: string;
      context: string;
    }> = [];
    for (const path of [impact.target, ...impact.reviewPack]) {
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
  }, [impact]);

  const handleCopyReviewPack = async () => {
    if (!impact || typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("failed");
      return;
    }

    const lines = [
      `Target: ${impact.target}`,
      `Blast radius: ${BLAST_RADIUS_LABELS[impact.blastRadius]}`,
      `Direct imports: ${impact.stats.directImports}`,
      `Importers: ${impact.stats.importers}`,
      "",
      "Likely touched files:",
      ...impact.reviewPack.map((path) => `- ${path}`),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="⌁"
        title="Approximate local blast radius"
        description="This is a fast import-based helper for review planning. It traces local imports and importers only, stays cheap and local, and now points to the most relevant repair session when a known exact panel already exists."
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
              onClick={() => void runImpact()}
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
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {IMPACT_EXAMPLES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => {
                setQuery(entry);
                void runImpact(entry);
              }}
              style={compactButtonStyle(query === entry)}
            >
              {entry.split("/").slice(-2).join("/")}
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="↺"
          title={impact ? "Showing retained impact results" : "Impact route unavailable"}
          description={loadError}
        />
      ) : null}

      {impact ? (
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ ...cardStyle(), display: "grid", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: "6px" }}>
                <SectionLabel detail={`${impact.stats.scannedFiles} source files`}>
                  Project impact
                </SectionLabel>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text2)",
                    wordBreak: "break-word",
                  }}
                >
                  {impact.target}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <ShellBadge tone={BLAST_RADIUS_TONES[impact.blastRadius]}>
                  {BLAST_RADIUS_LABELS[impact.blastRadius]}
                </ShellBadge>
                <ShellBadge tone="muted">
                  {impact.stats.directImports} imports
                </ShellBadge>
                <ShellBadge tone="muted">
                  {impact.stats.importers} importers
                </ShellBadge>
                <ShellBadge tone="muted">
                  {impact.stats.likelyTouched} likely touched
                </ShellBadge>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleCopyReviewPack}
                style={compactButtonStyle()}
              >
                Copy review pack
              </button>
              {copyStatus === "copied" ? (
                <ShellBadge tone="success">Copied</ShellBadge>
              ) : null}
              {copyStatus === "failed" ? (
                <ShellBadge tone="default">Copy failed</ShellBadge>
              ) : null}
            </div>
            {repairSessions.length > 0 ? (
              <div style={{ display: "grid", gap: "10px" }}>
                <SectionLabel detail={`${repairSessions.length} likely repair sessions`}>
                  Open the right repair next
                </SectionLabel>
                <ActionSessionCluster
                  items={repairSessions}
                  onOpen={(href) => router.push(href)}
                  buttonStyle={compactButtonStyle()}
                  maxPrimaryItems={1}
                  showPrimaryCards={false}
                />
              </div>
            ) : null}
          </div>

          {impact.warnings.length > 0 ? (
            <SurfaceCallout
              tone="warning"
              compact
              icon="!"
              title="Heuristic gaps to keep in mind"
              description={impact.warnings.join(" ")}
            />
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gap: "10px" }}>
              <SectionLabel detail={`${impact.directImports.length} files`}>
                Direct imports
              </SectionLabel>
              {impact.directImports.length > 0 ? (
                impact.directImports.map((path) => (
                  <article key={path} style={cardStyle()}>
                    <div style={{ fontSize: "12px", color: "var(--text)" }}>{path}</div>
                  </article>
                ))
              ) : (
                <SurfaceEmpty
                  compact
                  icon="·"
                  title="No direct local imports"
                  description="This file currently looks like a leaf or route entry."
                />
              )}
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <SectionLabel detail={`${impact.importers.length} files`}>
                Imported by
              </SectionLabel>
              {impact.importers.length > 0 ? (
                impact.importers.map((path) => (
                  <article key={path} style={cardStyle()}>
                    <div style={{ fontSize: "12px", color: "var(--text)" }}>{path}</div>
                  </article>
                ))
              ) : (
                <SurfaceEmpty
                  compact
                  icon="·"
                  title="No local importers"
                  description="This may be an entry surface, dynamic import, or isolated helper."
                />
              )}
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <SectionLabel detail={`${impact.likelyTouched.length} files`}>
                Likely touched
              </SectionLabel>
              {impact.likelyTouched.map((entry) => (
                <article key={entry.path} style={{ ...cardStyle(), display: "grid", gap: "8px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text)" }}>{entry.path}</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {entry.reasons.map((reason) => (
                      <ShellBadge
                        key={`${entry.path}-${reason}`}
                        tone={reason === "target" ? "accent" : "muted"}
                      >
                        {REASON_LABELS[reason]}
                      </ShellBadge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <SurfaceEmpty
          icon="⌁"
          title="Run a file impact check"
          description="Choose a repo-relative file and Nexus will estimate its local blast radius from imports and importers."
        />
      )}
    </div>
  );
}

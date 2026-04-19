"use client";

import { useEffect, useState } from "react";
import {
  SurfaceCallout,
  SurfaceEmpty,
  SurfaceSkeletonRows,
} from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";

interface MemoryAdapterStatusResponse {
  id: string;
  label: string;
  provider: string;
  mode: "native" | "loopback_sidecar";
  state: "default" | "disabled" | "not_configured" | "ready" | "degraded" | "rejected";
  default: boolean;
  enabled: boolean;
  available: boolean;
  localOnly: boolean;
  freeFirst: boolean;
  queryOnly: boolean;
  corpusSync: "none";
  featureFlag: string | null;
  endpoint: string | null;
  reason: string;
}

interface MemoryStatsResponse {
  syncedAt: string | null;
  syncAgeMinutes: number | null;
  total: number;
  latestUpdatedAt: number | null;
  countsByLayer: {
    raw: number;
    knowledge: number;
    output: number;
  };
  countsByDomain: Record<string, number>;
  countsByVisibility: {
    safe: number;
    internal: number;
    restricted: number;
  };
  lifecycle: {
    headline: string;
    detail: string;
    promotedCount: number;
    promotionReadyCount: number;
    compactionBacklog: number;
    citationReadyCount: number;
    reopenReadyCount: number;
    sensitiveHoldCount: number;
    freshnessLabel: string;
    nextMove: string;
  };
  preview: Array<{
    id: string;
    title: string;
    kind: string;
    layer: "raw" | "knowledge" | "output";
    visibility: "safe" | "internal" | "restricted";
    citationId: string | null;
    lifecycle:
      | "compaction_candidate"
      | "durable_note"
      | "reopen_candidate"
      | "sensitive_hold"
      | null;
    nextAction: "promote" | "compact" | "reopen" | "review" | "reference" | null;
    timestamp: number;
  }>;
  localOnly: boolean;
  freeFirst: boolean;
  productPolicy: string;
  withheldRestrictedCount: number;
  persistence: {
    raw: string;
    knowledge: string;
    output: string;
  };
  adapters: {
    defaultAdapterId: string;
    evaluationMode: "query_only_no_sync";
    restrictedSyncPolicy: "never_send_restricted_artifacts";
    native: MemoryAdapterStatusResponse;
    sidecar: MemoryAdapterStatusResponse;
  };
}

function formatSyncAge(value: number | null) {
  if (value === null) return "No sync yet";
  if (value < 1) return "Fresh";
  if (value < 60) return `${value}m ago`;
  const hours = Math.round(value / 60);
  return `${hours}h ago`;
}

function formatAdapterState(adapter: MemoryAdapterStatusResponse) {
  switch (adapter.state) {
    case "default":
      return "Default";
    case "disabled":
      return "Disabled";
    case "not_configured":
      return "Needs config";
    case "ready":
      return "Ready";
    case "degraded":
      return "Degraded";
    case "rejected":
      return "Rejected";
    default:
      return adapter.state;
  }
}

export default function MemorySpineStatusCard() {
  const [stats, setStats] = useState<MemoryStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/memory/stats");
      if (!res.ok) throw new Error("Failed to load memory stats.");
      const data = (await res.json()) as MemoryStatsResponse;
      setStats(data);
      setLoadError("");
    } catch {
      setLoadError(
        "Memory Spine stats are temporarily unavailable. Retained local posture stays visible until the route recovers.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surf2)] p-3 text-xs">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-[var(--text2)] hover:text-[var(--text)]"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="font-mono font-semibold tracking-wider">
          MEMORY SPINE
        </span>
        <div className="flex items-center gap-2">
          {stats ? (
            <span className="text-[9px] text-[var(--text3)]">
              {stats.total} items
            </span>
          ) : null}
          <span>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="mt-3 flex flex-col gap-3">
          {loading && !stats ? <SurfaceSkeletonRows rows={3} height={18} /> : null}

          {loadError ? (
            <SurfaceCallout
              tone="warning"
              compact
              icon="↺"
              title={stats ? "Showing retained memory posture" : "Memory stats unavailable"}
              description={loadError}
            />
          ) : null}

          {!loading && (!stats || stats.total === 0) ? (
            <SurfaceEmpty
              icon="Archive"
              title="No durable memory snapshot yet"
              description="VAULT clips, agent learnings, and mission outputs will sync into a local-only memory spine automatically as you use the app."
              compact
            />
          ) : null}

          {stats ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Raw</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.countsByLayer.raw}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Knowledge</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.countsByLayer.knowledge}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Outputs</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.countsByLayer.output}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Sync age</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {formatSyncAge(stats.syncAgeMinutes)}
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    {stats.lifecycle.freshnessLabel}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-3">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Safe</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.countsByVisibility.safe}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Internal</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.countsByVisibility.internal}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Restricted</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.withheldRestrictedCount}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Promote</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.lifecycle.promotionReadyCount}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Compaction</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.lifecycle.compactionBacklog}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Citations</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.lifecycle.citationReadyCount}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Reopen</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.lifecycle.reopenReadyCount}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] px-2 py-1.5 text-[10px] text-[var(--text2)]">
                {stats.lifecycle.headline}. {stats.lifecycle.detail} {stats.lifecycle.nextMove}
              </div>

              <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-2">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Posture</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {stats.localOnly ? "Local only" : "Remote"}
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    {stats.freeFirst ? stats.productPolicy : "Policy drift"}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Persistence</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    Raw {stats.persistence.raw}
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    Knowledge {stats.persistence.knowledge} · Output {stats.persistence.output}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-2">
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Native adapter</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {formatAdapterState(stats.adapters.native)}
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    {stats.adapters.native.reason}
                  </div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-2 py-1.5">
                  <div className="text-[var(--text3)]">Opt-in sidecar</div>
                  <div className="mt-1 font-mono text-[var(--text)]">
                    {formatAdapterState(stats.adapters.sidecar)}
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    {stats.adapters.sidecar.provider}
                    {stats.adapters.sidecar.endpoint
                      ? ` · ${stats.adapters.sidecar.endpoint}`
                      : ""}
                  </div>
                  <div className="mt-1 text-[var(--text3)]">
                    {stats.adapters.sidecar.reason}
                  </div>
                </div>
              </div>

              {stats.withheldRestrictedCount > 0 ? (
                <div className="rounded-md border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] px-2 py-1.5 text-[10px] text-[var(--text2)]">
                  Restricted artifacts are counted for readiness, but their details are withheld from shared memory surfaces and broad search results.
                </div>
              ) : null}

              {stats.preview.length ? (
                <details className="nexus-surface-disclosure">
                  <summary>Lifecycle preview</summary>
                  <div className="nexus-surface-disclosure__body">
                    <div className="grid gap-2">
                      {stats.preview.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border border-[var(--border)] bg-[var(--surf)] px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-mono text-[11px] text-[var(--text)]">
                              {item.title}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.citationId ? (
                                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] text-[var(--text2)]">
                                  {item.citationId}
                                </span>
                              ) : null}
                              {item.nextAction ? (
                                <span className="rounded-full border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] px-2 py-0.5 text-[9px] text-[var(--text2)]">
                                  {item.nextAction}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-1 text-[10px] text-[var(--text3)]">
                            {item.layer} · {item.kind} · {item.visibility}
                            {item.lifecycle ? ` · ${item.lifecycle.replace(/_/g, " ")}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ) : null}

              <div className="rounded-md border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.08)] px-2 py-1.5 text-[10px] text-[var(--text2)]">
                Native memory stays the default. Any sidecar remains loopback-only, query-only, and opt-in, with no automatic artifact sync out of Nexus.
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[9px] text-[var(--text3)]">
                  {stats.syncedAt
                    ? `Last synced ${new Date(stats.syncedAt).toLocaleTimeString()}`
                    : "Awaiting first local sync"}
                </span>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="rounded bg-[var(--surf3)] px-2 py-0.5 font-mono text-[10px] text-[var(--text2)] hover:text-[var(--text)] disabled:opacity-50"
                >
                  {loading ? "..." : "Refresh"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import type {
  CapabilityAssuranceContract,
  CapabilityAssuranceSnapshot,
  CapabilityLearningProposal,
  CapabilityOutcomeReceipt,
  CapabilityReadinessState,
} from "@/lib/capabilityAssurance";
import type { AssistantCapabilityId } from "@/lib/governanceCatalog";
import { timeAgo } from "@/lib/helpers";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";

interface CapabilityAssurancePayload {
  ok: true;
  available: true;
  generatedAt: number;
  contracts: CapabilityAssuranceContract[];
  snapshots: CapabilityAssuranceSnapshot[];
  recentReceipts: CapabilityOutcomeReceipt[];
  proposals: CapabilityLearningProposal[];
}

interface CapabilityAssurancePanelProps {
  title?: string;
  detail?: string;
  initialCapabilityId?: AssistantCapabilityId;
  compact?: boolean;
}

function readinessCalloutTone(state: CapabilityReadinessState) {
  if (state === "ready") return "success" as const;
  if (state === "degraded" || state === "unavailable") {
    return "warning" as const;
  }
  if (state === "approval_required") return "warning" as const;
  if (state === "retained") return "info" as const;
  return "default" as const;
}

function readinessBadgeTone(state: CapabilityReadinessState) {
  if (state === "ready") return "success" as const;
  if (state === "approval_required" || state === "retained") {
    return "accent" as const;
  }
  return "muted" as const;
}

function readinessLabel(state: CapabilityReadinessState) {
  return state.replaceAll("_", " ");
}

function cardStyle() {
  return {
    display: "grid",
    gap: "8px",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--surface-raised, var(--surf2))",
  } as const;
}

function percentage(value: number | null) {
  return value === null ? "No evidence" : `${value}%`;
}

function duration(value: number | null) {
  if (value === null) return "Unknown";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)} s`;
}

export default function CapabilityAssurancePanel({
  title = "Capability assurance",
  detail = "Verified outcomes, honest readiness, approved reinforcement, and the strongest safe next action.",
  initialCapabilityId = "conversation-general",
  compact = false,
}: CapabilityAssurancePanelProps) {
  const router = useRouter();
  const requestId = useRef(0);
  const [payload, setPayload] = useState<CapabilityAssurancePayload | null>(
    null,
  );
  const [selectedId, setSelectedId] =
    useState<AssistantCapabilityId>(initialCapabilityId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiFetch("/api/capability-assurance", {
        signal,
        cache: "no-store",
      });
      const body = (await response.json()) as
        | CapabilityAssurancePayload
        | { error?: string; available?: boolean };
      if (!response.ok || body.available !== true || !("contracts" in body)) {
        throw new Error(
          ("error" in body ? body.error : undefined) ??
            "Capability assurance evidence is unavailable.",
        );
      }
      if (id !== requestId.current || signal?.aborted) return;
      setPayload(body);
    } catch (error) {
      if (signal?.aborted || id !== requestId.current) return;
      setLoadError(
        error instanceof Error
          ? error.message
          : "Capability assurance evidence is unavailable.",
      );
    } finally {
      if (id === requestId.current && !signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (
      !payload ||
      payload.contracts.some((entry) => entry.capabilityId === selectedId)
    ) {
      return;
    }
    setSelectedId(payload.contracts[0]?.capabilityId ?? initialCapabilityId);
  }, [initialCapabilityId, payload, selectedId]);

  const selectedContract = useMemo(
    () =>
      payload?.contracts.find((entry) => entry.capabilityId === selectedId) ??
      null,
    [payload, selectedId],
  );
  const selectedSnapshot = useMemo(
    () =>
      payload?.snapshots.find((entry) => entry.capabilityId === selectedId) ??
      null,
    [payload, selectedId],
  );
  const selectedProposals = useMemo(
    () =>
      payload?.proposals.filter((entry) => entry.capabilityId === selectedId) ??
      [],
    [payload, selectedId],
  );
  const stateCounts = useMemo(() => {
    const counts: Partial<Record<CapabilityReadinessState, number>> = {};
    for (const snapshot of payload?.snapshots ?? []) {
      counts[snapshot.readiness] = (counts[snapshot.readiness] ?? 0) + 1;
    }
    return counts;
  }, [payload]);

  const review = useCallback(
    async (proposalId: string, decision: "approve" | "reject") => {
      setReviewingId(proposalId);
      setReviewError(null);
      try {
        const response = await apiFetch("/api/capability-assurance", {
          method: "POST",
          body: JSON.stringify({
            action: "review_learning",
            proposalId,
            decision,
          }),
        });
        const body = (await response.json()) as {
          ok?: boolean;
          error?: string;
        };
        if (!response.ok || body.ok !== true) {
          throw new Error(body.error ?? "Capability learning review failed.");
        }
        await load();
      } catch (error) {
        setReviewError(
          error instanceof Error
            ? error.message
            : "Capability learning review failed.",
        );
      } finally {
        setReviewingId(null);
      }
    },
    [load],
  );

  if (loading && !payload) {
    return (
      <SurfaceCallout
        role="status"
        tone="info"
        compact
        icon="◎"
        title={title}
        description="Loading capability contracts and verified outcome evidence…"
      />
    );
  }

  if (!payload || !selectedContract || !selectedSnapshot) {
    return (
      <SurfaceCallout
        role="alert"
        tone="warning"
        compact
        icon="↺"
        title="Capability assurance unavailable"
        description={
          loadError ??
          "No verified capability contract payload is available. Readiness is unknown."
        }
      >
        <ShellButton onClick={() => void load()} disabled={loading}>
          {loading ? "Retrying…" : "Retry"}
        </ShellButton>
      </SurfaceCallout>
    );
  }

  return (
    <div style={{ display: "grid", gap: compact ? "10px" : "14px" }}>
      <SurfaceCallout
        tone={readinessCalloutTone(selectedSnapshot.readiness)}
        compact
        icon="◎"
        title={title}
        description={`${detail} ${selectedSnapshot.readinessReason}`}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <ShellBadge tone="success">Ready {stateCounts.ready ?? 0}</ShellBadge>
          <ShellBadge tone="accent">
            Retained {stateCounts.retained ?? 0}
          </ShellBadge>
          <ShellBadge tone="muted">
            Degraded{" "}
            {(stateCounts.degraded ?? 0) + (stateCounts.unavailable ?? 0)}
          </ShellBadge>
          <ShellBadge tone="accent">
            Approval {stateCounts.approval_required ?? 0}
          </ShellBadge>
          <ShellBadge tone="muted">
            Unverified {stateCounts.unverified ?? 0}
          </ShellBadge>
        </div>
      </SurfaceCallout>

      {loadError ? (
        <SurfaceCallout
          role="alert"
          tone="warning"
          compact
          icon="↺"
          title="Showing retained assurance evidence"
          description={`${loadError} Existing verified evidence remains visible and has not been replaced.`}
        >
          <ShellButton onClick={() => void load()} disabled={loading}>
            {loading ? "Retrying…" : "Retry refresh"}
          </ShellButton>
        </SurfaceCallout>
      ) : null}

      <div
        aria-label="Capability assurance contracts"
        style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
      >
        {payload.contracts.map((entry) => {
          const snapshot = payload.snapshots.find(
            (candidate) => candidate.capabilityId === entry.capabilityId,
          );
          const active = entry.capabilityId === selectedId;
          return (
            <button
              key={entry.capabilityId}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(entry.capabilityId)}
              style={{
                padding: "7px 10px",
                borderRadius: "999px",
                border: active
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
                background: active ? "var(--surface-active)" : "var(--surf2)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              {entry.capabilityId} · {snapshot?.readiness ?? "unverified"}
            </button>
          );
        })}
      </div>

      <div style={cardStyle()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <SectionLabel
            detail={`Contract v${selectedContract.contractVersion}`}
          >
            {selectedContract.capabilityId}
          </SectionLabel>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <ShellBadge tone={readinessBadgeTone(selectedSnapshot.readiness)}>
              {readinessLabel(selectedSnapshot.readiness)}
            </ShellBadge>
            <ShellBadge tone="accent">
              Score {selectedSnapshot.score}
            </ShellBadge>
            <ShellBadge
              tone={
                selectedSnapshot.efficiencyPosture === "efficient"
                  ? "success"
                  : "muted"
              }
            >
              {selectedSnapshot.efficiencyPosture}
            </ShellBadge>
          </div>
        </div>
        <p className="nexus-shell-copy nexus-shell-copy--compact">
          {selectedContract.summary}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "8px",
          }}
        >
          {[
            ["Verified runs", String(selectedSnapshot.verifiedRuns)],
            ["Success rate", percentage(selectedSnapshot.successRate)],
            ["Average duration", duration(selectedSnapshot.averageDurationMs)],
            [
              "Average context",
              selectedSnapshot.averageContextChars === null
                ? "Unknown"
                : `${selectedSnapshot.averageContextChars.toLocaleString()} chars`,
            ],
            [
              "Last proof",
              selectedSnapshot.lastVerifiedAt
                ? timeAgo(
                    new Date(selectedSnapshot.lastVerifiedAt).toISOString(),
                  )
                : "Never verified",
            ],
            [
              "Learning",
              `${selectedSnapshot.approvedLearningCount} approved · ${selectedSnapshot.proposedLearningCount} proposed`,
            ],
          ].map(([label, value]) => (
            <div key={label} style={cardStyle()}>
              <span className="nexus-shell-kicker">{label}</span>
              <strong style={{ color: "var(--text)", fontSize: "12px" }}>
                {value}
              </strong>
            </div>
          ))}
        </div>
        {selectedSnapshot.knownWeakness ? (
          <SurfaceCallout
            tone="warning"
            compact
            icon="!"
            title="Known weakness"
            description={selectedSnapshot.knownWeakness}
          />
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={{ display: "grid", gap: "8px" }}>
          <SectionLabel detail="Source, freshness, and failure semantics">
            Information products
          </SectionLabel>
          {selectedContract.information.map((entry) => (
            <article key={entry.id} style={cardStyle()}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <ShellBadge tone="accent">{entry.source}</ShellBadge>
                <ShellBadge tone="muted">{entry.freshness}</ShellBadge>
                <ShellBadge tone="muted">{entry.failureSemantics}</ShellBadge>
              </div>
              <strong style={{ color: "var(--text)", fontSize: "12px" }}>
                {entry.label}
              </strong>
              <span className="nexus-shell-copy nexus-shell-copy--compact">
                {entry.description}
              </span>
            </article>
          ))}
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          <SectionLabel detail="Effect, approval, verification, and recovery">
            Supported actions
          </SectionLabel>
          {selectedContract.actions.map((entry) => (
            <article key={entry.id} style={cardStyle()}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <ShellBadge tone="accent">{entry.mode}</ShellBadge>
                <ShellBadge tone="muted">{entry.riskTier}</ShellBadge>
                <ShellBadge tone={entry.approvalRequired ? "muted" : "success"}>
                  {entry.approvalRequired ? "approval required" : "direct"}
                </ShellBadge>
              </div>
              <strong style={{ color: "var(--text)", fontSize: "12px" }}>
                {entry.label}
              </strong>
              <span className="nexus-shell-copy nexus-shell-copy--compact">
                {entry.description}
              </span>
              <span className="nexus-shell-copy nexus-shell-copy--compact">
                <strong>Prerequisites:</strong>{" "}
                {entry.prerequisites.join(" · ")}
              </span>
              <span className="nexus-shell-copy nexus-shell-copy--compact">
                <strong>Expected:</strong> {entry.expectedEffect}
              </span>
              <span className="nexus-shell-copy nexus-shell-copy--compact">
                <strong>Verify:</strong> {entry.verification}
              </span>
              <span className="nexus-shell-copy nexus-shell-copy--compact">
                <strong>Recover:</strong> {entry.recovery}
              </span>
            </article>
          ))}
        </div>
      </div>

      <SurfaceCallout
        tone={
          selectedSnapshot.strongestNextAction.approvalRequired
            ? "warning"
            : "info"
        }
        compact
        icon="→"
        title={`Strongest safe next action · ${selectedSnapshot.strongestNextAction.label}`}
        description={`${selectedSnapshot.strongestNextAction.expectedEffect} ${
          selectedSnapshot.strongestNextAction.approvalRequired
            ? "Operator approval remains required."
            : "This is the lowest-risk ready path."
        }`}
      >
        <ShellButton
          onClick={() =>
            router.push(selectedSnapshot.strongestNextAction.route)
          }
        >
          Open safe path
        </ShellButton>
      </SurfaceCallout>

      <div style={{ display: "grid", gap: "8px" }}>
        <SectionLabel detail="Only evidence-linked proposals can be reviewed">
          Reinforcement queue
        </SectionLabel>
        {reviewError ? (
          <SurfaceCallout
            role="alert"
            tone="warning"
            compact
            icon="!"
            title="Learning review failed"
            description={reviewError}
          />
        ) : null}
        {selectedProposals.length === 0 ? (
          <SurfaceCallout
            tone="default"
            compact
            icon="○"
            title="No learning proposals"
            description="This is a verified empty queue, not proof that the capability is ready. Two matching current outcome receipts are required before Nexus proposes a reusable lesson."
          />
        ) : (
          selectedProposals.map((proposal) => (
            <article key={proposal.id} style={cardStyle()}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <ShellBadge
                  tone={
                    proposal.status === "approved"
                      ? "success"
                      : proposal.status === "rejected"
                        ? "muted"
                        : "accent"
                  }
                >
                  {proposal.status}
                </ShellBadge>
                <ShellBadge tone="muted">{proposal.failureCode}</ShellBadge>
                <ShellBadge tone="muted">
                  {proposal.evidenceReceiptIds.length} receipts
                </ShellBadge>
              </div>
              <strong style={{ color: "var(--text)", fontSize: "12px" }}>
                {proposal.lesson}
              </strong>
              {proposal.status === "proposed" ? (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <ShellButton
                    disabled={reviewingId !== null}
                    onClick={() => void review(proposal.id, "approve")}
                  >
                    {reviewingId === proposal.id ? "Reviewing…" : "Approve"}
                  </ShellButton>
                  <ShellButton
                    disabled={reviewingId !== null}
                    onClick={() => void review(proposal.id, "reject")}
                  >
                    Reject
                  </ShellButton>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

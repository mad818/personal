"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { buildCachedSystemPrompt } from "@/lib/ai";
import {
  buildNightShiftScheduledJobs,
  stagePreparedNightShift,
} from "@/lib/secondBrainNightShiftClient";
import type {
  NightShiftProposalEnvelope,
  NightShiftStatus,
} from "@/lib/secondBrainNightShiftContract";
import { useStore } from "@/store/useStore";
import {
  SectionLabel,
  ShellBadge,
  ShellButton,
  ShellStack,
} from "@/components/ui/shell";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "9px",
  padding: "9px 10px",
  background: "var(--surf)",
  color: "var(--text)",
  font: "inherit",
  lineHeight: 1.5,
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error || `Request failed (${response.status}).`);
  }
  return payload;
}

export default function SecondBrainNightShiftWorkbench() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const scheduledJobs = settings.scheduledJobs ?? [];
  const [status, setStatus] = useState<NightShiftStatus | null>(null);
  const [selected, setSelected] = useState<NightShiftProposalEnvelope | null>(null);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch("/api/second-brain/night-shift");
      setStatus(await readJson<NightShiftStatus>(response));
    } catch {
      setError("The private second-brain vault is unavailable.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The second-brain action failed.",
      );
    } finally {
      setBusy("");
    }
  };

  const capture = () =>
    runAction("capture", async () => {
      const response = await apiFetch("/api/second-brain/night-shift", {
        method: "POST",
        body: JSON.stringify({
          action: "capture",
          title,
          sourceUrl,
          text: captureText,
        }),
      });
      const result = await readJson<{ capture: { filename: string } }>(response);
      setTitle("");
      setSourceUrl("");
      setCaptureText("");
      setMessage(`Captured ${result.capture.filename} without summarizing it.`);
    });

  const stage = () =>
    runAction("stage", async () => {
      const result = await stagePreparedNightShift({
        baseSystemPrompt: buildCachedSystemPrompt(settings),
        singleFlightKey: `manual-night-shift:${Math.floor(Date.now() / 60_000)}`,
      });
      setMessage(result.summary);
      if (result.staged) await openProposal(result.staged.id);
    });

  const openProposal = async (proposalId: string) => {
    try {
      const response = await apiFetch(
        `/api/second-brain/night-shift?proposalId=${encodeURIComponent(proposalId)}`,
      );
      const result = await readJson<{ proposal: NightShiftProposalEnvelope }>(response);
      setSelected(result.proposal);
      setError("");
    } catch {
      setError("The pending proposal could not be opened.");
    }
  };

  const decide = (action: "approve" | "reject") => {
    if (!selected) return;
    void runAction(action, async () => {
      const response = await apiFetch("/api/second-brain/night-shift", {
        method: "POST",
        body: JSON.stringify({ action, proposalId: selected.id }),
      });
      if (action === "approve") {
        const result = await readJson<{
          promoted: { atoms: number; threads: number; briefings: number };
        }>(response);
        setMessage(
          `Promoted ${result.promoted.atoms} atoms, ${result.promoted.threads} thread revisions, and ${result.promoted.briefings} briefing.`,
        );
      } else {
        await readJson<{ rejected: { rejected: true } }>(response);
        setMessage("Proposal rejected and preserved in the desk archive.");
      }
      setSelected(null);
    });
  };

  const audit = () =>
    runAction("audit", async () => {
      const response = await apiFetch("/api/second-brain/night-shift", {
        method: "POST",
        body: JSON.stringify({ action: "audit" }),
      });
      const result = await readJson<{
        audit: { filename: string; findings: number; reportOnly: true };
      }>(response);
      setMessage(
        `Report-only audit wrote ${result.audit.filename} with ${result.audit.findings} finding(s).`,
      );
    });

  const installSchedules = () => {
    const templateIds = new Set(
      scheduledJobs.map((job) => job.templateId).filter(Boolean),
    );
    const additions = buildNightShiftScheduledJobs().filter(
      (job) => !templateIds.has(job.templateId),
    );
    if (additions.length === 0) {
      setMessage("Night shift and weekly audit schedules are already installed.");
      return;
    }
    updateSettings({ scheduledJobs: [...additions, ...scheduledJobs] });
    setMessage(
      `Installed ${additions.length} review-first schedule(s). They run only while Nexus is open.`,
    );
  };

  const installedScheduleCount = scheduledJobs.filter((job) =>
    job.templateId === "second-brain-night-shift" ||
    job.templateId === "second-brain-weekly-audit",
  ).length;

  return (
    <section
      data-testid="second-brain-night-shift-workbench"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: "14px",
        background: "var(--surf2)",
      }}
    >
      <ShellStack gap="14px">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <strong style={{ color: "var(--text)", fontSize: "13px" }}>
              Second Brain Night Shift
            </strong>
            <div style={{ color: "var(--text3)", fontSize: "10px", marginTop: "3px" }}>
              Private Markdown refinery · automatic desk work · human-gated knowledge
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <ShellBadge tone={status?.posture === "ready" ? "success" : "accent"}>
              {status?.posture ?? "Checking"}
            </ShellBadge>
            <ShellBadge tone="muted">Git ignored</ShellBadge>
            <ShellBadge tone="accent">Approval required</ShellBadge>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: "7px",
          }}
        >
          {[
            ["RAW", status?.counts.raw ?? 0],
            ["UNPROCESSED", status?.counts.unprocessed ?? 0],
            ["DESK", status?.counts.pendingProposals ?? 0],
            ["ATOMS", status?.counts.atoms ?? 0],
            ["THREADS", status?.counts.threads ?? 0],
            ["BRIEFINGS", status?.counts.briefings ?? 0],
          ].map(([label, count]) => (
            <div
              key={label}
              style={{
                border: "1px solid var(--border2)",
                borderRadius: "8px",
                padding: "8px 9px",
                background: "var(--surf)",
              }}
            >
              <div style={{ color: "var(--text3)", fontSize: "9px" }}>{label}</div>
              <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: 800 }}>
                {count}
              </div>
            </div>
          ))}
        </div>

        <details className="nexus-surface-disclosure">
          <summary>Capture raw material</summary>
          <div className="nexus-surface-disclosure__body">
            <div style={{ display: "grid", gap: "8px" }}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, 160))}
                placeholder="Capture title"
                style={fieldStyle}
              />
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value.slice(0, 2_048))}
                placeholder="Source URL (optional; never fetched automatically)"
                style={fieldStyle}
              />
              <textarea
                value={captureText}
                onChange={(event) => setCaptureText(event.target.value.slice(0, 24_000))}
                placeholder="Paste the thought, quote, article text, or rough note exactly as captured."
                rows={7}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <span style={{ color: "var(--text3)", fontSize: "10px" }}>
                  {captureText.length.toLocaleString()} / 24,000 characters
                </span>
                <ShellButton
                  onClick={() => void capture()}
                  disabled={Boolean(busy) || !captureText.trim()}
                >
                  {busy === "capture" ? "Capturing…" : "Add to raw inbox"}
                </ShellButton>
              </div>
            </div>
          </div>
        </details>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellButton
            onClick={() => void stage()}
            disabled={Boolean(busy) || !status?.counts.unprocessed}
          >
            {busy === "stage" ? "Preparing…" : "Prepare review proposal"}
          </ShellButton>
          <ShellButton onClick={() => void audit()} disabled={Boolean(busy)}>
            {busy === "audit" ? "Auditing…" : "Run report-only audit"}
          </ShellButton>
          <ShellButton onClick={installSchedules} disabled={Boolean(busy)}>
            {installedScheduleCount >= 2
              ? "Schedules installed"
              : "Install overnight schedules"}
          </ShellButton>
          <ShellButton onClick={() => void refresh()} disabled={Boolean(busy)}>
            Refresh
          </ShellButton>
        </div>
        <div style={{ color: "var(--text3)", fontSize: "10px", lineHeight: 1.5 }}>
          Live vault: <code>{status?.liveVaultPath ?? "data/second-brain"}</code>. The
          03:00 refinery stages proposals only. The Sunday 22:00 audit reports only.
          Scheduled work requires the Nexus desktop or web runtime to remain open.
        </div>

        {status?.pending.length ? (
          <div style={{ display: "grid", gap: "7px" }}>
            <SectionLabel detail="Nothing here is durable until you approve it">
              Pending desk proposals
            </SectionLabel>
            {status.pending.map((proposal) => (
              <div
                key={proposal.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  border: "1px solid var(--border2)",
                  borderRadius: "8px",
                  padding: "9px 10px",
                  background: "var(--surf)",
                }}
              >
                <div>
                  <div style={{ color: "var(--text2)", fontSize: "11px" }}>
                    {proposal.id}
                  </div>
                  <div style={{ color: "var(--text3)", fontSize: "10px" }}>
                    {proposal.atomCount} atoms · {proposal.threadCount} threads ·{" "}
                    {proposal.frictionCount} friction · {proposal.outcome}
                  </div>
                </div>
                <ShellButton onClick={() => void openProposal(proposal.id)}>
                  Review
                </ShellButton>
              </div>
            ))}
          </div>
        ) : null}

        {selected ? (
          <div
            style={{
              border: "1px solid var(--border2)",
              borderRadius: "9px",
              padding: "11px",
              background: "var(--surf)",
              display: "grid",
              gap: "9px",
            }}
          >
            <SectionLabel detail={`${selected.sources.length} immutable source file(s)`}>
              Review {selected.id}
            </SectionLabel>
            {selected.proposal.outcome === "blocked" ? (
              <div style={{ color: "var(--flo)", fontSize: "11px" }}>
                Blocked: {selected.proposal.blockReason}
              </div>
            ) : (
              <>
                {selected.proposal.atoms.map((atom) => (
                  <div key={atom.id} style={{ display: "grid", gap: "3px" }}>
                    <strong style={{ color: "var(--text2)", fontSize: "11px" }}>
                      {atom.title}
                    </strong>
                    <span style={{ color: "var(--text3)", fontSize: "10px" }}>
                      {atom.certainty} · {atom.sourceIds.length} source(s) ·{" "}
                      {atom.links.length} link(s) · {atom.friction.length} friction
                    </span>
                    <span style={{ color: "var(--text2)", fontSize: "11px", lineHeight: 1.5 }}>
                      {atom.claim}
                    </span>
                  </div>
                ))}
                <div style={{ color: "var(--text2)", fontSize: "11px", lineHeight: 1.5 }}>
                  Attention: {selected.proposal.briefing.attention || "No decision identified."}
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <ShellButton
                onClick={() => decide("approve")}
                disabled={Boolean(busy) || selected.proposal.outcome === "blocked"}
              >
                {busy === "approve" ? "Promoting…" : "Approve promotion"}
              </ShellButton>
              <ShellButton onClick={() => decide("reject")} disabled={Boolean(busy)}>
                {busy === "reject" ? "Archiving…" : "Reject proposal"}
              </ShellButton>
              <ShellButton onClick={() => setSelected(null)} disabled={Boolean(busy)}>
                Close review
              </ShellButton>
            </div>
          </div>
        ) : null}

        {message ? (
          <div role="status" style={{ color: "var(--green)", fontSize: "11px" }}>
            {message}
          </div>
        ) : null}
        {error ? (
          <div role="alert" style={{ color: "var(--flo)", fontSize: "11px" }}>
            {error}
          </div>
        ) : null}
      </ShellStack>
    </section>
  );
}

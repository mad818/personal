"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ShellBadge, ShellButton, SectionLabel } from "@/components/ui/shell";
import { InternalWorkbenchNotice } from "@/components/ui/InternalWorkbenchNotice";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import { useStore } from "@/store/useStore";
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowRun,
} from "@/lib/assimilation/types";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";

const NODE_TONE: Record<WorkflowNode["type"], string> = {
  source: "#4fd1c5",
  agent: "#60a5fa",
  transform: "#d6a56d",
  approval: "#f97316",
  scheduler: "#8b5cf6",
  sink: "#22c55e",
};

function nodeLabel(type: WorkflowNode["type"]) {
  return type.replace(/(^\w|-\w)/g, (chunk) => chunk.replace("-", "").toUpperCase());
}

async function loadJson<T>(url: string): Promise<T & { meta?: InternalWorkbenchMeta }> {
  const response = await apiFetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return (await response.json()) as T & { meta?: InternalWorkbenchMeta };
}

export default function WorkflowForge() {
  const missionJobs = useStore((s) => s.settings.scheduledJobs ?? []);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [workflowMeta, setWorkflowMeta] = useState<InternalWorkbenchMeta | null>(null);
  const [runMeta, setRunMeta] = useState<InternalWorkbenchMeta | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftApprovalMode, setDraftApprovalMode] =
    useState<WorkflowDefinition["approvalMode"]>("human_gate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadJson<{ workflows: WorkflowDefinition[] }>("/api/workflows"),
      loadJson<{ runs: WorkflowRun[] }>("/api/workflow-runs"),
    ])
      .then(([workflowPayload, runPayload]) => {
        if (!active) return;
        startTransition(() => {
          setWorkflows(workflowPayload.workflows);
          setRuns(runPayload.runs);
          setWorkflowMeta(workflowPayload.meta ?? null);
          setRunMeta(runPayload.meta ?? null);
          setSelectedId((current) => current || workflowPayload.workflows[0]?.id || "");
          setError("");
        });
      })
      .catch(() => {
        if (!active) return;
        setError(
          "Workflow Forge is temporarily unavailable. Retained templates and recent runs stay visible until the route recovers.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return workflows;
    return workflows.filter((workflow) =>
      [workflow.name, workflow.description, workflow.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [deferredSearch, workflows]);

  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selectedWorkflow) return;
    setDraftDescription(selectedWorkflow.description);
    setDraftApprovalMode(selectedWorkflow.approvalMode);
  }, [selectedWorkflow]);

  async function refreshRuns() {
    const runPayload = await loadJson<{ runs: WorkflowRun[] }>("/api/workflow-runs");
    setRuns(runPayload.runs);
    setRunMeta(runPayload.meta ?? null);
  }

  async function saveDraft() {
    if (!selectedWorkflow) return;
    setBusy(true);
    try {
      const response = await apiFetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedWorkflow,
          description: draftDescription.trim(),
          approvalMode: draftApprovalMode,
          version: selectedWorkflow.version + 1,
        } satisfies WorkflowDefinition),
      });
      if (!response.ok) throw new Error("Failed to save workflow.");
      const payload = (await response.json()) as {
        workflow: WorkflowDefinition;
        meta?: InternalWorkbenchMeta;
      };
      setWorkflowMeta(payload.meta ?? workflowMeta);
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === payload.workflow.id ? payload.workflow : workflow,
        ),
      );
      setError("");
    } catch {
      setError(
        "The workflow graph could not be saved. Existing templates were left untouched.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cloneTemplate() {
    if (!selectedWorkflow) return;
    const next: WorkflowDefinition = {
      ...selectedWorkflow,
      id: `${selectedWorkflow.id}-clone-${Date.now()}`,
      name: `${selectedWorkflow.name} Copy`,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    setBusy(true);
    try {
      const response = await apiFetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Failed to clone workflow.");
      const payload = (await response.json()) as {
        workflow: WorkflowDefinition;
        meta?: InternalWorkbenchMeta;
      };
      setWorkflowMeta(payload.meta ?? workflowMeta);
      setWorkflows((current) => [payload.workflow, ...current]);
      setSelectedId(payload.workflow.id);
      setError("");
    } catch {
      setError(
        "The workflow template could not be cloned. Existing templates were kept locally.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runWorkflow() {
    if (!selectedWorkflow) return;
    setBusy(true);
    try {
      const response = await apiFetch("/api/workflow-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: selectedWorkflow.id }),
      });
      if (!response.ok) throw new Error("Failed to start workflow run.");
      await refreshRuns();
      setError("");
    } catch {
      setError(
        "The workflow run did not start. Existing run history was preserved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportWorkflow() {
    if (!selectedWorkflow || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(JSON.stringify(selectedWorkflow, null, 2));
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(240px, 0.26fr) minmax(0, 0.48fr) minmax(260px, 0.26fr)",
        gap: "16px",
        alignItems: "start",
      }}
    >
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "14px",
          background: "rgba(7, 10, 18, 0.78)",
        }}
      >
        <SectionLabel detail={`${filtered.length} templates`}>Workflow Forge</SectionLabel>
        <InternalWorkbenchNotice meta={workflowMeta} compact />
        {error ? (
          <div style={{ marginTop: "10px" }}>
            <SurfaceCallout
              tone="warning"
              compact
              icon="↺"
              title="Workflow Forge degraded"
              description={error}
            />
          </div>
        ) : null}
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search forge templates"
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--surf2)",
            color: "var(--text)",
          }}
        />
        <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
          {filtered.map((workflow) => (
            <button
              key={workflow.id}
              type="button"
              onClick={() => setSelectedId(workflow.id)}
              style={{
                textAlign: "left",
                padding: "12px",
                borderRadius: "12px",
                border:
                  workflow.id === selectedWorkflow?.id
                    ? "1px solid rgba(214, 165, 109, 0.62)"
                    : "1px solid var(--border)",
                background:
                  workflow.id === selectedWorkflow?.id
                    ? "rgba(214, 165, 109, 0.09)"
                    : "rgba(10, 15, 30, 0.62)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <strong style={{ fontSize: "13px", color: "var(--text)" }}>
                  {workflow.name}
                </strong>
                <ShellBadge tone="muted">{workflow.theater}</ShellBadge>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "11px",
                  lineHeight: 1.55,
                  color: "var(--text2)",
                }}
              >
                {workflow.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "14px",
          background:
            "radial-gradient(circle at top, rgba(79, 110, 247, 0.14), transparent 48%), rgba(7, 10, 18, 0.8)",
        }}
      >
        <SectionLabel detail="Node lattice with human sanction points">
          Active graph
        </SectionLabel>
        {selectedWorkflow ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginTop: "8px",
              }}
            >
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>
                  {selectedWorkflow.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text2)" }}>
                  v{selectedWorkflow.version} · {selectedWorkflow.tags.join(" · ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <ShellBadge tone="accent">{selectedWorkflow.approvalMode}</ShellBadge>
                <ShellBadge tone="success">
                  {selectedWorkflow.nodes.length} nodes
                </ShellBadge>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${selectedWorkflow.nodes.length}, minmax(120px, 1fr))`,
                gap: "12px",
                marginTop: "18px",
                alignItems: "center",
              }}
            >
              {selectedWorkflow.nodes.map((node, index) => (
                <div
                  key={node.id}
                  style={{
                    position: "relative",
                    padding: "12px",
                    borderRadius: "14px",
                    border: `1px solid ${NODE_TONE[node.type]}55`,
                    background: "rgba(4, 8, 17, 0.86)",
                    minHeight: "140px",
                  }}
                >
                  {index < selectedWorkflow.nodes.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: "-12px",
                        width: "12px",
                        height: "1px",
                        background: "linear-gradient(to right, rgba(214, 165, 109, 0.55), rgba(214, 165, 109, 0.15))",
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: "10px",
                      color: NODE_TONE[node.type],
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {nodeLabel(node.type)}
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 800 }}>
                    {node.title}
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "11px",
                      lineHeight: 1.55,
                      color: "var(--text2)",
                    }}
                  >
                    {node.detail}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Mission summary
                </span>
                <textarea
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--surf2)",
                    color: "var(--text)",
                    resize: "vertical",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", maxWidth: "280px" }}>
                <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Approval mode
                </span>
                <select
                  value={draftApprovalMode}
                  onChange={(event) =>
                    setDraftApprovalMode(
                      event.target.value as WorkflowDefinition["approvalMode"],
                    )
                  }
                  style={{
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--surf2)",
                    color: "var(--text)",
                  }}
                >
                  <option value="human_gate">Human gate</option>
                  <option value="approve_on_write">Approve on write</option>
                  <option value="observe">Observe only</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
              <ShellButton onClick={() => void saveDraft()}>{busy ? "Saving..." : "Save graph"}</ShellButton>
              <ShellButton onClick={() => void cloneTemplate()}>Clone template</ShellButton>
              <ShellButton onClick={() => void runWorkflow()}>
                {busy ? "Running..." : "Run workflow"}
              </ShellButton>
              <ShellButton onClick={() => void exportWorkflow()}>Copy JSON</ShellButton>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text3)" }}>No workflow template available yet.</p>
        )}
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "14px",
          background: "rgba(7, 10, 18, 0.78)",
        }}
      >
        <SectionLabel detail="Mission Foundry linkage">Recent runs</SectionLabel>
        <InternalWorkbenchNotice meta={runMeta} compact />
        <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
          {runs.slice(0, 4).map((run) => (
            <div
              key={run.id}
              style={{
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "rgba(10, 15, 30, 0.62)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <strong style={{ fontSize: "12px" }}>{run.workflowName}</strong>
                <ShellBadge tone={run.status === "completed" ? "success" : "muted"}>
                  {run.status}
                </ShellBadge>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                {run.summary}
              </p>
            </div>
          ))}
        </div>

        <SectionLabel detail={`${missionJobs.length} scheduled missions`} >
          Mission Foundry
        </SectionLabel>
        <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
          {missionJobs.slice(0, 4).map((job) => (
            <div
              key={job.id}
              style={{
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "rgba(10, 15, 30, 0.62)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <strong style={{ fontSize: "12px" }}>{job.name}</strong>
                <ShellBadge tone={job.enabled ? "accent" : "muted"}>
                  {job.outputTarget ?? "none"}
                </ShellBadge>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.5 }}>
                {job.prompt}
              </p>
            </div>
          ))}
          {!missionJobs.length && (
            <p style={{ margin: 0, color: "var(--text3)", fontSize: "12px", lineHeight: 1.6 }}>
              Scheduler recipes will appear here as Mission Foundry links once they are armed in Auto Orders.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

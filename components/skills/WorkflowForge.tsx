"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import DataLoadingState from "@/components/ui/DataLoadingState";
import { ShellBadge, ShellButton, SectionLabel } from "@/components/ui/shell";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { toast } from "@/components/ui/Toast";
import { useStore } from "@/store/useStore";
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowRun,
} from "@/lib/assimilation/types";
import {
  analyzeScheduledJobs,
  getScheduledMissionReviewSummary,
} from "@/lib/schedulerGovernance";

const NODE_TONE: Record<WorkflowNode["type"], string> = {
  source: "#4fd1c5",
  agent: "#60a5fa",
  transform: "#d6a56d",
  approval: "#f97316",
  scheduler: "#8b5cf6",
  sink: "#22c55e",
};

type WorkflowAction = "save" | "clone" | "run" | "copy";

function nodeLabel(type: WorkflowNode["type"]) {
  return type.replace(/(^\w|-\w)/g, (chunk) =>
    chunk.replace("-", "").toUpperCase(),
  );
}

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return (await response.json()) as T;
}

export default function WorkflowForge() {
  const missionJobs = useStore((s) =>
    (s.settings.scheduledJobs ?? []).filter(
      (job) => (job.type ?? "mission") === "mission",
    ),
  );
  const missionGovernance = useMemo(
    () => analyzeScheduledJobs(missionJobs),
    [missionJobs],
  );
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftApprovalMode, setDraftApprovalMode] =
    useState<WorkflowDefinition["approvalMode"]>("human_gate");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [retryToken, setRetryToken] = useState(0);
  const [busyAction, setBusyAction] = useState<WorkflowAction | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadState("loading");
      setWorkflows([]);
      setRuns([]);
      try {
        const [workflowPayload, runPayload] = await Promise.all([
          loadJson<{ workflows: WorkflowDefinition[] }>("/api/workflows"),
          loadJson<{ runs: WorkflowRun[] }>("/api/workflow-runs"),
        ]);
        if (!active) return;
        startTransition(() => {
          setWorkflows(workflowPayload.workflows);
          setRuns(runPayload.runs);
          setSelectedId((current) =>
            workflowPayload.workflows.some(
              (workflow) => workflow.id === current,
            )
              ? current
              : workflowPayload.workflows[0]?.id || "",
          );
          setLoadState("ready");
        });
      } catch {
        if (!active) return;
        setLoadState("error");
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [retryToken]);

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
    workflows.find((workflow) => workflow.id === selectedId) ??
    filtered[0] ??
    null;

  useEffect(() => {
    if (!selectedWorkflow) return;
    setDraftDescription(selectedWorkflow.description);
    setDraftApprovalMode(selectedWorkflow.approvalMode);
  }, [selectedWorkflow]);

  async function refreshRuns() {
    const runPayload = await loadJson<{ runs: WorkflowRun[] }>(
      "/api/workflow-runs",
    );
    setRuns(runPayload.runs);
  }

  async function saveDraft() {
    if (!selectedWorkflow) return;
    setBusyAction("save");
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedWorkflow,
          description: draftDescription.trim(),
          approvalMode: draftApprovalMode,
          version: selectedWorkflow.version + 1,
        } satisfies WorkflowDefinition),
      });
      if (!response.ok) throw new Error("Workflow save failed");
      const payload = (await response.json()) as {
        workflow: WorkflowDefinition;
      };
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === payload.workflow.id ? payload.workflow : workflow,
        ),
      );
      toast({
        title: "Workflow graph saved",
        message: `${payload.workflow.name} is now at version ${payload.workflow.version}.`,
        severity: "low",
      });
    } catch {
      toast({
        title: "Workflow graph not saved",
        message:
          "The protected workflow route rejected or could not complete the save.",
        severity: "high",
      });
    } finally {
      setBusyAction(null);
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
    setBusyAction("clone");
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Workflow clone failed");
      const payload = (await response.json()) as {
        workflow: WorkflowDefinition;
      };
      setWorkflows((current) => [payload.workflow, ...current]);
      setSelectedId(payload.workflow.id);
      toast({
        title: "Workflow template cloned",
        message: `${payload.workflow.name} is ready for local review.`,
        severity: "low",
      });
    } catch {
      toast({
        title: "Workflow template not cloned",
        message:
          "The protected workflow route rejected or could not create the copy.",
        severity: "high",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function runWorkflow() {
    if (!selectedWorkflow) return;
    setBusyAction("run");
    try {
      const response = await fetch("/api/workflow-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: selectedWorkflow.id }),
      });
      if (!response.ok) throw new Error("Workflow run failed");
      await refreshRuns();
      toast({
        title: "Workflow run staged",
        message: `${selectedWorkflow.name} completed through the reviewed local run route.`,
        severity: "low",
      });
    } catch {
      toast({
        title: "Workflow run failed",
        message:
          "The run was not recorded. Review route readiness and try again.",
        severity: "high",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function exportWorkflow() {
    if (!selectedWorkflow || typeof navigator === "undefined") return;
    setBusyAction("copy");
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(selectedWorkflow, null, 2),
      );
      toast({
        title: "Workflow JSON copied",
        message: `${selectedWorkflow.name} is on the clipboard.`,
        severity: "low",
      });
    } catch {
      toast({
        title: "Workflow JSON not copied",
        message:
          "Clipboard access was unavailable. Keep the workflow open and try again.",
        severity: "medium",
      });
    } finally {
      setBusyAction(null);
    }
  }

  if (loadState === "loading") {
    return (
      <DataLoadingState
        dataName="workflow templates and recent runs"
        height={260}
      />
    );
  }

  if (loadState === "error") {
    return (
      <SurfaceCallout
        tone="warning"
        role="alert"
        title="Workflow Forge unavailable"
        description="Templates and recent runs could not be loaded. Retry without leaving SKILLS."
      >
        <ShellButton onClick={() => setRetryToken((current) => current + 1)}>
          Retry workflow data
        </ShellButton>
      </SurfaceCallout>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(240px, 0.26fr) minmax(0, 0.48fr) minmax(260px, 0.26fr)",
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
        <SectionLabel detail={`${filtered.length} templates`}>
          Workflow Forge
        </SectionLabel>
        <input
          aria-label="Search workflow templates"
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
                  v{selectedWorkflow.version} ·{" "}
                  {selectedWorkflow.tags.join(" · ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <ShellBadge tone="accent">
                  {selectedWorkflow.approvalMode}
                </ShellBadge>
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
                        background:
                          "linear-gradient(to right, rgba(214, 165, 109, 0.55), rgba(214, 165, 109, 0.15))",
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
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
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
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
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
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
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

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "16px",
              }}
            >
              <ShellButton
                onClick={() => void saveDraft()}
                disabled={Boolean(busyAction)}
              >
                {busyAction === "save" ? "Saving…" : "Save graph"}
              </ShellButton>
              <ShellButton
                onClick={() => void cloneTemplate()}
                disabled={Boolean(busyAction)}
              >
                {busyAction === "clone" ? "Cloning…" : "Clone template"}
              </ShellButton>
              <ShellButton
                onClick={() => void runWorkflow()}
                disabled={Boolean(busyAction)}
              >
                {busyAction === "run" ? "Running…" : "Run workflow"}
              </ShellButton>
              <ShellButton
                onClick={() => void exportWorkflow()}
                disabled={Boolean(busyAction)}
              >
                {busyAction === "copy" ? "Copying…" : "Copy JSON"}
              </ShellButton>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text3)" }}>
            No workflow template available yet.
          </p>
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
        <SectionLabel detail="Mission Foundry linkage">
          Recent runs
        </SectionLabel>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <strong style={{ fontSize: "12px" }}>{run.workflowName}</strong>
                <ShellBadge
                  tone={run.status === "completed" ? "success" : "muted"}
                >
                  {run.status}
                </ShellBadge>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "11px",
                  color: "var(--text2)",
                  lineHeight: 1.55,
                }}
              >
                {run.summary}
              </p>
            </div>
          ))}
        </div>

        <SectionLabel detail={`${missionJobs.length} scheduled missions`}>
          Mission Foundry
        </SectionLabel>
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(10, 15, 30, 0.62)",
          }}
        >
          <div
            style={{ fontSize: "11px", fontWeight: 800, color: "var(--text)" }}
          >
            Reviewed mission posture
          </div>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "11px",
              color: "var(--text2)",
              lineHeight: 1.55,
            }}
          >
            {missionGovernance.missionJobs
              ? `${missionGovernance.missionReviewContractJobs}/${missionGovernance.missionJobs} mission jobs have a bounded review contract, ${missionGovernance.pendingMissionReviews} are waiting on operator review, and ${missionGovernance.expiredMissionReviews} have slipped past their review window.`
              : "No reviewed mission jobs are active yet. Arm one through the scheduler before treating overnight work as a governed lane."}
          </p>
        </div>
        <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
          {missionJobs.slice(0, 4).map((job) => {
            const missionReview = getScheduledMissionReviewSummary(job);
            return (
              <div
                key={job.id}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "rgba(10, 15, 30, 0.62)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <strong style={{ fontSize: "12px" }}>{job.name}</strong>
                  <div
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    <ShellBadge tone={job.enabled ? "accent" : "muted"}>
                      {job.outputTarget ?? "none"}
                    </ShellBadge>
                    {missionReview.required ? (
                      <ShellBadge
                        tone={
                          missionReview.status === "pending_review"
                            ? "accent"
                            : missionReview.status === "cleared"
                              ? "success"
                              : "muted"
                        }
                      >
                        {missionReview.status.replace(/_/g, " ")}
                      </ShellBadge>
                    ) : null}
                  </div>
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "11px",
                    color: "var(--text2)",
                    lineHeight: 1.5,
                  }}
                >
                  {job.prompt}
                </p>
                {missionReview.required ? (
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "11px",
                      color: "var(--text3)",
                      lineHeight: 1.55,
                    }}
                  >
                    {missionReview.scope ?? "Missing mission scope."}
                    {missionReview.reentrySummary
                      ? ` Re-entry: ${missionReview.reentrySummary}`
                      : " Re-entry summary missing."}
                  </p>
                ) : null}
              </div>
            );
          })}
          {!missionJobs.length && (
            <p
              style={{
                margin: 0,
                color: "var(--text3)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              Scheduler recipes will appear here as Mission Foundry links once
              they are armed in Auto Orders.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

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
import {
  buildLinearWorkflowEdges,
  moveWorkflowNode,
  moveWorkflowNodeTo,
  normalizeWorkflowNodeOrder,
  WORKFLOW_NODE_TYPES,
} from "@/lib/workflowDefinition";

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
  const [draftNodes, setDraftNodes] = useState<WorkflowNode[]>([]);
  const [draftEdges, setDraftEdges] = useState<WorkflowDefinition["edges"]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
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
    setDraftNodes(normalizeWorkflowNodeOrder(selectedWorkflow.nodes));
    setDraftEdges(selectedWorkflow.edges);
    setDraggingNodeId(null);
  }, [selectedWorkflow]);

  const draftWorkflow = useMemo<WorkflowDefinition | null>(
    () =>
      selectedWorkflow
        ? {
            ...selectedWorkflow,
            description: draftDescription.trim(),
            approvalMode: draftApprovalMode,
            nodes: draftNodes,
            edges: draftEdges,
          }
        : null,
    [
      draftApprovalMode,
      draftDescription,
      draftEdges,
      draftNodes,
      selectedWorkflow,
    ],
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedWorkflow || !draftWorkflow) return false;
    return (
      JSON.stringify({
        description: selectedWorkflow.description,
        approvalMode: selectedWorkflow.approvalMode,
        nodes: normalizeWorkflowNodeOrder(selectedWorkflow.nodes),
        edges: selectedWorkflow.edges,
      }) !==
      JSON.stringify({
        description: draftWorkflow.description,
        approvalMode: draftWorkflow.approvalMode,
        nodes: draftWorkflow.nodes,
        edges: draftWorkflow.edges,
      })
    );
  }, [draftWorkflow, selectedWorkflow]);

  function applyStructuralNodes(nodes: WorkflowNode[]) {
    const normalized = normalizeWorkflowNodeOrder(nodes);
    setDraftNodes(normalized);
    setDraftEdges(buildLinearWorkflowEdges(normalized));
  }

  function moveNode(nodeId: string, direction: -1 | 1) {
    const currentIndex = draftNodes.findIndex((node) => node.id === nodeId);
    if (currentIndex === -1) return;
    applyStructuralNodes(
      moveWorkflowNode(draftNodes, nodeId, currentIndex + direction),
    );
  }

  function moveNodeTo(nodeId: string, targetNodeId: string) {
    applyStructuralNodes(moveWorkflowNodeTo(draftNodes, nodeId, targetNodeId));
  }

  function updateNode(
    nodeId: string,
    update: Partial<Pick<WorkflowNode, "type" | "title" | "detail">>,
  ) {
    setDraftNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, ...update } : node,
      ),
    );
  }

  function uniqueNodeId(prefix: string) {
    const safePrefix =
      prefix
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+/, "")
        .slice(0, 70) || "draft-step";
    const base = `${safePrefix}-${Date.now().toString(36)}`;
    let candidate = base;
    let suffix = 1;
    while (draftNodes.some((node) => node.id === candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function addNode() {
    applyStructuralNodes([
      ...draftNodes,
      {
        id: uniqueNodeId("draft-step"),
        type: "transform",
        title: `Draft step ${draftNodes.length + 1}`,
        detail:
          "Define the evidence, transformation, review, or output contract for this step.",
        x: draftNodes.length,
        y: 0,
      },
    ]);
  }

  function duplicateNode(nodeId: string) {
    const sourceIndex = draftNodes.findIndex((node) => node.id === nodeId);
    if (sourceIndex === -1) return;
    const source = draftNodes[sourceIndex];
    const next = [...draftNodes];
    next.splice(sourceIndex + 1, 0, {
      ...source,
      id: uniqueNodeId(`${source.id}-copy`),
      title: `${source.title.slice(0, 95)} Copy`,
    });
    applyStructuralNodes(next);
  }

  function removeNode(nodeId: string) {
    if (draftNodes.length <= 1) return;
    const node = draftNodes.find((entry) => entry.id === nodeId);
    const isLastCampaignApproval =
      node?.type === "approval" &&
      selectedWorkflow?.tags.includes("campaign") &&
      draftApprovalMode === "human_gate" &&
      draftNodes.filter((entry) => entry.type === "approval").length === 1;
    if (isLastCampaignApproval) {
      toast({
        title: "Approval step retained",
        message:
          "A human-gated campaign draft must keep at least one approval step.",
        severity: "medium",
      });
      return;
    }
    applyStructuralNodes(draftNodes.filter((node) => node.id !== nodeId));
  }

  async function refreshRuns() {
    const runPayload = await loadJson<{ runs: WorkflowRun[] }>(
      "/api/workflow-runs",
    );
    setRuns(runPayload.runs);
  }

  async function saveDraft() {
    if (!selectedWorkflow || !draftWorkflow) return;
    setBusyAction("save");
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draftWorkflow,
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
    if (!selectedWorkflow || !draftWorkflow) return;
    const next: WorkflowDefinition = {
      ...draftWorkflow,
      id: `wf-clone-${Date.now().toString(36)}`,
      name: `${selectedWorkflow.name.slice(0, 115)} Copy`,
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
    if (!draftWorkflow || typeof navigator === "undefined") return;
    setBusyAction("copy");
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(draftWorkflow, null, 2),
      );
      toast({
        title: "Workflow JSON copied",
        message: `${draftWorkflow.name} is on the clipboard.`,
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
                <ShellBadge tone="accent">{draftApprovalMode}</ShellBadge>
                <ShellBadge tone="success">
                  {draftNodes.length} nodes
                </ShellBadge>
                {hasUnsavedChanges ? (
                  <ShellBadge tone="muted" role="status">
                    Unsaved draft
                  </ShellBadge>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: "14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "var(--text3)",
                  fontSize: "11px",
                  lineHeight: 1.55,
                }}
              >
                Drag a step handle or use its arrow controls. Structural edits
                rebuild the visible sequence; nothing runs until the graph is
                saved.
              </p>
              <ShellButton
                onClick={addNode}
                disabled={Boolean(busyAction) || draftNodes.length >= 24}
                title={
                  draftNodes.length >= 24
                    ? "Workflow graphs are limited to 24 steps"
                    : "Add a new editable draft step"
                }
              >
                Add step
              </ShellButton>
            </div>

            <div
              style={{
                display: "grid",
                gridAutoFlow: "column",
                gridAutoColumns: "minmax(220px, 1fr)",
                gap: "12px",
                marginTop: "12px",
                alignItems: "stretch",
                overflowX: "auto",
                paddingBottom: "8px",
              }}
            >
              {draftNodes.map((node, index) => {
                const locksApprovalType =
                  node.type === "approval" &&
                  selectedWorkflow.tags.includes("campaign") &&
                  draftApprovalMode === "human_gate" &&
                  draftNodes.filter((entry) => entry.type === "approval")
                    .length === 1;
                return (
                  <div
                    key={node.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId =
                        draggingNodeId ||
                        event.dataTransfer.getData("text/plain");
                      if (sourceId) moveNodeTo(sourceId, node.id);
                      setDraggingNodeId(null);
                    }}
                    style={{
                      position: "relative",
                      padding: "12px",
                      borderRadius: "14px",
                      border: `1px solid ${NODE_TONE[node.type]}55`,
                      background:
                        draggingNodeId === node.id
                          ? "rgba(79, 110, 247, 0.18)"
                          : "rgba(4, 8, 17, 0.86)",
                      minHeight: "270px",
                      display: "grid",
                      alignContent: "start",
                      gap: "10px",
                    }}
                  >
                    {index < draftNodes.length - 1 && (
                      <div
                        aria-hidden="true"
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
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <span
                        draggable
                        title="Drag to reorder"
                        onDragStart={(event) => {
                          setDraggingNodeId(node.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", node.id);
                        }}
                        onDragEnd={() => setDraggingNodeId(null)}
                        style={{
                          border: 0,
                          background: "transparent",
                          padding: 0,
                          color: NODE_TONE[node.type],
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          cursor: "grab",
                        }}
                      >
                        {nodeLabel(node.type)} · drag
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                        {index + 1}/{draftNodes.length}
                      </span>
                    </div>
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                        Type
                      </span>
                      <select
                        aria-label={`Type for ${node.title}`}
                        value={node.type}
                        onChange={(event) =>
                          updateNode(node.id, {
                            type: event.target.value as WorkflowNode["type"],
                          })
                        }
                        style={{
                          padding: "8px",
                          borderRadius: "9px",
                          border: "1px solid var(--border)",
                          background: "var(--surf2)",
                          color: "var(--text)",
                        }}
                      >
                        {WORKFLOW_NODE_TYPES.map((type) => (
                          <option
                            key={type}
                            value={type}
                            disabled={locksApprovalType && type !== "approval"}
                          >
                            {nodeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                        Step title
                      </span>
                      <input
                        aria-label={`Title for step ${index + 1}`}
                        value={node.title}
                        maxLength={100}
                        onChange={(event) =>
                          updateNode(node.id, { title: event.target.value })
                        }
                        style={{
                          padding: "8px",
                          borderRadius: "9px",
                          border: "1px solid var(--border)",
                          background: "var(--surf2)",
                          color: "var(--text)",
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: "5px" }}>
                      <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                        Step contract
                      </span>
                      <textarea
                        aria-label={`Contract for ${node.title}`}
                        value={node.detail}
                        rows={4}
                        maxLength={500}
                        onChange={(event) =>
                          updateNode(node.id, { detail: event.target.value })
                        }
                        style={{
                          padding: "8px",
                          borderRadius: "9px",
                          border: "1px solid var(--border)",
                          background: "var(--surf2)",
                          color: "var(--text)",
                          resize: "vertical",
                        }}
                      />
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        marginTop: "auto",
                      }}
                    >
                      <ShellButton
                        onClick={() => moveNode(node.id, -1)}
                        disabled={Boolean(busyAction) || index === 0}
                        title={`Move ${node.title} left`}
                      >
                        Move left
                      </ShellButton>
                      <ShellButton
                        onClick={() => moveNode(node.id, 1)}
                        disabled={
                          Boolean(busyAction) || index === draftNodes.length - 1
                        }
                        title={`Move ${node.title} right`}
                      >
                        Move right
                      </ShellButton>
                      <ShellButton
                        onClick={() => duplicateNode(node.id)}
                        disabled={
                          Boolean(busyAction) || draftNodes.length >= 24
                        }
                        title={`Duplicate ${node.title}`}
                      >
                        Duplicate
                      </ShellButton>
                      <ShellButton
                        onClick={() => removeNode(node.id)}
                        disabled={
                          Boolean(busyAction) ||
                          draftNodes.length <= 1 ||
                          locksApprovalType
                        }
                        title={
                          locksApprovalType
                            ? "Human-gated campaigns must keep an approval step"
                            : `Remove ${node.title}`
                        }
                      >
                        Remove
                      </ShellButton>
                    </div>
                  </div>
                );
              })}
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
                  maxLength={1200}
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
                  <option
                    value="human_gate"
                    disabled={
                      selectedWorkflow.tags.includes("campaign") &&
                      !draftNodes.some((node) => node.type === "approval")
                    }
                  >
                    Human gate
                  </option>
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
                disabled={Boolean(busyAction) || !hasUnsavedChanges}
                title={
                  hasUnsavedChanges
                    ? "Validate and save the current graph draft"
                    : "The graph matches its saved version"
                }
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
                disabled={Boolean(busyAction) || hasUnsavedChanges}
                title={
                  hasUnsavedChanges
                    ? "Save the current graph before staging a local run"
                    : "Stage a reviewed local workflow run"
                }
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

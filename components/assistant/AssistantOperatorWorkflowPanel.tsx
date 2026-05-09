"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AssistantOperatorWorkflowFocus,
  AssistantOperatorWorkflowState,
} from "@/lib/assistantOperatorWorkflow";

const SECTION_LABELS: Record<AssistantOperatorWorkflowFocus, string> = {
  task_plan: "Task plan",
  proposed_edits: "Proposed edits",
  change_log: "Change log",
  skill_invocations: "Skills/tools",
};

function statusTone(status: string) {
  if (status === "active" || status === "planned") return "#8ee6c8";
  if (status === "blocked") return "#f3c982";
  if (status === "done") return "#a9c7ff";
  return "#c6ced8";
}

export default function AssistantOperatorWorkflowPanel({
  workflow,
  focus,
  compact = false,
}: {
  workflow: AssistantOperatorWorkflowState;
  focus?: AssistantOperatorWorkflowFocus;
  compact?: boolean;
}) {
  const sections = useMemo(() => {
    const next: AssistantOperatorWorkflowFocus[] = ["task_plan"];
    if (workflow.proposedEdits.length) next.push("proposed_edits");
    if (workflow.changeLog.length) next.push("change_log");
    if (workflow.skillInvocations.length) next.push("skill_invocations");
    return next;
  }, [workflow.changeLog.length, workflow.proposedEdits.length, workflow.skillInvocations.length]);
  const [activeSection, setActiveSection] =
    useState<AssistantOperatorWorkflowFocus>(
      focus ?? workflow.defaultFocus,
    );

  useEffect(() => {
    setActiveSection(focus ?? workflow.defaultFocus);
  }, [focus, workflow.defaultFocus]);

  const safeActive = sections.includes(activeSection)
    ? activeSection
    : sections[0];

  return (
    <div
      data-testid="assistant-operator-workflow"
      style={{
        marginTop: compact ? "6px" : "10px",
        padding: compact ? "8px" : "12px",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        color: "var(--text, #f7fbff)",
      }}
    >
      <div
        data-testid="assistant-workflow-phase"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: compact ? "8px" : "10px",
              fontWeight: 900,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "#9fb0c1",
            }}
          >
            Operator workflow
          </div>
          <div
            style={{
              fontSize: compact ? "11px" : "13px",
              fontWeight: 800,
              marginTop: "2px",
            }}
          >
            {workflow.phaseLabel}
          </div>
        </div>
        <span
          style={{
            flexShrink: 0,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.14)",
            padding: "4px 8px",
            fontSize: compact ? "8px" : "10px",
            fontWeight: 900,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: workflow.reviewRequired ? "#f3c982" : "#8ee6c8",
            background: "rgba(0,0,0,0.24)",
          }}
        >
          {workflow.reviewRequired ? "Review required" : "No write gate"}
        </span>
      </div>

      <p
        style={{
          margin: "0 0 8px",
          fontSize: compact ? "10px" : "12px",
          lineHeight: 1.45,
          color: "var(--text2, #c6ced8)",
        }}
      >
        {workflow.summary}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "5px",
          marginBottom: "8px",
        }}
      >
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                safeActive === section
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(255,255,255,0.04)",
              color: safeActive === section ? "#ffffff" : "var(--text2, #c6ced8)",
              fontSize: compact ? "8px" : "10px",
              fontWeight: 800,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            {SECTION_LABELS[section]}
          </button>
        ))}
      </div>

      {safeActive === "task_plan" ? (
        <div data-testid="assistant-workflow-task-plan">
          {workflow.taskPlan.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr",
                gap: "8px",
                padding: "5px 0",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span
                style={{
                  color: statusTone(item.status),
                  fontSize: compact ? "8px" : "10px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                {item.status}
              </span>
              <span style={{ fontSize: compact ? "10px" : "12px", lineHeight: 1.4 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {safeActive === "proposed_edits" ? (
        <div data-testid="assistant-workflow-proposed-edits">
          {workflow.proposedEdits.map((edit) => (
            <div
              key={edit.id}
              style={{
                padding: "7px 0",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ fontSize: compact ? "10px" : "12px", fontWeight: 800 }}>
                {edit.label}
              </div>
              <div
                style={{
                  marginTop: "3px",
                  color: "var(--text2, #c6ced8)",
                  fontSize: compact ? "9px" : "11px",
                  lineHeight: 1.45,
                }}
              >
                Risk {edit.risk}. Diff state {edit.diffState}. Approval surface:{" "}
                {edit.approvalSurface}. Files: {edit.files.join(", ")}.
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {safeActive === "change_log" ? (
        <div data-testid="assistant-workflow-change-log">
          {workflow.changeLog.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: "6px 0",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ fontSize: compact ? "10px" : "12px", fontWeight: 800 }}>
                {entry.label}
              </div>
              <div
                style={{
                  marginTop: "2px",
                  color: "var(--text2, #c6ced8)",
                  fontSize: compact ? "9px" : "11px",
                }}
              >
                {entry.detail}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {safeActive === "skill_invocations" ? (
        <div data-testid="assistant-workflow-skill-invocations">
          {workflow.skillInvocations.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "78px 1fr",
                gap: "8px",
                padding: "5px 0",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span
                style={{
                  color: statusTone(item.status),
                  fontSize: compact ? "8px" : "10px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                {item.status}
              </span>
              <span style={{ fontSize: compact ? "10px" : "12px", lineHeight: 1.4 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import type { HQWorkflowCommandId } from "@/components/home/office/workflowCommands";

interface WorkflowCatalogButton {
  id: HQWorkflowCommandId;
  command: string;
  automationGuidance: string;
}

interface Props {
  workflowTopic: string;
  onWorkflowTopicChange: (value: string) => void;
  automationCandidateWorkflows: WorkflowCatalogButton[];
  reviewOnlyWorkflows: WorkflowCatalogButton[];
  onApplyWorkflowTemplate: (workflowId: HQWorkflowCommandId) => void;
}

export default function CronSchedulerWorkflowTemplatesSection({
  workflowTopic,
  onWorkflowTopicChange,
  automationCandidateWorkflows,
  reviewOnlyWorkflows,
  onApplyWorkflowTemplate,
}: Props) {
  return (
    <div
      style={{
        marginTop: 2,
        display: "grid",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #1A2040",
        background: "#080d18",
      }}
    >
      <CompactOperatorNote
        label="WORKFLOW MISSION TEMPLATES"
        tone="info"
        summary="Safe HQ workflows can prefill human-gated missions. Review-only flows stay manual unless an operator deliberately promotes them."
        detail="Use the topic override when you want the same workflow shell aimed at a specific subject, campaign, or incident before saving the mission."
      />
      <input
        value={workflowTopic}
        onChange={(e) => onWorkflowTopicChange(e.target.value)}
        placeholder="Optional workflow topic override for prefilled missions"
        style={{
          background: "#060b14",
          border: "1px solid #1A2040",
          borderRadius: 6,
          color: "#ccd6f6",
          padding: "7px 10px",
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {automationCandidateWorkflows.map((workflow) => (
          <button
            key={workflow.id}
            type="button"
            onClick={() => onApplyWorkflowTemplate(workflow.id)}
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.28)",
              color: "#86efac",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 10,
              cursor: "pointer",
            }}
            title={workflow.automationGuidance}
          >
            {workflow.command}
          </button>
        ))}
      </div>
      {reviewOnlyWorkflows.length > 0 ? (
        <CompactOperatorNote
          label="REVIEW-ONLY WORKFLOWS"
          tone="caution"
          summary="These workflows stay manual by default because the review boundary matters more than one-click scheduling."
          detail="Hover a chip for the stored automation rationale when you need the longer explanation."
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {reviewOnlyWorkflows.map((workflow) => (
              <span
                key={workflow.id}
                title={workflow.automationGuidance}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 26,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(245,158,11,.24)",
                  background: "rgba(245,158,11,.08)",
                  color: "#fef3c7",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                }}
              >
                {workflow.command}
              </span>
            ))}
          </div>
        </CompactOperatorNote>
      ) : null}
    </div>
  );
}

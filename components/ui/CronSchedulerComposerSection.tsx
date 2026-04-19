"use client";

import type { ScheduledJob } from "@/store/useStore";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import CronSchedulerWorkflowTemplatesSection from "@/components/ui/CronSchedulerWorkflowTemplatesSection";
import type { HQWorkflowCatalogItem, HQWorkflowCommandId } from "@/components/home/office/workflowCommands";
import { MISSION_TEMPLATES, PRESET_CRONS } from "@/components/ui/cronSchedulerPanelUtils";

interface CronSchedulerComposerSectionProps {
  name: string;
  prompt: string;
  cron: string;
  jobType: ScheduledJob["type"];
  outputTarget: NonNullable<ScheduledJob["outputTarget"]>;
  approvalPolicy: NonNullable<ScheduledJob["approvalPolicy"]>;
  missionAgent: string;
  workflowTopic: string;
  error: string;
  automationCandidateWorkflows: HQWorkflowCatalogItem[];
  reviewOnlyWorkflows: HQWorkflowCatalogItem[];
  onNameChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onCronChange: (value: string) => void;
  onJobTypeChange: (value: ScheduledJob["type"]) => void;
  onOutputTargetChange: (
    value: NonNullable<ScheduledJob["outputTarget"]>,
  ) => void;
  onApprovalPolicyChange: (
    value: NonNullable<ScheduledJob["approvalPolicy"]>,
  ) => void;
  onMissionAgentChange: (value: string) => void;
  onWorkflowTopicChange: (value: string) => void;
  onAddJob: () => void;
  onApplyMissionTemplate: (templateId: string) => void;
  onApplyWorkflowTemplate: (workflowId: HQWorkflowCommandId) => void;
}

export default function CronSchedulerComposerSection({
  name,
  prompt,
  cron,
  jobType,
  outputTarget,
  approvalPolicy,
  missionAgent,
  workflowTopic,
  error,
  automationCandidateWorkflows,
  reviewOnlyWorkflows,
  onNameChange,
  onPromptChange,
  onCronChange,
  onJobTypeChange,
  onOutputTargetChange,
  onApprovalPolicyChange,
  onMissionAgentChange,
  onWorkflowTopicChange,
  onAddJob,
  onApplyMissionTemplate,
  onApplyWorkflowTemplate,
}: CronSchedulerComposerSectionProps) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid #1A2040",
        display: "grid",
        gap: 8,
      }}
    >
      <input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Job name (e.g. Morning macro brief)"
        style={{
          background: "#080d18",
          border: "1px solid #1A2040",
          borderRadius: 6,
          color: "#ccd6f6",
          padding: "7px 10px",
        }}
      />
      <textarea
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Task prompt (what should run on schedule)"
        rows={3}
        style={{
          background: "#080d18",
          border: "1px solid #1A2040",
          borderRadius: 6,
          color: "#ccd6f6",
          padding: "7px 10px",
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={cron}
          onChange={(event) => onCronChange(event.target.value)}
          style={{
            flex: 1,
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "7px 10px",
          }}
        >
          {PRESET_CRONS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        <button
          onClick={onAddJob}
          style={{
            background: "rgba(0,221,255,0.1)",
            border: "1px solid #00DDFF55",
            color: "#00DDFF",
            borderRadius: 6,
            padding: "0 12px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ADD
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <select
          value={jobType}
          onChange={(event) =>
            onJobTypeChange(event.target.value as ScheduledJob["type"])
          }
          style={{
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "7px 10px",
          }}
        >
          <option value="mission">Mission</option>
          <option value="prompt">Prompt</option>
        </select>
        <select
          value={outputTarget}
          onChange={(event) =>
            onOutputTargetChange(
              event.target.value as NonNullable<ScheduledJob["outputTarget"]>,
            )
          }
          style={{
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "7px 10px",
          }}
        >
          <option value="vault">Vault</option>
          <option value="notify">Notification</option>
          <option value="telegram">Telegram</option>
          <option value="download">Download pack</option>
          <option value="review">Pending review</option>
          <option value="none">No artifact</option>
        </select>
        <select
          value={approvalPolicy}
          onChange={(event) =>
            onApprovalPolicyChange(
              event.target.value as NonNullable<ScheduledJob["approvalPolicy"]>,
            )
          }
          style={{
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "7px 10px",
          }}
        >
          <option value="human_gate">Human gate</option>
          <option value="approve_on_write">Approve on write</option>
          <option value="observe">Observe only</option>
        </select>
        <select
          value={missionAgent}
          onChange={(event) => onMissionAgentChange(event.target.value)}
          style={{
            background: "#080d18",
            border: "1px solid #1A2040",
            borderRadius: 6,
            color: "#ccd6f6",
            padding: "7px 10px",
          }}
        >
          <option value="orbit">ORBIT</option>
          <option value="nova">NOVA</option>
          <option value="cipher">CIPHER</option>
          <option value="jansky">JANSKY</option>
          <option value="flux">FLUX</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {MISSION_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onApplyMissionTemplate(template.id)}
            style={{
              background: "rgba(79,110,247,0.12)",
              border: "1px solid rgba(79,110,247,0.26)",
              color: "#9fb7ff",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            {template.label}
          </button>
        ))}
      </div>
      <CompactOperatorNote
        label="COMPOSER"
        summary="Use templates when you want a safe starting point. Drop to raw cron only when you need custom cadence or output posture."
        detail="Mission templates keep the drawer concise, while workflow templates promote proven HQ lanes into scheduled runs without making the operator retype everything."
        tone="info"
      />
      <CronSchedulerWorkflowTemplatesSection
        workflowTopic={workflowTopic}
        onWorkflowTopicChange={onWorkflowTopicChange}
        automationCandidateWorkflows={automationCandidateWorkflows}
        reviewOnlyWorkflows={reviewOnlyWorkflows}
        onApplyWorkflowTemplate={onApplyWorkflowTemplate}
      />
      <input
        value={cron}
        onChange={(event) => onCronChange(event.target.value)}
        placeholder="Cron expression (minute hour day month weekday)"
        style={{
          background: "#080d18",
          border: "1px solid #1A2040",
          borderRadius: 6,
          color: "#ccd6f6",
          padding: "7px 10px",
          fontFamily: "monospace",
        }}
      />
      {error ? <div style={{ color: "#ef4444", fontSize: 11 }}>{error}</div> : null}
    </div>
  );
}

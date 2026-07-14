"use client";

import type { ScheduledJob } from "@/store/useStore";
import CompactOperatorNote from "@/components/ui/CompactOperatorNote";
import CronSchedulerWorkflowTemplatesSection from "@/components/ui/CronSchedulerWorkflowTemplatesSection";
import type { HQWorkflowCatalogItem, HQWorkflowCommandId } from "@/components/home/office/workflowCommands";
import {
  MISSION_REVIEW_EXPIRY_OPTIONS,
  MISSION_TEMPLATES,
  PRESET_CRONS,
} from "@/components/ui/cronSchedulerPanelUtils";

interface CronSchedulerComposerSectionProps {
  name: string;
  prompt: string;
  cron: string;
  jobType: ScheduledJob["type"];
  outputTarget: NonNullable<ScheduledJob["outputTarget"]>;
  approvalPolicy: NonNullable<ScheduledJob["approvalPolicy"]>;
  missionAgent: string;
  missionScope: string;
  missionReviewExpiryHours: number;
  missionReentrySummary: string;
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
  onMissionScopeChange: (value: string) => void;
  onMissionReviewExpiryHoursChange: (value: number) => void;
  onMissionReentrySummaryChange: (value: string) => void;
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
  missionScope,
  missionReviewExpiryHours,
  missionReentrySummary,
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
  onMissionScopeChange,
  onMissionReviewExpiryHoursChange,
  onMissionReentrySummaryChange,
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
        aria-label="Scheduled job name"
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
        aria-label="Scheduled task prompt"
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
          aria-label="Schedule preset"
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
          aria-label="Scheduled job type"
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
          aria-label="Scheduled output target"
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
          aria-label="Scheduled approval policy"
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
          aria-label="Scheduled mission agent"
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
      {jobType === "mission" ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(79,110,247,.22)",
            background: "rgba(10, 17, 32, 0.72)",
          }}
        >
          <div style={{ color: "#9fb7ff", fontSize: 11, fontWeight: 800 }}>
            REVIEW-FIRST MISSION CONTRACT
          </div>
          <input
            aria-label="Mission scope"
            value={missionScope}
            onChange={(event) => onMissionScopeChange(event.target.value)}
            placeholder="Mission scope (what the overnight work is allowed to do)"
            style={{
              background: "#080d18",
              border: "1px solid #1A2040",
              borderRadius: 6,
              color: "#ccd6f6",
              padding: "7px 10px",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.42fr) minmax(0, 0.58fr)",
              gap: 8,
            }}
          >
            <select
              aria-label="Mission review expiry"
              value={missionReviewExpiryHours}
              onChange={(event) =>
                onMissionReviewExpiryHoursChange(Number(event.target.value))
              }
              style={{
                background: "#080d18",
                border: "1px solid #1A2040",
                borderRadius: 6,
                color: "#ccd6f6",
                padding: "7px 10px",
              }}
            >
              {MISSION_REVIEW_EXPIRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div
              style={{
                borderRadius: 6,
                border: "1px solid #1A2040",
                background: "#080d18",
                color: "#6875a0",
                padding: "7px 10px",
                fontSize: 10,
                lineHeight: 1.45,
              }}
            >
              Target {missionAgent.toUpperCase()} · {outputTarget} ·{" "}
              {approvalPolicy.replace(/_/g, " ")}
            </div>
          </div>
          <textarea
            aria-label="Mission re-entry summary"
            value={missionReentrySummary}
            onChange={(event) => onMissionReentrySummaryChange(event.target.value)}
            placeholder="Re-entry summary (how the operator should review and resume the mission)"
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
          <div style={{ color: "#6875a0", fontSize: 10, lineHeight: 1.5 }}>
            Mission jobs stay local-first in this tranche. They can queue work for review,
            but they do not authorize silent expansion, route sprawl, or background
            follow-on missions by themselves.
          </div>
        </div>
      ) : null}
      <CronSchedulerWorkflowTemplatesSection
        workflowTopic={workflowTopic}
        onWorkflowTopicChange={onWorkflowTopicChange}
        automationCandidateWorkflows={automationCandidateWorkflows}
        reviewOnlyWorkflows={reviewOnlyWorkflows}
        onApplyWorkflowTemplate={onApplyWorkflowTemplate}
      />
      <input
        aria-label="Cron expression"
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

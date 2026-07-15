import { apiFetch } from "@/lib/apiFetch";
import { callNonInteractiveAI } from "@/lib/ai";
import {
  buildNightShiftSystemPrompt,
  buildNightShiftUserPrompt,
  parseNightShiftProposal,
  type NightShiftPreparation,
  type NightShiftProposalSummary,
} from "@/lib/secondBrainNightShiftContract";
import { buildScheduledMissionReviewState } from "@/lib/schedulerGovernance";
import type { ScheduledJob } from "@/store/useStore";

export const NIGHT_SHIFT_REFINERY_TEMPLATE_ID = "second-brain-night-shift";
export const NIGHT_SHIFT_AUDIT_TEMPLATE_ID = "second-brain-weekly-audit";

export function buildNightShiftScheduledJobs(
  createdAt = Date.now(),
): ScheduledJob[] {
  return [
    {
      id: `job-${NIGHT_SHIFT_REFINERY_TEMPLATE_ID}-${createdAt}`,
      name: "Second Brain Night Shift",
      prompt:
        "Prepare the next source-locked refinery proposal and stop at human review.",
      cron: "0 3 * * *",
      enabled: true,
      type: "mission",
      outputTarget: "review",
      approvalPolicy: "human_gate",
      missionAgent: "jansky",
      templateId: NIGHT_SHIFT_REFINERY_TEMPLATE_ID,
      missionReview: buildScheduledMissionReviewState({
        scope: "Private second-brain refinery staging only",
        targetAgent: "jansky",
        outputTarget: "review",
        approvalPolicy: "human_gate",
        expiryHours: 24,
        reentrySummary:
          "Review the staged atoms, threads, sources, and friction in VAULT. Approve or reject before the next shift.",
        createdAt,
      }),
    },
    {
      id: `job-${NIGHT_SHIFT_AUDIT_TEMPLATE_ID}-${createdAt}`,
      name: "Second Brain Weekly Audit",
      prompt:
        "Run the report-only integrity audit. Do not repair or promote notes.",
      cron: "0 22 * * 0",
      enabled: true,
      type: "mission",
      outputTarget: "vault",
      approvalPolicy: "observe",
      missionAgent: "jansky",
      templateId: NIGHT_SHIFT_AUDIT_TEMPLATE_ID,
      missionReview: buildScheduledMissionReviewState({
        scope: "Report-only integrity audit of the private Markdown vault",
        targetAgent: "jansky",
        outputTarget: "vault",
        approvalPolicy: "observe",
        expiryHours: 72,
        reentrySummary:
          "Review missing sources, orphans, stale tentative notes, unresolved friction, stale threads, and pending decisions.",
        createdAt,
      }),
    },
  ];
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !payload) {
    throw new Error(
      payload?.error || `Night-shift request failed (${response.status}).`,
    );
  }
  return payload;
}

export async function stagePreparedNightShift(input: {
  baseSystemPrompt: string;
  singleFlightKey: string;
}): Promise<{ summary: string; staged: NightShiftProposalSummary | null }> {
  const prepareResponse = await apiFetch("/api/second-brain/night-shift", {
    method: "POST",
    body: JSON.stringify({ action: "prepare" }),
  });
  const prepared = await readJson<{ preparation: NightShiftPreparation }>(
    prepareResponse,
  );
  if (prepared.preparation.sources.length === 0) {
    return {
      summary: "No unprocessed raw captures or source files.",
      staged: null,
    };
  }
  const raw = await callNonInteractiveAI({
    systemPrompt: `${input.baseSystemPrompt}\n\n${buildNightShiftSystemPrompt()}`,
    userPrompt: buildNightShiftUserPrompt(prepared.preparation),
    maxTokens: 3_600,
    task: "reasoning",
    singleFlightKey: input.singleFlightKey,
    secondBrainMode: "night-shift",
  });
  const parsed = parseNightShiftProposal(
    raw,
    prepared.preparation.sources.map((source) => source.id),
  );
  if (!parsed.ok) throw new Error(parsed.error);
  const stageResponse = await apiFetch("/api/second-brain/night-shift", {
    method: "POST",
    body: JSON.stringify({
      action: "stage",
      proposal: parsed.value,
      sources: prepared.preparation.sources.map((source) => ({
        id: source.id,
        fingerprint: source.fingerprint,
      })),
    }),
  });
  const staged = await readJson<{ staged: NightShiftProposalSummary }>(
    stageResponse,
  );
  return {
    summary:
      staged.staged.outcome === "blocked"
        ? `Staged blocked proposal ${staged.staged.id} for review.`
        : `Staged ${staged.staged.atomCount} atoms and ${staged.staged.threadCount} thread revisions for review.`,
    staged: staged.staged,
  };
}

export async function runNightShiftAuditClient() {
  const response = await apiFetch("/api/second-brain/night-shift", {
    method: "POST",
    body: JSON.stringify({ action: "audit" }),
  });
  return readJson<{
    audit: { filename: string; findings: number; reportOnly: true };
  }>(response);
}

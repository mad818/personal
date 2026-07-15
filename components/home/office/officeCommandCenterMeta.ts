"use client";

import type { LearningEntry } from "@/lib/agentLearnings";
import { callAI } from "@/lib/ai";
import { apiFetch } from "@/lib/apiFetch";
import { extractJsonObject } from "@/lib/aiStructuredEvidence";

interface HQMetaPendingEdit {
  path: string;
  old_string: string;
  new_string: string;
  reason: string;
  risk: "low" | "medium" | "high";
  agentId: "jansky";
}

interface HQMetaProposal extends HQMetaPendingEdit {
  observed: string[];
  inferred: string[];
  verifyNext: string[];
}

export type HQMetaCommandResult =
  | {
      kind: "message";
      text: string;
    }
  | {
      kind: "pending_edit";
      edit: HQMetaPendingEdit;
      text: string;
    };

function summarizeLearningEntries(entries: LearningEntry[]) {
  return entries
    .slice(0, 10)
    .map((entry, index) => {
      const proposedFix = entry.proposedFix ? ` -> ${entry.proposedFix}` : "";
      return `${index + 1}. [${entry.category}] ${entry.agent.toUpperCase()}: ${entry.summary}${proposedFix}`;
    })
    .join("\n");
}

function buildMetaPrompt(entrySummary: string) {
  return `You are JANSKY running a meta-analysis of agent learning records.

Recent learnings:
${entrySummary}

Task: Review these learnings and propose ONE specific improvement to a prompt or agent behavior in this codebase.

Return valid JSON only, no markdown fences:
{
  "file": "relative path, e.g. components/home/office/prompts.ts",
  "old": "exact text to replace, max 3 lines",
  "new": "replacement text, max 3 lines",
  "reason": "one sentence",
  "risk": "low",
  "observed": ["fact explicitly present in the learning records"],
  "inferred": ["why this fix is worth proposing"],
  "verifyNext": ["concise check to run before applying"]
}

Rules:
- Propose exactly one improvement.
- "file" must be a relative repo path.
- "old" and "new" must stay short and targeted.
- "risk" must be one of: low, medium, high.
- "observed" may only contain facts explicitly present in the learnings.
- "inferred" should contain compact reasoning for the proposal.
- "verifyNext" should contain 1-3 concise checks before applying the edit.`;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
}

function parseLegacyMetaProposal(aiResponse: string): HQMetaProposal | null {
  const lines = aiResponse
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const get = (prefix: string) =>
    lines
      .find((line) => line.startsWith(`${prefix}:`))
      ?.slice(prefix.length + 1)
      .trim() ?? "";

  const path = get("FILE");
  const old_string = get("OLD");
  const new_string = get("NEW");
  const reason = get("REASON") || "Proposed by JANSKY meta-analysis";
  const riskRaw = get("RISK").toLowerCase();
  const risk: HQMetaPendingEdit["risk"] =
    riskRaw === "medium" ? "medium" : riskRaw === "high" ? "high" : "low";

  if (!path || !old_string || !new_string) return null;

  return {
    path,
    old_string,
    new_string,
    reason,
    risk,
    agentId: "jansky",
    observed: [],
    inferred: [],
    verifyNext: [],
  };
}

function parseMetaProposal(aiResponse: string): HQMetaProposal | null {
  const payload = extractJsonObject(aiResponse);
  if (payload) {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const path = typeof parsed.file === "string" ? parsed.file.trim() : "";
      const old_string =
        typeof parsed.old === "string" ? parsed.old.trim() : "";
      const new_string =
        typeof parsed.new === "string" ? parsed.new.trim() : "";
      const reason =
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim()
          : "Proposed by JANSKY meta-analysis";
      const riskRaw =
        typeof parsed.risk === "string" ? parsed.risk.trim().toLowerCase() : "";
      const risk: HQMetaPendingEdit["risk"] =
        riskRaw === "medium" ? "medium" : riskRaw === "high" ? "high" : "low";

      if (!path || !old_string || !new_string) return null;

      return {
        path,
        old_string,
        new_string,
        reason,
        risk,
        agentId: "jansky",
        observed: normalizeList(parsed.observed),
        inferred: normalizeList(parsed.inferred),
        verifyNext: normalizeList(parsed.verifyNext),
      };
    } catch {
      return parseLegacyMetaProposal(aiResponse);
    }
  }

  return parseLegacyMetaProposal(aiResponse);
}

function renderEvidenceSection(label: string, entries: string[]) {
  if (entries.length === 0) return "";
  return `\n\n**${label}**\n${entries.map((entry) => `- ${entry}`).join("\n")}`;
}

function buildMetaResultText(proposal: HQMetaProposal) {
  return `Meta-analysis complete. Edit queued in pending edits.

**File:** \`${proposal.path}\`
**Reason:** ${proposal.reason}
**Risk:** ${proposal.risk}${renderEvidenceSection("Observed", proposal.observed)}${renderEvidenceSection("Inferred", proposal.inferred)}${renderEvidenceSection("Verify next", proposal.verifyNext)}`;
}

export async function runHQMetaCommand(): Promise<HQMetaCommandResult> {
  const learningsRes = await apiFetch("/api/agent-learnings?limit=10");
  const learningsData = learningsRes.ok
    ? ((await learningsRes.json()) as { entries: LearningEntry[] })
    : { entries: [] as LearningEntry[] };
  const entries = learningsData.entries ?? [];

  if (entries.length === 0) {
    return {
      kind: "message",
      text: "No learnings recorded yet. Run a few queries first, then try /meta again.",
    };
  }

  const aiResponse = await callAI(
    buildMetaPrompt(summarizeLearningEntries(entries)),
    1024,
    "meta",
  );
  const proposal = parseMetaProposal(aiResponse);

  if (!proposal) {
    return {
      kind: "message",
      text: `Meta-analysis complete.\n\n${aiResponse}`,
    };
  }

  return {
    kind: "pending_edit",
    edit: {
      path: proposal.path,
      old_string: proposal.old_string,
      new_string: proposal.new_string,
      reason: proposal.reason,
      risk: proposal.risk,
      agentId: "jansky",
    },
    text: buildMetaResultText(proposal),
  };
}

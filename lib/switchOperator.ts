import { apiFetch, probeRuntimeHealth } from "@/lib/apiFetch";
import { readBrowserInternetAvailability } from "@/lib/offlineReadiness";
import { detectRouteFromPrompt } from "@/lib/chatCapabilityRouting";
import { detectAgent } from "@/components/home/office/prompts";
import { type AgentId, type PreparedWorkspaceTarget, type SwitchOperatorStatus } from "@/components/home/office/types";
import {
  buildPreparedWorkspaceTarget,
  resolveAssistantWorkspaceForRoute,
} from "@/lib/assistantSessionRegistry";
import {
  buildProviderResiliencePosture,
  type ProviderHealthSnapshot,
} from "@/lib/providerPosture";

const SWITCH_OPERATOR_RE =
  /(?:^\/operator\b|\brun operator mode\b|\bswitch operator\b|\brun the next local tranche\b)/i;

const BLOCKED_REMOTE_PREFIXES = new Set(["FD2", "FD3", "FD4", "FD5", "A7b"]);

export interface SwitchOperatorTaskChoice {
  id: string;
  label: string;
  source: "active-program" | "queue";
}

export interface SwitchOperatorResult {
  handled: boolean;
  dispatch: boolean;
  summary: string;
  targetAgent: AgentId;
  routeHint: string;
  selectedLane: string;
  preparedWorkspace: PreparedWorkspaceTarget | null;
  agentPrompt: string;
  status: SwitchOperatorStatus;
}

function isBlockedTaskId(id: string) {
  return BLOCKED_REMOTE_PREFIXES.has(id);
}

export function hasSwitchOperatorSignal(input: string) {
  return SWITCH_OPERATOR_RE.test(input.trim());
}

export function extractSwitchOperatorTaskChoice(
  nextUpContent: string,
  activeTasks: string[],
): SwitchOperatorTaskChoice | null {
  const activeProgramLine = nextUpContent
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("- Active program:"));

  if (activeProgramLine) {
    const match = activeProgramLine.match(
      /Active program:\s*([A-Z]{1,3}\d+[a-z]?)\s+[—-]\s+([^.;]+)/,
    );
    if (match && !isBlockedTaskId(match[1])) {
      return {
        id: match[1],
        label: match[2].trim(),
        source: "active-program",
      };
    }
  }

  for (const task of activeTasks) {
    const match = task.match(/^([A-Z]{1,3}\d+[a-z]?)\s+[—-]\s+(.+)$/);
    if (!match) continue;
    if (isBlockedTaskId(match[1])) continue;
    return {
      id: match[1],
      label: match[2].trim(),
      source: "queue",
    };
  }

  return null;
}

function buildOperatorPreparedWorkspace(routeHint: string) {
  if (routeHint === "/command") {
    return buildPreparedWorkspaceTarget(
      "/command?focus=provider-health",
      "Open provider health",
      "Prepared COMMAND provider health so server-scored chain posture, runtime reachability, and the explicit operator lane are ready first.",
    );
  }
  return resolveAssistantWorkspaceForRoute(routeHint, "workflow");
}

export function buildSwitchOperatorSummary(input: {
  readinessSummary: string;
  choice: SwitchOperatorTaskChoice | null;
  dispatchPlan: string;
  nextStep: string;
}) {
  const { readinessSummary, choice, dispatchPlan, nextStep } = input;
  return [
    "1. Operator posture",
    readinessSummary,
    "",
    "2. Chosen task",
    choice ? `${choice.id} — ${choice.label}` : "No local tranche was available.",
    "",
    "3. Dispatch plan",
    dispatchPlan,
    "",
    "4. Strongest next step",
    nextStep,
  ].join("\n");
}

function buildSwitchOperatorPrompt(input: {
  readinessSummary: string;
  choice: SwitchOperatorTaskChoice;
  routeHint: string;
  preparedWorkspace: PreparedWorkspaceTarget | null;
}) {
  const { readinessSummary, choice, routeHint, preparedWorkspace } = input;
  return `Run Nexus Switch Operator mode for one bounded pass.

This mode is explicit-only and one-shot.

Current readiness:
- ${readinessSummary}

Canonical queue truth:
- Active local tranche: ${choice.id} — ${choice.label}
- Skip blocked staging milestones FD2 through FD5 and A7b.

Dispatch target:
- Preferred route: ${routeHint}
- Preferred prepared workspace: ${preparedWorkspace?.href ?? routeHint}

Rules:
- Choose one bounded next action only.
- Keep the response operator-grade and compact.
- Do not invent backlog items from old idea docs.
- Do not widen into scheduler automation, background loops, or staging work.

Return EXACTLY these sections:
1. Operator posture
2. Chosen task
3. Dispatch plan
4. Strongest next step`;
}

async function loadNextUpContent() {
  const response = await apiFetch("/api/project?section=state&slice=next-up", {
    cache: "no-store",
  });
  if (!response.ok) return "";
  const payload = (await response.json()) as { content?: string };
  return payload.content ?? "";
}

async function loadActiveTasks() {
  const response = await apiFetch("/api/project", {
    cache: "no-store",
  });
  if (!response.ok) return [] as string[];
  const payload = (await response.json()) as {
    state?: { active?: string[] };
  };
  return Array.isArray(payload.state?.active) ? payload.state?.active : [];
}

async function loadProviderSnapshot() {
  const response = await apiFetch("/api/health/providers", {
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as ProviderHealthSnapshot;
}

export async function runSwitchOperator(input: {
  command: string;
  now?: number;
  loadSnapshot?: () => Promise<ProviderHealthSnapshot | null>;
  loadRuntimeReachability?: () => Promise<boolean>;
  readInternet?: () => boolean;
  loadNextUp?: () => Promise<string>;
  loadTasks?: () => Promise<string[]>;
}): Promise<SwitchOperatorResult | null> {
  if (!hasSwitchOperatorSignal(input.command)) {
    return null;
  }

  const now = input.now ?? Date.now();
  const snapshot =
    (await (input.loadSnapshot ?? loadProviderSnapshot)().catch(() => null)) ?? null;
  const runtimeReachable = await (input.loadRuntimeReachability ?? (() => probeRuntimeHealth()))().catch(
    () => false,
  );
  const internetReachable = (input.readInternet ?? readBrowserInternetAvailability)();
  const posture = buildProviderResiliencePosture({
    snapshot,
    internetReachable,
    runtimeReachable,
  });
  const nextUpContent = await (input.loadNextUp ?? loadNextUpContent)().catch(
    () => "",
  );
  const activeTasks = await (input.loadTasks ?? loadActiveTasks)().catch(() => []);
  const choice = extractSwitchOperatorTaskChoice(nextUpContent, activeTasks);

  if (!choice) {
    const summary = buildSwitchOperatorSummary({
      readinessSummary: posture.readinessSummary,
      choice: null,
      dispatchPlan: "Hold dispatch. Canonical queue truth does not currently expose an unblocked local tranche.",
      nextStep: "Refresh docs/SYSTEM_STATE.md before running operator mode again.",
    });
    return {
      handled: true,
      dispatch: false,
      summary,
      targetAgent: "jansky",
      routeHint: "/command",
      selectedLane: "COMMAND provider health",
      preparedWorkspace: buildOperatorPreparedWorkspace("/command"),
      agentPrompt: summary,
      status: {
        mode: "blocked",
        requestedAt: now,
        updatedAt: now,
        readinessSummary: posture.readinessSummary,
        detail: "Operator mode could not find an unblocked local tranche in the canonical queue.",
        nextStep: "Refresh canonical queue truth before retrying operator mode.",
      },
    };
  }

  const routeHint = detectRouteFromPrompt(`${choice.id} ${choice.label}`) ?? "/hq";
  const preparedWorkspace = buildOperatorPreparedWorkspace(routeHint);
  const selectedLane =
    preparedWorkspace?.label ??
    (routeHint === "/command" ? "COMMAND provider health" : routeHint);
  const selectedAgent = detectAgent(`${choice.id} ${choice.label}`);

  if (posture.noAiLaneAvailable) {
    const summary = buildSwitchOperatorSummary({
      readinessSummary: posture.readinessSummary,
      choice,
      dispatchPlan: "Hold dispatch. No AI lane is healthy enough for a one-shot operator run.",
      nextStep: posture.repairAction,
    });
    return {
      handled: true,
      dispatch: false,
      summary,
      targetAgent: "jansky",
      routeHint,
      selectedLane,
      preparedWorkspace,
      agentPrompt: summary,
      status: {
        mode: "blocked",
        requestedAt: now,
        updatedAt: now,
        readinessSummary: posture.readinessSummary,
        taskId: choice.id,
        taskLabel: `${choice.id} — ${choice.label}`,
        selectedLane,
        selectedHref: preparedWorkspace?.href ?? routeHint,
        selectedAgent,
        detail: "Operator mode held dispatch because no healthy AI lane was available.",
        nextStep: posture.repairAction,
      },
    };
  }

  const agentPrompt = buildSwitchOperatorPrompt({
    readinessSummary: posture.readinessSummary,
    choice,
    routeHint,
    preparedWorkspace,
  });

  return {
    handled: true,
    dispatch: true,
    summary: buildSwitchOperatorSummary({
      readinessSummary: posture.readinessSummary,
      choice,
      dispatchPlan: `${selectedAgent.toUpperCase()} is staged through ${selectedLane}.`,
      nextStep:
        preparedWorkspace?.detail ??
        "Review the chosen lane after the one-shot operator run completes.",
    }),
    targetAgent: selectedAgent,
    routeHint,
    selectedLane,
    preparedWorkspace,
    agentPrompt,
    status: {
      mode: "running",
      requestedAt: now,
      updatedAt: now,
      readinessSummary: posture.readinessSummary,
      taskId: choice.id,
      taskLabel: `${choice.id} — ${choice.label}`,
      selectedLane,
      selectedHref: preparedWorkspace?.href ?? routeHint,
      selectedAgent,
      detail: `Operator mode is dispatching one bounded run for ${choice.id}.`,
      nextStep:
        preparedWorkspace?.detail ??
        "Reopen the chosen lane after the run if follow-through is still needed.",
    },
  };
}

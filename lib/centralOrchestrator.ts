export const CENTRAL_ORCHESTRATOR_MAX_WORKERS = 3;

export const CENTRAL_ORCHESTRATOR_WORKERS = [
  "orbit",
  "nova",
  "cipher",
  "flux",
] as const;

export type CentralOrchestratorWorkerId =
  (typeof CENTRAL_ORCHESTRATOR_WORKERS)[number];

export type SpecialistHandoffStatus =
  | "completed"
  | "degraded"
  | "blocked"
  | "failed";

export interface SpecialistHandoff {
  taskId: string;
  worker: CentralOrchestratorWorkerId;
  status: SpecialistHandoffStatus;
  summary: string;
  deliverable: string;
  codeProposal: string | null;
  files: string[];
  evidence: string[];
  notes: string[];
  risks: string[];
  verification: string[];
  nextAction: string;
}

export interface SpecialistMission {
  taskId: string;
  worker: CentralOrchestratorWorkerId;
  mission: string;
  context: string;
  expectedOutput: string;
}

const WORKER_BRIEFS: Record<CentralOrchestratorWorkerId, string> = {
  orbit:
    "EL is the engineering worker. Inspect supplied code context, propose the smallest coherent implementation, name affected files, and state verification needed.",
  nova:
    "DUSTIN is the research worker. Separate evidence from inference, identify source gaps, and return concise findings MAX can verify and synthesize.",
  cipher:
    "HOPPER is the security worker. Lead with concrete risk, identify the exact vulnerable or trust-boundary pattern, and state residual risk.",
  flux:
    "LUCAS is the markets worker. Separate current supplied data from assumptions, quantify uncertainty, and identify invalidation conditions.",
};

const STATUS_SET = new Set<SpecialistHandoffStatus>([
  "completed",
  "degraded",
  "blocked",
  "failed",
]);

function boundedString(value: unknown, fallback: string, max = 6_000) {
  if (typeof value !== "string") return fallback;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : fallback;
}

function boundedStringArray(value: unknown, maxItems = 12, maxChars = 1_000) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
}

export function normalizeCentralOrchestratorWorker(
  value: unknown,
): CentralOrchestratorWorkerId | null {
  if (typeof value !== "string") return null;
  const worker = value.trim().toLowerCase();
  return CENTRAL_ORCHESTRATOR_WORKERS.includes(
    worker as CentralOrchestratorWorkerId,
  )
    ? (worker as CentralOrchestratorWorkerId)
    : null;
}

export function normalizeSpecialistMission(input: {
  worker?: unknown;
  taskId?: unknown;
  mission?: unknown;
  context?: unknown;
  expectedOutput?: unknown;
}): SpecialistMission | null {
  const worker = normalizeCentralOrchestratorWorker(input.worker);
  const mission = boundedString(input.mission, "", 4_000);
  if (!worker || !mission) return null;

  return {
    worker,
    taskId: boundedString(
      input.taskId,
      `${worker}-${Date.now().toString(36)}`,
      80,
    ).replace(/[^a-zA-Z0-9._-]/g, "-"),
    mission,
    context: boundedString(input.context, "No additional context supplied.", 8_000),
    expectedOutput: boundedString(
      input.expectedOutput,
      "Return the strongest bounded specialist finding for MAX to synthesize.",
      1_000,
    ),
  };
}

export function buildSpecialistWorkerMessages(mission: SpecialistMission) {
  const schema = {
    taskId: mission.taskId,
    worker: mission.worker,
    status: "completed|degraded|blocked|failed",
    summary: "short outcome",
    deliverable: "specialist result for MAX",
    codeProposal: "string or null",
    files: ["only files grounded in supplied context"],
    evidence: ["facts or supplied proof"],
    notes: ["assumptions or useful follow-up notes"],
    risks: ["risks, conflicts, or uncertainty"],
    verification: ["checks MAX or the operator should run"],
    nextAction: "single recommended next action",
  };

  return [
    {
      role: "system" as const,
      content: `You are a temporary Nexus specialist reporting only to MAX, the central orchestrator. ${WORKER_BRIEFS[mission.worker]}

You have no tools, live file access, browser access, durable memory, or authority to mutate anything. Treat only supplied context as evidence. Code is a proposal, never proof that a file changed. If context is insufficient, return blocked or degraded rather than inventing details. Do not address the human operator.

Return ONLY one valid JSON object matching this shape:
${JSON.stringify(schema, null, 2)}`,
    },
    {
      role: "user" as const,
      content: `Task ID: ${mission.taskId}
Mission: ${mission.mission}
Expected output: ${mission.expectedOutput}

Context supplied by MAX:
${mission.context}`,
    },
  ];
}

export function buildFailedSpecialistHandoff(
  mission: SpecialistMission,
  summary: string,
): SpecialistHandoff {
  return {
    taskId: mission.taskId,
    worker: mission.worker,
    status: "failed",
    summary: boundedString(summary, "Specialist worker failed.", 1_000),
    deliverable: "",
    codeProposal: null,
    files: [],
    evidence: [],
    notes: [],
    risks: ["MAX did not receive a verified specialist result."],
    verification: [],
    nextAction: "MAX should continue without this worker or retry with narrower context.",
  };
}

export function parseSpecialistHandoff(
  raw: string,
  mission: SpecialistMission,
): SpecialistHandoff {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(extractJsonObject(raw)) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("handoff is not an object");
    }
    parsed = value as Record<string, unknown>;
  } catch {
    return {
      ...buildFailedSpecialistHandoff(
        mission,
        "Worker returned an unreadable handoff; raw output is preserved as a degraded deliverable.",
      ),
      status: "degraded",
      deliverable: boundedString(raw, "No readable worker output.", 6_000),
    };
  }

  const status =
    typeof parsed.status === "string" &&
    STATUS_SET.has(parsed.status as SpecialistHandoffStatus)
      ? (parsed.status as SpecialistHandoffStatus)
      : "degraded";
  const codeProposal =
    typeof parsed.codeProposal === "string" && parsed.codeProposal.trim()
      ? parsed.codeProposal.trim().slice(0, 8_000)
      : null;

  return {
    taskId: mission.taskId,
    worker: mission.worker,
    status,
    summary: boundedString(parsed.summary, "Worker returned no summary.", 1_000),
    deliverable: boundedString(parsed.deliverable, "", 6_000),
    codeProposal,
    files: boundedStringArray(parsed.files),
    evidence: boundedStringArray(parsed.evidence),
    notes: boundedStringArray(parsed.notes),
    risks: boundedStringArray(parsed.risks),
    verification: boundedStringArray(parsed.verification),
    nextAction: boundedString(
      parsed.nextAction,
      "MAX should review the handoff before using it.",
      1_000,
    ),
  };
}

export function formatSpecialistHandoff(handoff: SpecialistHandoff) {
  return `[SPECIALIST HANDOFF — return to MAX]\n${JSON.stringify(handoff, null, 2)}\n[END SPECIALIST HANDOFF]`;
}

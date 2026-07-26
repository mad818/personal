import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import {
  buildFeynmanPdf,
  buildFeynmanPreviewHtml,
  createFeynmanSessionId,
  isSafeFeynmanSessionId,
  rankFeynmanSessions,
  type FeynmanContinuityArtifact,
  type FeynmanContinuityArtifactKind,
  type FeynmanContinuitySession,
  type FeynmanNotebookEntry,
} from "./feynmanContinuity.ts";
import type {
  FeynmanResearchResult,
  FeynmanWorkflowId,
} from "./feynmanResearch.ts";

const ARTIFACTS: Record<
  FeynmanContinuityArtifactKind,
  {
    fileName: string;
    contentType: string;
    disposition: "inline" | "attachment";
  }
> = {
  plan: {
    fileName: "plan.md",
    contentType: "text/markdown; charset=utf-8",
    disposition: "inline",
  },
  notebook: {
    fileName: "notebook.md",
    contentType: "text/markdown; charset=utf-8",
    disposition: "inline",
  },
  report: {
    fileName: "report.md",
    contentType: "text/markdown; charset=utf-8",
    disposition: "inline",
  },
  evidence: {
    fileName: "evidence-ledger.json",
    contentType: "application/json; charset=utf-8",
    disposition: "attachment",
  },
  claims: {
    fileName: "claim-audit.json",
    contentType: "application/json; charset=utf-8",
    disposition: "attachment",
  },
  review: {
    fileName: "reviewer-findings.json",
    contentType: "application/json; charset=utf-8",
    disposition: "attachment",
  },
  provenance: {
    fileName: "provenance.json",
    contentType: "application/json; charset=utf-8",
    disposition: "attachment",
  },
  preview: {
    fileName: "preview.html",
    contentType: "text/html; charset=utf-8",
    disposition: "inline",
  },
  pdf: {
    fileName: "report.pdf",
    contentType: "application/pdf",
    disposition: "attachment",
  },
};

function dataRoot() {
  return (
    process.env.NEXUS_FEYNMAN_DATA_DIR ??
    path.join(process.cwd(), "agent-workspace", "feynman", "sessions")
  );
}

function assertSafeSessionId(sessionId: string) {
  if (!isSafeFeynmanSessionId(sessionId)) {
    throw new Error("Unsafe Feynman session ID.");
  }
}

function sessionDirectory(sessionId: string) {
  assertSafeSessionId(sessionId);
  return path.join(dataRoot(), sessionId);
}

function sessionManifestPath(sessionId: string) {
  return path.join(sessionDirectory(sessionId), "session.json");
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function defaultStageStatus(): FeynmanResearchResult["stageStatus"] {
  return {
    researcher: "degraded",
    writer: "degraded",
    verifier: "degraded",
    reviewer: "degraded",
  };
}

function artifacts(): FeynmanContinuityArtifact[] {
  return Object.entries(ARTIFACTS).map(([kind, artifact]) => ({
    kind: kind as FeynmanContinuityArtifactKind,
    fileName: artifact.fileName,
    contentType: artifact.contentType,
  }));
}

async function writeSession(session: FeynmanContinuitySession) {
  await writeFile(sessionManifestPath(session.id), json(session), "utf8");
}

export async function getFeynmanContinuitySession(sessionId: string) {
  assertSafeSessionId(sessionId);
  const raw = await readFile(sessionManifestPath(sessionId), "utf8");
  return JSON.parse(raw) as FeynmanContinuitySession;
}

export async function startFeynmanContinuitySession(input: {
  workflow: FeynmanWorkflowId;
  topic: string;
  now?: number;
  nonce?: string;
}) {
  const now = input.now ?? Date.now();
  const timestamp = new Date(now).toISOString();
  const session: FeynmanContinuitySession = {
    version: 1,
    id: createFeynmanSessionId(input.workflow, input.topic, now, input.nonce),
    workflow: input.workflow,
    topic: input.topic.trim(),
    title: `${input.workflow} · ${input.topic.trim()}`,
    summary: "Research session in progress.",
    status: "running",
    createdAt: timestamp,
    updatedAt: timestamp,
    stageStatus: defaultStageStatus(),
    failures: [],
    reportExcerpt: "",
    artifacts: artifacts(),
  };
  const directory = sessionDirectory(session.id);
  await mkdir(directory, { recursive: false });
  await writeFile(
    path.join(directory, ARTIFACTS.plan.fileName),
    [
      `# Research Plan · ${session.topic}`,
      "",
      `- Session: ${session.id}`,
      `- Workflow: ${session.workflow}`,
      `- Started: ${session.createdAt}`,
      "- Stages: Researcher, Writer, Verifier, Reviewer",
      "- Output: final report, evidence ledger, claim audit, review findings, provenance, preview, and PDF",
      "- Gate: no execution, installation, paid compute, external write, or recurring enablement without explicit operator approval",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    path.join(directory, ARTIFACTS.notebook.fileName),
    [
      `# Lab Notebook · ${session.topic}`,
      "",
      `- ${timestamp} · workflow · started · Session ${session.id} started.`,
      "",
    ].join("\n"),
    "utf8",
  );
  await writeSession(session);
  return session;
}

export async function appendFeynmanNotebookEntry(
  sessionId: string,
  entry: FeynmanNotebookEntry,
) {
  const session = await getFeynmanContinuitySession(sessionId);
  const notebookPath = path.join(
    sessionDirectory(sessionId),
    ARTIFACTS.notebook.fileName,
  );
  let notebook = "";
  try {
    notebook = await readFile(notebookPath, "utf8");
  } catch {
    notebook = `# Lab Notebook · ${session.topic}\n\n`;
  }
  const safeNote = entry.note.replace(/\s+/g, " ").trim().slice(0, 500);
  await writeFile(
    notebookPath,
    `${notebook.trimEnd()}\n- ${entry.at} · ${entry.stage} · ${entry.status} · ${safeNote}\n`,
    "utf8",
  );
  await writeSession({ ...session, updatedAt: entry.at });
}

export async function completeFeynmanContinuitySession(
  sessionId: string,
  result: FeynmanResearchResult,
) {
  const session = await getFeynmanContinuitySession(sessionId);
  const directory = sessionDirectory(sessionId);
  const updatedAt = new Date().toISOString();
  const firstHeading = result.report.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const next: FeynmanContinuitySession = {
    ...session,
    title: firstHeading || session.title,
    summary:
      result.report
        .split(/\n{2,}/)
        .map((part) => part.replace(/^#+\s*/gm, "").trim())
        .find((part) => part.length > 40)
        ?.slice(0, 320) ?? session.summary,
    status:
      result.failures.length > 0 ||
      Object.values(result.stageStatus).some((status) => status === "degraded")
        ? "degraded"
        : "complete",
    updatedAt,
    stageStatus: result.stageStatus,
    failures: result.failures,
    reportExcerpt: result.report.slice(0, 4_000),
  };
  const provenance = {
    version: 1,
    sessionId: next.id,
    workflow: result.workflow,
    topic: result.topic,
    generatedAt: updatedAt,
    stageStatus: result.stageStatus,
    coverage: result.coverage,
    approvalRequired: result.approvalRequired,
    integrityPassport: result.integrityPassport,
    failures: result.failures,
    sources: result.sources,
    claimVerdicts: result.claims.map((claim) => ({
      id: claim.id,
      verdict: claim.verdict,
      sourceIds: claim.sourceIds,
    })),
  };
  await Promise.all([
    writeFile(
      path.join(directory, ARTIFACTS.report.fileName),
      `${result.report.trim()}\n`,
      "utf8",
    ),
    writeFile(
      path.join(directory, ARTIFACTS.evidence.fileName),
      json(result.sources),
      "utf8",
    ),
    writeFile(
      path.join(directory, ARTIFACTS.claims.fileName),
      json(result.claims),
      "utf8",
    ),
    writeFile(
      path.join(directory, ARTIFACTS.review.fileName),
      json(result.reviewFindings),
      "utf8",
    ),
    writeFile(
      path.join(directory, ARTIFACTS.provenance.fileName),
      json(provenance),
      "utf8",
    ),
    writeFile(
      path.join(directory, ARTIFACTS.preview.fileName),
      buildFeynmanPreviewHtml({ session: next, report: result.report }),
      "utf8",
    ),
    writeFile(
      path.join(directory, ARTIFACTS.pdf.fileName),
      buildFeynmanPdf(next.title, result.report),
    ),
  ]);
  await appendFeynmanNotebookEntry(sessionId, {
    at: updatedAt,
    stage: "workflow",
    status: next.status === "complete" ? "complete" : "degraded",
    note: `Session finalized with ${result.sources.length} sources, ${result.claims.length} audited claims, and ${result.reviewFindings.length} reviewer findings.`,
  });
  await writeSession(next);
  return next;
}

export async function degradeFeynmanContinuitySession(
  sessionId: string,
  reason: string,
) {
  const session = await getFeynmanContinuitySession(sessionId);
  const updatedAt = new Date().toISOString();
  const next: FeynmanContinuitySession = {
    ...session,
    status: "degraded",
    updatedAt,
    failures: Array.from(new Set([...session.failures, reason.trim()])).filter(
      Boolean,
    ),
  };
  await appendFeynmanNotebookEntry(sessionId, {
    at: updatedAt,
    stage: "workflow",
    status: "degraded",
    note: reason,
  });
  await writeSession(next);
  return next;
}

export async function listFeynmanContinuitySessions(options?: {
  limit?: number;
}) {
  await mkdir(dataRoot(), { recursive: true });
  const entries = await readdir(dataRoot(), { withFileTypes: true });
  const sessions: FeynmanContinuitySession[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !isSafeFeynmanSessionId(entry.name)) continue;
    try {
      sessions.push(await getFeynmanContinuitySession(entry.name));
    } catch {
      // Ignore incomplete or corrupt local session directories.
    }
  }
  return rankFeynmanSessions(sessions, "", options?.limit ?? 20);
}

export async function searchFeynmanContinuitySessions(
  query: string,
  options?: { limit?: number },
) {
  const sessions = await listFeynmanContinuitySessions({ limit: 500 });
  return rankFeynmanSessions(sessions, query, options?.limit ?? 20);
}

export async function readFeynmanContinuityArtifact(
  sessionId: string,
  kind: FeynmanContinuityArtifactKind,
) {
  assertSafeSessionId(sessionId);
  const artifact = ARTIFACTS[kind];
  if (!artifact) throw new Error("Unknown Feynman artifact kind.");
  const buffer = await readFile(
    path.join(sessionDirectory(sessionId), artifact.fileName),
  );
  return {
    buffer,
    contentType: artifact.contentType,
    fileName: artifact.fileName,
    disposition: artifact.disposition,
  };
}

import { randomUUID } from "crypto";
import type {
  FeynmanAgentStage,
  FeynmanResearchResult,
  FeynmanWorkflowId,
} from "./feynmanResearch.ts";

export type FeynmanContinuityStatus = "running" | "complete" | "degraded";
export type FeynmanNotebookStage = "workflow" | FeynmanAgentStage;
export type FeynmanNotebookStatus = "started" | "complete" | "degraded";
export type FeynmanContinuityArtifactKind =
  | "plan"
  | "notebook"
  | "report"
  | "evidence"
  | "claims"
  | "review"
  | "provenance"
  | "preview"
  | "pdf";

export interface FeynmanNotebookEntry {
  at: string;
  stage: FeynmanNotebookStage;
  status: FeynmanNotebookStatus;
  note: string;
}

export interface FeynmanContinuityArtifact {
  kind: FeynmanContinuityArtifactKind;
  fileName: string;
  contentType: string;
}

export interface FeynmanContinuitySession {
  version: 1;
  id: string;
  workflow: FeynmanWorkflowId;
  topic: string;
  title: string;
  summary: string;
  status: FeynmanContinuityStatus;
  createdAt: string;
  updatedAt: string;
  stageStatus: FeynmanResearchResult["stageStatus"];
  failures: string[];
  reportExcerpt: string;
  artifacts: FeynmanContinuityArtifact[];
}

const SAFE_SESSION_ID_RE =
  /^\d{8}T\d{6}-[a-z0-9](?:[a-z0-9-]{0,86}[a-z0-9])?-[a-f0-9]{8}$/;

function slugify(value: string, max = 48) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/g, "") || "research"
  );
}

function utcCompact(now: number) {
  return new Date(now)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "");
}

export function createFeynmanSessionId(
  workflow: FeynmanWorkflowId,
  topic: string,
  now = Date.now(),
  nonce: string = randomUUID(),
) {
  const suffix = nonce
    .replace(/[^a-f0-9]/gi, "")
    .toLowerCase()
    .slice(0, 8);
  return `${utcCompact(now)}-${slugify(workflow, 18)}-${slugify(topic)}-${suffix.padEnd(8, "0")}`;
}

export function isSafeFeynmanSessionId(value: string) {
  return SAFE_SESSION_ID_RE.test(value);
}

export function isFeynmanContinuityArtifactKind(
  value: string,
): value is FeynmanContinuityArtifactKind {
  return [
    "plan",
    "notebook",
    "report",
    "evidence",
    "claims",
    "review",
    "provenance",
    "preview",
    "pdf",
  ].includes(value);
}

function normalizedTokens(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 1),
    ),
  );
}

export function rankFeynmanSessions(
  sessions: FeynmanContinuitySession[],
  query: string,
  limit = 20,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const tokens = normalizedTokens(query);
  if (!normalizedQuery) {
    return [...sessions]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, Math.max(1, limit));
  }
  return sessions
    .map((session) => {
      const topic = session.topic.toLowerCase();
      const haystack = [
        session.id,
        session.workflow,
        session.topic,
        session.title,
        session.summary,
        session.reportExcerpt,
        session.failures.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const score =
        (topic === normalizedQuery ? 12 : 0) +
        (topic.includes(normalizedQuery) ? 6 : 0) +
        (haystack.includes(normalizedQuery) ? 4 : 0) +
        tokens.filter((token) => haystack.includes(token)).length;
      return { session, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.session.updatedAt.localeCompare(left.session.updatedAt),
    )
    .slice(0, Math.max(1, limit))
    .map((entry) => entry.session);
}

function artifactUrl(
  sessionId: string,
  artifact: FeynmanContinuityArtifactKind,
) {
  return `/api/feynman/artifacts?sessionId=${encodeURIComponent(sessionId)}&artifact=${artifact}`;
}

export function buildFeynmanResumeContext(session: FeynmanContinuitySession) {
  const stageSummary = Object.entries(session.stageStatus)
    .map(([stage, status]) => `${stage}: ${status}`)
    .join(", ");
  return [
    `# Resume Feynman session ${session.id}`,
    "",
    `- Workflow: ${session.workflow}`,
    `- Topic: ${session.topic}`,
    `- Status: ${session.status}`,
    `- Updated: ${session.updatedAt}`,
    `- Stages: ${stageSummary}`,
    `- Failures: ${session.failures.length > 0 ? session.failures.join(" | ") : "none"}`,
    `- Notebook: ${artifactUrl(session.id, "notebook")}`,
    `- Provenance: ${artifactUrl(session.id, "provenance")}`,
    `- Preview: ${artifactUrl(session.id, "preview")}`,
    `- PDF: ${artifactUrl(session.id, "pdf")}`,
    "",
    "## Prior Report Excerpt",
    session.reportExcerpt || "No report excerpt is available.",
    "",
    "Continue by reviewing the open questions and strongest evidence gap. Do not execute or write externally without the existing approval gates.",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildFeynmanPreviewHtml(input: {
  session: FeynmanContinuitySession;
  report: string;
}) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(input.session.title)}</title>`,
    "<style>",
    "body{margin:0;background:#0b0d10;color:#e8edf2;font:16px/1.65 system-ui,sans-serif}",
    "main{max-width:960px;margin:0 auto;padding:40px 24px 72px}",
    "header{border-bottom:1px solid #303944;margin-bottom:28px;padding-bottom:20px}",
    "h1{font-size:28px;margin:0 0 8px}p{color:#aeb8c4;margin:0}",
    "pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 ui-monospace,monospace;color:#dbe4ec}",
    "</style>",
    "</head>",
    "<body>",
    "<main>",
    "<header>",
    `<h1>${escapeHtml(input.session.title)}</h1>`,
    `<p>${escapeHtml(input.session.workflow)} · ${escapeHtml(input.session.updatedAt)} · ${escapeHtml(input.session.status)}</p>`,
    "</header>",
    `<pre>${escapeHtml(input.report)}</pre>`,
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function pdfSafe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfLines(value: string, width = 92) {
  const lines: string[] = [];
  for (const sourceLine of value.split(/\r?\n/)) {
    if (!sourceLine) {
      lines.push("");
      continue;
    }
    let remaining = sourceLine;
    while (remaining.length > width) {
      let splitAt = remaining.lastIndexOf(" ", width);
      if (splitAt < Math.floor(width / 2)) splitAt = width;
      lines.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trimStart();
    }
    lines.push(remaining);
  }
  return lines;
}

export function buildFeynmanPdf(title: string, report: string) {
  const lines = wrapPdfLines(`${title}\n\n${report}`);
  const pageLines: string[][] = [];
  for (let index = 0; index < lines.length; index += 54) {
    pageLines.push(lines.slice(index, index + 54));
  }
  if (pageLines.length === 0) pageLines.push([""]);

  const fontObjectId = 3 + pageLines.length * 2;
  const objects = new Map<number, string>();
  const pageIds = pageLines.map((_, index) => 3 + index * 2);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
  );
  pageLines.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = [
      "BT",
      "/F1 10 Tf",
      "48 752 Td",
      "12 TL",
      ...page.map((line) => `(${pdfSafe(line)}) Tj T*`),
      "ET",
    ].join("\n");
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.set(
      contentId,
      `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects.set(
    fontObjectId,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  );

  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id <= fontObjectId; id += 1) {
    offsets[id] = Buffer.byteLength(output, "ascii");
    output += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(output, "ascii");
  output += `xref\n0 ${fontObjectId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontObjectId; id += 1) {
    output += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${fontObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(output, "ascii");
}

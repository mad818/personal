import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  NIGHT_SHIFT_MAX_SOURCE_CHARS,
  NIGHT_SHIFT_MAX_SOURCE_ITEMS,
  NIGHT_SHIFT_MAX_TOTAL_SOURCE_CHARS,
  normalizeNightShiftProposal,
  toNightShiftSlug,
  type NightShiftPreparation,
  type NightShiftProposal,
  type NightShiftProposalEnvelope,
  type NightShiftProposalSummary,
  type NightShiftSourceKind,
  type NightShiftSourceSnapshot,
  type NightShiftStatus,
} from "./secondBrainNightShiftContract.ts";

const LIVE_ROOT = path.join(process.cwd(), "data", "second-brain");
const TRACKED_ROOT = path.join(
  process.cwd(),
  "docs",
  "ideas",
  "second-brain-night-shift",
);
const RAW_DIR = path.join(LIVE_ROOT, "0-raw");
const DESK_DIR = path.join(LIVE_ROOT, "1-desk");
const DESK_ARCHIVE_DIR = path.join(DESK_DIR, "archive");
const ATOM_DIR = path.join(LIVE_ROOT, "2-atoms");
const ATOM_ARCHIVE_DIR = path.join(ATOM_DIR, "archive");
const THREAD_DIR = path.join(LIVE_ROOT, "3-threads");
const SOURCE_DIR = path.join(LIVE_ROOT, "sources");
const BRIEFING_DIR = path.join(LIVE_ROOT, "briefings");
const PLAYBOOK_DIR = path.join(LIVE_ROOT, "playbooks");
const STATE_DIR = path.join(LIVE_ROOT, ".nexus");
const STATE_PATH = path.join(STATE_DIR, "shift-state.json");
const MAX_CAPTURE_CHARS = 24_000;
const MAX_DISK_SOURCE_BYTES = 1_000_000;

interface NightShiftState {
  version: 1;
  processed: Record<string, { processedAt: string; proposalId: string }>;
}

interface CandidateFile extends NightShiftSourceSnapshot {
  modifiedAt: string;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

function fileStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function pathExists(target: string) {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyIfMissing(source: string, destination: string) {
  try {
    await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;
  }
}

export async function ensureNightShiftVault() {
  await Promise.all(
    [
      RAW_DIR,
      DESK_DIR,
      DESK_ARCHIVE_DIR,
      ATOM_DIR,
      ATOM_ARCHIVE_DIR,
      THREAD_DIR,
      SOURCE_DIR,
      BRIEFING_DIR,
      PLAYBOOK_DIR,
      STATE_DIR,
    ].map((directory) => mkdir(directory, { recursive: true })),
  );
  await Promise.all([
    copyIfMissing(
      path.join(TRACKED_ROOT, "house-rules.md"),
      path.join(LIVE_ROOT, "house-rules.md"),
    ),
    ...["scout", "refinery", "editor", "audit"].map((name) =>
      copyIfMissing(
        path.join(TRACKED_ROOT, "playbooks", `${name}.md`),
        path.join(PLAYBOOK_DIR, `${name}.md`),
      ),
    ),
  ]);
}

async function listMarkdownFiles(directory: string) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          !entry.name.startsWith("."),
      )
      .map((entry) => path.join(directory, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function readState(): Promise<NightShiftState> {
  try {
    const parsed = JSON.parse(await readFile(STATE_PATH, "utf8")) as NightShiftState;
    return parsed?.version === 1 && parsed.processed
      ? parsed
      : { version: 1, processed: {} };
  } catch {
    return { version: 1, processed: {} };
  }
}

async function writeState(state: NightShiftState) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function candidateId(kind: NightShiftSourceKind, absolutePath: string) {
  const relativePath = path.relative(LIVE_ROOT, absolutePath).replace(/\\/g, "/");
  const pathHash = createHash("sha256").update(relativePath).digest("hex").slice(0, 8);
  return `${kind}-${toNightShiftSlug(path.basename(absolutePath, ".md"), "capture")}-${pathHash}`;
}

async function readCandidate(
  kind: NightShiftSourceKind,
  absolutePath: string,
): Promise<CandidateFile | null> {
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile() || fileStat.size > MAX_DISK_SOURCE_BYTES) return null;
    const content = await readFile(absolutePath, "utf8");
    const relativePath = path.relative(LIVE_ROOT, absolutePath).replace(/\\/g, "/");
    return {
      id: candidateId(kind, absolutePath),
      kind,
      relativePath,
      fingerprint: createHash("sha256").update(content).digest("hex"),
      characterCount: content.length,
      loadedCharacterCount: 0,
      truncated: false,
      content,
      modifiedAt: fileStat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

async function listCandidates() {
  const [rawFiles, sourceFiles] = await Promise.all([
    listMarkdownFiles(RAW_DIR),
    listMarkdownFiles(SOURCE_DIR),
  ]);
  const candidates = await Promise.all([
    ...rawFiles.map((file) => readCandidate("raw", file)),
    ...sourceFiles.map((file) => readCandidate("source", file)),
  ]);
  return candidates
    .filter((item): item is CandidateFile => Boolean(item))
    .sort((left, right) => left.modifiedAt.localeCompare(right.modifiedAt));
}

function extractTitle(content: string, fallback: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return cleanText(heading, 160) || fallback;
}

function extractSummary(content: string) {
  const withoutFrontmatter = content.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "");
  const paragraph = withoutFrontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith(">"));
  return cleanText(paragraph, 300);
}

async function listExistingNotes(directory: string, limit: number) {
  const files = (await listMarkdownFiles(directory)).slice(0, limit);
  return Promise.all(
    files.map(async (file) => {
      try {
        const content = (await readFile(file, "utf8")).slice(0, 6_000);
        const id = toNightShiftSlug(path.basename(file, ".md"), "note");
        return {
          id,
          title: extractTitle(content, id),
          summary: extractSummary(content),
        };
      } catch {
        return null;
      }
    }),
  ).then((items) => items.filter((item): item is NonNullable<typeof item> => Boolean(item)));
}

async function readPendingEnvelopes() {
  const files = await readdir(DESK_DIR, { withFileTypes: true }).catch(() => []);
  const jsonFiles = files
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(DESK_DIR, entry.name));
  const envelopes = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        const parsed = JSON.parse(await readFile(file, "utf8")) as NightShiftProposalEnvelope;
        return parsed?.status === "pending" ? parsed : null;
      } catch {
        return null;
      }
    }),
  );
  return envelopes
    .filter((item): item is NightShiftProposalEnvelope => Boolean(item))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function summarizeEnvelope(envelope: NightShiftProposalEnvelope): NightShiftProposalSummary {
  return {
    id: envelope.id,
    createdAt: envelope.createdAt,
    outcome: envelope.proposal.outcome,
    atomCount: envelope.proposal.atoms.length,
    threadCount: envelope.proposal.threads.length,
    frictionCount: envelope.proposal.atoms.reduce(
      (total, atom) => total + atom.friction.length,
      0,
    ),
  };
}

export async function readNightShiftStatus(): Promise<NightShiftStatus> {
  await ensureNightShiftVault();
  const [candidates, pending, atoms, threads, briefings, state] = await Promise.all([
    listCandidates(),
    readPendingEnvelopes(),
    listMarkdownFiles(ATOM_DIR),
    listMarkdownFiles(THREAD_DIR),
    listMarkdownFiles(BRIEFING_DIR),
    readState(),
  ]);
  return {
    posture: "ready",
    liveVaultPath: "data/second-brain",
    gitIgnored: true,
    automaticWriteScope: "desk_and_audit_only",
    promotionRequiresHumanApproval: true,
    counts: {
      raw: candidates.filter((item) => item.kind === "raw").length,
      sources: candidates.filter((item) => item.kind === "source").length,
      unprocessed: candidates.filter((item) => !state.processed[item.fingerprint]).length,
      pendingProposals: pending.length,
      atoms: atoms.length,
      threads: threads.length,
      briefings: briefings.length,
    },
    pending: pending.map(summarizeEnvelope),
  };
}

export async function prepareNightShift(): Promise<NightShiftPreparation> {
  await ensureNightShiftVault();
  const [candidates, state, existingAtoms, existingThreads] = await Promise.all([
    listCandidates(),
    readState(),
    listExistingNotes(ATOM_DIR, 200),
    listExistingNotes(THREAD_DIR, 80),
  ]);
  const selected = candidates
    .filter((item) => !state.processed[item.fingerprint])
    .slice(0, NIGHT_SHIFT_MAX_SOURCE_ITEMS);
  let remaining = NIGHT_SHIFT_MAX_TOTAL_SOURCE_CHARS;
  const sources: CandidateFile[] = [];
  for (const item of selected) {
    if (remaining <= 0) break;
    const allowed = Math.max(0, Math.min(NIGHT_SHIFT_MAX_SOURCE_CHARS, remaining));
    const content = item.content.slice(0, allowed);
    remaining -= content.length;
    sources.push({
      ...item,
      content,
      loadedCharacterCount: content.length,
      truncated: content.length < item.content.length,
    });
  }
  return {
    sources,
    existingAtoms,
    existingThreads,
    limits: {
      sourceItems: NIGHT_SHIFT_MAX_SOURCE_ITEMS,
      sourceCharacters: NIGHT_SHIFT_MAX_TOTAL_SOURCE_CHARS,
      atoms: 24,
      threads: 8,
    },
  };
}

export async function captureNightShiftInput(input: {
  title?: unknown;
  text?: unknown;
  sourceUrl?: unknown;
}) {
  await ensureNightShiftVault();
  const rawText = typeof input.text === "string" ? input.text : "";
  if (!rawText.trim()) throw new Error("Capture text is required.");
  if (rawText.length > MAX_CAPTURE_CHARS) {
    throw new Error(`Capture exceeds the ${MAX_CAPTURE_CHARS.toLocaleString()} character limit.`);
  }
  const title = cleanText(input.title, 160) || "Untitled capture";
  const text = cleanText(rawText, MAX_CAPTURE_CHARS);
  const rawUrl = cleanText(input.sourceUrl, 2_048);
  let sourceUrl = "";
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("unsupported protocol");
      }
      sourceUrl = parsed.toString();
    } catch {
      throw new Error("Source URL must be a valid HTTP or HTTPS address.");
    }
  }
  const now = new Date();
  const id = `${fileStamp(now)}-${toNightShiftSlug(title, "capture")}`;
  const filename = `${id}.md`;
  const content = [
    "---",
    `id: ${JSON.stringify(id)}`,
    "type: raw_capture",
    `captured_at: ${JSON.stringify(now.toISOString())}`,
    `source_url: ${JSON.stringify(sourceUrl)}`,
    "---",
    "",
    `# ${title}`,
    "",
    text,
    "",
  ].join("\n");
  await writeFile(path.join(RAW_DIR, filename), content, { encoding: "utf8", flag: "wx" });
  return { id: candidateId("raw", path.join(RAW_DIR, filename)), filename };
}

function assertSafeProposalId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^shift-[a-z0-9-]{10,120}$/.test(id)) {
    throw new Error("Invalid proposal ID.");
  }
  return id;
}

async function currentCandidateMap() {
  return new Map((await listCandidates()).map((candidate) => [candidate.id, candidate]));
}

function proposalFile(id: string) {
  return path.join(DESK_DIR, `${id}.json`);
}

export async function stageNightShiftProposal(input: {
  proposal: unknown;
  sources: Array<{ id?: unknown; fingerprint?: unknown }>;
}) {
  await ensureNightShiftVault();
  const current = await currentCandidateMap();
  const expected = input.sources
    .slice(0, NIGHT_SHIFT_MAX_SOURCE_ITEMS)
    .map((source) => ({
      id: toNightShiftSlug(source.id),
      fingerprint: cleanText(source.fingerprint, 128),
    }))
    .filter((source) => source.id && source.fingerprint);
  if (expected.length === 0) throw new Error("No prepared sources were supplied.");
  for (const source of expected) {
    const candidate = current.get(source.id);
    if (!candidate || candidate.fingerprint !== source.fingerprint) {
      throw new Error("A prepared source changed. Prepare a fresh shift proposal.");
    }
  }
  const normalized = normalizeNightShiftProposal(
    input.proposal,
    expected.map((source) => source.id),
  );
  if (!normalized.ok) throw new Error(normalized.error);
  const id = `shift-${fileStamp().toLowerCase()}-${randomUUID().slice(0, 8)}`;
  const envelope: NightShiftProposalEnvelope = {
    id,
    status: "pending",
    createdAt: new Date().toISOString(),
    sources: expected.map((source) => {
      const candidate = current.get(source.id)!;
      const { content: _content, modifiedAt: _modifiedAt, ...snapshot } = candidate;
      return snapshot;
    }),
    proposal: normalized.value,
  };
  await writeFile(proposalFile(id), JSON.stringify(envelope, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
  return summarizeEnvelope(envelope);
}

export async function getNightShiftProposal(value: unknown) {
  await ensureNightShiftVault();
  const id = assertSafeProposalId(value);
  try {
    const envelope = JSON.parse(
      await readFile(proposalFile(id), "utf8"),
    ) as NightShiftProposalEnvelope;
    if (envelope.id !== id || envelope.status !== "pending") return null;
    return envelope;
  } catch {
    return null;
  }
}

function renderAtom(
  atom: NightShiftProposal["atoms"][number],
  sourcePaths: Map<string, string>,
  createdAt: string,
) {
  const sources = atom.sourceIds.map((id) => sourcePaths.get(id)).filter(Boolean);
  const orphan = atom.links.length < 2;
  return [
    "---",
    `id: ${JSON.stringify(atom.id)}`,
    "type: atom",
    `created_at: ${JSON.stringify(createdAt)}`,
    `certainty: ${atom.certainty}`,
    `sources: ${JSON.stringify(sources)}`,
    `links: ${JSON.stringify(atom.links)}`,
    "---",
    "",
    `# ${atom.title}`,
    "",
    "## Claim",
    "",
    atom.claim,
    "",
    "## Why It Matters",
    "",
    atom.whyItMatters || "Not established by the supplied evidence.",
    ...(orphan
      ? ["", "## [ORPHAN]", "", "Fewer than two evidence-backed links exist. Audit this as the vault grows."]
      : []),
    ...atom.friction.flatMap((item) => [
      "",
      "## [FRICTION]",
      "",
      `> [[${item.noteId}]] — ${item.reason}`,
    ]),
    ...(atom.openThreads.length
      ? ["", "## Open Threads", "", ...atom.openThreads.map((item) => `- ${item}`)]
      : []),
    "",
  ].join("\n");
}

function renderThread(
  thread: NightShiftProposal["threads"][number],
  proposalId: string,
  createdAt: string,
) {
  return [
    "---",
    `id: ${JSON.stringify(thread.id)}`,
    "type: thread_revision",
    `proposal_id: ${JSON.stringify(proposalId)}`,
    `created_at: ${JSON.stringify(createdAt)}`,
    `atoms: ${JSON.stringify(thread.atomIds)}`,
    "---",
    "",
    `# ${thread.title}`,
    "",
    thread.summary,
    "",
    "## Atoms",
    "",
    ...thread.atomIds.map((id) => `- [[${id}]]`),
    "",
  ].join("\n");
}

function renderBriefing(envelope: NightShiftProposalEnvelope) {
  const proposal = envelope.proposal;
  return [
    "---",
    "type: night_shift_briefing",
    `proposal_id: ${JSON.stringify(envelope.id)}`,
    `created_at: ${JSON.stringify(envelope.createdAt)}`,
    "---",
    "",
    `# Night Shift Briefing — ${envelope.createdAt.slice(0, 10)}`,
    "",
    "## What Came In",
    "",
    `- Sources reviewed: ${envelope.sources.length}`,
    `- Atoms promoted: ${proposal.atoms.length}`,
    "",
    "## Contradictions You Should Resolve",
    "",
    ...(proposal.briefing.contradictions.length
      ? proposal.briefing.contradictions.map((item) => `- ${item}`)
      : ["- None raised in this shift."]),
    "",
    "## Threads That Grew",
    "",
    ...(proposal.briefing.threadsChanged.length
      ? proposal.briefing.threadsChanged.map((id) => `- [[${id}]]`)
      : ["- None."]),
    "",
    "## One Thing Worth Your Attention Today",
    "",
    proposal.briefing.attention || "No operator decision was identified.",
    "",
  ].join("\n");
}

export async function approveNightShiftProposal(value: unknown) {
  await ensureNightShiftVault();
  const id = assertSafeProposalId(value);
  const envelope = await getNightShiftProposal(id);
  if (!envelope) throw new Error("Pending proposal was not found.");
  if (envelope.proposal.outcome === "blocked") {
    throw new Error("Blocked proposals cannot be promoted. Reject it or prepare a fresh shift.");
  }
  const current = await currentCandidateMap();
  for (const source of envelope.sources) {
    const candidate = current.get(source.id);
    if (!candidate || candidate.fingerprint !== source.fingerprint) {
      throw new Error("A source changed after staging. Promotion requires a fresh proposal.");
    }
  }
  const normalized = normalizeNightShiftProposal(
    envelope.proposal,
    envelope.sources.map((source) => source.id),
  );
  if (!normalized.ok) throw new Error(normalized.error);
  const proposal = normalized.value;
  const sourcePaths = new Map(envelope.sources.map((source) => [source.id, source.relativePath]));
  const createdAt = new Date().toISOString();
  const atomWrites = proposal.atoms.map((atom) => ({
    path: path.join(ATOM_DIR, `${atom.id}.md`),
    content: renderAtom(atom, sourcePaths, createdAt),
  }));
  const threadWrites = proposal.threads.map((thread) => ({
    path: path.join(THREAD_DIR, `${thread.id}--${id}.md`),
    content: renderThread(thread, id, createdAt),
  }));
  const briefingWrite = {
    path: path.join(BRIEFING_DIR, `${createdAt.slice(0, 10)}--${id}.md`),
    content: renderBriefing({ ...envelope, proposal }),
  };
  const writes = [...atomWrites, ...threadWrites, briefingWrite];
  for (const write of writes) {
    if (await pathExists(write.path)) {
      throw new Error(`Promotion blocked because ${path.basename(write.path)} already exists.`);
    }
  }
  for (const write of writes) {
    await writeFile(write.path, write.content, { encoding: "utf8", flag: "wx" });
  }
  const state = await readState();
  for (const source of envelope.sources) {
    state.processed[source.fingerprint] = { processedAt: createdAt, proposalId: id };
  }
  await writeState(state);
  await rename(proposalFile(id), path.join(DESK_ARCHIVE_DIR, `${id}.approved.json`));
  return {
    proposalId: id,
    atoms: atomWrites.length,
    threads: threadWrites.length,
    briefings: 1,
  };
}

export async function rejectNightShiftProposal(value: unknown) {
  await ensureNightShiftVault();
  const id = assertSafeProposalId(value);
  if (!(await pathExists(proposalFile(id)))) throw new Error("Pending proposal was not found.");
  await rename(proposalFile(id), path.join(DESK_ARCHIVE_DIR, `${id}.rejected.json`));
  return { proposalId: id, rejected: true };
}

function parseFrontmatterArray(content: string, key: string): string[] {
  const match = content.match(new RegExp(`^${key}:\\s*(\\[[^\\n]*\\])\\s*$`, "m"));
  if (!match) return [];
  try {
    const value = JSON.parse(match[1]) as unknown;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function ageDays(file: string) {
  const fileStat = await stat(file);
  return Math.floor((Date.now() - fileStat.mtimeMs) / 86_400_000);
}

export async function runNightShiftAudit() {
  await ensureNightShiftVault();
  const [atomFiles, threadFiles, pending] = await Promise.all([
    listMarkdownFiles(ATOM_DIR),
    listMarkdownFiles(THREAD_DIR),
    readPendingEnvelopes(),
  ]);
  const missingSources: string[] = [];
  const orphans: string[] = [];
  const staleTentative: string[] = [];
  const staleFriction: string[] = [];
  for (const file of atomFiles) {
    const content = await readFile(file, "utf8").catch(() => "");
    const name = path.basename(file);
    const sources = parseFrontmatterArray(content, "sources");
    const links = parseFrontmatterArray(content, "links");
    if (sources.length === 0) {
      missingSources.push(`${name}: no source references`);
    } else {
      for (const source of sources) {
        const resolved = path.resolve(LIVE_ROOT, source);
        if (!resolved.startsWith(`${path.resolve(LIVE_ROOT)}${path.sep}`) || !(await pathExists(resolved))) {
          missingSources.push(`${name}: missing ${source}`);
        }
      }
    }
    if (links.length === 0) orphans.push(name);
    const days = await ageDays(file).catch(() => 0);
    if (/^certainty:\s*tentative\s*$/m.test(content) && days >= 14) {
      staleTentative.push(`${name} (${days}d)`);
    }
    if (content.includes("[FRICTION]") && days >= 7) {
      staleFriction.push(`${name} (${days}d)`);
    }
  }
  const staleThreads: string[] = [];
  for (const file of threadFiles) {
    const days = await ageDays(file).catch(() => 0);
    if (days >= 30) staleThreads.push(`${path.basename(file)} (${days}d)`);
  }
  const now = new Date();
  const sections: Array<[string, string[]]> = [
    ["Prime Directive Breaches", missingSources],
    ["Orphan Atoms", orphans],
    ["Tentative For 14+ Days", staleTentative],
    ["Unresolved Friction For 7+ Days", staleFriction],
    ["Threads Stale For 30+ Days", staleThreads],
    ["Pending Human Decisions", pending.map((item) => item.id)],
  ];
  const content = [
    "---",
    "type: second_brain_audit",
    `created_at: ${JSON.stringify(now.toISOString())}`,
    "report_only: true",
    "---",
    "",
    `# Second Brain Audit — ${now.toISOString().slice(0, 10)}`,
    "",
    "> Report only. No files were repaired or rewritten.",
    "",
    ...sections.flatMap(([heading, items]) => [
      `## ${heading}`,
      "",
      ...(items.length ? items.map((item) => `- ${item}`) : ["- None."]),
      "",
    ]),
  ].join("\n");
  const filename = `audit-${fileStamp(now)}.md`;
  await writeFile(path.join(BRIEFING_DIR, filename), content, {
    encoding: "utf8",
    flag: "wx",
  });
  return {
    filename,
    findings: sections.reduce((total, [, items]) => total + items.length, 0),
    reportOnly: true as const,
  };
}

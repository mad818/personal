import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export type SecondBrainMode =
  | "off"
  | "auto"
  | "file-first"
  | "human-editor"
  | "night-shift";
export type ResolvedSecondBrainMode = Exclude<SecondBrainMode, "auto">;

export const SECOND_BRAIN_MAX_FILE_CHARS = 12_000;
export const SECOND_BRAIN_MAX_TOTAL_CHARS = 20_000;

interface SecondBrainFileDefinition {
  id: "index" | "human-editor" | "night-shift-skill" | "night-shift-rules";
  relativePath: string;
  required: boolean;
  stripFrontmatter?: boolean;
}

export interface SecondBrainFileStatus {
  id: SecondBrainFileDefinition["id"];
  path: string;
  required: boolean;
  present: boolean;
  characterCount: number;
  loadedCharacterCount: number;
  truncated: boolean;
  modifiedAt: string | null;
}

export interface SecondBrainStatus {
  posture: "ready" | "degraded";
  authority: "human_files_over_ai_memory";
  aiWriteAuthority: false;
  files: SecondBrainFileStatus[];
}

export function isSecondBrainModeReady(
  mode: ResolvedSecondBrainMode,
  loadedFiles: SecondBrainFileStatus[],
): boolean {
  if (mode === "human-editor") {
    return loadedFiles.some(
      (file) => file.id === "human-editor" && file.present,
    );
  }
  if (mode === "night-shift") {
    const ids = new Set(loadedFiles.filter((file) => file.present).map((file) => file.id));
    return ids.has("night-shift-skill") && ids.has("night-shift-rules");
  }
  return true;
}

interface LoadedSecondBrainFile extends SecondBrainFileStatus {
  content: string;
}

const SECOND_BRAIN_FILES: SecondBrainFileDefinition[] = [
  {
    id: "index",
    relativePath: "SECOND_BRAIN.md",
    required: true,
  },
  {
    id: "human-editor",
    relativePath: "docs/ideas/skills/human-editor/SKILL.md",
    required: true,
    stripFrontmatter: true,
  },
  {
    id: "night-shift-skill",
    relativePath: "docs/ideas/skills/night-shift-second-brain/SKILL.md",
    required: true,
    stripFrontmatter: true,
  },
  {
    id: "night-shift-rules",
    relativePath: "docs/ideas/second-brain-night-shift/house-rules.md",
    required: true,
  },
];

function stripYamlFrontmatter(content: string): string {
  return content.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "").trim();
}

function cleanLoadedContent(content: string): string {
  return content.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

async function loadSecondBrainFile(
  definition: SecondBrainFileDefinition,
): Promise<LoadedSecondBrainFile> {
  const absolutePath = path.join(process.cwd(), definition.relativePath);
  try {
    const [raw, fileStat] = await Promise.all([
      readFile(absolutePath, "utf8"),
      stat(absolutePath),
    ]);
    const prepared = cleanLoadedContent(
      definition.stripFrontmatter ? stripYamlFrontmatter(raw) : raw.trim(),
    );
    const content = prepared.slice(0, SECOND_BRAIN_MAX_FILE_CHARS);
    return {
      id: definition.id,
      path: definition.relativePath.replace(/\\/g, "/"),
      required: definition.required,
      present: true,
      characterCount: prepared.length,
      loadedCharacterCount: content.length,
      truncated: prepared.length > content.length,
      modifiedAt: fileStat.mtime.toISOString(),
      content,
    };
  } catch {
    return {
      id: definition.id,
      path: definition.relativePath.replace(/\\/g, "/"),
      required: definition.required,
      present: false,
      characterCount: 0,
      loadedCharacterCount: 0,
      truncated: false,
      modifiedAt: null,
      content: "",
    };
  }
}

function collectText(value: unknown, depth = 0): string[] {
  if (depth > 3) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectText(item, depth + 1));
  }
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [record.text, record.content].flatMap((item) =>
    collectText(item, depth + 1),
  );
}

function readUserMessageText(messages: unknown[]): string {
  return messages
    .filter(
      (message) =>
        message &&
        typeof message === "object" &&
        (message as Record<string, unknown>).role === "user",
    )
    .flatMap((message) =>
      collectText((message as Record<string, unknown>).content),
    )
    .join("\n")
    .slice(-8_000);
}

export function normalizeSecondBrainMode(value: unknown): SecondBrainMode {
  return value === "off" ||
    value === "file-first" ||
    value === "human-editor" ||
    value === "night-shift"
    ? value
    : "auto";
}

export function shouldUseHumanEditorProtocol(input: {
  task?: unknown;
  messages?: unknown;
}): boolean {
  if (input.task === "code" || input.task === "embed") return false;
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const text = readUserMessageText(messages);
  if (!text) return false;

  const namedMode =
    /\b(human editor mode|natural thought flow|ai pattern breaker|ban the fluff words|reader-first rewrite|mega prompt)\b/i;
  const directRewrite =
    /\b(rewrite|humanize)\s+(this|the following)\b|\bmake\s+(this|it)\s+sound\s+(human|natural)\b/i;
  const editVerb = /\b(rewrite|humanize|edit|polish|tighten)\b/i;
  const proseTarget =
    /\b(text|copy|post|tweet|thread|caption|email|message|article|paragraph|bio|description|statement|announcement|script|draft|prose|writing)\b/i;

  return (
    namedMode.test(text) ||
    directRewrite.test(text) ||
    (editVerb.test(text) && proseTarget.test(text))
  );
}

export function resolveSecondBrainMode(input: {
  requestedMode?: unknown;
  task?: unknown;
  messages?: unknown;
}): ResolvedSecondBrainMode {
  const requested = normalizeSecondBrainMode(input.requestedMode);
  if (requested !== "auto") return requested;
  return shouldUseHumanEditorProtocol(input) ? "human-editor" : "file-first";
}

async function loadFilesForMode(
  mode: ResolvedSecondBrainMode,
): Promise<LoadedSecondBrainFile[]> {
  if (mode === "off") return [];
  const selected = SECOND_BRAIN_FILES.filter(
    (file) =>
      file.id === "index" ||
      (mode === "human-editor" && file.id === "human-editor") ||
      (mode === "night-shift" && file.id.startsWith("night-shift-")),
  );
  const loaded = await Promise.all(selected.map(loadSecondBrainFile));
  let remaining = SECOND_BRAIN_MAX_TOTAL_CHARS;
  return loaded.map((file) => {
    const content = file.content.slice(0, Math.max(0, remaining));
    remaining -= content.length;
    return {
      ...file,
      content,
      loadedCharacterCount: content.length,
      truncated: file.truncated || content.length < file.content.length,
    };
  });
}

export async function readSecondBrainStatus(): Promise<SecondBrainStatus> {
  const files = await Promise.all(SECOND_BRAIN_FILES.map(loadSecondBrainFile));
  const missingRequired = files.some((file) => file.required && !file.present);
  return {
    posture: missingRequired ? "degraded" : "ready",
    authority: "human_files_over_ai_memory",
    aiWriteAuthority: false,
    files: files.map(({ content: _content, ...status }) => status),
  };
}

export async function buildSecondBrainSystemBlock(
  mode: ResolvedSecondBrainMode,
): Promise<{ block: string; loadedFiles: SecondBrainFileStatus[] }> {
  const files = await loadFilesForMode(mode);
  const present = files.filter((file) => file.present && file.content);
  if (present.length === 0) return { block: "", loadedFiles: [] };

  const sources = present
    .map((file) => `SOURCE: ${file.path}\n${file.content}`)
    .join("\n\n");
  return {
    block: `[FILE_FIRST_SECOND_BRAIN]\nThese project-owned files are durable context. Follow them after system safety and the operator's current request. Preserve any stricter output schema already requested. Do not treat AI memory as permission to edit these files.\n\n${sources}\n[END FILE_FIRST_SECOND_BRAIN]`,
    loadedFiles: present.map(({ content: _content, ...status }) => status),
  };
}

export function appendSecondBrainSystemPrompt(
  systemPrompt: string | undefined,
  secondBrainBlock: string,
): string | undefined {
  const parts = [systemPrompt?.trim(), secondBrainBlock.trim()].filter(Boolean);
  return parts.length ? parts.join("\n\n") : undefined;
}

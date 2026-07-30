export const PROJECT_FILE_CONTEXT_LIMITS = {
  maximumResponseChars: 60_000,
  maximumChunkChars: 10_000,
  minimumSemanticChunkChars: 3_000,
  maximumSelectedChunks: 4,
  maximumFocusChars: 200,
  maximumFocusTokens: 12,
  maximumManifestEntries: 80,
} as const;

export type ProjectFileChunk = {
  index: number;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  characters: number;
  label: string;
  content: string;
};

export type ProjectFileContextOptions = {
  extension?: string;
  focus?: string;
  chunk?: string;
};

export type ProjectFileContextResult = {
  text: string;
  chunkCount: number;
  selectedChunkIndexes: number[];
  contextual: boolean;
};

type SourceLine = {
  offset: number;
  line: number;
  text: string;
};

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass", ".less"]);
const SHELL_EXTENSIONS = new Set([".sh", ".bash", ".ps1"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);

function cleanLabel(value: string) {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "continuation";
  return cleaned.length <= 88 ? cleaned : `${cleaned.slice(0, 87)}…`;
}

function normalizeExtension(extension: string | undefined) {
  const normalized = (extension ?? "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith(".") ? normalized : `.${normalized}`;
}

function buildSourceLines(content: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let offset = 0;
  let line = 1;
  while (offset <= content.length) {
    const newline = content.indexOf("\n", offset);
    const end = newline === -1 ? content.length : newline;
    lines.push({
      offset,
      line,
      text: content.slice(offset, end),
    });
    if (newline === -1) break;
    offset = newline + 1;
    line += 1;
  }
  return lines;
}

function semanticBoundaryLabel(rawLine: string, extension: string) {
  const line = rawLine.replace(/\r$/, "");
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (MARKDOWN_EXTENSIONS.has(extension)) {
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    return heading ? cleanLabel(heading[1]) : null;
  }

  const leadingSpaces = line.match(/^\s*/)?.[0].length ?? 0;
  if (CODE_EXTENSIONS.has(extension) && leadingSpaces <= 2) {
    const declaration = trimmed.match(
      /^(?:(?:export|declare)\s+)*(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum|namespace|const|let|var)\s+([A-Za-z_$][\w$]*)/,
    );
    if (declaration) return cleanLabel(declaration[0]);
  }

  if (
    STYLE_EXTENSIONS.has(extension) &&
    leadingSpaces <= 2 &&
    /(?:\{|^@(?:media|supports|layer|keyframes)\b)/.test(trimmed)
  ) {
    return cleanLabel(trimmed.replace(/\s*\{\s*$/, ""));
  }

  if (
    extension === ".json" &&
    leadingSpaces <= 2 &&
    /^"[^"]+"\s*:/.test(trimmed)
  ) {
    return cleanLabel(trimmed.replace(/:\s*.*$/, ""));
  }

  if (SHELL_EXTENSIONS.has(extension) && leadingSpaces <= 2) {
    const shellDeclaration = trimmed.match(
      /^(?:function\s+)?[A-Za-z_][\w-]*(?:\s*\(\))?\s*\{/,
    );
    if (shellDeclaration) return cleanLabel(shellDeclaration[0]);
  }

  return null;
}

function lineNumberAtOffset(lines: SourceLine[], offset: number) {
  let low = 0;
  let high = lines.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle].offset <= offset) low = middle + 1;
    else high = middle - 1;
  }
  return lines[Math.max(0, high)]?.line ?? 1;
}

function firstLineLabel(
  lines: SourceLine[],
  startOffset: number,
  endOffset: number,
  semanticLabels: Map<number, string>,
) {
  const semanticLine = lines.find(
    (line) =>
      line.offset >= startOffset &&
      line.offset < endOffset &&
      semanticLabels.has(line.offset),
  );
  if (semanticLine) return semanticLabels.get(semanticLine.offset)!;
  const firstVisible = lines.find(
    (line) =>
      line.offset >= startOffset && line.offset < endOffset && line.text.trim(),
  );
  return cleanLabel(firstVisible?.text ?? "continuation");
}

export function chunkProjectFileContent(
  content: string,
  rawExtension = "",
): ProjectFileChunk[] {
  if (!content) {
    return [
      {
        index: 1,
        startOffset: 0,
        endOffset: 0,
        startLine: 1,
        endLine: 1,
        characters: 0,
        label: "empty file",
        content: "",
      },
    ];
  }

  const extension = normalizeExtension(rawExtension);
  const lines = buildSourceLines(content);
  const semanticLabels = new Map<number, string>();
  for (const line of lines) {
    const label = semanticBoundaryLabel(line.text, extension);
    if (label) semanticLabels.set(line.offset, label);
  }

  const chunks: ProjectFileChunk[] = [];
  let startOffset = 0;
  while (startOffset < content.length) {
    const hardEnd = Math.min(
      content.length,
      startOffset + PROJECT_FILE_CONTEXT_LIMITS.maximumChunkChars,
    );
    let endOffset = hardEnd;

    if (hardEnd < content.length) {
      const minimumBoundary =
        startOffset + PROJECT_FILE_CONTEXT_LIMITS.minimumSemanticChunkChars;
      const semanticOffsets = [...semanticLabels.keys()].filter(
        (offset) => offset >= minimumBoundary && offset <= hardEnd,
      );
      const semanticEnd = semanticOffsets.at(-1);
      if (semanticEnd !== undefined) {
        endOffset = semanticEnd;
      } else {
        const lineEnd = lines
          .filter(
            (line) => line.offset >= minimumBoundary && line.offset <= hardEnd,
          )
          .at(-1)?.offset;
        if (lineEnd !== undefined) endOffset = lineEnd;
      }
    }

    if (endOffset <= startOffset) endOffset = hardEnd;
    const chunkContent = content.slice(startOffset, endOffset);
    const endLineOffset = Math.max(startOffset, endOffset - 1);
    chunks.push({
      index: chunks.length + 1,
      startOffset,
      endOffset,
      startLine: lineNumberAtOffset(lines, startOffset),
      endLine: lineNumberAtOffset(lines, endLineOffset),
      characters: chunkContent.length,
      label: firstLineLabel(lines, startOffset, endOffset, semanticLabels),
      content: chunkContent,
    });
    startOffset = endOffset;
  }

  return chunks;
}

function normalizeFocus(rawFocus: string | undefined) {
  const focus = (rawFocus ?? "").trim();
  if (/[\r\n\0]/.test(focus)) {
    throw new Error("read_project_file focus must be one plain-text line.");
  }
  if (focus.length > PROJECT_FILE_CONTEXT_LIMITS.maximumFocusChars) {
    throw new Error(
      `read_project_file focus must be ${PROJECT_FILE_CONTEXT_LIMITS.maximumFocusChars} characters or fewer.`,
    );
  }
  return focus;
}

function parseChunkSelector(rawChunk: string | undefined, chunkCount: number) {
  const value = (rawChunk ?? "").trim();
  if (!value) return null;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error("read_project_file chunk must be a 1-based integer.");
  }
  const selected = Number(value);
  if (!Number.isSafeInteger(selected) || selected > chunkCount) {
    throw new Error(
      `read_project_file chunk must be between 1 and ${chunkCount}.`,
    );
  }
  return selected;
}

function focusTokens(focus: string) {
  return [
    ...new Set(focus.toLowerCase().match(/[a-z0-9_$-]{2,}/g) ?? []),
  ].slice(0, PROJECT_FILE_CONTEXT_LIMITS.maximumFocusTokens);
}

function countOccurrences(haystack: string, needle: string) {
  let count = 0;
  let offset = 0;
  while (count < 20) {
    const match = haystack.indexOf(needle, offset);
    if (match === -1) break;
    count += 1;
    offset = match + Math.max(1, needle.length);
  }
  return count;
}

function selectFocusedChunks(chunks: ProjectFileChunk[], focus: string) {
  const normalizedFocus = focus.toLowerCase();
  const tokens = focusTokens(focus);
  const ranked = chunks
    .map((chunk) => {
      const haystack = `${chunk.label}\n${chunk.content}`.toLowerCase();
      let score =
        normalizedFocus && haystack.includes(normalizedFocus) ? 40 : 0;
      for (const token of tokens) {
        const weight = token.length >= 4 ? 3 : 1;
        score += countOccurrences(haystack, token) * weight;
        if (chunk.label.toLowerCase().includes(token)) score += 8;
      }
      return { chunk, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.chunk.index - right.chunk.index,
    );

  const hasMatch = ranked.some((candidate) => candidate.score > 0);
  const selected = (hasMatch ? ranked : chunks.map((chunk) => ({ chunk })))
    .slice(0, PROJECT_FILE_CONTEXT_LIMITS.maximumSelectedChunks)
    .map((candidate) => candidate.chunk)
    .sort((left, right) => left.index - right.index);
  return { selected, matched: hasMatch };
}

function manifestChunks(chunks: ProjectFileChunk[]) {
  if (chunks.length <= PROJECT_FILE_CONTEXT_LIMITS.maximumManifestEntries) {
    return chunks;
  }
  const half = Math.floor(
    PROJECT_FILE_CONTEXT_LIMITS.maximumManifestEntries / 2,
  );
  return [...chunks.slice(0, half), ...chunks.slice(-half)];
}

function formatManifest(chunks: ProjectFileChunk[]) {
  const visible = manifestChunks(chunks);
  const lines = visible.map(
    (chunk) =>
      `${chunk.index}. lines ${chunk.startLine}-${chunk.endLine} · ${chunk.characters} chars · ${chunk.label}`,
  );
  if (visible.length < chunks.length) {
    lines.splice(
      Math.floor(lines.length / 2),
      0,
      `… ${chunks.length - visible.length} middle chunks omitted from manifest …`,
    );
  }
  return lines.join("\n");
}

function formatLargeFileContext(
  content: string,
  chunks: ProjectFileChunk[],
  selected: ProjectFileChunk[],
  selectionLabel: string,
) {
  const header = [
    `[Large project file: ${content.length} chars · ${chunks.at(-1)?.endLine ?? 1} lines · ${chunks.length} semantic chunks]`,
    `[Selected chunks: ${selected.map((chunk) => chunk.index).join(", ")} · ${selectionLabel}]`,
    "",
    "CHUNK MANIFEST",
    formatManifest(chunks),
    "",
  ].join("\n");
  const suffix = [
    "",
    "[Read another section by calling read_project_file with the same path and chunk set to a manifest number, or provide a bounded focus hint.]",
  ].join("\n");

  let included = [...selected];
  const render = () =>
    `${header}${included
      .map(
        (chunk) =>
          `--- CHUNK ${chunk.index}/${chunks.length} · lines ${chunk.startLine}-${chunk.endLine} · ${chunk.label} ---\n${chunk.content}`,
      )
      .join("\n\n")}${suffix}`;

  while (
    included.length > 1 &&
    render().length > PROJECT_FILE_CONTEXT_LIMITS.maximumResponseChars
  ) {
    included = included.slice(0, -1);
  }
  const text = render();
  if (text.length > PROJECT_FILE_CONTEXT_LIMITS.maximumResponseChars) {
    throw new Error(
      "Project file context metadata exceeded the fixed response budget.",
    );
  }
  return { text, included };
}

export function buildProjectFileContext(
  content: string,
  options: ProjectFileContextOptions = {},
): ProjectFileContextResult {
  const focus = normalizeFocus(options.focus);
  const chunks = chunkProjectFileContent(content, options.extension);
  const selectedChunk = parseChunkSelector(options.chunk, chunks.length);

  if (content.length <= PROJECT_FILE_CONTEXT_LIMITS.maximumResponseChars) {
    return {
      text: content,
      chunkCount: 1,
      selectedChunkIndexes: [1],
      contextual: false,
    };
  }

  const focusedSelection = selectedChunk
    ? null
    : selectFocusedChunks(chunks, focus);
  const selected = selectedChunk
    ? [chunks[selectedChunk - 1]]
    : focusedSelection!.selected;
  const selectionLabel = selectedChunk
    ? "exact chunk selection"
    : focus && focusedSelection?.matched
      ? "focus-ranked locally"
      : focus
        ? "focus had no match; leading semantic context"
        : "leading semantic context";
  const formatted = formatLargeFileContext(
    content,
    chunks,
    selected,
    selectionLabel,
  );
  return {
    text: formatted.text,
    chunkCount: chunks.length,
    selectedChunkIndexes: formatted.included.map((chunk) => chunk.index),
    contextual: true,
  };
}

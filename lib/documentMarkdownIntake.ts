export type DocumentMarkdownFormat = "markdown" | "text" | "html" | "unsupported";

export interface DocumentMarkdownIntakeResult {
  format: DocumentMarkdownFormat;
  markdown: string;
  sourceHint: string;
  externalPattern: string;
}

const MARKITDOWN_SOURCE = {
  repo: "microsoft/markitdown",
  url: "https://github.com/microsoft/markitdown",
} as const;

export function detectDocumentFormat(filename: string, mimeHint?: string): DocumentMarkdownFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".txt")) return "text";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (mimeHint?.includes("markdown")) return "markdown";
  if (mimeHint?.includes("html")) return "html";
  if (mimeHint?.includes("text")) return "text";
  return "unsupported";
}

export function normalizeDocumentToMarkdown(input: {
  filename: string;
  content: string;
  mimeHint?: string;
}): DocumentMarkdownIntakeResult {
  const format = detectDocumentFormat(input.filename, input.mimeHint);
  const trimmed = input.content.trim();

  if (format === "markdown") {
    return {
      format,
      markdown: trimmed,
      sourceHint: "Native markdown passthrough.",
      externalPattern: MARKITDOWN_SOURCE.url,
    };
  }

  if (format === "text") {
    return {
      format,
      markdown: trimmed.split("\n").map((line) => line.trim()).join("\n\n"),
      sourceHint: "Plain text wrapped for agent intake.",
      externalPattern: MARKITDOWN_SOURCE.url,
    };
  }

  if (format === "html") {
    const text = trimmed
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return {
      format,
      markdown: text.slice(0, 12_000),
      sourceHint: "HTML stripped to text — for rich pages prefer fetch_url or Firecrawl BYOK.",
      externalPattern: MARKITDOWN_SOURCE.url,
    };
  }

  return {
    format: "unsupported",
    markdown: "",
    sourceHint: `Binary or office formats require external ${MARKITDOWN_SOURCE.repo} conversion before Vault intake.`,
    externalPattern: MARKITDOWN_SOURCE.url,
  };
}

export function buildDocumentMarkdownIntakeBlock(): string {
  return (
    `\n[DOCUMENT INTAKE — markitdown pattern]\n` +
    `Supported in Nexus: .md, .txt, stripped .html via document_to_markdown.\n` +
    `Binary: pass file_path (repo-relative) to document_to_markdown when MARKITDOWN_BIN is configured.\n` +
    `External fallback: PDF/DOCX/PPTX → run ${MARKITDOWN_SOURCE.repo} locally, then file to VAULT.\n` +
    `[END DOCUMENT INTAKE]\n`
  );
}

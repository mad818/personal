export type ArtifactType =
  | "compiled_memory_page"
  | "document_extract"
  | "market_review"
  | "vulnerability_review"
  | "ai_exposure_review"
  | "repo_assimilation"
  | "repo_compare"
  | "osint_casefile"
  | "vault_audit"
  | "study_brief"
  | "learning_note"
  | "review_sheet"
  | "quiz_set"
  | "reverse_engineering_brief"
  | "route_handler"
  | "app_surface"
  | "react_component"
  | "state_store"
  | "hook_module"
  | "security_module"
  | "workflow_module"
  | "shared_library"
  | "unknown";

export type ArtifactParserHint =
  | "markdown"
  | "plain_text"
  | "typescript"
  | "tsx"
  | "javascript"
  | "jsx"
  | "json"
  | "pdf"
  | "image"
  | "csv"
  | "unknown";

export type ArtifactSensitivity = "safe" | "internal" | "restricted";

export interface ArtifactClassification {
  artifactType: ArtifactType;
  confidence: number;
  parserHint: ArtifactParserHint;
  sensitive: boolean;
  sensitivity: ArtifactSensitivity;
  reasons: string[];
}

interface MemoryArtifactClassificationInput {
  workflowId?: string;
  route?: string;
  visibility: ArtifactSensitivity;
  tags: string[];
  content: string;
  documentMetadata?: {
    originLabel?: string;
    mimeType?: string;
    pageCount?: number;
  };
  researchSignals?: {
    structure?: "light" | "structured" | "document_heavy";
    sourceCount?: number;
  };
  continuity?: {
    artifactClass?: string;
  };
}

function uniqueReasons(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const reasons: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    reasons.push(normalized);
  }
  return reasons.slice(0, 4);
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  const bounded = Math.max(0.05, Math.min(0.99, value));
  return Math.round(bounded * 100) / 100;
}

function parserHintFromMimeType(mimeType?: string) {
  const normalized = mimeType?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("pdf")) return "pdf" as ArtifactParserHint;
  if (normalized.includes("json")) return "json" as ArtifactParserHint;
  if (normalized.includes("csv") || normalized.includes("spreadsheet")) {
    return "csv" as ArtifactParserHint;
  }
  if (normalized.startsWith("image/")) return "image" as ArtifactParserHint;
  if (normalized.startsWith("text/plain")) return "plain_text" as ArtifactParserHint;
  return null;
}

function parserHintFromOriginLabel(originLabel?: string) {
  const normalized = originLabel?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (normalized.endsWith(".pdf")) return "pdf" as ArtifactParserHint;
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(normalized)) return "image" as ArtifactParserHint;
  if (normalized.endsWith(".csv")) return "csv" as ArtifactParserHint;
  if (normalized.endsWith(".json")) return "json" as ArtifactParserHint;
  if (normalized.endsWith(".md")) return "markdown" as ArtifactParserHint;
  if (/\.(txt|log)$/i.test(normalized)) return "plain_text" as ArtifactParserHint;
  return null;
}

export function formatArtifactTypeLabel(type: ArtifactType) {
  return type
    .replace(/_/g, " ")
    .replace(/\bai\b/gi, "AI")
    .replace(/\bapi\b/gi, "API")
    .replace(/\bosint\b/gi, "OSINT")
    .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

export function formatArtifactParserHintLabel(hint: ArtifactParserHint) {
  return hint
    .replace(/_/g, " ")
    .replace(/\btsx\b/gi, "TSX")
    .replace(/\bpdf\b/gi, "PDF")
    .replace(/\bcsv\b/gi, "CSV")
    .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

export function classifyMemoryArtifact(
  input: MemoryArtifactClassificationInput,
): ArtifactClassification {
  const parserHint =
    parserHintFromMimeType(input.documentMetadata?.mimeType) ??
    parserHintFromOriginLabel(input.documentMetadata?.originLabel) ??
    "markdown";
  const sensitivity = input.visibility;
  const sensitive = sensitivity !== "safe";
  const workflowId = input.workflowId?.trim().toLowerCase();
  const artifactClass = input.continuity?.artifactClass?.trim().toLowerCase();
  const structure = input.researchSignals?.structure ?? "light";
  const sourceCount = input.researchSignals?.sourceCount ?? 0;

  if (workflowId === "market-review") {
    return {
      artifactType: "market_review",
      confidence: 0.98,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["workflow: market-review", input.route]),
    };
  }
  if (workflowId === "vuln-review") {
    return {
      artifactType: "vulnerability_review",
      confidence: 0.98,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["workflow: vuln-review", input.route]),
    };
  }
  if (workflowId === "ai-exposure-review") {
    return {
      artifactType: "ai_exposure_review",
      confidence: 0.98,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["workflow: ai-exposure-review", input.route]),
    };
  }
  if (workflowId === "repo-assimilation") {
    return {
      artifactType: "repo_assimilation",
      confidence: 0.98,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["workflow: repo-assimilation", input.route]),
    };
  }
  if (workflowId === "repo-compare") {
    return {
      artifactType: "repo_compare",
      confidence: 0.98,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["workflow: repo-compare", input.route]),
    };
  }
  if (workflowId === "osint-casefile") {
    return {
      artifactType: "osint_casefile",
      confidence: 0.97,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["workflow: osint-casefile", input.route]),
    };
  }
  if (workflowId === "vault-librarian" || workflowId === "vault-weekly") {
    return {
      artifactType: "vault_audit",
      confidence: 0.96,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons([`workflow: ${workflowId}`, input.route]),
    };
  }
  if (artifactClass === "study_brief") {
    return {
      artifactType: "study_brief",
      confidence: 0.95,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["artifact class: study_brief", input.route]),
    };
  }
  if (artifactClass === "learning_note") {
    return {
      artifactType: "learning_note",
      confidence: 0.95,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["artifact class: learning_note", input.route]),
    };
  }
  if (artifactClass === "review_sheet") {
    return {
      artifactType: "review_sheet",
      confidence: 0.95,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["artifact class: review_sheet", input.route]),
    };
  }
  if (artifactClass === "quiz_set") {
    return {
      artifactType: "quiz_set",
      confidence: 0.95,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons(["artifact class: quiz_set", input.route]),
    };
  }
  if (
    artifactClass === "reverse_engineering_brief" ||
    artifactClass === "reverse_engineering_prep"
  ) {
    return {
      artifactType: "reverse_engineering_brief",
      confidence: 0.95,
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons([`artifact class: ${artifactClass}`, input.route]),
    };
  }
  if (
    parserHint === "pdf" ||
    parserHint === "image" ||
    parserHint === "csv" ||
    Boolean(input.documentMetadata?.pageCount) ||
    structure === "document_heavy"
  ) {
    return {
      artifactType: "document_extract",
      confidence: clampConfidence(
        parserHint === "pdf" || Boolean(input.documentMetadata?.pageCount)
          ? 0.92
          : 0.84,
      ),
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons([
        input.documentMetadata?.mimeType ? `mime: ${input.documentMetadata.mimeType}` : null,
        input.documentMetadata?.pageCount ? "multi-page document" : null,
        structure === "document_heavy" ? "document-heavy structure" : null,
      ]),
    };
  }
  if (sourceCount > 0 || structure === "structured") {
    return {
      artifactType: "compiled_memory_page",
      confidence: clampConfidence(sourceCount > 1 ? 0.82 : 0.74),
      parserHint,
      sensitive,
      sensitivity,
      reasons: uniqueReasons([
        sourceCount > 0 ? `${sourceCount} cited source${sourceCount === 1 ? "" : "s"}` : null,
        structure === "structured" ? "structured research signals" : null,
        input.route,
      ]),
    };
  }
  return {
    artifactType: "compiled_memory_page",
    confidence: 0.64,
    parserHint,
    sensitive,
    sensitivity,
    reasons: uniqueReasons([
      input.tags.includes("compiled") ? "compiled artifact" : null,
      input.route,
      input.content.trim() ? "durable content available" : null,
    ]),
  };
}

export function classifyProjectArtifact(
  path: string,
  source = "",
): ArtifactClassification {
  const normalizedPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const lowerPath = normalizedPath.toLowerCase();
  const lowerSource = source.toLowerCase();
  const parserHint: ArtifactParserHint = lowerPath.endsWith(".tsx")
    ? "tsx"
    : lowerPath.endsWith(".ts")
      ? "typescript"
      : lowerPath.endsWith(".jsx")
        ? "jsx"
        : lowerPath.endsWith(".js")
          ? "javascript"
          : lowerPath.endsWith(".json")
            ? "json"
            : "unknown";

  let artifactType: ArtifactType = "unknown";
  let confidence = 0.58;
  const reasons: Array<string | null | undefined> = [];

  if (lowerPath.startsWith("app/api/") || /\/route\.(ts|tsx|js|jsx)$/i.test(normalizedPath)) {
    artifactType = "route_handler";
    confidence = 0.97;
    reasons.push("server route");
  } else if (
    lowerPath.startsWith("app/") &&
    /\/(?:page|layout|loading|error)\.(ts|tsx|js|jsx)$/i.test(normalizedPath)
  ) {
    artifactType = "app_surface";
    confidence = 0.96;
    reasons.push("app surface entry");
  } else if (lowerPath.startsWith("components/")) {
    artifactType = "react_component";
    confidence = 0.95;
    reasons.push("component path");
  } else if (lowerPath.startsWith("store/")) {
    artifactType = "state_store";
    confidence = 0.97;
    reasons.push("state store path");
  } else if (lowerPath.startsWith("hooks/")) {
    artifactType = "hook_module";
    confidence = 0.95;
    reasons.push("hook path");
  } else if (lowerPath.startsWith("lib/security/")) {
    artifactType = "security_module";
    confidence = 0.98;
    reasons.push("security library path");
  } else if (
    lowerPath.startsWith("lib/") &&
    /(workflow|mission|prompt|assimilation|compare|review|weekly|librarian|triage)/i.test(
      normalizedPath,
    )
  ) {
    artifactType = "workflow_module";
    confidence = 0.88;
    reasons.push("workflow-oriented library");
  } else if (lowerPath.startsWith("lib/")) {
    artifactType = "shared_library";
    confidence = 0.84;
    reasons.push("shared library");
  }

  let sensitivity: ArtifactSensitivity = "safe";
  if (
    lowerPath.startsWith("lib/security/") ||
    lowerPath.startsWith("app/api/") ||
    /(token|secret|password|bearer|nexus_token|privacy shield|tool isolation|credential)/i.test(
      lowerSource,
    )
  ) {
    sensitivity = "internal";
    reasons.push("internal runtime or trust surface");
  }
  if (
    /(operator-only|for operator eyes only|sensitive incident evidence|chain of custody)/i.test(
      lowerSource,
    )
  ) {
    sensitivity = "restricted";
    reasons.push("restricted evidence marker");
  }

  return {
    artifactType,
    confidence: clampConfidence(confidence),
    parserHint,
    sensitive: sensitivity !== "safe",
    sensitivity,
    reasons: uniqueReasons(reasons),
  };
}

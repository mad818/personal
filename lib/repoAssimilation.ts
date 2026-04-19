import { normalizeSessionHref } from "@/lib/exactSessionLinks";
import {
  inferEvidenceStrength,
  type EvidenceStrength,
  type ResearchSourceRef,
} from "@/lib/researchSources";
import type { RepoIntelProfile } from "@/lib/repoIntel";

export const REPO_ASSIMILATION_SECTION_HEADINGS = [
  "Repo snapshot",
  "Essence prompt",
  "Nexus fit map",
  "Safe adoption points",
  "Boundaries and risks",
  "ORBIT handoff",
] as const;

export interface RepoAssimilationSections {
  repoSnapshot: string;
  essencePrompt: string;
  nexusFitMap: string;
  safeAdoptionPoints: string;
  boundariesAndRisks: string;
  orbitHandoff: string;
}

export interface RepoAssimilationResult {
  brief: string;
  profile: RepoIntelProfile;
  cacheHit: boolean;
  warnings: string[];
}

export interface RepoAssimilationDeps {
  getProfile: (
    rawRepoReference: string,
  ) => Promise<{ profile: RepoIntelProfile; cacheHit: boolean }>;
  synthesize: (profile: RepoIntelProfile) => Promise<string>;
}

const GITHUB_URL_RE =
  /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/i;
const OWNER_REPO_RE = /\b[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}\b/;
const REPO_ASSIMILATION_RE =
  /\b(?:assimilate|assimilation|adapt|adopt|fit|fit map|reference this repo|should we adopt this|should we use this|safe adoption)\b/i;

function cleanInline(value: string, max = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0),
    ),
  );
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

function parseMarkdownSections(content: string) {
  const sections = new Map<string, string>();
  const matches = Array.from(
    content.matchAll(/^## ([^\n]+)\n([\s\S]*?)(?=^## |\s*$)/gm),
  );
  for (const match of matches) {
    const heading = match[1]?.trim().toLowerCase();
    if (!heading) continue;
    sections.set(heading, (match[2] ?? "").trim());
  }
  return sections;
}

function firstMeaningfulLine(value: string) {
  return (
    value
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .find((line) => line.length > 0) ?? ""
  );
}

function repoSignalText(profile: RepoIntelProfile) {
  return [
    profile.description,
    profile.readmeExcerpt,
    profile.topics.join(" "),
    profile.inferredStack.join(" "),
    profile.languageHints.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function inferNexusFitLines(profile: RepoIntelProfile) {
  const signal = repoSignalText(profile);
  const lines: string[] = [];

  if (/\b(trad|market|portfolio|watchlist|signal|alpha)\b/i.test(signal)) {
    lines.push(
      "- ALPHA / HQ: adapt thesis-review or decision-support patterns without turning Nexus into an execution or broker surface.",
    );
  }
  if (
    /\b(osint|intel|threat|cyber|security|headers|dns|metadata|recon)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- RECON / CYBER: reuse passive-first assessment or evidence-shaping ideas, but keep tooling bounded to local trust rules.",
    );
  }
  if (
    /\b(research|analysis|paper|knowledge|assistant|agent|ai|model|report)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- INTEL / HQ: adapt synthesis, briefing, or research-flow ideas through existing NOVA and assistant-first seams.",
    );
  }
  if (
    /\b(memory|notes|vault|obsidian|knowledge base|archive|recall)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- VAULT: preserve durable memory, artifact continuity, or archive cues as native compiled-page behavior instead of mirroring the upstream product.",
    );
  }
  if (/\b(workflow|scheduler|automation|job|queue|ops)\b/i.test(signal)) {
    lines.push(
      "- HQ / COMMAND: borrow orchestration or queue posture only where the current governance and review gates already exist.",
    );
  }
  if (/\b(vehicle|drone|radar|sensor|telemetry)\b/i.test(signal)) {
    lines.push(
      "- VEHICLE: absorb readiness or artifact ideas without widening into control authority, RF command, or new route families.",
    );
  }

  if (lines.length === 0) {
    lines.push(
      "- HQ / RESOURCES: treat this repo as a reference pattern and move forward only if ORBIT can translate it into a small local slice without copying the upstream shape.",
    );
  }

  lines.push(
    "- RECON repo intel stays the front door so assessment remains metadata-first before any local implementation planning starts.",
  );
  lines.push(
    "- VAULT is the durable landing zone for finished assimilation briefs so the fit decision can reopen exactly later.",
  );
  return uniqueStrings(lines).slice(0, 5);
}

function inferSafeAdoptionLines(profile: RepoIntelProfile) {
  const names = profile.topLevelTree.map((entry) => entry.name.toLowerCase());
  const lines: string[] = [];

  if (
    names.includes("app") ||
    names.includes("components") ||
    names.includes("src")
  ) {
    lines.push(
      "- Adapt route boundaries or component decomposition patterns locally instead of mirroring the upstream directory tree.",
    );
  }
  if (names.includes("lib") || names.includes("packages") || names.includes("src")) {
    lines.push(
      "- Reuse helper-layer ideas, typed contracts, or orchestration boundaries first before touching shell-wide UX.",
    );
  }
  if (names.includes("docs") || names.includes("readme.md")) {
    lines.push(
      "- Borrow framing, vocabulary, or workflow language from the docs and README, but rewrite it in Nexus-native operator terms.",
    );
  }
  if (profile.inferredStack.some((stack) => /next|react|typescript|node/i.test(stack))) {
    lines.push(
      "- Translate compatible web patterns through the existing Next.js and TypeScript stack only where Nexus already has matching seams.",
    );
  }

  lines.push(
    "- Keep any final outcome as a Nexus-local implementation plan, helper, or playbook rather than vendoring repo code or assets.",
  );
  return uniqueStrings(lines).slice(0, 5);
}

function buildFallbackRepoAssimilationSections(
  profile: RepoIntelProfile,
  warnings: string[],
): RepoAssimilationSections {
  const stackLabel =
    profile.inferredStack.join(", ") ||
    profile.languageHints.join(", ") ||
    "No clear stack signal";
  const treeLabel =
    profile.topLevelTree
      .slice(0, 6)
      .map((entry) => `${entry.type === "dir" ? "dir" : "file"}:${entry.name}`)
      .join(", ") || "Top-level tree unavailable.";
  const metadataCoverage =
    profile.readmeExcerpt.trim().length > 0
      ? "README plus public GitHub metadata were available."
      : "README signal was missing, so the fit map relies on public GitHub metadata only.";

  return {
    repoSnapshot: cleanInline(
      `${profile.displayName} is a public GitHub repo for ${profile.description || "an upstream pattern with sparse description"}. Likely stack: ${stackLabel}. Tree cues: ${treeLabel}. ${metadataCoverage}`,
      420,
    ),
    essencePrompt: cleanInline(
      `Treat ${profile.normalizedRepoId} as a reference pattern for ${profile.description || "its visible operator workflow"}, then re-express the useful behavior through existing Nexus routes and contracts instead of mirroring the upstream product or repo layout.`,
      320,
    ),
    nexusFitMap: inferNexusFitLines(profile).join("\n"),
    safeAdoptionPoints: inferSafeAdoptionLines(profile).join("\n"),
    boundariesAndRisks: uniqueStrings([
      "- Stay public-safe and metadata-grounded; do not fetch private repos, arbitrary source files, or background GitHub data.",
      "- Do not import upstream code directly; translate only the smallest locally justified pattern.",
      profile.readmeExcerpt.trim().length === 0
        ? "- README coverage is missing, so adoption confidence stays lower until the repo is reviewed more deeply."
        : null,
      warnings.length > 0 ? `- Degraded signals: ${warnings.join(" ")}` : null,
    ]).join("\n"),
    orbitHandoff:
      "Ask ORBIT to turn this fit map into a smallest-first local implementation plan, keeping explicit non-goals and avoiding direct upstream code import.",
  };
}

function toSectionString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRepoAssimilationJson(value: string): RepoAssimilationSections | null {
  const payload = extractJsonObject(value);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      repoSnapshot: toSectionString(parsed.repoSnapshot),
      essencePrompt: toSectionString(parsed.essencePrompt),
      nexusFitMap: toSectionString(parsed.nexusFitMap),
      safeAdoptionPoints: toSectionString(parsed.safeAdoptionPoints),
      boundariesAndRisks: toSectionString(parsed.boundariesAndRisks),
      orbitHandoff: toSectionString(parsed.orbitHandoff),
    };
  } catch {
    return null;
  }
}

function withFallbackSection(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function formatRepoAssimilationBrief(
  sections: RepoAssimilationSections,
) {
  const bodies = [
    sections.repoSnapshot,
    sections.essencePrompt,
    sections.nexusFitMap,
    sections.safeAdoptionPoints,
    sections.boundariesAndRisks,
    sections.orbitHandoff,
  ];

  return REPO_ASSIMILATION_SECTION_HEADINGS.map((heading, index) => {
    const body = bodies[index]?.trim() || "No signal recorded.";
    return `## ${heading}\n${body}`;
  }).join("\n\n");
}

export function parseRepoAssimilationMarkdown(
  content: string,
): RepoAssimilationSections {
  const sections = parseMarkdownSections(content);
  return {
    repoSnapshot: sections.get("repo snapshot") ?? "",
    essencePrompt: sections.get("essence prompt") ?? "",
    nexusFitMap: sections.get("nexus fit map") ?? "",
    safeAdoptionPoints: sections.get("safe adoption points") ?? "",
    boundariesAndRisks: sections.get("boundaries and risks") ?? "",
    orbitHandoff: sections.get("orbit handoff") ?? "",
  };
}

export function buildRepoAssimilationTitle(profile: RepoIntelProfile) {
  return `Repo assimilation · ${profile.normalizedRepoId}`;
}

export function buildRepoAssimilationSummary(
  profile: RepoIntelProfile,
  brief: string,
) {
  const sections = parseRepoAssimilationMarkdown(brief);
  const fitLine = firstMeaningfulLine(sections.nexusFitMap);
  const safeLine = firstMeaningfulLine(sections.safeAdoptionPoints);
  return cleanInline(
    [
      `${profile.normalizedRepoId} fit review.`,
      fitLine,
      safeLine,
    ]
      .filter(Boolean)
      .join(" "),
    220,
  );
}

export function buildRepoAssimilationTags(profile: RepoIntelProfile) {
  return uniqueStrings([
    "repo-assimilation",
    `repo:${slugify(profile.normalizedRepoId)}`,
    ...profile.inferredStack.slice(0, 3).map((stack) => `stack:${slugify(stack)}`),
  ]);
}

export function hasRepoAssimilationReadmeSignal(
  profileOrBrief: Pick<
    RepoIntelProfile,
    "readmeExcerpt"
  > | string,
) {
  if (typeof profileOrBrief === "string") {
    return !/readme (?:excerpt )?(?:unavailable|signal was missing)/i.test(
      profileOrBrief,
    );
  }
  return profileOrBrief.readmeExcerpt.trim().length > 0;
}

export function buildRepoAssimilationSourceRefs(
  profile: Pick<RepoIntelProfile, "normalizedRepoId" | "sourceUrl" | "readmeExcerpt">,
): ResearchSourceRef[] {
  const refs: ResearchSourceRef[] = [
    {
      id: `github:${profile.normalizedRepoId}`,
      title: `${profile.normalizedRepoId} repo root`,
      href: profile.sourceUrl,
      sourceType: "citation",
      evidenceStrength: "source-backed",
      inferred: false,
    },
  ];

  if (hasRepoAssimilationReadmeSignal(profile)) {
    refs.push({
      id: `github:${profile.normalizedRepoId}:readme`,
      title: `${profile.normalizedRepoId} README`,
      href: `${profile.sourceUrl}#readme`,
      sourceType: "citation",
      evidenceStrength: "source-backed",
      inferred: false,
    });
  }

  return refs;
}

export function buildRepoAssimilationEvidenceStrength(
  profile: RepoIntelProfile,
): EvidenceStrength {
  const sourceRefs = buildRepoAssimilationSourceRefs(profile);
  const metadataSignals = [
    profile.description.trim().length > 0,
    profile.topics.length > 0,
    profile.inferredStack.length > 0 || profile.languageHints.length > 0,
    profile.topLevelTree.length > 0,
  ].filter(Boolean).length;

  if (profile.readmeExcerpt.trim().length > 0 && metadataSignals >= 3) {
    return "synthesis-ready";
  }

  return inferEvidenceStrength({
    sourceType: "citation",
    sourceCount: sourceRefs.length,
    citationCount: sourceRefs.length,
  });
}

export function buildRepoAssimilationPreparedWorkspace() {
  const href = normalizeSessionHref("/recon?view=osint&focus=recon-repo-intel");
  return {
    href,
    label: "Open RECON repo assimilation",
    detail:
      "Prepared the repo-intel lane so a public-safe assimilation brief can be assessed, filed, and handed to ORBIT without widening into direct code import.",
  };
}

export function buildRepoAssimilationOrbitPrompt(input: {
  normalizedRepoId: string;
  brief: string;
}) {
  const sections = parseRepoAssimilationMarkdown(input.brief);
  return [
    `Use the saved repo assimilation brief for ${input.normalizedRepoId} as the planning constraint set for local Nexus work.`,
    `Repo snapshot: ${sections.repoSnapshot || "No snapshot recorded."}`,
    `Essence prompt: ${sections.essencePrompt || "No essence prompt recorded."}`,
    `Nexus fit map: ${sections.nexusFitMap || "No fit map recorded."}`,
    `Safe adoption points: ${sections.safeAdoptionPoints || "No safe-adoption notes recorded."}`,
    `Boundaries and risks: ${sections.boundariesAndRisks || "No boundary notes recorded."}`,
    `ORBIT handoff: ${sections.orbitHandoff || "No ORBIT handoff recorded."}`,
    "Respond with: 1. local fit, 2. safest first implementation slice, 3. explicit non-goals and boundaries to preserve.",
    "Do not import or mirror upstream code directly.",
  ].join("\n");
}

export function buildRepoAssimilationSynthesisPrompt(
  profile: RepoIntelProfile,
) {
  const treeBlock =
    profile.topLevelTree.length > 0
      ? profile.topLevelTree
          .slice(0, 10)
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.type === "dir" ? "dir" : "file"}:${entry.name}`,
          )
          .join("\n")
      : "Top-level tree unavailable.";

  return [
    "You are Nexus Prime's repo-assimilation engine.",
    "Return JSON only.",
    "Use this exact shape:",
    "{",
    '  "repoSnapshot": "string",',
    '  "essencePrompt": "string",',
    '  "nexusFitMap": "string",',
    '  "safeAdoptionPoints": "string",',
    '  "boundariesAndRisks": "string",',
    '  "orbitHandoff": "string"',
    "}",
    "",
    "Rules:",
    "- Use only the supplied public GitHub metadata, README excerpt, stack hints, topics, and top-level tree.",
    "- Keep the writing compact, operator-grade, and explicitly public-safe.",
    "- Do not recommend direct code import, vendoring, GitHub write actions, or private-repo assumptions.",
    "- In nexusFitMap and safeAdoptionPoints, use short bullet-style lines separated by newlines.",
    "- In boundariesAndRisks, explicitly mention missing README or sparse metadata when relevant.",
    "",
    `REPO: ${profile.normalizedRepoId}`,
    `SOURCE URL: ${profile.sourceUrl}`,
    `DISPLAY NAME: ${profile.displayName}`,
    `DESCRIPTION: ${profile.description || "No GitHub description available."}`,
    `TOPICS: ${profile.topics.join(", ") || "none"}`,
    `STACK: ${profile.inferredStack.join(", ") || profile.languageHints.join(", ") || "unknown"}`,
    `STATS: ${profile.stars} stars · ${profile.forks} forks · ${profile.watchers} watchers`,
    `LICENSE: ${profile.license ?? "unknown"}`,
    `DEFAULT BRANCH: ${profile.defaultBranch ?? "unknown"}`,
    "",
    "TOP-LEVEL TREE:",
    treeBlock,
    "",
    "README EXCERPT:",
    profile.readmeExcerpt || "README excerpt unavailable.",
    "",
    "WARNINGS:",
    profile.warnings.length > 0 ? profile.warnings.join(" | ") : "None.",
  ].join("\n");
}

export function hasRepoAssimilationSignal(input: string) {
  if (!REPO_ASSIMILATION_RE.test(input)) return false;
  return GITHUB_URL_RE.test(input) || OWNER_REPO_RE.test(input);
}

export async function runRepoAssimilation(
  rawRepoReference: string,
  deps: RepoAssimilationDeps,
): Promise<RepoAssimilationResult> {
  const { profile, cacheHit } = await deps.getProfile(rawRepoReference);
  const warnings = [...profile.warnings];
  const fallback = buildFallbackRepoAssimilationSections(profile, warnings);

  try {
    const synthesized = await deps.synthesize(profile);
    const parsed = parseRepoAssimilationJson(synthesized);
    if (parsed) {
      return {
        profile,
        cacheHit,
        warnings,
        brief: formatRepoAssimilationBrief({
          repoSnapshot: withFallbackSection(
            parsed.repoSnapshot,
            fallback.repoSnapshot,
          ),
          essencePrompt: withFallbackSection(
            parsed.essencePrompt,
            fallback.essencePrompt,
          ),
          nexusFitMap: withFallbackSection(
            parsed.nexusFitMap,
            fallback.nexusFitMap,
          ),
          safeAdoptionPoints: withFallbackSection(
            parsed.safeAdoptionPoints,
            fallback.safeAdoptionPoints,
          ),
          boundariesAndRisks: withFallbackSection(
            parsed.boundariesAndRisks,
            fallback.boundariesAndRisks,
          ),
          orbitHandoff: withFallbackSection(
            parsed.orbitHandoff,
            fallback.orbitHandoff,
          ),
        }),
      };
    }
    warnings.push("AI synthesis returned an invalid JSON payload.");
  } catch {
    warnings.push("AI synthesis failed.");
  }

  return {
    profile,
    cacheHit,
    warnings,
    brief: formatRepoAssimilationBrief(
      buildFallbackRepoAssimilationSections(profile, warnings),
    ),
  };
}

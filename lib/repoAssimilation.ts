import { normalizeSessionHref } from "@/lib/exactSessionLinks";
import {
  inferEvidenceStrength,
  type EvidenceStrength,
  type ResearchSourceRef,
} from "@/lib/researchSources";
import type { RepoIntelProfile } from "@/lib/repoIntel";

export const REPO_ASSIMILATION_SECTION_HEADINGS = [
  "Repo snapshot",
  "Local fit and why now",
  "Implementation decision",
  "Extension points and smallest slice",
  "Boundaries and risks",
  "ORBIT handoff",
] as const;

export type RepoAssimilationDecision = "adopt" | "adapt" | "reject";

export interface RepoAssimilationSections {
  repoSnapshot: string;
  localFitAndWhyNow: string;
  implementationDecision: string;
  extensionPointsAndSmallestSlice: string;
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
const OFFENSIVE_REPO_SIGNAL_RE =
  /\b(?:exploit|offensive|post-?exploitation|payload|keylogger|phishing|credential stuffing|ransomware|pentest|c2|command-and-control|dropper)\b/i;
const DIRECT_SEAM_SIGNAL_RE =
  /\b(?:privacy|redaction|anonymization|artifact|classification|repo|workflow|memory|archive|vault|osint|recon|intel|research|sandbox|tool isolation|evaluation|eval|prompt|routing)\b/i;

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

function chooseAssimilationDecision(
  profile: RepoIntelProfile,
): RepoAssimilationDecision {
  const signal = repoSignalText(profile);
  const metadataStrength =
    (profile.readmeExcerpt.trim().length > 0 ? 2 : 0) +
    (profile.description.trim().length > 0 ? 1 : 0) +
    (profile.topics.length > 0 ? 1 : 0) +
    (profile.inferredStack.length > 0 || profile.languageHints.length > 0
      ? 1
      : 0) +
    (profile.topLevelTree.length > 0 ? 1 : 0);

  if (OFFENSIVE_REPO_SIGNAL_RE.test(signal)) {
    return "reject";
  }

  if (
    DIRECT_SEAM_SIGNAL_RE.test(signal) &&
    metadataStrength >= 5 &&
    !/\b(media|video|audio|animation|recording|avatar|hyperframe)\b/i.test(
      signal,
    )
  ) {
    return "adopt";
  }

  return "adapt";
}

function inferLocalFitLines(profile: RepoIntelProfile) {
  const signal = repoSignalText(profile);
  const lines: string[] = [];

  if (/\b(trad|market|portfolio|watchlist|signal|alpha)\b/i.test(signal)) {
    lines.push(
      "- Best landing zone: ALPHA / HQ thesis-review seams, where the pattern can improve operator decision support without turning Nexus into an execution surface.",
    );
  }
  if (
    /\b(osint|intel|threat|cyber|security|headers|dns|metadata|recon)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- Best landing zone: RECON / CYBER passive-first assessment and evidence-filing seams, because Nexus already stages advisory-only review there.",
    );
  }
  if (
    /\b(research|analysis|paper|knowledge|assistant|agent|ai|model|report|eval)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- Best landing zone: HQ / INTEL runtime and briefing seams, where synthesis, evaluation, or workflow posture can be translated into existing assistant contracts.",
    );
  }
  if (
    /\b(memory|notes|vault|obsidian|knowledge base|archive|recall)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- Best landing zone: VAULT compiled-page and continuity seams, because Nexus already preserves durable recall and archive posture there.",
    );
  }
  if (
    /\b(workflow|scheduler|automation|job|queue|ops|orchestration)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- Why now: Nexus already has workflow commands, post-run artifact filing, and exact reopen behavior, so the useful pattern can land as a bounded operator workflow instead of a new subsystem.",
    );
  }
  if (
    /\b(repo|repository|codebase|compare|implementation|extension point|impact)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- Why now: RECON repo intel, repo compare, and Resources impact already exist, so this repo can translate into a stronger implementation brief instead of another broad ecosystem summary.",
    );
  }

  if (lines.length === 0) {
    lines.push(
      "- Best landing zone: HQ / RESOURCES reference-pattern work, but only if the upstream idea can become one bounded local helper, panel, or playbook.",
    );
  }

  lines.push(
    "- Keep repo assessment metadata-first in RECON and file the durable decision to VAULT before any implementation planning widens.",
  );
  return uniqueStrings(lines).slice(0, 4);
}

function inferExtensionPointLines(profile: RepoIntelProfile) {
  const signal = repoSignalText(profile);
  const lines: string[] = [];

  if (
    /\b(repo|compare|dependency|reference library|implementation brief)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- RECON implementation brief seam: `components/recon/RepoIntelPanel.tsx`, `lib/repoAssimilation.ts`, and `lib/repoCompare.ts`.",
    );
  }
  if (
    /\b(osint|intel|threat|cyber|security|metadata|evidence)\b/i.test(signal)
  ) {
    lines.push(
      "- Evidence and advisory filing seam: `app/recon/page.tsx`, `app/cyber/page.tsx`, and `components/vault/CompiledMemoryPagesPanel.tsx`.",
    );
  }
  if (/\b(memory|archive|vault|knowledge|recall|compiled)\b/i.test(signal)) {
    lines.push(
      "- Durable archive seam: `components/vault/CompiledMemoryPagesPanel.tsx`, `lib/memoryPagesStore.ts`, and `lib/artifactClassification.ts`.",
    );
  }
  if (
    /\b(agent|assistant|workflow|queue|orchestration|handoff|brief)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- HQ handoff seam: `components/home/office/workflowCommands.ts`, `components/home/office/officeCommandCenterPostRun.ts`, and `lib/liveContext.ts`.",
    );
  }
  if (
    /\b(privacy|redaction|anonymization|provider|cloud-bound)\b/i.test(signal)
  ) {
    lines.push(
      "- Provider-boundary seam: `app/api/ai/route.ts`, `lib/privacyShieldServer.ts`, and `components/ui/TrustPostureStrip.tsx`.",
    );
  }
  if (/\b(sandbox|tool isolation|exec|runner|workflow run)\b/i.test(signal)) {
    lines.push(
      "- Tool-governance seam: `app/api/tools/route.ts`, `lib/security/toolIsolationPolicy.ts`, and `lib/security/toolIsolationRunner.ts`.",
    );
  }
  if (
    /\b(file|artifact|classification|inspection|project|ownership|impact)\b/i.test(
      signal,
    )
  ) {
    lines.push(
      "- Project inspection seam: `components/resources/ProjectImpactConsole.tsx`, `lib/projectArchitecture.ts`, and `lib/artifactClassification.ts`.",
    );
  }

  lines.push(
    "- Smallest slice first: land one helper, parser, or route-local panel change before any shell-wide redesign or upstream code copy.",
  );
  return uniqueStrings(lines).slice(0, 5);
}

function buildImplementationDecisionSection(profile: RepoIntelProfile) {
  const decision = chooseAssimilationDecision(profile);
  const decisionLabel = formatRepoAssimilationDecisionLabel(decision);
  const lines = [`- Decision: ${decisionLabel.toLowerCase()}.`];

  if (decision === "reject") {
    lines.push(
      "- Why: the visible repo signals drift into offensive, automation-heavy, or otherwise out-of-scope behavior for Nexus's advisory-only boundary.",
    );
    lines.push(
      "- Operator stance: keep this repo as reference-only context and look for a safer internal seam or defensive-only analogue instead of implementation.",
    );
    return lines.join("\n");
  }

  if (decision === "adopt") {
    lines.push(
      "- Why: the repo maps tightly to an existing Nexus seam with enough public metadata to justify a bounded local translation now.",
    );
    lines.push(
      "- Guardrail: adopt the operator pattern, contract, or workflow posture only; do not import upstream code, directory structure, or product framing wholesale.",
    );
    return lines.join("\n");
  }

  lines.push(
    "- Why: the fit is real, but the upstream product shape still needs translation into Nexus-native seams, language, and governance.",
  );
  lines.push(
    "- Guardrail: use the repo as a design or workflow reference, then rewrite the implementation around the smallest justified local slice.",
  );
  return lines.join("\n");
}

function buildDecisionTag(decision: RepoAssimilationDecision) {
  return `decision:${decision}`;
}

function parseDecisionFromText(value: string) {
  const normalized = value.toLowerCase();
  if (
    /\bdecision:\s*reject\b/.test(normalized) ||
    /\breject\b/.test(normalized)
  ) {
    return "reject" as const;
  }
  if (
    /\bdecision:\s*adopt\b/.test(normalized) ||
    /\badopt\b/.test(normalized)
  ) {
    return "adopt" as const;
  }
  if (
    /\bdecision:\s*adapt\b/.test(normalized) ||
    /\badapt\b/.test(normalized)
  ) {
    return "adapt" as const;
  }
  return null;
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
      : "README signal was missing, so the brief relies on public GitHub metadata only.";

  return {
    repoSnapshot: cleanInline(
      `${profile.displayName} is a public GitHub repo for ${profile.description || "an upstream pattern with sparse description"}. Likely stack: ${stackLabel}. Tree cues: ${treeLabel}. ${metadataCoverage}`,
      420,
    ),
    localFitAndWhyNow: inferLocalFitLines(profile).join("\n"),
    implementationDecision: buildImplementationDecisionSection(profile),
    extensionPointsAndSmallestSlice:
      inferExtensionPointLines(profile).join("\n"),
    boundariesAndRisks: uniqueStrings([
      "- Stay public-safe and metadata-grounded; do not fetch private repos, arbitrary source files, or background GitHub data.",
      "- Do not import upstream code directly; keep the outcome as a Nexus-local helper, panel, parser, playbook, or route-side contract change.",
      profile.readmeExcerpt.trim().length === 0
        ? "- README coverage is missing, so implementation confidence stays lower until the repo is reviewed more deeply."
        : null,
      warnings.length > 0 ? `- Degraded signals: ${warnings.join(" ")}` : null,
    ]).join("\n"),
    orbitHandoff:
      "- Ask ORBIT to preserve the recorded decision, propose the smallest local slice, name the actual Nexus files or seams to touch first, and keep explicit upstream boundaries intact.",
  };
}

function toSectionString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRepoAssimilationJson(
  value: string,
): RepoAssimilationSections | null {
  const payload = extractJsonObject(value);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      repoSnapshot: toSectionString(parsed.repoSnapshot),
      localFitAndWhyNow:
        toSectionString(parsed.localFitAndWhyNow) ||
        toSectionString(parsed.nexusFitMap) ||
        toSectionString(parsed.essencePrompt),
      implementationDecision: toSectionString(parsed.implementationDecision),
      extensionPointsAndSmallestSlice:
        toSectionString(parsed.extensionPointsAndSmallestSlice) ||
        toSectionString(parsed.safeAdoptionPoints),
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
    sections.localFitAndWhyNow,
    sections.implementationDecision,
    sections.extensionPointsAndSmallestSlice,
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
  const localFitAndWhyNow =
    sections.get("local fit and why now") ??
    sections.get("nexus fit map") ??
    sections.get("essence prompt") ??
    "";
  const implementationDecisionText =
    sections.get("implementation decision") ?? "";
  const inferredDecision =
    parseDecisionFromText(implementationDecisionText) ??
    parseDecisionFromText(
      [
        localFitAndWhyNow,
        sections.get("safe adoption points") ?? "",
        sections.get("orbit handoff") ?? "",
      ].join("\n"),
    ) ??
    "adapt";
  return {
    repoSnapshot: sections.get("repo snapshot") ?? "",
    localFitAndWhyNow,
    implementationDecision:
      implementationDecisionText ||
      `- Decision: ${formatRepoAssimilationDecisionLabel(inferredDecision).toLowerCase()}.`,
    extensionPointsAndSmallestSlice:
      sections.get("extension points and smallest slice") ??
      sections.get("safe adoption points") ??
      "",
    boundariesAndRisks: sections.get("boundaries and risks") ?? "",
    orbitHandoff: sections.get("orbit handoff") ?? "",
  };
}

export function getRepoAssimilationDecision(
  sections: RepoAssimilationSections,
): RepoAssimilationDecision {
  return (
    parseDecisionFromText(sections.implementationDecision) ??
    parseDecisionFromText(sections.localFitAndWhyNow) ??
    parseDecisionFromText(sections.orbitHandoff) ??
    "adapt"
  );
}

export function formatRepoAssimilationDecisionLabel(
  decision: RepoAssimilationDecision,
) {
  switch (decision) {
    case "adopt":
      return "Adopt";
    case "reject":
      return "Reject";
    case "adapt":
    default:
      return "Adapt";
  }
}

export function buildRepoAssimilationTitle(profile: RepoIntelProfile) {
  return `Repo assimilation · ${profile.normalizedRepoId}`;
}

export function buildRepoAssimilationSummary(
  profile: RepoIntelProfile,
  brief: string,
) {
  const sections = parseRepoAssimilationMarkdown(brief);
  const fitLine = firstMeaningfulLine(sections.localFitAndWhyNow);
  const extensionLine = firstMeaningfulLine(
    sections.extensionPointsAndSmallestSlice,
  );
  const decision = formatRepoAssimilationDecisionLabel(
    getRepoAssimilationDecision(sections),
  );
  return cleanInline(
    [
      `${profile.normalizedRepoId} implementation brief.`,
      `Decision ${decision.toLowerCase()}.`,
      fitLine,
      extensionLine,
    ]
      .filter(Boolean)
      .join(" "),
    220,
  );
}

export function buildRepoAssimilationTags(
  profile: RepoIntelProfile,
  brief?: string | null,
) {
  const parsedBrief = brief ? parseRepoAssimilationMarkdown(brief) : null;
  const decisionTag = buildDecisionTag(
    parsedBrief
      ? getRepoAssimilationDecision(parsedBrief)
      : chooseAssimilationDecision(profile),
  );
  return uniqueStrings([
    "repo-assimilation",
    decisionTag,
    `repo:${slugify(profile.normalizedRepoId)}`,
    ...profile.inferredStack
      .slice(0, 3)
      .map((stack) => `stack:${slugify(stack)}`),
  ]);
}

export function hasRepoAssimilationReadmeSignal(
  profileOrBrief: Pick<RepoIntelProfile, "readmeExcerpt"> | string,
) {
  if (typeof profileOrBrief === "string") {
    return !/readme (?:excerpt )?(?:unavailable|signal was missing)/i.test(
      profileOrBrief,
    );
  }
  return profileOrBrief.readmeExcerpt.trim().length > 0;
}

export function buildRepoAssimilationSourceRefs(
  profile: Pick<
    RepoIntelProfile,
    "normalizedRepoId" | "sourceUrl" | "readmeExcerpt"
  >,
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
      "Prepared the repo-intel lane so a public-safe implementation brief can be assessed, filed, and handed to ORBIT without widening into direct code import.",
  };
}

export function buildRepoAssimilationOrbitPrompt(input: {
  normalizedRepoId: string;
  brief: string;
  correctionConstraints?: string[];
}) {
  const sections = parseRepoAssimilationMarkdown(input.brief);
  const decisionLabel = formatRepoAssimilationDecisionLabel(
    getRepoAssimilationDecision(sections),
  ).toLowerCase();
  const lines = [
    `Use the saved repo assimilation brief for ${input.normalizedRepoId} as the planning constraint set for local Nexus work.`,
    `Repo snapshot: ${sections.repoSnapshot || "No snapshot recorded."}`,
    `Local fit and why now: ${sections.localFitAndWhyNow || "No local-fit notes recorded."}`,
    `Implementation decision: ${sections.implementationDecision || `No decision recorded; default to ${decisionLabel}.`}`,
    `Extension points and smallest slice: ${sections.extensionPointsAndSmallestSlice || "No extension points recorded."}`,
    `Boundaries and risks: ${sections.boundariesAndRisks || "No boundary notes recorded."}`,
    `ORBIT handoff: ${sections.orbitHandoff || "No ORBIT handoff recorded."}`,
  ];

  if (input.correctionConstraints && input.correctionConstraints.length > 0) {
    lines.push("Local correction-memory constraints:");
    lines.push(
      ...input.correctionConstraints.map((constraint) => `- ${constraint}`),
    );
  }

  lines.push(
    "Respond with: 1. confirm whether the recorded adopt/adapt/reject decision still holds, 2. identify the smallest local implementation slice, 3. name the exact Nexus files or seams to touch first, 4. list explicit non-goals and upstream boundaries to preserve.",
  );
  lines.push(
    "If the recorded decision is reject, do not plan implementation; propose the nearest safer internal alternative instead.",
  );
  lines.push("Do not import or mirror upstream code directly.");

  return lines.join("\n");
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
  const suggestedSeams = inferExtensionPointLines(profile)
    .map((line) => line.replace(/^- /, ""))
    .join("\n");

  return [
    "You are Homefront's repo-assimilation engine.",
    "Return JSON only.",
    "Use this exact shape:",
    "{",
    '  "repoSnapshot": "string",',
    '  "localFitAndWhyNow": "string",',
    '  "implementationDecision": "string",',
    '  "extensionPointsAndSmallestSlice": "string",',
    '  "boundariesAndRisks": "string",',
    '  "orbitHandoff": "string"',
    "}",
    "",
    "Rules:",
    "- Use only the supplied public GitHub metadata, README excerpt, stack hints, topics, and top-level tree.",
    "- Keep the writing compact, operator-grade, and explicitly public-safe.",
    "- Do not recommend direct code import, vendoring, GitHub write actions, or private-repo assumptions.",
    "- localFitAndWhyNow, extensionPointsAndSmallestSlice, boundariesAndRisks, and orbitHandoff must use short bullet-style lines separated by newlines.",
    '- implementationDecision must start with "- Decision: adopt.", "- Decision: adapt.", or "- Decision: reject." and then explain why in one or two more bullet lines.',
    "- extensionPointsAndSmallestSlice must name actual Nexus seams or files where the idea should land, not generic product summaries or upstream directory mirroring.",
    "- If metadata is sparse, or the repo drifts into offensive automation, say so and use reject or adapt instead of pretending certainty.",
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
    "LIKELY NEXUS SEAMS:",
    suggestedSeams || "No strong seam suggestions available.",
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
          localFitAndWhyNow: withFallbackSection(
            parsed.localFitAndWhyNow,
            fallback.localFitAndWhyNow,
          ),
          implementationDecision: withFallbackSection(
            parsed.implementationDecision,
            fallback.implementationDecision,
          ),
          extensionPointsAndSmallestSlice: withFallbackSection(
            parsed.extensionPointsAndSmallestSlice,
            fallback.extensionPointsAndSmallestSlice,
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

import type {
  HQAssistantIntent,
  HQAnswerStyle,
} from "@/components/home/office/types";
import {
  detectAssistantCapability,
  getAssistantCapability,
  type AssistantCapabilityId,
} from "@/lib/assistantCapabilityRegistry";
import { getEngineeringPlaybook } from "@/lib/engineeringPlaybooks";
import { getImpactRepairSession } from "@/lib/impactRepairSessions";
import { getSpecDrivenTemplate } from "@/lib/specDrivenDevelopment";
import { getSurfaceCapability } from "@/lib/surfaceCapabilities";
import { getSystemDesignMap } from "@/lib/systemDesignMaps";

export type AssistantIndexedDocumentKind =
  | "surface"
  | "system"
  | "playbook"
  | "spec"
  | "impact";

export interface AssistantIndexedDocument {
  id: string;
  kind: AssistantIndexedDocumentKind;
  title: string;
  summary: string;
  href: string;
  route: string;
  artifactType: string;
  risk: "low" | "moderate" | "high";
  followUpWorkspaceHref: string | null;
  capabilityId: AssistantCapabilityId | null;
  confidence: number;
}

export interface AssistantIndexedRetrievalResult {
  capabilityId: AssistantCapabilityId;
  capabilityConfidence: number;
  matchedKeywords: string[];
  documents: AssistantIndexedDocument[];
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreDocument(
  input: string,
  baseConfidence: number,
  haystack: string[],
  kindBonus: number,
) {
  const normalizedInput = input.toLowerCase();
  const keywordScore = haystack.reduce(
    (score, token) =>
      token && normalizedInput.includes(token) ? score + 5 : score,
    0,
  );
  return clampConfidence(baseConfidence * 0.58 + keywordScore + kindBonus);
}

function buildSurfaceDocument(
  capabilityId: AssistantCapabilityId,
  input: string,
  surfaceId: string,
  baseConfidence: number,
): AssistantIndexedDocument {
  const surface = getSurfaceCapability(surfaceId);
  return {
    id: `surface:${surface.id}`,
    kind: "surface",
    title: surface.title,
    summary: surface.tagline,
    href: surface.jumpActions[0]?.href ?? surface.route,
    route: surface.route,
    artifactType: "route guidance",
    risk: "low",
    followUpWorkspaceHref: surface.jumpActions[0]?.href ?? surface.route,
    capabilityId,
    confidence: scoreDocument(
      input,
      baseConfidence,
      [
        surface.id,
        surface.title.toLowerCase(),
        surface.tagline.toLowerCase(),
        ...surface.subsections.map((section) => section.label.toLowerCase()),
      ],
      14,
    ),
  };
}

function buildSystemDocument(
  capabilityId: AssistantCapabilityId,
  input: string,
  systemId: string,
  baseConfidence: number,
): AssistantIndexedDocument {
  const system = getSystemDesignMap(systemId);
  return {
    id: `system:${system.id}`,
    kind: "system",
    title: system.title,
    summary: system.summary,
    href: `/resources?view=system&system=${system.id}`,
    route: system.primaryRoute,
    artifactType: "system map",
    risk: system.changeRisk,
    followUpWorkspaceHref: system.nextActions[0]?.href ?? system.primaryRoute,
    capabilityId,
    confidence: scoreDocument(
      input,
      baseConfidence,
      [
        system.id,
        system.title.toLowerCase(),
        system.summary.toLowerCase(),
        ...system.surfaces.map((surface) => surface.toLowerCase()),
        ...system.readFirst.map((file) => file.toLowerCase()),
      ],
      18,
    ),
  };
}

function buildPlaybookDocument(
  capabilityId: AssistantCapabilityId,
  input: string,
  playbookId: string,
  baseConfidence: number,
): AssistantIndexedDocument {
  const playbook = getEngineeringPlaybook(playbookId);
  return {
    id: `playbook:${playbook.id}`,
    kind: "playbook",
    title: playbook.title,
    summary: playbook.objective,
    href: `/resources?view=playbooks&playbook=${playbook.id}`,
    route: "/resources",
    artifactType: "workflow scaffold",
    risk: "high",
    followUpWorkspaceHref:
      playbook.followOnActions[0]?.href ?? "/resources?view=playbooks",
    capabilityId,
    confidence: scoreDocument(
      input,
      baseConfidence,
      [
        playbook.id,
        playbook.title.toLowerCase(),
        playbook.objective.toLowerCase(),
        playbook.whenToUse.toLowerCase(),
      ],
      16,
    ),
  };
}

function buildSpecDocument(
  capabilityId: AssistantCapabilityId,
  input: string,
  specId: string,
  baseConfidence: number,
): AssistantIndexedDocument {
  const spec = getSpecDrivenTemplate(specId);
  return {
    id: `spec:${spec.id}`,
    kind: "spec",
    title: spec.title,
    summary: spec.objective,
    href: `/resources?view=specs&spec=${spec.id}`,
    route: "/resources",
    artifactType: "spec starter",
    risk: "high",
    followUpWorkspaceHref:
      spec.followOnActions[0]?.href ?? "/resources?view=specs",
    capabilityId,
    confidence: scoreDocument(
      input,
      baseConfidence,
      [
        spec.id,
        spec.title.toLowerCase(),
        spec.objective.toLowerCase(),
        spec.bestFor.toLowerCase(),
      ],
      16,
    ),
  };
}

function buildImpactDocument(
  capabilityId: AssistantCapabilityId,
  input: string,
  filePath: string,
  baseConfidence: number,
): AssistantIndexedDocument | null {
  const repair = getImpactRepairSession(filePath);
  if (!repair) return null;
  return {
    id: `impact:${filePath}`,
    kind: "impact",
    title: filePath,
    summary: repair.detail,
    href: repair.href,
    route: "/resources",
    artifactType: "blast radius",
    risk: "high",
    followUpWorkspaceHref: repair.href,
    capabilityId,
    confidence: scoreDocument(
      input,
      baseConfidence,
      [
        filePath.toLowerCase(),
        repair.label.toLowerCase(),
        repair.detail.toLowerCase(),
      ],
      22,
    ),
  };
}

export function resolveAssistantIndexedRetrieval(opts: {
  input: string;
  intent: HQAssistantIntent;
  answerStyle: HQAnswerStyle;
  routeHint?: string | null;
  filePath?: string | null;
}): AssistantIndexedRetrievalResult {
  const capabilityMatch = detectAssistantCapability({
    input: opts.input,
    intent: opts.intent,
    answerStyle: opts.answerStyle,
    routeHint: opts.routeHint,
    filePath: opts.filePath,
  });
  const capability = getAssistantCapability(capabilityMatch.capability.id);
  const documents: AssistantIndexedDocument[] = [];

  if (capability.surfaceId) {
    documents.push(
      buildSurfaceDocument(
        capability.id,
        opts.input,
        capability.surfaceId,
        capabilityMatch.confidence,
      ),
    );
  }

  if (capability.systemId) {
    documents.push(
      buildSystemDocument(
        capability.id,
        opts.input,
        capability.systemId,
        capabilityMatch.confidence,
      ),
    );
  }

  if (capability.playbookId) {
    documents.push(
      buildPlaybookDocument(
        capability.id,
        opts.input,
        capability.playbookId,
        capabilityMatch.confidence,
      ),
    );
  }

  if (capability.specId) {
    documents.push(
      buildSpecDocument(
        capability.id,
        opts.input,
        capability.specId,
        capabilityMatch.confidence,
      ),
    );
  }

  if (opts.filePath) {
    const impactDocument = buildImpactDocument(
      capability.id,
      opts.input,
      opts.filePath,
      capabilityMatch.confidence,
    );
    if (impactDocument) documents.push(impactDocument);
  }

  return {
    capabilityId: capability.id,
    capabilityConfidence: capabilityMatch.confidence,
    matchedKeywords: capabilityMatch.matchedKeywords,
    documents: documents
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4),
  };
}

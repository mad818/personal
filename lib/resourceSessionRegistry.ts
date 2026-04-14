export const DEFAULT_ENGINEERING_PLAYBOOK_ID = "safe-refactor";

export const ENGINEERING_PLAYBOOK_IDS = [
  "safe-refactor",
  "security-boundary-audit",
  "hallucination-hardening",
  "spec-driven-development",
  "reverse-engineering-follow-through",
  "second-brain-heartbeat",
  "market-review-loop",
  "osint-casefile-loop",
  "radar-readiness-session",
  "feature-ship",
  "api-wire",
] as const;

export type EngineeringPlaybookId = (typeof ENGINEERING_PLAYBOOK_IDS)[number];

const ENGINEERING_PLAYBOOK_ID_SET = new Set<string>(ENGINEERING_PLAYBOOK_IDS);

const ENGINEERING_PLAYBOOK_ALIASES: Record<string, EngineeringPlaybookId> = {
  "release-hardening": "feature-ship",
  "safe-refactors": "safe-refactor",
};

export function isEngineeringPlaybookId(
  value: string | null | undefined,
): value is EngineeringPlaybookId {
  if (!value) return false;
  return ENGINEERING_PLAYBOOK_ID_SET.has(value);
}

export function resolveEngineeringPlaybookId(
  value: string | null | undefined,
): EngineeringPlaybookId | null {
  if (!value) return null;
  const normalized = ENGINEERING_PLAYBOOK_ALIASES[value] ?? value;
  return isEngineeringPlaybookId(normalized) ? normalized : null;
}

export const DEFAULT_SPEC_TEMPLATE_ID = "feature-build";

export const SPEC_TEMPLATE_IDS = [
  "feature-build",
  "api-integration",
  "second-brain-system",
  "reverse-engineering-memory",
] as const;

export type SpecTemplateId = (typeof SPEC_TEMPLATE_IDS)[number];

const SPEC_TEMPLATE_ID_SET = new Set<string>(SPEC_TEMPLATE_IDS);

const SPEC_TEMPLATE_ALIASES: Record<string, SpecTemplateId> = {
  "high-risk-change": "feature-build",
  "api-wire": "api-integration",
};

export function isSpecTemplateId(
  value: string | null | undefined,
): value is SpecTemplateId {
  if (!value) return false;
  return SPEC_TEMPLATE_ID_SET.has(value);
}

export function resolveSpecTemplateId(
  value: string | null | undefined,
): SpecTemplateId | null {
  if (!value) return null;
  const normalized = SPEC_TEMPLATE_ALIASES[value] ?? value;
  return isSpecTemplateId(normalized) ? normalized : null;
}

export const DEFAULT_SYSTEM_DESIGN_ID = "hq-mission-flow";

export const SYSTEM_DESIGN_IDS = [
  "hq-mission-flow",
  "ai-runtime-boundary",
  "memory-spine",
  "scheduler-governance",
  "recon-boundary",
  "vehicle-bridge",
] as const;

export type SystemDesignId = (typeof SYSTEM_DESIGN_IDS)[number];

const SYSTEM_DESIGN_ID_SET = new Set<string>(SYSTEM_DESIGN_IDS);

const SYSTEM_DESIGN_ALIASES: Record<string, SystemDesignId> = {
  "vehicle-readiness": "vehicle-bridge",
};

export function isSystemDesignId(
  value: string | null | undefined,
): value is SystemDesignId {
  if (!value) return false;
  return SYSTEM_DESIGN_ID_SET.has(value);
}

export function resolveSystemDesignId(
  value: string | null | undefined,
): SystemDesignId | null {
  if (!value) return null;
  const normalized = SYSTEM_DESIGN_ALIASES[value] ?? value;
  return isSystemDesignId(normalized) ? normalized : null;
}

export const DEFAULT_SURFACE_CAPABILITY_ID = "hq";

export const SURFACE_CAPABILITY_IDS = [
  "hq",
  "command",
  "intel",
  "alpha",
  "cyber",
  "recon",
  "vault",
  "vehicle",
  "resources",
  "security",
  "skills",
] as const;

export type SurfaceCapabilityId = (typeof SURFACE_CAPABILITY_IDS)[number];

const SURFACE_CAPABILITY_ID_SET = new Set<string>(SURFACE_CAPABILITY_IDS);

const SURFACE_CAPABILITY_ALIASES: Record<string, SurfaceCapabilityId> = {
  home: "hq",
};

export function isSurfaceCapabilityId(
  value: string | null | undefined,
): value is SurfaceCapabilityId {
  if (!value) return false;
  return SURFACE_CAPABILITY_ID_SET.has(value);
}

export function resolveSurfaceCapabilityId(
  value: string | null | undefined,
): SurfaceCapabilityId | null {
  if (!value) return null;
  const normalized = SURFACE_CAPABILITY_ALIASES[value] ?? value;
  return isSurfaceCapabilityId(normalized) ? normalized : null;
}

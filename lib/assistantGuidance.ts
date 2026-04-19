import type {
  AssistantGuidance,
  AssistantGuidanceKind,
} from "@/components/home/office/types";
import { normalizeSessionHref } from "@/lib/exactSessionLinks";

const GUIDANCE_PRIORITY_BY_KIND: Record<AssistantGuidanceKind, number> = {
  degraded: 100,
  scope_drift: 90,
  continuation: 80,
  learning: 74,
  execution: 70,
  archive: 60,
};

function normalizeGuidanceItem(
  guidance: AssistantGuidance | null | undefined,
): AssistantGuidance | null {
  if (!guidance) return null;
  const title = guidance.title.trim();
  const detail = guidance.detail.trim();
  if (!title || !detail) return null;
  const href =
    typeof guidance.href === "string" && guidance.href.startsWith("/")
      ? normalizeSessionHref(guidance.href)
      : guidance.href;
  return {
    ...guidance,
    title,
    detail,
    href,
    priority: guidance.priority ?? GUIDANCE_PRIORITY_BY_KIND[guidance.kind],
  };
}

export function mergeAssistantGuidance(
  ...groups: Array<
    | AssistantGuidance
    | null
    | undefined
    | Array<AssistantGuidance | null | undefined>
  >
): AssistantGuidance[] {
  const deduped = new Map<string, AssistantGuidance>();

  for (const group of groups) {
    const items = Array.isArray(group) ? group : [group];
    for (const item of items) {
      const normalized = normalizeGuidanceItem(item);
      if (!normalized) continue;
      const key = [
        normalized.kind,
        normalized.title.toLowerCase(),
        normalized.detail.toLowerCase(),
        normalized.href ?? "",
      ].join("::");
      const current = deduped.get(key);
      if (!current || (normalized.priority ?? 0) > (current.priority ?? 0)) {
        deduped.set(key, normalized);
      }
    }
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const priorityDelta = (right.priority ?? 0) - (left.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    return left.title.localeCompare(right.title);
  });
}

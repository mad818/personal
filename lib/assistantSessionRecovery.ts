import type { HQAssistantIntent } from "@/components/home/office/types";
import {
  resolveAssistantCapabilityId,
  type AssistantCapabilityId,
  getAssistantCapability,
} from "@/lib/assistantCapabilityRegistry";
import { normalizeCanonicalRoutePath } from "@/lib/assistantCanonicalRegistry";
import {
  findStrongestUnfinishedSessionForRoute,
  type UnfinishedSessionMemory,
} from "@/lib/assistantSessionMemory";
import {
  normalizePreparedWorkspaceTarget,
  resolveAssistantWorkspaceForRoute,
} from "@/lib/assistantSessionRegistry";
import { isExactSessionHref, normalizeSessionHref } from "@/lib/exactSessionLinks";

export const PREPARED_WORKSPACE_TTL_MS = 1000 * 60 * 20;

interface RecoveryPreparedWorkspace {
  href: string;
  preparedAt?: number;
}

interface ResolveAssistantSessionHrefOptions {
  href?: string | null;
  pathname?: string | null;
  preparedWorkspace?: RecoveryPreparedWorkspace | null;
  unfinishedSessions?: Partial<UnfinishedSessionMemory>[] | null;
  capability?: AssistantCapabilityId | string | null;
  defaultIntent?: HQAssistantIntent;
  includeRouteDefault?: boolean;
  now?: number;
}

function normalizeRoutePath(value: string | null | undefined) {
  if (!value) return null;
  return normalizeCanonicalRoutePath(normalizeSessionHref(value));
}

function isPreparedWorkspaceFresh(
  preparedWorkspace: RecoveryPreparedWorkspace | null | undefined,
  now = Date.now(),
) {
  if (!preparedWorkspace?.href) return false;
  if (typeof preparedWorkspace.preparedAt !== "number") return false;
  return now - preparedWorkspace.preparedAt < PREPARED_WORKSPACE_TTL_MS;
}

function resolveCapabilityId(value: AssistantCapabilityId | string | null | undefined) {
  if (!value) return null;
  return resolveAssistantCapabilityId(value);
}

function resolveDefaultExactHref(
  pathname: string | null | undefined,
  capabilityId: AssistantCapabilityId | null,
  intent: HQAssistantIntent,
) {
  const normalizedPath = normalizeRoutePath(pathname);
  if (!normalizedPath) return "";

  if (capabilityId) {
    const capability = getAssistantCapability(capabilityId);
    if (normalizeRoutePath(capability.defaultExactHref) === normalizedPath) {
      return normalizeSessionHref(capability.defaultExactHref);
    }
  }

  const routeDefault = normalizePreparedWorkspaceTarget(
    resolveAssistantWorkspaceForRoute(normalizedPath, intent),
  );
  return routeDefault?.href ? normalizeSessionHref(routeDefault.href) : "";
}

export function resolveAssistantSessionHref(
  options: ResolveAssistantSessionHrefOptions,
) {
  const normalizedTargetHref = options.href
    ? normalizeSessionHref(options.href)
    : normalizeRoutePath(options.pathname) ?? "";
  const normalizedPath =
    normalizeRoutePath(normalizedTargetHref) ?? normalizeRoutePath(options.pathname);
  if (!normalizedPath) return normalizedTargetHref;

  if (normalizedTargetHref && isExactSessionHref(normalizedTargetHref)) {
    return normalizedTargetHref;
  }

  const capabilityId = resolveCapabilityId(options.capability);
  const now = options.now ?? Date.now();
  const preparedWorkspace = options.preparedWorkspace?.href
    ? normalizePreparedWorkspaceTarget({
        href: options.preparedWorkspace.href,
        label: "Resume workspace",
        detail:
          "Prepared the strongest exact session so the assistant can recover the previous working lane cleanly.",
      })
    : null;
  if (
    preparedWorkspace?.href &&
    isPreparedWorkspaceFresh(options.preparedWorkspace, now) &&
    normalizeRoutePath(preparedWorkspace.href) === normalizedPath
  ) {
    return normalizeSessionHref(preparedWorkspace.href);
  }

  const unfinishedMatch = findStrongestUnfinishedSessionForRoute(
    options.unfinishedSessions,
    {
      pathname: normalizedPath,
      capability: capabilityId,
    },
  );
  if (unfinishedMatch?.href) {
    return normalizeSessionHref(unfinishedMatch.href);
  }

  if (options.includeRouteDefault) {
    const defaultHref = resolveDefaultExactHref(
      normalizedPath,
      capabilityId,
      options.defaultIntent ?? "conversation",
    );
    if (defaultHref) {
      return defaultHref;
    }
  }

  return normalizedTargetHref || normalizedPath;
}

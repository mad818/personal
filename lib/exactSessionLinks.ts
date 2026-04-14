import {
  CANONICAL_ROUTE_ALIASES,
  CANONICAL_SEGMENTED_ROUTE_RULES,
  CANONICAL_SIMPLE_FOCUS_ROUTES,
  normalizeCanonicalResourceParams,
  normalizeCanonicalVaultParams,
} from "@/lib/assistantCanonicalRegistry";

function buildRelativeHref(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeResourcesParams(params: URLSearchParams) {
  normalizeCanonicalResourceParams(params);
}

function normalizeVaultParams(params: URLSearchParams) {
  normalizeCanonicalVaultParams(params);
}

function normalizeSimpleFocusParams(pathname: string, params: URLSearchParams) {
  const allowed = CANONICAL_SIMPLE_FOCUS_ROUTES[pathname];
  if (!allowed) return;
  const focus = params.get("focus");
  if (!focus) return;
  if (!allowed.includes(focus)) {
    params.delete("focus");
  }
}

function normalizeSegmentedRouteParams(pathname: string, params: URLSearchParams) {
  const rule = CANONICAL_SEGMENTED_ROUTE_RULES[pathname];
  if (!rule) return;

  const rawFocus = params.get("focus");
  const rawView = (params.get("view") ?? "").toLowerCase();
  const focusView = rawFocus ? rule.focusToView[rawFocus] : null;

  if (rawFocus && !focusView) {
    params.delete("focus");
  }

  if (focusView) {
    params.set("view", focusView);
    return;
  }

  if (!rule.allowedViews.includes(rawView)) {
    params.set("view", rule.defaultView);
  }
}

function hasResourcesExactParams(params: URLSearchParams) {
  return (
    params.has("playbook") ||
    params.has("spec") ||
    params.has("system") ||
    params.has("surface") ||
    params.has("file")
  );
}

export function normalizeSessionHref(href: string) {
  if (!href.startsWith("/")) return href;

  const url = new URL(href, "http://nexus.local");
  const pathname = CANONICAL_ROUTE_ALIASES[url.pathname] ?? url.pathname;
  const params = new URLSearchParams(url.searchParams.toString());

  if (pathname === "/resources") {
    normalizeResourcesParams(params);
  } else if (pathname === "/vault") {
    normalizeVaultParams(params);
  } else if (CANONICAL_SEGMENTED_ROUTE_RULES[pathname]) {
    normalizeSegmentedRouteParams(pathname, params);
  } else {
    normalizeSimpleFocusParams(pathname, params);
  }

  return buildRelativeHref(pathname, params);
}

export function isExactSessionHref(href: string) {
  if (!href.startsWith("/")) return false;
  const normalized = normalizeSessionHref(href);
  const url = new URL(normalized, "http://nexus.local");
  const params = url.searchParams;

  if (params.has("focus")) return true;
  if (params.has("compiledFilter")) return true;
  if (params.has("workflowId")) return true;
  if (params.has("graphAudit")) return true;
  if (url.pathname === "/resources" && hasResourcesExactParams(params)) return true;
  return false;
}

export function getSessionTargetLabel(href: string) {
  return isExactSessionHref(href) ? "Exact panel" : "Route";
}

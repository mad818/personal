import {
  DEFAULT_ENGINEERING_PLAYBOOK_ID,
  DEFAULT_SPEC_TEMPLATE_ID,
  DEFAULT_SURFACE_CAPABILITY_ID,
  DEFAULT_SYSTEM_DESIGN_ID,
  resolveEngineeringPlaybookId,
  resolveSpecTemplateId,
  resolveSurfaceCapabilityId,
  resolveSystemDesignId,
} from "@/lib/resourceSessionRegistry";

export {
  DEFAULT_ENGINEERING_PLAYBOOK_ID,
  DEFAULT_SPEC_TEMPLATE_ID,
  DEFAULT_SURFACE_CAPABILITY_ID,
  DEFAULT_SYSTEM_DESIGN_ID,
  resolveEngineeringPlaybookId,
  resolveSpecTemplateId,
  resolveSurfaceCapabilityId,
  resolveSystemDesignId,
} from "@/lib/resourceSessionRegistry";

export type CanonicalSegmentedViewRule = {
  defaultView: string;
  allowedViews: readonly string[];
  focusToView: Record<string, string>;
};

export const CANONICAL_ROUTE_ALIASES: Record<string, string> = {
  "/home": "/hq",
  "/internal/skills": "/skills",
  "/internal/vehicle": "/vehicle",
};

export const CANONICAL_SIMPLE_FOCUS_ROUTES: Record<string, readonly string[]> = {
  "/hq": [
    "hq-strategium",
    "hq-console-shell",
    "hq-chronicle",
    "hq-scheduler-composer",
    "hq-scheduler-governance",
    "hq-scheduler-jobs",
  ],
  "/command": [
    "runtime-efficiency",
    "agent-health",
    "memory-spine",
    "provider-health",
  ],
  "/vehicle": [
    "vehicle-bridge-status",
    "vehicle-connector-onboarding",
    "vehicle-bench-checklist",
    "vehicle-artifact-convention",
  ],
};

export const CANONICAL_SEGMENTED_ROUTE_RULES: Record<
  string,
  CanonicalSegmentedViewRule
> = {
  "/intel": {
    defaultView: "news",
    allowedViews: ["news", "world", "markets", "sweeps"],
    focusToView: {
      "intel-news": "news",
      "intel-world": "world",
      "intel-markets": "markets",
      "intel-sweeps": "sweeps",
    },
  },
  "/alpha": {
    defaultView: "watchlist",
    allowedViews: ["watchlist", "signals", "scanner", "sizer", "prices", "charts"],
    focusToView: {
      "alpha-watchlist": "watchlist",
      "alpha-market-review": "watchlist",
      "alpha-signals": "signals",
      "alpha-scanner": "scanner",
      "alpha-sizer": "sizer",
      "alpha-prices": "prices",
      "alpha-charts": "charts",
    },
  },
  "/cyber": {
    defaultView: "triage",
    allowedViews: ["triage", "matrix", "cves", "otx", "cisa", "drone", "vuln-review"],
    focusToView: {
      "cyber-triage": "triage",
      "cyber-matrix": "matrix",
      "cyber-cves": "cves",
      "cyber-otx": "otx",
      "cyber-cisa": "cisa",
      "cyber-drone": "drone",
      "cyber-vuln-review": "vuln-review",
    },
  },
  "/recon": {
    defaultView: "osint",
    allowedViews: ["osint", "pdns", "headers", "metadata", "binary", "opsec"],
    focusToView: {
      "recon-lookup": "osint",
      "recon-repo-intel": "osint",
      "recon-headers": "headers",
      "recon-binary": "binary",
      "recon-opsec": "opsec",
    },
  },
  "/security": {
    defaultView: "doctrine",
    allowedViews: ["doctrine", "ai", "physical"],
    focusToView: {
      "security-doctrine": "doctrine",
      "security-ai-surface": "ai",
      "security-physical": "physical",
    },
  },
  "/skills": {
    defaultView: "forge",
    allowedViews: ["forge", "blacksite", "brain", "library"],
    focusToView: {
      "skills-forge": "forge",
      "skills-blacksite": "blacksite",
      "skills-brain": "brain",
      "skills-library": "library",
    },
  },
};

export const CANONICAL_RESOURCES_VIEWS = new Set([
  "finder",
  "manual",
  "surfaces",
  "playbooks",
  "specs",
  "system",
  "registry",
  "kits",
  "impact",
  "study",
  "voice-lab",
] as const);

export const CANONICAL_RESOURCE_VIEW_ALIASES: Record<string, string> = {
  surface: "surfaces",
  systems: "system",
  impacts: "impact",
  playbook: "playbooks",
  spec: "specs",
};

export const CANONICAL_VAULT_FOCUSES = new Set([
  "vault-memory-spine",
  "vault-memory-project",
  "vault-memory-conversation",
  "vault-memory-general",
  "vault-memory-research",
  "vault-memory-study",
  "vault-stewardship",
  "vault-compiled-pages",
  "vault-graph-focus",
  "vault-export-second-brain",
] as const);

export const CANONICAL_VAULT_COMPILED_FILTERS = new Set([
  "all",
  "route-less",
  "untagged",
  "reverse-engineering",
] as const);

export const CANONICAL_VAULT_WORKFLOW_IDS = new Set([
  "market-review",
  "osint-casefile",
  "repo-assimilation",
  "repo-compare",
  "vault-librarian",
  "vault-weekly",
  "vuln-review",
] as const);

export const CANONICAL_VAULT_GRAPH_AUDITS = new Set(["orphans"] as const);

export function normalizeCanonicalRoutePath(route: string | null | undefined) {
  if (!route) return null;
  const pathname = route.split("?")[0] ?? route;
  return CANONICAL_ROUTE_ALIASES[pathname] ?? pathname;
}

export function normalizeCanonicalResourceParams(params: URLSearchParams) {
  const rawView = (params.get("view") ?? "").toLowerCase();
  const aliasedView = CANONICAL_RESOURCE_VIEW_ALIASES[rawView] ?? rawView;
  const impactMode = (params.get("impactMode") ?? "").toLowerCase();
  const voiceProject = params.get("voiceProject")?.trim() ?? "";

  if (params.has("system")) {
    const system = resolveSystemDesignId(params.get("system"));
    if (system) params.set("system", system);
  }

  if (params.has("surface")) {
    const surface = resolveSurfaceCapabilityId(params.get("surface"));
    if (surface) params.set("surface", surface);
  }

  const inferredView = params.has("playbook")
    ? "playbooks"
    : params.has("spec")
      ? "specs"
      : params.has("system")
        ? "system"
        : params.has("surface")
          ? "surfaces"
          : params.has("voiceProject")
            ? "voice-lab"
          : params.has("file")
            ? "impact"
            : null;

  const nextView = CANONICAL_RESOURCES_VIEWS.has(aliasedView as never)
    ? aliasedView
    : inferredView ?? "finder";

  params.set("view", nextView);

  if (nextView === "playbooks") {
    params.set(
      "playbook",
      resolveEngineeringPlaybookId(params.get("playbook")) ??
        DEFAULT_ENGINEERING_PLAYBOOK_ID,
    );
  }

  if (nextView === "specs") {
    params.set(
      "spec",
      resolveSpecTemplateId(params.get("spec")) ?? DEFAULT_SPEC_TEMPLATE_ID,
    );
  }

  if (nextView === "system") {
    params.set(
      "system",
      resolveSystemDesignId(params.get("system")) ?? DEFAULT_SYSTEM_DESIGN_ID,
    );
  }

  if (nextView === "surfaces") {
    params.set(
      "surface",
      resolveSurfaceCapabilityId(params.get("surface")) ??
        DEFAULT_SURFACE_CAPABILITY_ID,
    );
  }

  if (nextView === "impact") {
    if (
      impactMode !== "blast" &&
      impactMode !== "graph" &&
      impactMode !== "ownership" &&
      impactMode !== "hotspots" &&
      impactMode !== "security"
    ) {
      params.set("impactMode", "blast");
    } else {
      params.set("impactMode", impactMode);
    }
  } else {
    params.delete("impactMode");
  }

  if (nextView === "voice-lab") {
    if (voiceProject) {
      params.set("voiceProject", voiceProject);
    } else {
      params.delete("voiceProject");
    }
  } else {
    params.delete("voiceProject");
  }
}

export function normalizeCanonicalVaultParams(params: URLSearchParams) {
  const rawFocus = params.get("focus");
  const compiledFilter = params.get("compiledFilter");
  const graphAudit = params.get("graphAudit");
  const workflowId = params.get("workflowId");
  const pageId = params.get("pageId")?.trim() ?? "";
  const nodeId = params.get("nodeId")?.trim() ?? "";

  let focus = rawFocus;
  if (compiledFilter) focus = "vault-compiled-pages";
  if (workflowId) focus = "vault-compiled-pages";
  if (pageId && !focus) focus = "vault-compiled-pages";
  if (nodeId && !compiledFilter && !workflowId && !pageId) {
    focus = "vault-graph-focus";
  }
  if (graphAudit && !compiledFilter && !workflowId && !pageId && !nodeId) {
    focus = "vault-graph-focus";
  }

  if (focus && !CANONICAL_VAULT_FOCUSES.has(focus as never)) {
    focus = compiledFilter || workflowId || pageId
      ? "vault-compiled-pages"
      : graphAudit || nodeId
        ? "vault-graph-focus"
        : null;
  }

  if (focus) {
    params.set("focus", focus);
  } else {
    params.delete("focus");
  }

  if (focus === "vault-compiled-pages") {
    if (
      compiledFilter &&
      !CANONICAL_VAULT_COMPILED_FILTERS.has(compiledFilter as never)
    ) {
      params.delete("compiledFilter");
    }
    if (
      workflowId &&
      !CANONICAL_VAULT_WORKFLOW_IDS.has(workflowId as never)
    ) {
      params.delete("workflowId");
    }
    if (pageId) {
      params.set("pageId", pageId);
    } else {
      params.delete("pageId");
    }
  } else {
    params.delete("compiledFilter");
    params.delete("workflowId");
    params.delete("pageId");
  }

  if (focus === "vault-graph-focus") {
    if (nodeId) {
      params.set("nodeId", nodeId);
    } else {
      params.delete("nodeId");
    }
    if (graphAudit && !CANONICAL_VAULT_GRAPH_AUDITS.has(graphAudit as never)) {
      params.delete("graphAudit");
    }
  } else {
    params.delete("nodeId");
    params.delete("graphAudit");
  }
}

import contentToolsContent from "@/lib/arpgContentToolsContent.json";

export interface ArpgContentToolsContent {
  schemaVersion: "mw6-content-tools-v1";
  title: string;
  purpose: string;
  registries: Array<{
    id: string;
    label: string;
    sourcePath: string;
    validator: string;
    coverage: string;
    addWorkflow: string;
  }>;
  helpers: Array<{
    id: string;
    label: string;
    kind: string;
    command: string;
    safeUse: string;
    output: string;
  }>;
  fixtureSaves: Array<{
    id: string;
    label: string;
    path: string;
    coverage: string;
  }>;
  progressionChecks: Array<{
    id: string;
    label: string;
    guards: string;
    failureMode: string;
  }>;
  authoringRules: string[];
}

export const ARPG_CONTENT_TOOLS =
  contentToolsContent as ArpgContentToolsContent;

export function getArpgContentToolsSummary() {
  const devOnlyHelpers = ARPG_CONTENT_TOOLS.helpers.filter((helper) =>
    helper.kind.includes("dev-only"),
  );

  return {
    title: ARPG_CONTENT_TOOLS.title,
    purpose: ARPG_CONTENT_TOOLS.purpose,
    registryCount: ARPG_CONTENT_TOOLS.registries.length,
    helperCount: ARPG_CONTENT_TOOLS.helpers.length,
    fixtureSaveCount: ARPG_CONTENT_TOOLS.fixtureSaves.length,
    progressionCheckCount: ARPG_CONTENT_TOOLS.progressionChecks.length,
    authoringRuleCount: ARPG_CONTENT_TOOLS.authoringRules.length,
    devOnlyHelperCount: devOnlyHelpers.length,
    registries: ARPG_CONTENT_TOOLS.registries,
    helpers: ARPG_CONTENT_TOOLS.helpers,
    fixtureSaves: ARPG_CONTENT_TOOLS.fixtureSaves,
    progressionChecks: ARPG_CONTENT_TOOLS.progressionChecks,
    authoringRules: ARPG_CONTENT_TOOLS.authoringRules,
    devOnlyHelpers,
  };
}

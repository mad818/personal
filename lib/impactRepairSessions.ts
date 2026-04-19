export interface ImpactRepairSession {
  href: string;
  label: string;
  detail: string;
}

const IMPACT_REPAIR_SESSION_PREFIXES: Array<{
  prefix: string;
  session: ImpactRepairSession;
}> = [
  {
    prefix: "components/home/office/HQTerminalSection.tsx",
    session: {
      href: "/hq?focus=hq-chronicle",
      label: "Open HQ chronicle",
      detail: "Work from the live chronicle block when touching reply flow, continuation, or mission output.",
    },
  },
  {
    prefix: "components/home/office/HQConsoleShellSection.tsx",
    session: {
      href: "/hq?focus=hq-console-shell",
      label: "Open HQ console shell",
      detail: "Jump directly into the shell chrome and scene-control block instead of the broad HQ top.",
    },
  },
  {
    prefix: "components/home/office/OfficeCommandCenter.tsx",
    session: {
      href: "/hq?focus=hq-chronicle",
      label: "Open HQ chronicle",
      detail: "Use the main HQ repair session for the shell’s orchestration and chronicle flow.",
    },
  },
  {
    prefix: "components/ui/CronSchedulerRunner.tsx",
    session: {
      href: "/hq?focus=hq-scheduler-jobs",
      label: "Open scheduler jobs",
      detail: "Review active scheduler results and job-led repair flow from the exact HQ scheduler jobs session.",
    },
  },
  {
    prefix: "components/ui/CronSchedulerPanel.tsx",
    session: {
      href: "/hq?focus=hq-scheduler-governance",
      label: "Open scheduler governance",
      detail: "Use the exact scheduler governance session instead of reopening the whole shell.",
    },
  },
  {
    prefix: "lib/schedulerGovernance.ts",
    session: {
      href: "/hq?focus=hq-scheduler-governance",
      label: "Open scheduler governance",
      detail: "Keep audit posture, governance rules, and scheduler repair context visible while changing shared automation logic.",
    },
  },
  {
    prefix: "components/vault/VaultStewardshipPanel.tsx",
    session: {
      href: "/vault?focus=vault-stewardship",
      label: "Open VAULT stewardship",
      detail: "Start from the archive-health panel when repairing vault continuity or maintenance posture.",
    },
  },
  {
    prefix: "components/vault/CompiledMemoryPagesPanel.tsx",
    session: {
      href: "/vault?focus=vault-compiled-pages",
      label: "Open compiled pages",
      detail: "Jump directly into compiled-page repair flow instead of the broader VAULT shell.",
    },
  },
  {
    prefix: "app/vault/page.tsx",
    session: {
      href: "/vault?focus=vault-stewardship",
      label: "Open VAULT stewardship",
      detail: "Use the exact archive repair session while changing the VAULT route shell.",
    },
  },
  {
    prefix: "lib/memorySpine.ts",
    session: {
      href: "/vault?focus=vault-memory-spine",
      label: "Open memory spine",
      detail: "Keep the local memory readiness lane visible while changing the shared archive contract.",
    },
  },
  {
    prefix: "lib/memoryPagesStore.ts",
    session: {
      href: "/vault?focus=vault-compiled-pages",
      label: "Open compiled pages",
      detail: "Review durable compiled-page behavior on the exact archive panel while changing stored page logic.",
    },
  },
  {
    prefix: "app/command/page.tsx",
    session: {
      href: "/command?focus=runtime-efficiency",
      label: "Open COMMAND runtime",
      detail: "Start with runtime posture when changing the main COMMAND shell.",
    },
  },
  {
    prefix: "lib/ai.ts",
    session: {
      href: "/command?focus=runtime-efficiency",
      label: "Open COMMAND runtime",
      detail: "Keep runtime efficiency, prompt waste, and provider posture visible while changing the AI boundary.",
    },
  },
  {
    prefix: "lib/security/routePolicy.ts",
    session: {
      href: "/recon?view=opsec&focus=recon-opsec",
      label: "Open RECON OPSEC",
      detail: "Use the exact trust-boundary panel while changing route and connector policy.",
    },
  },
  {
    prefix: "components/recon/ReconLookup.tsx",
    session: {
      href: "/recon?view=osint&focus=recon-lookup",
      label: "Open RECON lookup",
      detail: "Jump directly into the target-led lookup panel when refining recon flow.",
    },
  },
  {
    prefix: "components/recon/HeadersAudit.tsx",
    session: {
      href: "/recon?view=headers&focus=recon-headers",
      label: "Open headers audit",
      detail: "Use the exact headers repair session instead of the broader RECON route.",
    },
  },
  {
    prefix: "components/vehicle/VehicleArtifactManifestCard.tsx",
    session: {
      href: "/vehicle?focus=vehicle-artifact-convention",
      label: "Open vehicle artifacts",
      detail: "Jump directly into session bundles and future hardware artifact continuity.",
    },
  },
  {
    prefix: "components/vehicle/DroneOpsLaunchpad.tsx",
    session: {
      href: "/vehicle?focus=vehicle-connector-onboarding",
      label: "Open connector onboarding",
      detail: "Use the exact readiness panel for future Pixhawk and ArduPilot prep.",
    },
  },
];

export function getImpactRepairSession(filePath: string): ImpactRepairSession | null {
  const normalized = filePath.replace(/\\/g, "/");
  const match = IMPACT_REPAIR_SESSION_PREFIXES.find((entry) =>
    normalized.startsWith(entry.prefix),
  );
  return match?.session ?? null;
}

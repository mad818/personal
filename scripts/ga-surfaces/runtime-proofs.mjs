#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x ga-surfaces-runtime: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

function requireAll(files, needles, label) {
  const merged = files
    .map((relativePath) => readRequired(...relativePath.split("/")))
    .join("\n");
  for (const needle of needles) {
    requireText(merged, needle, label);
  }
}

const SURFACE_RUNTIME_PROOFS = [
  {
    id: "home",
    label: "HQ / Home",
    run() {
      requireAll(
        ["app/hq/page.tsx", "app/home/page.tsx"],
        ["OfficeCommandCenter", "ShellStage"],
        "home routes",
      );
      const hqTerminal = readRequired(
        "components",
        "home",
        "office",
        "HQTerminalSection.tsx",
      );
      requireText(hqTerminal, "MementoCycleStrip", "HQTerminalSection.tsx");
      requireText(
        hqTerminal,
        "CorrectionMemoryProvenanceStrip",
        "HQTerminalSection.tsx",
      );
      const chrome = readRequired("components", "ui", "RootLayoutChrome.tsx");
      requireText(chrome, "AuthGate", "RootLayoutChrome.tsx");
      const office = readRequired(
        "components",
        "home",
        "office",
        "OfficeCommandCenter.tsx",
      );
      requireText(office, "try {", "OfficeCommandCenter.tsx");
      requireText(office, "catch", "OfficeCommandCenter.tsx");
    },
  },
  {
    id: "command",
    label: "COMMAND",
    run() {
      const page = readRequired("app", "command", "page.tsx");
      requireText(page, "LazyNetworkHealth", "command/page.tsx");
      requireText(page, "LazyPrivacyShieldReceiptCard", "command/page.tsx");
      requireText(page, "LazyOvernightMissionCard", "command/page.tsx");
      requireText(page, "ShellPage", "command/page.tsx");
      const network = readRequired("components", "command", "NetworkHealth.tsx");
      requireText(network, "AbortSignal.timeout", "NetworkHealth.tsx");
      requireText(network, "try {", "NetworkHealth.tsx");
      requireText(network, "catch", "NetworkHealth.tsx");
    },
  },
  {
    id: "intel",
    label: "INTEL",
    run() {
      const page = readRequired("app", "intel", "page.tsx");
      requireText(page, "LazyIntelDeferredSegment", "intel/page.tsx");
      requireText(page, "ShellPage", "intel/page.tsx");
      const deferred = readRequired(
        "components",
        "intel",
        "IntelDeferredSegment.tsx",
      );
      requireText(deferred, "OpsDensityAlertStrip", "IntelDeferredSegment.tsx");
      requireText(deferred, "PapersResearchPanel", "IntelDeferredSegment.tsx");
      const loader = readRequired("components", "ui", "DataLoader.tsx");
      requireText(loader, "fg:", "DataLoader.tsx");
      requireText(loader, "value:", "DataLoader.tsx");
      requireText(loader, "label:", "DataLoader.tsx");
      requireText(loader, "catch", "DataLoader.tsx");
      const papers = readRequired(
        "components",
        "intel",
        "PapersResearchPanel.tsx",
      );
      requireText(papers, "try {", "PapersResearchPanel.tsx");
      requireText(papers, "catch", "PapersResearchPanel.tsx");
    },
  },
  {
    id: "alpha",
    label: "ALPHA",
    run() {
      const page = readRequired("app", "alpha", "page.tsx");
      requireText(page, "PricesLoader", "alpha/page.tsx");
      requireText(page, "ShellPage", "alpha/page.tsx");
      const buyBot = readRequired("components", "alpha", "BuyBot.tsx");
      requireText(buyBot, "unavailable", "BuyBot.tsx");
      const forecast = readRequired("components", "alpha", "ForecastLabCard.tsx");
      requireText(forecast, "degraded", "ForecastLabCard.tsx");
    },
  },
  {
    id: "cyber",
    label: "CYBER",
    run() {
      const page = readRequired("app", "cyber", "page.tsx");
      requireText(page, "LazyTriageView", "cyber/page.tsx");
      requireText(page, "LazyCyberDeferredChamber", "cyber/page.tsx");
      requireText(page, "LazyAiExposureReviewCard", "cyber/page.tsx");
      requireText(page, "ShellPage", "cyber/page.tsx");
      const triage = readRequired("components", "cyber", "TriageView.tsx");
      requireText(triage, "try {", "TriageView.tsx");
      requireText(triage, "catch", "TriageView.tsx");
    },
  },
  {
    id: "recon",
    label: "RECON",
    run() {
      const page = readRequired("app", "recon", "page.tsx");
      requireText(page, "LazyReconLookup", "recon/page.tsx");
      requireText(page, "LazyPassiveDns", "recon/page.tsx");
      requireText(page, "LazyGeocodingPlaygroundCard", "recon/page.tsx");
      requireText(page, "LazyRepoAssimilationQueueCard", "recon/page.tsx");
      requireText(page, "ShellPage", "recon/page.tsx");
      const lookup = readRequired("components", "recon", "ReconLookup.tsx");
      requireText(lookup, "BYOK", "ReconLookup.tsx");
      requireText(lookup, "try {", "ReconLookup.tsx");
      requireText(lookup, "catch", "ReconLookup.tsx");
    },
  },
  {
    id: "vault",
    label: "VAULT",
    run() {
      const page = readRequired("app", "vault", "page.tsx");
      requireText(page, "LazyCompiledMemoryPagesPanel", "vault/page.tsx");
      requireText(page, "LazyMemoryAskPanel", "vault/page.tsx");
      requireText(page, "LazyDocumentIntakePanel", "vault/page.tsx");
      requireText(page, "ShellPage", "vault/page.tsx");
      const ask = readRequired("components", "vault", "MemoryAskPanel.tsx");
      requireText(ask, "unavailable", "MemoryAskPanel.tsx");
      requireText(ask, "try {", "MemoryAskPanel.tsx");
      requireText(ask, "catch", "MemoryAskPanel.tsx");
      const compiled = readRequired(
        "components",
        "vault",
        "CompiledMemoryPagesPanel.tsx",
      );
      requireText(compiled, "try {", "CompiledMemoryPagesPanel.tsx");
      requireText(compiled, "catch", "CompiledMemoryPagesPanel.tsx");
    },
  },
  {
    id: "resources",
    label: "RESOURCES",
    run() {
      const page = readRequired("app", "resources", "page.tsx");
      requireText(page, "ResourcesWorkbench", "resources/page.tsx");
      requireText(page, "ShellPage", "resources/page.tsx");
      const workbench = readRequired(
        "components",
        "resources",
        "ResourcesWorkbench.tsx",
      );
      requireText(workbench, "ProjectImpactConsole", "ResourcesWorkbench.tsx");
      const impact = readRequired(
        "components",
        "resources",
        "ProjectImpactConsole.tsx",
      );
      requireText(impact, "unavailable", "ProjectImpactConsole.tsx");
      requireText(impact, "try {", "ProjectImpactConsole.tsx");
      requireText(impact, "catch", "ProjectImpactConsole.tsx");
    },
  },
];

export function runGaSurfaceRuntimeProofs() {
  for (const proof of SURFACE_RUNTIME_PROOFS) {
    proof.run();
  }
  return SURFACE_RUNTIME_PROOFS.length;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const count = runGaSurfaceRuntimeProofs();
  console.log(`ok ga-surfaces-runtime (${count} GA surfaces structurally proven)`);
}

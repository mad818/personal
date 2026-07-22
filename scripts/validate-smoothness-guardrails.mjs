import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

function listFiles(dir, predicate) {
  const root = path.join(repoRoot, dir);
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    const rel = path.relative(repoRoot, full).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "archive"].includes(entry.name)) continue;
      files.push(...listFiles(rel, predicate));
    } else if (predicate(rel)) {
      files.push(rel);
    }
  }
  return files;
}

const errors = [];

const requiredSnippets = [
  {
    file: "lib/operationalLights.ts",
    snippets: [
      "OperationalLightState",
      "buildOperationalLightGrid",
      "Phone LAN/PWA proof remains manual",
    ],
  },
  {
    file: "hooks/useOperationalLights.ts",
    snippets: [
      "window.setInterval(run, 60_000)",
      "document.hidden",
      "AbortController",
    ],
  },
  {
    file: "components/ui/OperationalLightGrid.tsx",
    snippets: [
      'data-testid="operational-light-grid"',
      "aria-label",
      "title={title}",
    ],
  },
  {
    file: "components/nav/Nav.tsx",
    snippets: ["useOperationalLights", 'variant="toprail"', "maxLights={10}"],
  },
  {
    file: "components/ui/FreeLocalReadinessPanel.tsx",
    snippets: [
      "buildOperationalLightGrid",
      'variant={compact ? "compact" : "panel"}',
      "document.hidden",
    ],
  },
  {
    file: "components/home/office/OfficeRoom3D.tsx",
    snippets: [
      "OperationalRoomLightRack",
      "getOperationalLightStateHex",
      "roomOperationalLights",
    ],
  },
  {
    file: "app/globals.css",
    snippets: [
      ".nexus-operational-lights",
      "prefers-reduced-motion",
      "nexus-operational-light-pulse",
    ],
  },
];

for (const check of requiredSnippets) {
  const source = read(check.file);
  for (const snippet of check.snippets) {
    if (!source.includes(snippet)) {
      errors.push(
        `${check.file}: missing smoothness proof snippet "${snippet}"`,
      );
    }
  }
}

const legacyStatusSurfaces = [
  "HealthMonitor",
  "SystemStatusFooter",
  "TelemetryHUD",
  "AgentStatusBar",
];
const tsxFiles = [
  ...listFiles("app", (file) => file.endsWith(".tsx")),
  ...listFiles("components", (file) => file.endsWith(".tsx")),
];

for (const legacyName of legacyStatusSurfaces) {
  const owningFile = tsxFiles.find((file) =>
    file.endsWith(`${legacyName}.tsx`),
  );
  if (owningFile) {
    errors.push(
      `${owningFile}: ${legacyName} must remain retired; use OperationalLightGrid instead.`,
    );
  }
  for (const file of tsxFiles) {
    if (file === owningFile) continue;
    const source = read(file);
    const importPattern = new RegExp(
      `import\\s+(?:[^;]*\\b${legacyName}\\b[^;]*|${legacyName})\\s+from`,
    );
    if (importPattern.test(source)) {
      errors.push(
        `${file}: ${legacyName} is a legacy floating status surface; fold indicators into OperationalLightGrid instead.`,
      );
    }
  }
}

const toprailPolling = read("components/ui/TrustPostureStrip.tsx");
if (!toprailPolling.includes("document.hidden")) {
  errors.push(
    "components/ui/TrustPostureStrip.tsx: trust strip polling must pause while the tab is hidden.",
  );
}

const forbiddenNetworkIdleFiles = [
  ...listFiles(
    "tests",
    (file) => file.endsWith(".ts") || file.endsWith(".tsx"),
  ),
];
for (const file of forbiddenNetworkIdleFiles) {
  const source = read(file);
  if (source.includes("networkidle")) {
    errors.push(
      `${file}: avoid networkidle waits for smoothness proof; use explicit route/DOM checks.`,
    );
  }
}

if (errors.length > 0) {
  console.error("Smoothness guardrail validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Smoothness guardrails OK (operational lights, visibility-aware polling, and legacy status surfaces are retired).",
);

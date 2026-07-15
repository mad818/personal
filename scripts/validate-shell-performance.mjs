import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const notes = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function containsFormatIndependentSnippet(source, snippet) {
  if (source.includes(snippet)) return true;
  return source.replace(/\s+/g, "").includes(snippet.replace(/\s+/g, ""));
}

function collectFiles(rootPath, predicate) {
  if (!fs.existsSync(rootPath)) return [];
  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

const packageJson = JSON.parse(read("package.json"));
const requiredScripts = [
  "dev:fresh",
  "build:verified",
  "verify:fast",
  "performance:runtime:check",
  "performance:check",
];
for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script]) {
    errors.push(`package.json: missing performance workflow script "${script}"`);
  }
}

const devServer = read("scripts/dev-server.mjs");
if (!containsFormatIndependentSnippet(devServer, 'process.argv.includes("--fresh")')) {
  errors.push("scripts/dev-server.mjs: normal dev startup must preserve .next unless --fresh is explicit.");
}
if (!containsFormatIndependentSnippet(devServer, "fresh runtime")) {
  errors.push("scripts/dev-server.mjs: fresh-start behavior must remain operator-visible.");
}
if (!containsFormatIndependentSnippet(devServer, 'join(nextDir, "BUILD_ID")')) {
  errors.push("scripts/dev-server.mjs: development startup must detect incompatible production output.");
}
if (!containsFormatIndependentSnippet(devServer, "cleared incompatible production build before development runtime")) {
  errors.push("scripts/dev-server.mjs: production-output cleanup must remain operator-visible.");
}

const rootChrome = read("components/ui/RootLayoutChrome.tsx");
for (const forbiddenImport of [
  "@/components/ui/CronSchedulerRunner",
  "@/components/ui/DataLoader",
  "@/components/ui/GlobalDataLoader",
  "@/components/ui/MemorySpineSync",
]) {
  if (containsFormatIndependentSnippet(rootChrome, `from "${forbiddenImport}"`)) {
    errors.push(
      `components/ui/RootLayoutChrome.tsx: heavy shell service must not be statically imported (${forbiddenImport}).`,
    );
  }
}
if (!containsFormatIndependentSnippet(rootChrome, "<ShellBackgroundServices pathname={pathname} />")) {
  errors.push("components/ui/RootLayoutChrome.tsx: missing route-aware background service boundary.");
}

const nav = read("components/nav/Nav.tsx");
for (const forbiddenImport of [
  "@/components/settings/SettingsDrawer",
  "@/components/ui/NotificationCenter",
]) {
  if (containsFormatIndependentSnippet(nav, `from "${forbiddenImport}"`)) {
    errors.push(
      `components/nav/Nav.tsx: closed overlay must not be statically imported (${forbiddenImport}).`,
    );
  }
}
for (const snippet of [
  'dynamic(() => import("@/components/settings/SettingsDrawer")',
  'dynamic(() => import("@/components/ui/NotificationCenter")',
  "settingsLoaded",
  "notificationsLoaded",
]) {
  if (!containsFormatIndependentSnippet(nav, snippet)) {
    errors.push(`components/nav/Nav.tsx: missing click-activated overlay boundary "${snippet}"`);
  }
}

const shellServices = read("components/ui/ShellBackgroundServices.tsx");
for (const snippet of [
  "requestIdleCallback",
  "plan.deferTimeoutMs",
  "CronSchedulerRunner",
  "MemorySpineSync",
]) {
  if (!containsFormatIndependentSnippet(shellServices, snippet)) {
    errors.push(`components/ui/ShellBackgroundServices.tsx: missing "${snippet}"`);
  }
}

const dynamicBoundaryChecks = [
  {
    file: "app/cyber/page.tsx",
    modules: ["@/components/cyber/CyberDeferredChamber"],
  },
  {
    file: "app/intel/page.tsx",
    modules: ["@/components/intel/IntelDeferredSegment"],
  },
  {
    file: "app/command/page.tsx",
    modules: [
      "@/components/command/AIBriefing",
      "@/components/command/AgentHealthCard",
      "@/components/command/BusinessBuilder",
      "@/components/command/EfficiencyOpsCard",
      "@/components/command/EventRadar",
      "@/components/command/FocusPanel",
      "@/components/command/JobRiskAnalyzer",
      "@/components/command/KPICards",
      "@/components/command/MemorySpineStatusCard",
      "@/components/command/NetworkHealth",
      "@/components/command/PrivacyShieldPreviewPanel",
      "@/components/command/ProjectStackCard",
      "@/components/command/RuntimeEfficiencyCard",
      "@/components/command/SystemStatusRing",
      "@/components/command/ThreatHeatmap",
      "@/components/command/WorldEventMap",
      "@/components/vault/MemoryAskPanel",
    ],
  },
  {
    file: "app/vault/page.tsx",
    modules: [
      "@/components/vault/VaultPublishChamber",
      "@/components/vault/VaultRelationsChamber",
    ],
  },
  {
    file: "app/skills/page.tsx",
    modules: [
      "@/components/skills/AgencyRoleLibrary",
      "@/components/skills/BlacksiteLab",
      "@/components/skills/KnowledgeBase",
      "@/components/skills/KnowledgeGraphViz",
      "@/components/skills/LearningLog",
      "@/components/skills/LearningProgressRing",
      "@/components/skills/SkillLibrary",
      "@/components/skills/SkillRadarChart",
      "@/components/skills/SystemBrain",
      "@/components/skills/WorkflowForge",
    ],
  },
  {
    file: "app/security/page.tsx",
    modules: [
      "@/components/security/AIHardeningCoveragePanel",
      "@/components/security/AlertTimeline",
      "@/components/security/CameraGrid",
      "@/components/security/DronePanel",
      "@/components/security/PerimeterSweep",
      "@/components/security/SecurityAlerts",
      "@/components/security/SecurityDoctrineMatrix",
      "@/components/security/ThreatLevelIndicator",
    ],
  },
  {
    file: "components/resources/ResourcesWorkbench.tsx",
    modules: [
      "@/components/resources/DeveloperFieldManual",
      "@/components/resources/MassiveWinConsole",
      "@/components/resources/PlaybooksConsole",
      "@/components/resources/ProjectImpactConsole",
      "@/components/resources/RegistryConsole",
      "@/components/resources/SessionFinderConsole",
      "@/components/resources/SourceIntelligenceConsole",
      "@/components/resources/SpecDrivenConsole",
      "@/components/resources/StudyWorkbenchConsole",
      "@/components/resources/SubscriptionEscapeConsole",
      "@/components/resources/SurfaceCapabilitiesConsole",
      "@/components/resources/SystemDesignConsole",
      "@/components/resources/VoiceLabConsole",
    ],
  },
  {
    file: "app/vehicle/page.tsx",
    modules: [
      "@/components/vehicle/BenchBringUpChecklist",
      "@/components/vehicle/CameraArray",
      "@/components/vehicle/ControlPanel",
      "@/components/vehicle/DroneOpsLaunchpad",
      "@/components/vehicle/FirstHardwareDayCard",
      "@/components/vehicle/RadarSweep",
      "@/components/vehicle/SensorFusion",
      "@/components/vehicle/SensorHealthRadial",
      "@/components/vehicle/TelemetryChart",
      "@/components/vehicle/TelemetryPanel",
      "@/components/vehicle/VehicleArtifactManifestCard",
    ],
  },
  {
    file: "app/iot/page.tsx",
    modules: [
      "@/components/iot/AutomationRules",
      "@/components/iot/DeviceRegistry",
      "@/components/iot/DeviceStatusMatrix",
      "@/components/iot/SensorDashboard",
      "@/components/iot/WeatherTimeline",
    ],
  },
];

for (const check of dynamicBoundaryChecks) {
  const source = read(check.file);
  if (!containsFormatIndependentSnippet(source, 'from "next/dynamic"')) {
    errors.push(`${check.file}: missing next/dynamic route-panel boundary.`);
  }
  for (const modulePath of check.modules) {
    if (containsFormatIndependentSnippet(source, `from "${modulePath}"`)) {
      errors.push(`${check.file}: chamber-only panel must not be statically imported (${modulePath}).`);
    }
    if (!containsFormatIndependentSnippet(source, `import("${modulePath}")`)) {
      errors.push(`${check.file}: missing dynamic chamber import (${modulePath}).`);
    }
  }
}

const chunkRoot = path.join(repoRoot, ".next", "static", "chunks");
const jsChunks = collectFiles(chunkRoot, (file) => file.endsWith(".js"));
const hasProductionBuild = fs.existsSync(path.join(repoRoot, ".next", "BUILD_ID"));
if (jsChunks.length > 0 && hasProductionBuild) {
  const largestChunk = jsChunks
    .map((file) => ({ file, bytes: fs.statSync(file).size }))
    .sort((left, right) => right.bytes - left.bytes)[0];
  const maxChunkBytes = 1_500 * 1024;
  notes.push(
    `largest generated chunk ${path.basename(largestChunk.file)} ${(largestChunk.bytes / 1024).toFixed(1)} KB`,
  );
  if (largestChunk.bytes > maxChunkBytes) {
    errors.push(
      `.next/static/chunks: largest generated chunk exceeds 1500 KB (${(largestChunk.bytes / 1024).toFixed(1)} KB).`,
    );
  }

  const appChunks = jsChunks.filter((file) =>
    file.includes(`${path.sep}chunks${path.sep}app${path.sep}`),
  );
  const largestAppChunk = appChunks
    .map((file) => ({ file, bytes: fs.statSync(file).size }))
    .sort((left, right) => right.bytes - left.bytes)[0];
  if (largestAppChunk) {
    notes.push(
      `largest generated app chunk ${path.basename(largestAppChunk.file)} ${(largestAppChunk.bytes / 1024).toFixed(1)} KB`,
    );
    if (largestAppChunk.bytes > 250 * 1024) {
      errors.push(
        `.next/static/chunks/app: largest route chunk exceeds 250 KB (${(largestAppChunk.bytes / 1024).toFixed(1)} KB).`,
      );
    }
  }

  const appBuildManifestPath = path.join(repoRoot, ".next", "app-build-manifest.json");
  if (fs.existsSync(appBuildManifestPath)) {
    const appBuildManifest = JSON.parse(fs.readFileSync(appBuildManifestPath, "utf8"));
    const routeChunkBudgets = {
      "/alpha/page": 25 * 1024,
      "/cyber/page": 40 * 1024,
      "/intel/page": 25 * 1024,
      "/recon/page": 20 * 1024,
      "/command/page": 45 * 1024,
      "/vault/page": 45 * 1024,
      "/skills/page": 50 * 1024,
      "/security/page": 50 * 1024,
      "/resources/page": 45 * 1024,
      "/vehicle/page": 55 * 1024,
      "/iot/page": 25 * 1024,
    };

    for (const [route, maxBytes] of Object.entries(routeChunkBudgets)) {
      const routeFiles = appBuildManifest.pages?.[route] ?? [];
      const routeChunkBytes = routeFiles
        .filter((file) => file.startsWith(`static/chunks/app${route.slice(0, -4)}`) && file.endsWith(".js"))
        .reduce((total, file) => total + fs.statSync(path.join(repoRoot, ".next", file)).size, 0);
      notes.push(`${route} app chunk ${(routeChunkBytes / 1024).toFixed(1)} KB`);
      if (routeChunkBytes === 0) {
        errors.push(`.next/app-build-manifest.json: missing generated app chunk for ${route}.`);
      } else if (routeChunkBytes > maxBytes) {
        errors.push(
          `${route}: generated app chunk exceeds ${maxBytes / 1024} KB (${(routeChunkBytes / 1024).toFixed(1)} KB).`,
        );
      }
    }
  } else {
    errors.push(".next/app-build-manifest.json: missing production route manifest.");
  }
} else if (jsChunks.length > 0) {
  notes.push("generated chunk budgets skipped because .next contains development output");
} else {
  notes.push("generated chunk budgets skipped because .next/static/chunks is absent");
}

const publicFiles = collectFiles(path.join(repoRoot, "public"), () => true);
const largestPublicFile = publicFiles
  .map((file) => ({ file, bytes: fs.statSync(file).size }))
  .sort((left, right) => right.bytes - left.bytes)[0];
if (largestPublicFile) {
  notes.push(
    `largest public asset ${path.relative(repoRoot, largestPublicFile.file)} ${(largestPublicFile.bytes / 1024).toFixed(1)} KB`,
  );
  if (largestPublicFile.bytes > 2_500 * 1024) {
    errors.push(
      `public: runtime asset exceeds 2500 KB (${path.relative(repoRoot, largestPublicFile.file)}).`,
    );
  }
}

if (errors.length > 0) {
  console.error("Shell performance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Shell performance budgets OK (${notes.join("; ")}).`);

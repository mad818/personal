#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
};
const fail = (message) => {
  console.error(`nexus-company-map validation failed: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

const registry = read("lib/nexusCompanyMap.ts");
const component = read("components/skills/NexusCompanyMap.tsx");
const library = read("components/skills/AgencyRoleLibrary.tsx");
const styles = read("app/globals.css");
const packageJson = read("package.json");
const spec = read("specs/features/nexus-company-map.md");
const graphifyContext = read(
  "docs/ideas/repo-analysis/graphify/REPO_CONTEXT.md",
);
if (!registry || !component || !spec)
  fail("required company-map files are missing");

for (const department of [
  "Command & Operations",
  "Engineering",
  "Design",
  "Research & Knowledge",
  "Marketing & Social",
  "Finance & Business",
  "Legal & Trust",
])
  requireText(registry, department, `department ${department}`);
for (const source of [
  "Graphify",
  "Superpowers",
  "Matt Pocock's Engineering Skills",
  "TypeScript Deep Modules (PR #505)",
  "David Ondrej's Agent Skills",
  "Context7",
  "Anthropic skills collection",
  "Claude-Mem",
  "UI/UX Pro Max",
  "Taste Skill",
  "Emil's Design Engineering Skills",
  "OpenDirectory GTM Skill Atlas",
  "Mautic Campaign Builder Pattern",
  "Vaultwarden-Informed Sealed Vault",
  "ayghri/i-have-adhd Focus Output",
  "UditAkhourii/adhd Capped Divergence",
  "Frontend Slides",
  "Last30Days",
  "AutoTemp evaluation pattern",
  "LeakHub verification pattern",
  "P4RS3LT0NGV3 transformation taxonomy",
  "GLOSSOPETRAE visibility-gap defense",
  "ST3GG media-tail defense",
  "AutoStoryGen staged drafting pattern",
  "Ourobopus review loop",
  "NATURALIS FUTURA risk-briefing pattern",
  "Marketing Skills",
  "Social Media Skills",
])
  requireText(registry, source, `source ${source}`);

requireText(registry, "not the company org chart", "Graphify correction");
requireText(registry, "translation_required", "translation boundary");
requireText(
  component,
  'data-testid="nexus-company-map"',
  "company map test id",
);
requireText(component, "queueHQPrompt", "HQ handoff");
requireText(component, "navigator.clipboard.writeText", "ChatGPT copy path");
requireText(component, 'role="tablist"', "accessible department rail");
requireText(
  component,
  "handleDepartmentKeyDown",
  "keyboard department selection",
);
requireText(component, 'aria-live="polite"', "copy feedback live region");
requireText(component, "useReducedMotion", "reduced motion behavior");
requireText(
  styles,
  ".nexus-company-map__workspace",
  "company map workplane styles",
);
requireText(
  styles,
  ".nexus-ops-layout__workplane--skills",
  "mobile Skills workplane containment",
);
requireText(library, "NexusCompanyMap", "Agency Role Library mount");
requireText(graphifyContext, "not an AI-company", "Graphify analysis boundary");
requireText(
  read("docs/ideas/repo-analysis/last30days-skill/REPO_CONTEXT.md"),
  "external research runtime",
  "Last30Days analysis boundary",
);
requireText(
  read("docs/ideas/repo-analysis/emilkowalski-skills/REPO_CONTEXT.md"),
  "not an application runtime or a replacement",
  "design skills analysis boundary",
);
requireText(
  read("docs/ideas/repo-analysis/ayghri-i-have-adhd/REPO_CONTEXT.md"),
  "response-shaping skill",
  "focus-output analysis boundary",
);
requireText(
  read("docs/ideas/repo-analysis/uditakhourii-adhd/REPO_CONTEXT.md"),
  "larger upstream call pattern",
  "capped-divergence analysis boundary",
);
requireText(
  read("docs/ideas/repo-analysis/frontend-slides/REPO_CONTEXT.md"),
  "rather than serving as a presentation runtime inside Nexus",
  "Frontend Slides analysis boundary",
);
requireText(
  read("docs/ideas/repo-analysis/mattpocock-skills/REPO_CONTEXT.md"),
  "intentionally remains outside the released plugin/router surface",
  "Matt Pocock PR boundary",
);
requireText(
  read("docs/ideas/repo-analysis/varnan-tech-opendirectory/REPO_CONTEXT.md"),
  "current `main` README lists 62 skills",
  "OpenDirectory current inventory",
);
requireText(
  read("docs/ideas/repo-analysis/mautic-mautic/REPO_CONTEXT.md"),
  "not into a marketing automation service",
  "Mautic product boundary",
);
requireText(
  read("docs/ideas/repo-analysis/dani-garcia-vaultwarden/REPO_CONTEXT.md"),
  "encryption is performed by the clients",
  "Vaultwarden responsibility boundary",
);
requireText(
  read("docs/ideas/repo-analysis/davidondrej-skills/REPO_CONTEXT.md"),
  "reviewed skill-by-skill",
  "David Ondrej catalog boundary",
);
requireText(
  read("docs/ideas/repo-analysis/elder-plinius/REPO_CONTEXT.md"),
  "selected eight patterns",
  "elder-plinius portfolio boundary",
);
requireText(
  read("docs/ideas/repo-analysis/elder-plinius/portfolio-inventory.json"),
  '"repositoryCount": 45',
  "elder-plinius portfolio inventory",
);
requireText(
  read("docs/ideas/repo-analysis/elder-plinius/glossopetrae/REPO_CONTEXT.md"),
  "defensive inspection lesson",
  "GLOSSOPETRAE analysis boundary",
);
requireText(
  read("docs/ideas/repo-analysis/elder-plinius/st3gg/REPO_CONTEXT.md"),
  "must not install, copy, or expose",
  "ST3GG analysis boundary",
);

const scripts = JSON.parse(packageJson).scripts ?? {};
requireText(
  String(scripts["company-map:runtime:check"] ?? ""),
  "check-nexus-company-map-runtime",
  "focused runtime gate",
);
requireText(
  String(scripts["company-map:check"] ?? ""),
  "company-map:runtime:check",
  "focused check chain",
);
requireText(
  String(scripts.verify ?? ""),
  "npm run company-map:check",
  "verify wiring",
);
console.log("Nexus company map static validation OK.");

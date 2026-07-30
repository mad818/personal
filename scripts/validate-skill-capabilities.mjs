#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import {
  detectCssHiddenPromptSmuggling,
  detectUnicodeHiddenPromptSmuggling,
  evaluateSkillCapabilities,
} from "../lib/skillSpectrumPolicy.ts";
import { analyzeSkillDependencyGraph } from "../lib/skillDependencyGraph.ts";

const root = process.cwd();
const skillRoots = [
  path.join(root, ".agents", "skills"),
  path.join(root, ".claude", "skills"),
  path.join(root, "docs", "ideas", "skills"),
];

function fail(message) {
  console.error(`x skill-capabilities: ${message}`);
  process.exit(1);
}

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (entry.name === "SKILL.md" || entry.name === "GUIDE.md")
      output.push(full);
  }
  return output;
}

const capabilityRe =
  /\b(?:filesystem|network|process|secrets|agent|memory|tool):[a-z_]+\b/g;
const skillReferenceRe = /@([A-Za-z0-9._/\\-]+\/SKILL\.md)\b/g;

function toRepoRelative(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function resolveSkillReference(sourceFile, reference) {
  const normalized = reference
    .replaceAll("\\", "/")
    .replace(/^\.Codex\/skills\//, ".agents/skills/");
  const repoRelative = /^(?:\.agents|\.claude|docs)\//.test(normalized);
  const absolute = repoRelative
    ? path.resolve(root, normalized)
    : path.resolve(path.dirname(sourceFile), normalized);
  return toRepoRelative(absolute);
}

let scanned = 0;
let blocked = 0;
let contentScanned = 0;

for (const skillRoot of skillRoots) {
  if (!fs.existsSync(skillRoot)) {
    fail(`required skill root is missing: ${path.relative(root, skillRoot)}`);
  }
}

const skillFiles = skillRoots.flatMap((skillRoot) => walk(skillRoot)).sort();
const skillEntryFiles = skillFiles.filter(
  (skillFile) => path.basename(skillFile) === "SKILL.md",
);
const nodeIdByEntryFile = new Map(
  skillEntryFiles.map((skillFile) => {
    const relative = toRepoRelative(skillFile);
    return [relative, relative.slice(0, -"/SKILL.md".length)];
  }),
);
const graphNodeByDirectory = new Map(
  skillEntryFiles.map((skillFile) => {
    const id = nodeIdByEntryFile.get(toRepoRelative(skillFile));
    return [
      path.dirname(skillFile),
      {
        id,
        capabilities: [],
        dependencies: [],
      },
    ];
  }),
);

for (const skillFile of skillFiles) {
  const text = fs.readFileSync(skillFile, "utf8");
  contentScanned += 1;
  const cssFindings = detectCssHiddenPromptSmuggling(text);
  if (cssFindings.length) {
    fail(
      `${path.relative(root, skillFile)} has CSS-hidden prompt smuggling (line ${cssFindings[0].line}): ${cssFindings[0].excerpt}`,
    );
  }
  const unicodeFindings = detectUnicodeHiddenPromptSmuggling(text);
  if (unicodeFindings.length) {
    const finding = unicodeFindings[0];
    fail(
      `${path.relative(root, skillFile)} has Unicode hidden-channel content (${finding.category} ${finding.codePoint}, line ${finding.line}, column ${finding.column}): ${finding.excerpt}`,
    );
  }
  const declared = [...new Set(text.match(capabilityRe) ?? [])];
  const graphNode = graphNodeByDirectory.get(path.dirname(skillFile));
  if (graphNode) {
    graphNode.capabilities.push(...declared);
    for (const match of text.matchAll(skillReferenceRe)) {
      const targetFile = resolveSkillReference(skillFile, match[1]);
      graphNode.dependencies.push(
        nodeIdByEntryFile.get(targetFile) ?? `unresolved:${targetFile}`,
      );
    }
  }
  if (!declared.length) continue;
  scanned += 1;
  const { violations } = evaluateSkillCapabilities(declared);
  if (violations.length) {
    blocked += violations.length;
    fail(
      `${path.relative(root, skillFile)} declares blocked capabilities: ${violations
        .map((v) => v.capability)
        .join(", ")}`,
    );
  }
}

const graphReport = analyzeSkillDependencyGraph([
  ...graphNodeByDirectory.values(),
]);
if (graphReport.unresolved.length > 0) {
  const finding = graphReport.unresolved[0];
  fail(
    `${finding.from} has unresolved skill dependency ${finding.dependency.replace(/^unresolved:/, "")}`,
  );
}
if (graphReport.cycles.length > 0) {
  fail(
    `skill dependency cycle detected: ${graphReport.cycles[0].path.join(" -> ")}`,
  );
}
const blockedEscalation = graphReport.escalations.find(
  (finding) => finding.inheritedRisk === "blocked",
);
if (blockedEscalation) {
  fail(
    `${blockedEscalation.skillId} inherits blocked capabilities through ${blockedEscalation.via.join(" -> ")}: ${blockedEscalation.capabilities.join(", ")}`,
  );
}
const reviewEscalations = graphReport.escalations.filter(
  (finding) => finding.inheritedRisk === "review",
);

console.log(
  `ok skill-capabilities (${skillRoots.length} roots, ${contentScanned} skill markdown file(s) CSS/Unicode-scanned, ${scanned} with capability declarations, ${blocked} blocked; dependency graph ${graphReport.nodeCount} nodes/${graphReport.edgeCount} edges, ${reviewEscalations.length} review escalation(s))`,
);

#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const root = process.cwd();
const findings = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function fail(message) {
  findings.push(message);
}

function requireText(source, value, label) {
  if (!source.includes(value)) fail(`${label} is missing ${value}`);
}

function requireNormalizedText(source, value, label) {
  const normalizedSource = source.replace(/\s+/g, " ");
  const normalizedValue = value.replace(/\s+/g, " ");
  if (!normalizedSource.includes(normalizedValue)) {
    fail(`${label} is missing ${normalizedValue}`);
  }
}

function listTsxFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const relativePath = relative(root, path).replaceAll("\\", "/");
    if (entry.isDirectory() && relativePath === "app/hq") {
      continue;
    }
    if (entry.isDirectory()) files.push(...listTsxFiles(path));
    if (entry.isFile() && entry.name.endsWith(".tsx")) files.push(path);
  }
  return files;
}

function hasJsxAttribute(attributes, name) {
  return attributes.properties.some(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

function collectRawInlineScripts(file) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const scripts = [];

  function visit(node) {
    let opening = null;
    if (ts.isJsxSelfClosingElement(node)) opening = node;
    if (ts.isJsxElement(node)) opening = node.openingElement;
    if (
      opening &&
      opening.tagName.getText() === "script" &&
      hasJsxAttribute(opening.attributes, "dangerouslySetInnerHTML")
    ) {
      scripts.push({
        file: relative(root, file).replaceAll("\\", "/"),
        nonce: hasJsxAttribute(opening.attributes, "nonce"),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return scripts;
}

const requiredFiles = [
  "lib/security/contentSecurityPolicy.ts",
  "scripts/check-content-security-policy-runtime.mjs",
  "scripts/check-content-security-policy-production.mjs",
  "scripts/validate-nonce-script-csp.mjs",
  "specs/features/nonce-script-csp-hardening.md",
  "docs/security/nonce-script-csp.md",
];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) fail(`Missing nonce CSP file: ${file}`);
}

const policy = read("lib/security/contentSecurityPolicy.ts");
const middleware = read("middleware.ts");
const layout = read("app/layout.tsx");
const nextConfig = read("next.config.js");
const packageJson = JSON.parse(read("package.json"));
const handoffGenerator = read("scripts/generate-handoff.js");
const todo = read("tasks/todo.md");
const lessons = read("tasks/lessons.md");

for (const value of [
  "CONTENT_SECURITY_POLICY_NONCE_BYTES = 16",
  "globalThis.crypto.getRandomValues(bytes)",
  "assertContentSecurityPolicyNonce(nonce)",
  "\"script-src 'self'\"",
  "\"'strict-dynamic'\"",
  "scriptSrc.push(\"'unsafe-eval'\")",
  "if (options.tradingViewEmbed)",
  'scriptSrc.push("https://s3.tradingview.com")',
  '"sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox"',
]) {
  requireText(policy, value, "contentSecurityPolicy.ts");
}

for (const value of [
  "createContentSecurityPolicyNonce",
  "buildContentSecurityPolicy",
  "requestHeaders.set(CONTENT_SECURITY_POLICY_NONCE_HEADER, nonce)",
  "requestHeaders.set(CONTENT_SECURITY_POLICY_HEADER, contentSecurityPolicy)",
  "response.headers.set(CONTENT_SECURITY_POLICY_HEADER, policy)",
  "NextResponse.next({ request: { headers: requestHeaders } })",
  "'/api/:path*'",
  "next-router-prefetch",
  "purpose",
  "prefetch",
  "tradingViewEmbed: pathname === '/embeds/tradingview'",
]) {
  requireNormalizedText(middleware, value, "middleware.ts");
}
if ((middleware.match(/NextResponse\.next\(/g) ?? []).length !== 1) {
  fail("middleware.ts must route all next responses through the CSP wrapper.");
}
if ((middleware.match(/NextResponse\.json\(/g) ?? []).length !== 1) {
  fail("middleware.ts must route all JSON responses through the CSP wrapper.");
}
if (
  !middleware.includes("_next/static") ||
  !middleware.includes("_next/image")
) {
  fail("middleware.ts document matcher must exclude Next.js static assets.");
}

for (const value of [
  "const requestHeaders = await headers()",
  "requestHeaders.get(CONTENT_SECURITY_POLICY_NONCE_HEADER)",
  "<PersistedShellStateBootScript nonce={nonce} />",
  "<SurfaceMotionBootScript nonce={nonce} />",
]) {
  requireNormalizedText(layout, value, "app/layout.tsx");
}

const rawScripts = [
  ...listTsxFiles(join(root, "app")),
  ...listTsxFiles(join(root, "components")),
].flatMap(collectRawInlineScripts);
const expectedRawScripts = [
  "app/layout.tsx",
  "components/ui/PersistedShellStateBootScript.tsx",
  "components/ui/SurfaceMotionBootScript.tsx",
];
if (rawScripts.length !== expectedRawScripts.length) {
  fail(
    `Expected ${expectedRawScripts.length} active raw inline scripts, found ${rawScripts.length}.`,
  );
}
for (const expected of expectedRawScripts) {
  const script = rawScripts.find((candidate) => candidate.file === expected);
  if (!script) fail(`Missing inventoried raw inline script: ${expected}`);
  if (script && !script.nonce)
    fail(`Raw inline script is missing nonce: ${expected}`);
}
for (const script of rawScripts) {
  if (!script.nonce) fail(`Raw inline script is missing nonce: ${script.file}`);
}

if (nextConfig.includes("Content-Security-Policy")) {
  fail("next.config.js still emits a static Content-Security-Policy header.");
}
if (nextConfig.includes("buildCsp") || nextConfig.includes("script-src")) {
  fail("next.config.js still owns the request-specific script policy.");
}

if (
  packageJson.scripts?.["security:csp"] !==
  "node scripts/validate-nonce-script-csp.mjs && npm run security:csp:runtime"
) {
  fail("package.json security:csp wiring drifted.");
}
if (
  packageJson.scripts?.["security:csp:runtime"] !==
  "node --no-warnings --experimental-strip-types scripts/check-content-security-policy-runtime.mjs"
) {
  fail("package.json security:csp:runtime wiring drifted.");
}
if (
  packageJson.scripts?.["security:csp:production:check"] !==
  "node scripts/check-content-security-policy-production.mjs"
) {
  fail("package.json security:csp:production:check wiring drifted.");
}
requireText(
  packageJson.scripts?.verify ?? "",
  "npm run security:csp",
  "verify",
);
requireText(
  handoffGenerator,
  "CSP is generated per request in middleware and inline scripts require a nonce",
  "handoff generator",
);
requireText(todo, "NONCE-SCRIPT-CSP-HARDENING", "task queue");
requireText(lessons, "per-request script nonces", "lessons");

if (findings.length > 0) {
  console.error(
    `Nonce script CSP validation found ${findings.length} issue(s):`,
  );
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Nonce script CSP OK (${rawScripts.length} intentional raw inline scripts require the per-request nonce).`,
);

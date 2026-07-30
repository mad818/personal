#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";

const root = process.cwd();
const apiRoot = join(root, "app", "api");
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const expectedExceptions = new Set([
  "POST /api/ai",
  "POST /api/tools",
  "POST /api/phone-acceptance/receipt",
]);
const publicLogin = "POST /api/token";
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

function listRouteFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listRouteFiles(path));
    if (entry.isFile() && entry.name === "route.ts") files.push(path);
  }
  return files;
}

function hasExportModifier(node) {
  return Boolean(
    node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ),
  );
}

function routeFromFile(file) {
  const routeDirectory = relative(join(root, "app"), dirname(file)).replaceAll(
    "\\",
    "/",
  );
  return `/${routeDirectory}`;
}

function exportedUnsafeMethods(file) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const methods = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      hasExportModifier(statement) &&
      statement.name &&
      unsafeMethods.has(statement.name.text)
    ) {
      methods.push(statement.name.text);
    }
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          unsafeMethods.has(declaration.name.text)
        ) {
          methods.push(declaration.name.text);
        }
      }
    }
  }
  return methods;
}

const routeFiles = listRouteFiles(apiRoot);
const inventory = routeFiles.flatMap((file) =>
  exportedUnsafeMethods(file).map((method) => ({
    file,
    method,
    route: routeFromFile(file),
    key: `${method} ${routeFromFile(file)}`,
  })),
);

for (const exception of expectedExceptions) {
  if (!inventory.some((entry) => entry.key === exception)) {
    fail(`Phone mutation exception has no active handler: ${exception}`);
  }
}
if (!inventory.some((entry) => entry.key === publicLogin)) {
  fail("Public phone/master login POST handler is missing.");
}

const protectedMutations = inventory.filter((entry) => entry.key !== publicLogin);
const exceptionMutations = protectedMutations.filter((entry) =>
  expectedExceptions.has(entry.key),
);
const defaultBlockedMutations = protectedMutations.filter(
  (entry) => !expectedExceptions.has(entry.key),
);
if (exceptionMutations.length !== expectedExceptions.size) {
  fail("Phone mutation exceptions are duplicated or incomplete.");
}
if (defaultBlockedMutations.length < 25) {
  fail(
    `Expected at least 25 protected mutations behind default deny, found ${defaultBlockedMutations.length}.`,
  );
}

const requiredFiles = [
  "middleware.ts",
  "lib/security/phoneSessionPolicy.ts",
  "app/api/ai/route.ts",
  "app/api/auth-diagnostics/route.ts",
  "docs/deployment/phone-access-free-local.md",
  "specs/features/phone-tier-mutation-boundary.md",
];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) fail(`Missing phone-tier file: ${file}`);
}

const middleware = read("middleware.ts");
const policy = read("lib/security/phoneSessionPolicy.ts");
const aiRoute = read("app/api/ai/route.ts");
const authDiagnostics = read("app/api/auth-diagnostics/route.ts");
const routePolicy = read("lib/security/routePolicy.ts");
const envExample = read(".env.example");
const phoneRunbook = read("docs/deployment/phone-access-free-local.md");
const packageJson = JSON.parse(read("package.json"));
const todo = read("tasks/todo.md");
const lessons = read("tasks/lessons.md");
const spec = read("specs/features/phone-tier-mutation-boundary.md");

for (const value of [
  "PHONE_SESSION_READ_METHODS",
  "PHONE_SESSION_MUTATION_EXCEPTIONS",
  "resolvePhoneSessionRequestPolicy",
  "resolvePhoneSessionAiPolicy",
  "candidate.pathname === pathname",
]) {
  requireText(policy, value, "phoneSessionPolicy.ts");
}
for (const value of [
  "getNexusSessionState",
  "resolvePhoneSessionRequestPolicy",
  "session?.authTier === 'phone' && !internalAuthorized",
  "phone_token_limited",
  "X-Nexus-Phone-Policy",
  "applyAuthNoStoreHeaders(response.headers)",
]) {
  requireText(middleware, value, "middleware.ts");
}
if (middleware.includes("hasAuthenticatedNexusSession")) {
  fail("middleware.ts still collapses signed sessions to a boolean helper.");
}
const publicIndex = middleware.indexOf("if (policy.public)");
const sessionIndex = middleware.indexOf("getNexusSessionState(sessionCookie)");
const tierIndex = middleware.indexOf("session?.authTier === 'phone'");
if (!(publicIndex >= 0 && publicIndex < sessionIndex && sessionIndex < tierIndex)) {
  fail("middleware.ts phone-tier ordering must follow public and generic auth checks.");
}
for (const value of [
  "resolvePhoneSessionAiPolicy",
  "!phoneAiPolicy.explicitProviderAllowed",
  "phoneAiPolicy.localOnly ||",
  "phone_token_limited",
  "phone_local_ai_unavailable",
]) {
  requireText(aiRoute, value, "AI route");
}
const phoneProviderBlockIndex = aiRoute.indexOf(
  "!phoneAiPolicy.explicitProviderAllowed",
);
const secondBrainLoadIndex = aiRoute.indexOf("buildSecondBrainSystemBlock(");
if (
  !(
    phoneProviderBlockIndex >= 0 &&
    secondBrainLoadIndex >= 0 &&
    phoneProviderBlockIndex < secondBrainLoadIndex
  )
) {
  fail("AI route must reject phone cloud providers before second-brain loading.");
}
requireText(authDiagnostics, "authTier:", "auth diagnostics");
requireText(
  routePolicy,
  '{ prefix: "/api/token", routeClass: "local_only", public: true }',
  "route policy",
);
requireText(envExample, "read access and local assistant", ".env.example");
requireText(phoneRunbook, "Phone-token permissions", "phone runbook");
requireText(todo, "PHONE-TIER-MUTATION-BOUNDARY", "task queue");
requireText(lessons, "signed authentication tiers", "lessons");
requireText(spec, "25 mutation handlers", "feature spec");

if (
  packageJson.scripts?.["phone:tier:check"] !==
  "node scripts/validate-phone-session-boundary.mjs && npm run phone:tier:runtime:check"
) {
  fail("package.json phone:tier:check wiring drifted.");
}
if (
  packageJson.scripts?.["phone:tier:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-phone-session-policy-runtime.mjs"
) {
  fail("package.json phone:tier:runtime:check wiring drifted.");
}
requireText(
  packageJson.scripts?.["phone:lan:check"] ?? "",
  "npm run phone:tier:check &&",
  "canonical phone LAN gate",
);

if (findings.length > 0) {
  console.error(`Phone-tier boundary found ${findings.length} issue(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(
  `Phone-tier mutation boundary OK (${inventory.length} unsafe handlers: 1 public login, ${exceptionMutations.length} exact phone exceptions, ${defaultBlockedMutations.length} protected default-deny mutations).`,
);

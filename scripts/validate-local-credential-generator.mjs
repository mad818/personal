#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const relativePath = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x credential-generator: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x credential-generator: ${message}`);
  process.exit(1);
};
const normalize = (value) => value.replace(/\s+/g, " ").trim();
const requireText = (text, needle, label) => {
  if (!normalize(text).includes(normalize(needle))) {
    fail(`${label} missing ${needle}`);
  }
};
const forbidText = (text, needle, label) => {
  if (text.includes(needle)) fail(`${label} must not contain ${needle}`);
};

const contract = read("lib", "localCredentialGenerator.ts");
const component = read(
  "components",
  "vault",
  "LocalCredentialGeneratorPanel.tsx",
);
const vaultPage = read("app", "vault", "page.tsx");
const matrix = JSON.parse(
  read("docs", "ideas", "source-parity", "keepassxreboot-keepassxc.json"),
);
const analysis = read(
  "docs",
  "ideas",
  "repo-analysis",
  "keepassxreboot-keepassxc",
  "REPO_CONTEXT.md",
);
const ecosystem = read("docs", "ideas", "assimilated-ecosystem.md");
const companyMap = read("lib", "nexusCompanyMap.ts");
const spec = read(
  "specs",
  "features",
  "keepassxc-local-credential-generator.md",
);
const tasks = read("tasks", "todo.md");
const packageJson = JSON.parse(read("package.json"));

for (const needle of [
  "PASSWORD_MIN_LENGTH = 8",
  "PASSWORD_MAX_LENGTH = 128",
  "PASSPHRASE_MIN_WORDS = 4",
  "PASSPHRASE_MAX_WORDS = 16",
  "CUSTOM_WORD_LIST_MIN_WORDS = 32",
  "CUSTOM_WORD_LIST_MAX_WORDS = 4_096",
  "CUSTOM_WORD_LIST_MAX_BYTES = 128 * 1_024",
  "BUILT_IN_PASSPHRASE_WORDS",
  "getRandomValues",
  "randomIndex",
  "generatePassword",
  "parseCustomWordList",
  "generatePassphrase",
  "conservativeRequiredSetEntropy",
  "classifyEntropyEstimate",
])
  requireText(contract, needle, "generation contract");

forbidText(contract, "Math.random", "generation contract");
for (const needle of [
  'data-testid="local-credential-generator"',
  "navigator.clipboard.writeText",
  "takeSelectedFile",
  '"visibilitychange"',
  "CREDENTIAL_RESULT_CLEAR_MS",
  'role={feedbackKind === "error" ? "alert" : "status"}',
  'type="file"',
  "Generated value cleared manually",
  "Generator only — not a password manager",
])
  requireText(component, needle, "active component");
for (const forbidden of [
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "fetch(",
  "apiFetch(",
  "callAI(",
]) {
  forbidText(component, forbidden, "memory-only component");
}

for (const needle of [
  'import("@/components/vault/LocalCredentialGeneratorPanel")',
  '"generator"',
  '"vault-credential-generator"',
  "<LazyLocalCredentialGeneratorPanel />",
])
  requireText(vaultPage, needle, "VAULT reachability");

if (matrix.status !== "in_progress") {
  fail("KeePassXC matrix must remain in progress while Argon2 is pending");
}
if (matrix.source.version !== "develop-4980-commits-2026-07-27") {
  fail("KeePassXC source revision is stale");
}
if (matrix.source.license !== "GPL-2.0-or-GPL-3.0-with-third-party-notices") {
  fail("KeePassXC license boundary is stale");
}
const generatorCapability = matrix.capabilities.find(
  (capability) => capability.id === "secure-password-generator",
);
if (generatorCapability?.disposition !== "adapted") {
  fail("secure password generator capability must be adapted");
}
if (
  matrix.capabilities.filter(
    (capability) => capability.disposition === "pending",
  ).length !== 1
) {
  fail("only the separately blocked Argon2 capability should remain pending");
}

requireText(analysis, "4,980 commits", "current source analysis");
requireText(analysis, "version `2.7.11`", "current guide analysis");
requireText(
  ecosystem,
  "[keepassxreboot/keepassxc](https://github.com/keepassxreboot/keepassxc)",
  "benefits ledger",
);
requireText(
  companyMap,
  'id: "keepassxc-local-generator"',
  "Company Map source",
);
requireText(spec, "Result lifecycle", "feature lifecycle contract");
requireText(tasks, "KEEPASSXC-LOCAL-CREDENTIAL-GENERATOR", "task contract");

if (
  packageJson.scripts?.["vault:credential-generator:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-local-credential-generator-runtime.mjs"
) {
  fail("runtime command is missing");
}
if (
  packageJson.scripts?.["vault:credential-generator:check"] !==
  "node scripts/validate-local-credential-generator.mjs && npm run vault:credential-generator:runtime:check"
) {
  fail("focused command is missing");
}
requireText(
  String(packageJson.scripts?.verify ?? ""),
  "npm run vault:credential-generator:check",
  "canonical verify wiring",
);

console.log(
  "ok credential-generator (complete password/passphrase controls, Web Crypto, memory-only lifecycle, current source/license truth, reachable VAULT lane)",
);

#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const relativePath = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x sealed-vault: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x sealed-vault: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};
const forbidText = (text, needle, label) => {
  if (text.includes(needle)) fail(`${label} must not contain ${needle}`);
};

const library = read("lib", "sealedVault.ts");
const panel = read("components", "vault", "SealedVaultPanel.tsx");
const vaultPage = read("app", "vault", "page.tsx");
const companyMap = read("lib", "nexusCompanyMap.ts");
const matrix = JSON.parse(
  read("docs", "ideas", "source-parity", "dani-garcia-vaultwarden.json"),
);
const analysis = read(
  "docs",
  "ideas",
  "repo-analysis",
  "dani-garcia-vaultwarden",
  "REPO_CONTEXT.md",
);
const ecosystem = read("docs", "ideas", "assimilated-ecosystem.md");
const spec = read("specs", "features", "vaultwarden-local-sealed-vault.md");
const packageJson = JSON.parse(read("package.json"));

for (const needle of [
  'SEALED_VAULT_STORAGE_KEY = "nexus.sealed-vault.envelope.v1"',
  "SEALED_VAULT_KDF_ITERATIONS = 600_000",
  "SEALED_VAULT_AUTO_LOCK_MS = 5 * 60 * 1_000",
  "SEALED_VAULT_MAX_RECORDS = 100",
  'name: "PBKDF2"',
  'hash: "SHA-256"',
  '{ name: "AES-GCM", length: 256 }',
  "additionalData",
  "tagLength: 128",
  "provider.getRandomValues(new Uint8Array(16))",
  "provider.getRandomValues(new Uint8Array(12))",
  "parseSealedVaultEnvelope",
  "validateSealedVaultPayload",
  "sealVaultPayload",
  "openSealedVault",
  "upsertSealedVaultRecord",
  "deleteSealedVaultRecord",
])
  requireText(library, needle, "crypto contract");

for (const needle of [
  'data-testid="sealed-vault-panel"',
  "Create sealed vault",
  "Unlock notes",
  "New sealed note",
  "Seal note",
  "Delete note",
  "Change passphrase",
  "Download encrypted backup",
  "Import encrypted backup",
  "Delete sealed vault",
  "Lock now",
  'document.addEventListener("visibilitychange"',
  "SEALED_VAULT_AUTO_LOCK_MS",
  "window.localStorage.setItem",
  "window.localStorage.removeItem",
  "storedEnvelopePresent",
  "requestTextDownload",
  'type="password"',
  'type="file"',
  'aria-live="polite"',
  'role="alertdialog"',
  "Local privacy layer, not a password manager",
  "There is no sync, recovery key, Bitwarden compatibility, or security-audit parity.",
])
  requireText(panel, needle, "complete sealed-vault UI");

for (const forbidden of [
  "fetch(",
  "callAI(",
  "/api/",
  "console.log",
  "console.error",
  "window.confirm",
  'document.createElement("a")',
]) {
  forbidText(panel, forbidden, "local-only panel");
  forbidText(library, forbidden, "local-only crypto library");
}

for (const needle of [
  "type ArchiveLaneView =",
  '| "sealed"',
  '{ id: "sealed", label: "Sealed notes" }',
  'focus === "vault-sealed"',
  'id="vault-sealed"',
  "<LazySealedVaultPanel />",
])
  requireText(vaultPage, needle, "reachable VAULT lane");

requireText(companyMap, 'id: "vaultwarden-sealed-vault"', "Company Map source");
requireText(
  analysis,
  "encryption is performed by the clients",
  "source responsibility correction",
);
requireText(
  ecosystem,
  "[dani-garcia/vaultwarden](https://github.com/dani-garcia/vaultwarden)",
  "benefits ledger",
);
requireText(spec, "whole bounded lifecycle", "feature contract");

if (matrix.status !== "complete") fail("source matrix must be complete");
if (matrix.source.version !== "1.36.0-main-2026-07-26")
  fail("source release is stale");
if (matrix.source.license !== "AGPL-3.0") fail("source license is stale");
if (matrix.capabilities.length !== 4)
  fail("expected four capability decisions");
const dispositions = Object.fromEntries(
  matrix.capabilities.map((capability) => [
    capability.id,
    capability.disposition,
  ]),
);
if (dispositions["end-to-end-client-encryption"] !== "adapted")
  fail("client encryption must be adapted");
for (const excluded of [
  "bitwarden-compatible-api",
  "self-hosted-password-server",
  "organization-vault-sharing",
]) {
  if (dispositions[excluded] !== "excluded")
    fail(`${excluded} must remain excluded`);
}

if (
  packageJson.scripts?.["vault:sealed:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-sealed-vault-runtime.mjs"
)
  fail("runtime command is missing");
if (
  packageJson.scripts?.["vault:sealed:check"] !==
  "node scripts/validate-sealed-vault.mjs && npm run vault:sealed:runtime:check"
)
  fail("focused command is missing");
requireText(
  String(packageJson.scripts?.verify ?? ""),
  "npm run vault:sealed:check",
  "canonical verify wiring",
);

console.log(
  "ok sealed-vault (complete local lifecycle, strict Web Crypto envelope, honest no-sync/no-password-manager boundary)",
);

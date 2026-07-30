#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => {
  const relativePath = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x privacy-platform: missing ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
};
const fail = (message) => {
  console.error(`x privacy-platform: ${message}`);
  process.exit(1);
};
const requireText = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
};

const matrixIds = [
  "authpass-authpass",
  "bitwarden-server",
  "buttercup-buttercup-desktop",
  "gopasspw-gopass",
  "hashicorp-vault",
  "keepassxreboot-keepassxc",
  "keeweb-keeweb",
  "lesspass-lesspass",
  "padloc-padloc",
  "getumbrel-umbrel",
  "cloakhq-cloakbrowser",
];
const matrices = matrixIds.map((id) =>
  JSON.parse(read("docs", "ideas", "source-parity", `${id}.json`)),
);

for (const matrix of matrices) {
  if (matrix.status !== "complete") fail(`${matrix.id} must be complete`);
  if (matrix.source.reviewedAt !== "2026-07-27") {
    fail(`${matrix.id} must be reviewed on 2026-07-27`);
  }
  const pending = matrix.capabilities.filter(
    (capability) => capability.disposition === "pending",
  );
  if (pending.length > 0) {
    fail(`${matrix.id} still has ${pending.length} pending capabilities`);
  }
}

const decisions = new Map(
  matrices.flatMap((matrix) =>
    matrix.capabilities.map((capability) => [
      `${matrix.id}/${capability.id}`,
      capability.disposition,
    ]),
  ),
);
const expected = {
  "bitwarden-server/event-log-api": "adapted",
  "buttercup-buttercup-desktop/entry-history-and-undo": "adapted",
  "gopasspw-gopass/secret-hierarchy": "adapted",
  "gopasspw-gopass/git-as-sync-backend": "excluded",
  "hashicorp-vault/secrets-engine-pattern": "adapted",
  "hashicorp-vault/transit-encryption-as-a-service": "adapted",
  "hashicorp-vault/audit-log-every-request": "excluded",
  "keepassxreboot-keepassxc/argon2-key-derivation": "excluded",
  "keeweb-keeweb/offline-first-pwa-pattern": "excluded",
  "lesspass-lesspass/stateless-password-derivation": "excluded",
  "lesspass-lesspass/no-sync-no-storage": "adapted",
  "padloc-padloc/pwa-with-offline": "excluded",
  "getumbrel-umbrel/app-store-ux-pattern": "excluded",
  "cloakhq-cloakbrowser/tracker-blocking-list": "adapted",
  "cloakhq-cloakbrowser/proxy-rotation-for-osint": "excluded",
};
for (const [id, disposition] of Object.entries(expected)) {
  if (decisions.get(id) !== disposition) {
    fail(`${id} must remain ${disposition}`);
  }
}

const library = read("lib", "sealedVault.ts");
const panel = read("components", "vault", "SealedVaultPanel.tsx");
const runtime = read("scripts", "check-sealed-vault-runtime.mjs");
const spec = read(
  "specs",
  "features",
  "password-privacy-platform-closure.md",
);
for (const needle of [
  "schemaVersion: 2",
  "SEALED_VAULT_MAX_RECORD_HISTORY = 12",
  "SEALED_VAULT_MAX_EVENTS = 200",
  "boundedPath",
  "undoSealedVaultRecord",
  "appendSealedVaultEvent",
  '"create"',
  '"rekey"',
]) {
  requireText(library, needle, "sealed payload v2");
}
for (const needle of [
  "Private path (slash-separated)",
  "Restore previous revision",
  "Mutation receipts",
  "not a tamper-proof external audit service",
]) {
  requireText(panel, needle, "sealed vault UI");
}
for (const needle of [
  "schemaVersion: 1",
  "SEALED_VAULT_MAX_RECORD_HISTORY",
  "SEALED_VAULT_MAX_EVENTS",
  "undoSealedVaultRecord",
]) {
  requireText(runtime, needle, "runtime migration proof");
}
requireText(spec, "Phone/PWA expansion remains deferred", "scope boundary");

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["privacy-platform:check"] !==
  "node scripts/validate-password-privacy-platform-closure.mjs && npm run vault:sealed:check && npm run vault:credential-generator:check && npm run network:source-integrations:check"
) {
  fail("focused command is missing");
}
requireText(
  String(packageJson.scripts?.verify ?? ""),
  "npm run privacy-platform:check",
  "canonical verify wiring",
);

console.log(
  `ok privacy-platform (matrices=${matrices.length}; capabilities=${matrices.reduce((total, matrix) => total + matrix.capabilities.length, 0)}; legacy-migration=true; hierarchy=true; revisions=12; receipts=200)`,
);

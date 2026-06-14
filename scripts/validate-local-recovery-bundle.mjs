#!/usr/bin/env node
/* eslint-disable no-console */

import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function fail(message) {
  console.error(`x local-recovery-bundle: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readRequired(...parts) {
  const filePath = join(root, ...parts);
  if (!existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return readFileSync(filePath, "utf8");
}

const spec = readRequired("specs", "features", "local-recovery-bundle.md");
const plan = readRequired(
  "docs",
  "superpowers",
  "plans",
  "2026-06-06-local-recovery-bundle.md",
);
const operatorDoc = readRequired("docs", "deployment", "local-recovery-bundles.md");
const runnerPath = join(root, "scripts", "local-recovery-bundle.mjs");
if (!existsSync(runnerPath)) fail("scripts/local-recovery-bundle.mjs is missing");
const runnerSource = readFileSync(runnerPath, "utf8");
const packageJson = JSON.parse(readRequired("package.json"));

assert(spec.includes("LOCAL-RECOVERY-BUNDLE"), "feature spec contract is missing");
assert(spec.includes("RESTORE_LOCAL_STATE"), "restore confirmation is missing");
assert(
  plan.includes("Local Recovery Bundle Implementation Plan"),
  "implementation plan is missing",
);
assert(operatorDoc.includes("RESTORE_LOCAL_STATE"), "operator restore guide is missing");

for (const required of [
  "subscription-escape",
  "subscription-escape-assets",
  "phone-acceptance-receipts",
  "sha256",
  "RESTORE_LOCAL_STATE",
  "--overwrite",
  "manifest.json",
  "assertSafeTargetPath",
]) {
  assert(runnerSource.includes(required), `runner is missing ${required}`);
}

for (const unsafe of [
  "fetch(",
  "node:http",
  "node:https",
  "process.env",
  "child_process",
  ".env",
  ".git",
]) {
  assert(!runnerSource.includes(unsafe), `runner must not include ${unsafe}`);
}

assert(
  packageJson.scripts?.["local:recovery"] ===
    "node scripts/local-recovery-bundle.mjs",
  "package.json is missing local:recovery",
);
assert(
  packageJson.scripts?.["local:recovery:check"] ===
    "node scripts/validate-local-recovery-bundle.mjs",
  "package.json is missing local:recovery:check",
);
assert(
  packageJson.scripts?.verify?.includes("npm run local:recovery:check"),
  "verify script is missing local:recovery:check",
);

const runtime = await import(`${pathToFileURL(runnerPath).href}?check=${Date.now()}`);
for (const name of [
  "createRecoveryBundle",
  "listRecoveryBundles",
  "verifyRecoveryBundle",
  "restoreRecoveryBundle",
]) {
  assert(typeof runtime[name] === "function", `runner must export ${name}`);
}

const fixtureRoot = mkdtempSync(join(tmpdir(), "nexus-recovery-check-"));
const sourceRoot = join(fixtureRoot, "source");
const restoreRoot = join(fixtureRoot, "restore");
const backupRoot = join(fixtureRoot, "backups");

function writeFixture(base, relativePath, content) {
  const filePath = join(base, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

try {
  writeFixture(
    sourceRoot,
    "data/subscription-escape.json",
    JSON.stringify({ media: [{ title: "Fixture Film" }] }),
  );
  writeFixture(
    sourceRoot,
    "data/subscription-escape-assets/cover.txt",
    "fixture-cover",
  );
  writeFixture(
    sourceRoot,
    "data/phone-acceptance-receipts.json",
    JSON.stringify({ receipts: [{ kind: "fixture" }] }),
  );
  writeFixture(sourceRoot, "data/not-allowlisted.json", "must-not-back-up");

  const created = await runtime.createRecoveryBundle({ sourceRoot, backupRoot });
  assert(created.fileCount === 3, "create must include exactly three allowlisted fixtures");
  assert(created.totalBytes > 0, "create must record total bytes");
  assert(existsSync(created.manifestPath), "create must write manifest.json");
  assert(
    !existsSync(join(created.bundlePath, "files", "data", "not-allowlisted.json")),
    "create must exclude non-allowlisted files",
  );

  const listed = await runtime.listRecoveryBundles({ backupRoot });
  assert(listed.length === 1, "list must return the created bundle");
  assert(listed[0].valid === true, "list must mark the created bundle valid");

  const verified = await runtime.verifyRecoveryBundle({
    backupRoot,
    bundle: created.bundleId,
  });
  assert(verified.valid === true, "verify must accept an intact bundle");
  assert(verified.fileCount === 3, "verify must report fixture file count");

  const verifiedByPath = await runtime.verifyRecoveryBundle({
    backupRoot,
    bundle: relative(process.cwd(), created.bundlePath),
  });
  assert(verifiedByPath.valid === true, "verify must accept a path inside backup root");

  const outsideRoot = join(fixtureRoot, "outside-bundles");
  const outsideBundle = join(outsideRoot, created.bundleId);
  cpSync(created.bundlePath, outsideBundle, { recursive: true });
  let junctionCreated = false;
  try {
    symlinkSync(outsideRoot, join(backupRoot, "redirect"), "junction");
    junctionCreated = true;
  } catch {
    // Junction creation can be disabled by host policy.
  }
  if (junctionCreated) {
    let symlinkAncestorBlocked = false;
    try {
      await runtime.verifyRecoveryBundle({
        backupRoot,
        bundle: join(backupRoot, "redirect", created.bundleId),
      });
    } catch {
      symlinkAncestorBlocked = true;
    }
    assert(
      symlinkAncestorBlocked,
      "verify must reject bundle paths with symlinked ancestors",
    );
  }

  const dryRun = await runtime.restoreRecoveryBundle({
    backupRoot,
    bundle: created.bundleId,
    targetRoot: restoreRoot,
  });
  assert(dryRun.applied === false, "restore must default to dry-run");
  assert(dryRun.wouldRestore === 3, "dry-run must report restore count");
  assert(
    !existsSync(join(restoreRoot, "data", "subscription-escape.json")),
    "dry-run must not write files",
  );

  let confirmationBlocked = false;
  try {
    await runtime.restoreRecoveryBundle({
      backupRoot,
      bundle: created.bundleId,
      targetRoot: restoreRoot,
      apply: true,
      confirm: "WRONG",
    });
  } catch {
    confirmationBlocked = true;
  }
  assert(confirmationBlocked, "restore apply must require exact confirmation");

  const restored = await runtime.restoreRecoveryBundle({
    backupRoot,
    bundle: created.bundleId,
    targetRoot: restoreRoot,
    apply: true,
    confirm: "RESTORE_LOCAL_STATE",
  });
  assert(restored.applied === true, "confirmed restore must apply");
  assert(restored.restored === 3, "confirmed restore must restore all fixtures");

  let overwriteBlocked = false;
  try {
    await runtime.restoreRecoveryBundle({
      backupRoot,
      bundle: created.bundleId,
      targetRoot: restoreRoot,
      apply: true,
      confirm: "RESTORE_LOCAL_STATE",
    });
  } catch {
    overwriteBlocked = true;
  }
  assert(overwriteBlocked, "restore must block existing files without overwrite");

  const overwritten = await runtime.restoreRecoveryBundle({
    backupRoot,
    bundle: created.bundleId,
    targetRoot: restoreRoot,
    apply: true,
    confirm: "RESTORE_LOCAL_STATE",
    overwrite: true,
  });
  assert(overwritten.applied === true, "reviewed overwrite restore must apply");
  assert(overwritten.overwritten === 3, "reviewed overwrite must report conflicts");

  const tamperedPath = join(
    created.bundlePath,
    "files",
    "data",
    "subscription-escape.json",
  );
  writeFileSync(tamperedPath, "tampered");
  let tamperBlocked = false;
  try {
    await runtime.verifyRecoveryBundle({
      backupRoot,
      bundle: created.bundleId,
    });
  } catch {
    tamperBlocked = true;
  }
  assert(tamperBlocked, "verify must reject tampered bundle files");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("ok local-recovery-bundle (create/list/verify/restore/tamper)");

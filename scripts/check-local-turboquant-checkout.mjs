#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  auditLocalTurboQuantCheckout,
  TURBOQUANT_REVIEWED_COMMIT,
} from "./audit-local-turboquant-checkout.mjs";

const root = process.cwd();
const fixtureRoot = path.join(
  root,
  "tmp-codex-runtime",
  "turboquant-checkout-fixture",
);
const expectedPrefix = `${path.join(root, "tmp-codex-runtime")}${path.sep}`;
if (!fixtureRoot.startsWith(expectedPrefix)) {
  throw new Error("Refusing to manage a fixture outside tmp-codex-runtime.");
}

fs.rmSync(fixtureRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(fixtureRoot, "turboquant", "integration"), {
  recursive: true,
});
for (const file of [
  "README.md",
  "setup.py",
  "proof.py",
  "benchmark.py",
  "turboquant/__init__.py",
  "turboquant/score.py",
  "turboquant/store.py",
  "turboquant/quantizer.py",
  "turboquant/rotation.py",
  "turboquant/capture.py",
  "turboquant/codebook.py",
  "turboquant/triton_kernels.py",
  "turboquant/kv_cache.py",
  "turboquant/vllm_attn_backend.py",
  "turboquant/integration/vllm.py",
]) {
  fs.writeFileSync(path.join(fixtureRoot, file), `${file}\n`);
}
fs.writeFileSync(
  path.join(fixtureRoot, "LICENSE"),
  "GNU GENERAL PUBLIC LICENSE\nVersion 3\n",
);

function git(args) {
  const result = spawnSync("git", args, {
    cwd: fixtureRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

try {
  git(["init", "--quiet"]);
  git(["config", "user.email", "nexus-check@example.invalid"]);
  git(["config", "user.name", "Nexus checkout check"]);
  git(["add", "--all"]);
  git(["commit", "--quiet", "-m", "fixture"]);
  const fixtureCommit = git(["rev-parse", "HEAD"]);
  const audit = auditLocalTurboQuantCheckout(fixtureRoot, {
    expectedCommit: fixtureCommit,
  });
  assert.equal(audit.valid, true);
  assert.equal(audit.gpl3License, true);
  assert.equal(audit.reviewedCommit, fixtureCommit);
  assert.equal(TURBOQUANT_REVIEWED_COMMIT.length, 40);
  assert.equal(audit.requiredFiles, 16);
  assert.deepEqual(audit.executableScripts, ["proof.py", "benchmark.py"]);
  assert.deepEqual(audit.readmeOnlyScripts, [
    "validate_paper.py",
    "audit_claims.py",
    "test_modular.py",
    "test_turboquant.py",
  ]);
  fs.appendFileSync(path.join(fixtureRoot, "proof.py"), "modified\n");
  assert.throws(
    () =>
      auditLocalTurboQuantCheckout(fixtureRoot, {
        expectedCommit: fixtureCommit,
      }),
    /clean/i,
  );
  git(["checkout", "--quiet", "--", "proof.py"]);
  fs.unlinkSync(path.join(fixtureRoot, "proof.py"));
  assert.throws(
    () =>
      auditLocalTurboQuantCheckout(fixtureRoot, {
        expectedCommit: fixtureCommit,
      }),
    /missing/i,
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(
  "ok local-turboquant-checkout (actual source files, GPL boundary, README-only scripts)",
);

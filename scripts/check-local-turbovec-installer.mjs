#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  INSTALL_CONFIRMATION,
  verifyLocalTurboVecWheel,
} from "./install-local-turbovec-wheel.mjs";

const root = process.cwd();
const fixtureDir = path.join(root, "tmp-codex-runtime");
const fixturePath = path.join(fixtureDir, "turbovec-0.7.0-cp39-abi3-win_amd64.whl");
const content = Buffer.from("nexus-local-turbovec-wheel-fixture");
const sha256 = crypto.createHash("sha256").update(content).digest("hex");
fs.mkdirSync(fixtureDir, { recursive: true });
fs.writeFileSync(fixturePath, content);

try {
  const verified = verifyLocalTurboVecWheel({
    wheelPath: fixturePath,
    expectedSha256: sha256,
    confirmation: INSTALL_CONFIRMATION,
  });
  assert.equal(verified.sha256, sha256);
  assert.equal(verified.sizeBytes, content.length);

  assert.throws(
    () =>
      verifyLocalTurboVecWheel({
        wheelPath: fixturePath,
        expectedSha256: "0".repeat(64),
        confirmation: INSTALL_CONFIRMATION,
      }),
    /checksum/i,
  );
  assert.throws(
    () =>
      verifyLocalTurboVecWheel({
        wheelPath: fixturePath,
        expectedSha256: sha256,
        confirmation: "wrong",
      }),
    /confirmation/i,
  );
} finally {
  fs.unlinkSync(fixturePath);
}

console.log("ok local-turbovec-installer (local wheel, checksum, confirmation)");

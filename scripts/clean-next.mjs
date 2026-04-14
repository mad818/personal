#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "fs";
import path from "path";

const distDir = process.env.NEXUS_NEXT_DIST_DIR ?? ".next";
const root = path.resolve("C:/Users/mario/Desktop/personal");
const target = path.resolve(process.cwd(), distDir);
const relativeTarget = path.relative(root, target);

if (
  relativeTarget.startsWith("..") ||
  path.isAbsolute(relativeTarget) ||
  !path.basename(target).startsWith(".next")
) {
  console.error(`❌ clean-next: refusing to remove unexpected path ${target}`);
  process.exit(1);
}

if (!fs.existsSync(target)) {
  console.log(`clean-next: ${distDir} already absent`);
  process.exit(0);
}

try {
  fs.rmSync(target, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 250,
  });
  console.log(`clean-next: removed ${distDir}`);
} catch (error) {
  console.error(
    `❌ clean-next: failed to remove ${distDir} after retries`,
    error,
  );
  process.exit(1);
}

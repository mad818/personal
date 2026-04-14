#!/usr/bin/env node
/* eslint-disable no-console */

import { cpSync, existsSync, mkdirSync } from "fs";
import path from "path";

const root = path.resolve("C:/Users/mario/Desktop/personal");
const distDir = process.env.NEXUS_NEXT_DIST_DIR ?? ".next";
const targetDistDir = path.resolve(process.cwd(), distDir);
const standaloneDir = path.join(targetDistDir, "standalone");
const staticSource = path.join(targetDistDir, "static");
const staticTarget = path.join(standaloneDir, distDir, "static");
const publicSource = path.join(root, "public");
const publicTarget = path.join(standaloneDir, "public");

function assertSafePath(targetPath, label) {
  const relativeTarget = path.relative(root, targetPath);
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    console.error(`stage-runtime-assets: refusing to touch unexpected ${label} path ${targetPath}`);
    process.exit(1);
  }
}

function copyTree(sourcePath, targetPath, label) {
  if (!existsSync(sourcePath)) {
    console.log(`stage-runtime-assets: skipped ${label}; source is absent`);
    return;
  }

  assertSafePath(targetPath, label);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true, force: true });
  console.log(`stage-runtime-assets: synced ${label}`);
}

if (!existsSync(standaloneDir)) {
  console.error(
    `stage-runtime-assets: missing standalone runtime at ${standaloneDir}. Run \`npm run build\` first.`,
  );
  process.exit(1);
}

copyTree(staticSource, staticTarget, "Next static assets");
copyTree(publicSource, publicTarget, "public assets");

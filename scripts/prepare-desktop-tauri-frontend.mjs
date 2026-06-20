#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneRoot = path.join(root, ".next", "standalone");
const frontendDist = path.join(root, "desktop", "frontend-dist");
const packagedRuntime = path.join(root, "desktop", "packaged-runtime");

function copyDir(src, dest, { skip = new Set() } = {}) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to, { skip });
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function rimraf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

if (!fs.existsSync(path.join(standaloneRoot, "server.js"))) {
  console.error(
    "prepare-desktop-tauri-frontend: missing .next/standalone/server.js — run npm run desktop:build-runtime first",
  );
  process.exit(1);
}

rimraf(frontendDist);
rimraf(packagedRuntime);
fs.mkdirSync(frontendDist, { recursive: true });

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nexus</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #0a0a0b; color: #e8e8ea; display: grid; place-items: center; min-height: 100vh; }
      main { text-align: center; max-width: 28rem; padding: 2rem; }
      h1 { font-size: 1.1rem; letter-spacing: 0.08em; text-transform: uppercase; }
      p { color: #9a9aa3; font-size: 0.9rem; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>Nexus Desktop</h1>
      <p>Local runtime shell. Production builds load the packaged Next standalone server alongside this asset bundle.</p>
    </main>
  </body>
</html>
`;

fs.writeFileSync(path.join(frontendDist, "index.html"), indexHtml, "utf8");

const publicSrc = path.join(root, "public");
if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, path.join(frontendDist, "public"));
}

copyDir(standaloneRoot, packagedRuntime);

console.log("ok prepare-desktop-tauri-frontend");
console.log(`  frontendDist: ${path.relative(root, frontendDist)}`);
console.log(`  packagedRuntime: ${path.relative(root, packagedRuntime)}`);

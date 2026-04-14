#!/usr/bin/env node
/* eslint-disable no-console */

import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "app", "api");
const POLICY_FILE = path.join(ROOT, "lib", "security", "routePolicy.ts");

function fail(message) {
  console.error(`❌ route-policy: ${message}`);
  process.exit(1);
}

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function listApiRoutes() {
  return walk(API_ROOT)
    .filter((file) => file.endsWith(`${path.sep}route.ts`))
    .map((file) => {
      const relDir = path
        .dirname(path.relative(API_ROOT, file))
        .split(path.sep)
        .filter(Boolean)
        .join("/");
      return relDir ? `/api/${relDir}` : "/api";
    })
    .sort();
}

function readPolicyPrefixes() {
  const raw = readFileSync(POLICY_FILE, "utf-8");
  const prefixes = [...raw.matchAll(/prefix:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );
  return prefixes.sort();
}

function formatList(values) {
  return values.map((value) => `  - ${value}`).join("\n");
}

function main() {
  const routes = listApiRoutes();
  const prefixes = readPolicyPrefixes();

  const duplicates = prefixes.filter(
    (prefix, index) => prefixes.indexOf(prefix) !== index,
  );
  if (duplicates.length > 0) {
    fail(`Duplicate route-policy prefixes found:\n${formatList(duplicates)}`);
  }

  const routeSet = new Set(routes);
  const prefixSet = new Set(prefixes);

  const missingPolicies = routes.filter((route) => !prefixSet.has(route));
  if (missingPolicies.length > 0) {
    fail(
      `API routes missing explicit route-policy entries:\n${formatList(
        missingPolicies,
      )}`,
    );
  }

  const orphanedPolicies = prefixes.filter((prefix) => !routeSet.has(prefix));
  if (orphanedPolicies.length > 0) {
    fail(
      `Route-policy entries without matching app/api routes:\n${formatList(
        orphanedPolicies,
      )}`,
    );
  }

  console.log(
    `✅ route-policy: ${routes.length} API routes mapped to ${prefixes.length} explicit policy entries`,
  );
}

main();

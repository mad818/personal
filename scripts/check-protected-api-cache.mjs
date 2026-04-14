#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync, readFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, "app", "api");
const POLICY_FILE = path.join(ROOT, "lib", "security", "routePolicy.ts");

const PROTECTED_SIGNAL_PATTERNS = [
  /protectedJson\(/,
  /applyProtectedApiHeaders\(/,
  /applyNoStoreHeaders\(/,
  /workbenchJson\(/,
  /workbenchError\(/,
  /Cache-Control["']?\s*:\s*["'][^"']*no-store/i,
];

const FORBIDDEN_CACHE_PATTERNS = [/public,\s*max-age/i, /s-maxage\s*=/i];

function fail(message) {
  console.error(`❌ protected-api-cache: ${message}`);
  process.exit(1);
}

function formatList(values) {
  return values.map((value) => `  - ${value}`).join("\n");
}

function readPolicies() {
  const raw = readFileSync(POLICY_FILE, "utf-8");
  return [...raw.matchAll(/\{\s*prefix:\s*"([^"]+)",\s*routeClass:\s*"([^"]+)",\s*public:\s*(true|false)\s*\}/g)].map(
    (match) => ({
      prefix: match[1],
      routeClass: match[2],
      public: match[3] === "true",
    }),
  );
}

function routeFileForPrefix(prefix) {
  const rel = prefix.replace(/^\/api\/?/, "");
  return rel
    ? path.join(API_ROOT, ...rel.split("/"), "route.ts")
    : path.join(API_ROOT, "route.ts");
}

function main() {
  const protectedRoutes = readPolicies().filter(
    (policy) => policy.routeClass === "local_only" && policy.public === false,
  );
  const failures = [];

  for (const policy of protectedRoutes) {
    const routeFile = routeFileForPrefix(policy.prefix);
    if (!existsSync(routeFile)) {
      failures.push(`${policy.prefix} -> missing file ${routeFile}`);
      continue;
    }

    const raw = readFileSync(routeFile, "utf-8");
    if (FORBIDDEN_CACHE_PATTERNS.some((pattern) => pattern.test(raw))) {
      failures.push(`${policy.prefix} -> contains public cache directives`);
      continue;
    }

    if (!PROTECTED_SIGNAL_PATTERNS.some((pattern) => pattern.test(raw))) {
      failures.push(
        `${policy.prefix} -> missing protected-response signal (protectedJson/workbenchJson/applyNoStoreHeaders)`,
      );
    }
  }

  if (failures.length > 0) {
    fail(
      `Protected local-only routes must enforce no-store semantics:\n${formatList(
        failures,
      )}`,
    );
  }

  console.log(
    `✅ protected-api-cache: ${protectedRoutes.length} protected local-only routes enforce no-store semantics`,
  );
}

main();

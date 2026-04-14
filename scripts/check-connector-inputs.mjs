#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();

const ROUTE_EXPECTATIONS = [
  {
    file: "app/api/headers/route.ts",
    patterns: [/assertSafePublicUrl\(/, /checkRateLimit\(/],
    label: "/api/headers",
  },
  {
    file: "app/api/agent-reach/route.ts",
    patterns: [/buildValidatedSearchParams\(/, /assertSafePublicUrl\(/, /checkRateLimit\(/],
    label: "/api/agent-reach",
  },
  {
    file: "app/api/weather/route.ts",
    patterns: [/parseBoundedFloatParam\(/],
    label: "/api/weather",
  },
  {
    file: "app/api/flights/route.ts",
    patterns: [/parseOptionalBoundingBox\(/],
    label: "/api/flights",
  },
  {
    file: "app/api/maritime/route.ts",
    patterns: [/parseBoundedFloatParam\(/],
    label: "/api/maritime",
  },
];

function fail(message) {
  console.error(`❌ connector-inputs: ${message}`);
  process.exit(1);
}

function main() {
  const failures = [];

  for (const expectation of ROUTE_EXPECTATIONS) {
    const fullPath = path.join(ROOT, expectation.file);
    const raw = readFileSync(fullPath, "utf-8");

    for (const pattern of expectation.patterns) {
      if (!pattern.test(raw)) {
        failures.push(
          `${expectation.label} missing expected hardening signal ${pattern.toString()}`,
        );
      }
    }
  }

  if (failures.length > 0) {
    fail(failures.map((item) => `  - ${item}`).join("\n"));
  }

  console.log(
    `✅ connector-inputs: ${ROUTE_EXPECTATIONS.length} hardened connector routes still depend on the shared validation layer`,
  );
}

main();

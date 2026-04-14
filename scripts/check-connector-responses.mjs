#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "fs";
import path from "path";

const ROOT = process.cwd();

const ROUTES = [
  {
    file: "app/api/gdelt/route.ts",
    label: "/api/gdelt",
  },
  {
    file: "app/api/threat-intel/route.ts",
    label: "/api/threat-intel",
  },
  {
    file: "app/api/prices/route.ts",
    label: "/api/prices",
  },
  {
    file: "app/api/weather/route.ts",
    label: "/api/weather",
  },
  {
    file: "app/api/flights/route.ts",
    label: "/api/flights",
  },
  {
    file: "app/api/geo-scan/route.ts",
    label: "/api/geo-scan",
  },
];

function fail(message) {
  console.error(`❌ connector-responses: ${message}`);
  process.exit(1);
}

function main() {
  const failures = [];

  for (const route of ROUTES) {
    const raw = readFileSync(path.join(ROOT, route.file), "utf-8");

    if (!/connectorJson\(/.test(raw)) {
      failures.push(`${route.label} does not use connectorJson().`);
    }
    if (/public,\s*max-age/i.test(raw) || /s-maxage\s*=/i.test(raw)) {
      failures.push(`${route.label} still advertises public cache directives.`);
    }
  }

  if (failures.length > 0) {
    fail(failures.map((item) => `  - ${item}`).join("\n"));
  }

  console.log(
    `✅ connector-responses: ${ROUTES.length} authenticated connector routes use shared private-cache response contracts`,
  );
}

main();

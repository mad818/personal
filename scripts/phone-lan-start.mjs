#!/usr/bin/env node
/* eslint-disable no-console */

import { networkInterfaces } from "node:os";
import { closeSync, mkdirSync, openSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: false });

function readLanAddresses() {
  const addresses = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (!entry.address || entry.address.startsWith("169.254.")) continue;
      addresses.push(entry.address);
    }
  }
  return Array.from(new Set(addresses)).sort();
}

const port =
  process.env.NEXUS_PHONE_LAN_PORT ?? process.env.NEXUS_RUNTIME_PORT ?? "3100";

process.env.NEXUS_PHONE_LAN_ENABLED = "true";
process.env.NEXUS_NETWORK_MODE = process.env.NEXUS_NETWORK_MODE ?? "isolated";
process.env.NEXUS_ALLOW_PAID_APIS =
  process.env.NEXUS_ALLOW_PAID_APIS ?? "false";
process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS =
  process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS ?? "false";
process.env.NEXUS_RUNTIME_HOST = "0.0.0.0";
process.env.HOSTNAME = "0.0.0.0";
process.env.NEXUS_RUNTIME_PORT = port;
process.env.PORT = port;

const rateLimitLedgerPath = resolve(
  process.env.NEXUS_RATE_LIMIT_LEDGER_PATH ??
    join(process.cwd(), ".nexus", "rate-limit-ledger.json"),
);
const rateLimitProbePath = join(
  dirname(rateLimitLedgerPath),
  `.rate-limit-write-probe-${process.pid}-${Date.now()}`,
);
try {
  mkdirSync(dirname(rateLimitLedgerPath), { recursive: true });
  closeSync(openSync(rateLimitProbePath, "wx", 0o600));
  rmSync(rateLimitProbePath, { force: true });
  process.env.NEXUS_RATE_LIMIT_LEDGER_PATH = rateLimitLedgerPath;
} catch {
  try {
    rmSync(rateLimitProbePath, { force: true });
  } catch {
    // The configured parent may be unavailable or not a directory.
  }
  console.error(
    "phone:lan:start — durable rate-limit storage is unavailable; check NEXUS_RATE_LIMIT_LEDGER_PATH permissions before exposing Nexus to the LAN",
  );
  process.exit(1);
}

// Raise V8 heap limit to prevent OOM restarts from Next.js dev watcher.
// The watcher can spike well past the 512 MB default when many files are watched.
// Override via NODE_OPTIONS in .env.local if you need a different value.
process.env.NODE_OPTIONS =
  process.env.NODE_OPTIONS ?? "--max-old-space-size=4096";

const urls = readLanAddresses().map((address) => `http://${address}:${port}`);
const hqUrls = urls.map((url) => `${url}/hq?focus=hq-chronicle`);
console.log("phone:lan:start — free local phone access");
console.log("desktop stays on; phone connects over the same network");
console.log("network mode:", process.env.NEXUS_NETWORK_MODE);
console.log("paid APIs:", process.env.NEXUS_ALLOW_PAID_APIS);
console.log("high-risk tools:", process.env.NEXUS_ENABLE_HIGH_RISK_TOOLS);
console.log("durable rate limits: ready");
if (!process.env.NEXUS_TOKEN) {
  console.log(
    "warning: set NEXUS_TOKEN before using LAN access outside this machine",
  );
}
if (urls.length) {
  console.log("phone URLs:");
  for (const url of urls) console.log(`  ${url}`);
  console.log("HQ phone URLs:");
  for (const url of hqUrls) console.log(`  ${url}`);
} else {
  console.log("phone URLs: no LAN IPv4 address detected yet");
}
console.log("desktop URL: http://127.0.0.1:" + port);
console.log("desktop HQ: http://127.0.0.1:" + port + "/hq?focus=hq-chronicle");
console.log(
  "If Windows asks, allow Node/Next through the firewall for this private network.",
);

await import("./dev-direct-3100.mjs");

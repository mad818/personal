#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x network-source-integrations: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const relative = parts.join("/");
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${relative} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) fail(`${label} is missing ${needle}`);
  }
}

function excludeAll(source, label, needles) {
  for (const needle of needles) {
    if (source.includes(needle)) fail(`${label} must not include ${needle}`);
  }
}

const spec = readRequired("specs", "features", "espectre-masterdnsvpn-native-assimilation.md");
const espectre = readRequired("lib", "espectre.ts");
const espectreRoute = readRequired("app", "api", "espectre", "route.ts");
const espectrePanel = readRequired("components", "iot", "EspectreWifiViewer.tsx");
const iotPage = readRequired("app", "iot", "page.tsx");
const masterDnsVpn = readRequired("lib", "masterDnsVpn.ts");
const masterDnsVpnRoute = readRequired("app", "api", "masterdnsvpn", "readiness", "route.ts");
const masterDnsVpnPanel = readRequired("components", "resources", "MasterDnsVpnReadinessPanel.tsx");
const secureLinks = readRequired("components", "resources", "SecureLinkOpenPanel.tsx");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const deployment = readRequired("docs", "deployment", "espectre-masterdnsvpn-integrations.md");
const espectreParity = JSON.parse(readRequired("docs", "ideas", "source-parity", "espectre.json"));
const masterDnsVpnParity = JSON.parse(readRequired("docs", "ideas", "source-parity", "masterdnsvpn.json"));
const packageJson = JSON.parse(readRequired("package.json"));

requireAll(spec, "feature spec", [
  "explicit consent declaration",
  "loopback proxy",
  "Do not create a DNS tunnel",
  "Do not claim MasterDnsVPN hides an IP",
]);
requireAll(espectre, "ESPectre helper", [
  "normalizeEspectreTelemetry",
  "buildEspectreReadiness",
  "buildEspectreControlEnvelope",
  "consentConfirmed",
  "movementScore",
  "motionOnHits",
  "motionOffHits",
]);
requireAll(espectreRoute, "ESPectre route", [
  "protectedJson",
  "createSimulatedEspectreTelemetry",
  "normalizeEspectreTelemetry",
  "buildEspectreControlEnvelope",
  "pendingCommands",
  "acknowledge",
]);
requireAll(espectrePanel, "ESPectre panel", [
  'data-testid="espectre-wifi-viewer"',
  "WiFi sensing",
  "Calibrate",
  "Consent",
]);
requireAll(iotPage, "IoT page", ["EspectreWifiViewer", "WiFi sensing"]);
requireAll(masterDnsVpn, "MasterDnsVPN helper", [
  "buildMasterDnsVpnReadiness",
  "127.0.0.1",
  "chacha20",
  "aes",
  "xor",
  "does not hide your IP",
]);
requireAll(masterDnsVpnRoute, "MasterDnsVPN route", [
  "node:net",
  "isLoopbackMasterDnsVpnHost",
  "buildMasterDnsVpnReadiness",
  "protectedJson",
]);
requireAll(masterDnsVpnPanel, "MasterDnsVPN panel", [
  'data-testid="masterdnsvpn-readiness"',
  "Emergency external transport",
  "does not unlock public links",
]);
requireAll(secureLinks, "secure-link panel", ["MasterDnsVpnReadinessPanel"]);
requireAll(routePolicy, "route policy", ["/api/espectre", "/api/masterdnsvpn/readiness"]);
requireAll(deployment, "deployment guide", ["ESPectre", "MasterDnsVPN", "NEXUS_TOKEN", "loopback"]);
excludeAll(masterDnsVpnRoute, "MasterDnsVPN route", [
  "dns.resolve",
  "dgram",
  "child_process",
  "spawn(",
  "exec(",
  "fetch(",
]);

for (const matrix of [espectreParity, masterDnsVpnParity]) {
  if (matrix.status !== "complete") fail(`${matrix.id} parity must be complete`);
  if (matrix.capabilities.some((capability) => capability.disposition === "pending")) {
    fail(`${matrix.id} parity still has pending capabilities`);
  }
}

if (
  packageJson.scripts?.["network:source-integrations:check"] !==
  "node scripts/check-network-source-integrations.mjs && npm run network:source-integrations:runtime:check"
) {
  fail("package.json is missing network:source-integrations:check");
}
if (
  packageJson.scripts?.["network:source-integrations:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-network-source-integrations-runtime.mjs"
) {
  fail("package.json is missing network:source-integrations:runtime:check");
}
if (!(packageJson.scripts?.verify ?? "").includes("npm run network:source-integrations:check")) {
  fail("verify is missing network:source-integrations:check");
}

console.log("ok network-source-integrations");

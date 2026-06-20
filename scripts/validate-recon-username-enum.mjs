#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    console.error(`x recon-username-enum: ${parts.join("/")} is missing`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`x recon-username-enum: ${label} is missing "${needle}"`);
    process.exit(1);
  }
}

// ── Required files ────────────────────────────────────────────────────────────
const enumLib = readRequired("lib", "recon", "usernameEnum.ts");
const route = readRequired("app", "api", "recon", "username-enum", "route.ts");
const routePolicy = readRequired("lib", "security", "routePolicy.ts");
const reconLookup = readRequired("components", "recon", "ReconLookup.tsx");
const spec = readRequired("specs", "features", "recon-username-whatsmyname.md");
const blackbirdParity = JSON.parse(
  readRequired("docs", "ideas", "source-parity", "blackbird.json"),
);
const packageJson = JSON.parse(readRequired("package.json"));

// ── Validate sites manifest ───────────────────────────────────────────────────
const sitesPath = path.join(root, "lib", "recon", "whatsMyNameSites.json");
if (!fs.existsSync(sitesPath)) {
  console.error("x recon-username-enum: lib/recon/whatsMyNameSites.json is missing");
  process.exit(1);
}
const sites = JSON.parse(fs.readFileSync(sitesPath, "utf8"));
if (!Array.isArray(sites) || sites.length < 25) {
  console.error(
    `x recon-username-enum: whatsMyNameSites.json must have at least 25 entries (got ${sites.length})`,
  );
  process.exit(1);
}
if (sites.length > 30) {
  console.error(
    `x recon-username-enum: whatsMyNameSites.json must have at most 30 entries (got ${sites.length})`,
  );
  process.exit(1);
}
for (const site of sites) {
  if (
    typeof site.name !== "string" ||
    typeof site.uri_check !== "string" ||
    !site.uri_check.includes("{account}") ||
    !["status_code", "message"].includes(site.detection) ||
    !["dev", "social", "blog", "forum", "creative", "career"].includes(site.category)
  ) {
    console.error(
      `x recon-username-enum: malformed site entry: ${JSON.stringify(site)}`,
    );
    process.exit(1);
  }
}

// ── Validate usernameEnum.ts ──────────────────────────────────────────────────
for (const needle of [
  "USERNAME_ENUM_LIMITS",
  "normalizeUsername",
  "buildSiteUrl",
  "checkUsername",
  "formatUsernameEnumResults",
  "getSiteManifest",
  "maxConcurrency",
  "absoluteMaxSites",
  "defaultMaxSites",
  "withBoundedConcurrency",
  "_fetcher",
]) {
  requireText(enumLib, needle, "usernameEnum.ts");
}

// ── Validate API route ────────────────────────────────────────────────────────
requireText(route, "export async function POST", "username-enum route.ts");
requireText(route, "checkRateLimit", "username-enum route.ts");
requireText(route, "normalizeUsername", "username-enum route.ts");
requireText(route, "checkUsername", "username-enum route.ts");
requireText(route, "formatUsernameEnumResults", "username-enum route.ts");
requireText(route, "force-dynamic", "username-enum route.ts");

// ── Validate route policy ─────────────────────────────────────────────────────
requireText(
  routePolicy,
  '"/api/recon/username-enum"',
  "routePolicy.ts",
);
requireText(
  routePolicy,
  'routeClass: "connector_opt_in"',
  "routePolicy.ts connector_opt_in for username-enum",
);

// ── Validate ReconLookup wires in the API call ────────────────────────────────
requireText(reconLookup, "/api/recon/username-enum", "ReconLookup.tsx");
requireText(reconLookup, "username-enum", "ReconLookup.tsx");

// ── Validate spec invariants ──────────────────────────────────────────────────
requireText(spec, "Max 30 sites per request", "spec invariants");
requireText(spec, "No paid APIs", "spec invariants");
requireText(spec, "connector_opt_in", "spec invariants");

// ── Validate blackbird parity JSON ────────────────────────────────────────────
const multiSite = blackbirdParity.capabilities?.find(
  (c) => c.id === "username-search-multi-site",
);
if (!multiSite || multiSite.disposition !== "adapted") {
  console.error(
    "x recon-username-enum: blackbird.json must have username-search-multi-site with disposition=adapted",
  );
  process.exit(1);
}
const pythonCli = blackbirdParity.capabilities?.find(
  (c) => c.id === "python-cli-runtime",
);
if (!pythonCli || pythonCli.disposition !== "excluded") {
  console.error(
    "x recon-username-enum: blackbird.json must have python-cli-runtime with disposition=excluded",
  );
  process.exit(1);
}

// ── Validate package.json scripts ────────────────────────────────────────────
if (
  packageJson.scripts?.["recon:username:runtime:check"] !==
  "node --no-warnings --experimental-strip-types scripts/check-recon-username-enum-runtime.mjs"
) {
  console.error(
    "x recon-username-enum: package.json recon:username:runtime:check script is missing or wrong",
  );
  process.exit(1);
}
if (
  packageJson.scripts?.["recon:username:check"] !==
  "node scripts/validate-recon-username-enum.mjs && npm run recon:username:runtime:check"
) {
  console.error(
    "x recon-username-enum: package.json recon:username:check script is missing or wrong",
  );
  process.exit(1);
}
if (!packageJson.scripts?.verify?.includes("recon:username:check")) {
  console.error(
    "x recon-username-enum: npm run verify must include recon:username:check",
  );
  process.exit(1);
}

console.log(
  `ok recon-username-enum (${sites.length} sites, bounded concurrency, connector_opt_in, rate-limited, parity verified)`,
);

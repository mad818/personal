#!/usr/bin/env node
/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  USERNAME_ENUM_LIMITS,
  normalizeUsername,
  buildSiteUrl,
  checkUsername,
  formatUsernameEnumResults,
  getSiteManifest,
} from "../lib/recon/usernameEnum.ts";

// ── normalizeUsername ─────────────────────────────────────────────────────────
assert.equal(normalizeUsername("alice"), "alice");
assert.equal(normalizeUsername("  bob  "), "bob");
assert.equal(normalizeUsername("user-name_123"), "user-name_123");
assert.equal(normalizeUsername("a.b.c"), "a.b.c");

assert.throws(() => normalizeUsername(""), /at least 1/);
assert.throws(() => normalizeUsername("   "), /at least 1/);
assert.throws(
  () => normalizeUsername("a".repeat(USERNAME_ENUM_LIMITS.maxUsernameLength + 1)),
  /at most/,
);
assert.throws(() => normalizeUsername("../secret"), /path traversal/);
assert.throws(() => normalizeUsername("has/slash"), /path traversal/);
assert.throws(() => normalizeUsername("has space"), /only letters/);
assert.throws(() => normalizeUsername("has@symbol"), /only letters/);

// ── buildSiteUrl ──────────────────────────────────────────────────────────────
const sites = getSiteManifest();
assert.ok(sites.length >= 25, `Expected >= 25 sites, got ${sites.length}`);
assert.ok(sites.length <= 30, `Expected <= 30 sites, got ${sites.length}`);

const gh = sites.find((s) => s.name === "GitHub");
assert.ok(gh, "GitHub must be in manifest");
assert.equal(buildSiteUrl(gh, "alice"), "https://github.com/alice");

const hn = sites.find((s) => s.name === "HackerNews");
assert.ok(hn, "HackerNews must be in manifest");
assert.equal(buildSiteUrl(hn, "alice"), "https://news.ycombinator.com/user?id=alice");

// All sites must have {account} placeholder
for (const site of sites) {
  assert.ok(
    site.uri_check.includes("{account}"),
    `${site.name}: uri_check must contain {account}`,
  );
  assert.ok(
    ["status_code", "message"].includes(site.detection),
    `${site.name}: detection must be status_code or message`,
  );
  assert.ok(
    ["dev", "social", "blog", "forum", "creative", "career"].includes(site.category),
    `${site.name}: invalid category ${site.category}`,
  );
}

// ── checkUsername with mock fetcher ───────────────────────────────────────────

// Mock: returns 200 for GitHub and Dev.to, 404 for everything else
const mockFetcher = async (url, _timeoutMs, _needsBody) => {
  if (url.includes("github.com/alice")) return { status: 200 };
  if (url.includes("dev.to/alice")) return { status: 200 };
  if (url.includes("ycombinator.com")) return { status: 200, body: "karma: 42 points" };
  return { status: 404 };
};

// Default maxSites = 25
const results = await checkUsername("alice", { maxSites: 5, _fetcher: mockFetcher });
assert.equal(results.length, 5, "Should check exactly maxSites sites");

const ghResult = results.find((r) => r.name === "GitHub");
assert.ok(ghResult, "GitHub result must be present in first 5");
assert.equal(ghResult.found, true, "GitHub should be found");
assert.equal(ghResult.status, "found");
assert.equal(ghResult.uri, "https://github.com/alice");
assert.equal(ghResult.category, "dev");
assert.equal(ghResult.responseCode, 200);

// Confirm not_found sites are correct
const notFoundResults = results.filter((r) => r.status === "not_found");
assert.ok(notFoundResults.length > 0, "Some sites should be not_found");

// ── Timeout handling ──────────────────────────────────────────────────────────
const timeoutFetcher = async (_url, _timeoutMs, _needsBody) => {
  const err = new Error("The operation was aborted.");
  err.name = "TimeoutError";
  throw err;
};
const timeoutResults = await checkUsername("alice", { maxSites: 3, _fetcher: timeoutFetcher });
assert.equal(timeoutResults.length, 3);
assert.ok(timeoutResults.every((r) => r.status === "timeout"));
assert.ok(timeoutResults.every((r) => !r.found));

// ── Error handling ────────────────────────────────────────────────────────────
const errorFetcher = async (_url, _timeoutMs, _needsBody) => {
  throw new Error("Network error");
};
const errorResults = await checkUsername("alice", { maxSites: 2, _fetcher: errorFetcher });
assert.equal(errorResults.length, 2);
assert.ok(errorResults.every((r) => r.status === "error"));

// ── Bounds: absoluteMaxSites enforced ────────────────────────────────────────
const allResults = await checkUsername("alice", {
  maxSites: 999,
  _fetcher: mockFetcher,
});
assert.ok(
  allResults.length <= USERNAME_ENUM_LIMITS.absoluteMaxSites,
  `Bounded to ${USERNAME_ENUM_LIMITS.absoluteMaxSites} max`,
);

// ── message detection mode ────────────────────────────────────────────────────
const hnSite = sites.find((s) => s.name === "HackerNews");
assert.ok(hnSite, "HackerNews must exist");
assert.equal(hnSite.detection, "message", "HackerNews must use message detection");
assert.ok(hnSite.found_string, "HackerNews must have found_string");
assert.ok(hnSite.miss_string, "HackerNews must have miss_string");

// ── formatUsernameEnumResults ─────────────────────────────────────────────────
const fullResults = await checkUsername("alice", { maxSites: 5, _fetcher: mockFetcher });
const formatted = formatUsernameEnumResults(fullResults, "alice");
assert.ok(typeof formatted === "string");
assert.ok(formatted.length > 0);
assert.ok(formatted.includes("alice"), "Formatted output must include username");
assert.ok(formatted.length <= USERNAME_ENUM_LIMITS.maxFormattedChars);

// Empty results
const emptyFormatted = formatUsernameEnumResults([], "nobody");
assert.ok(emptyFormatted.includes("No sites checked"));

// Format includes category info for found sites
const foundFormatted = formatUsernameEnumResults(
  [{ name: "GitHub", uri: "https://github.com/alice", found: true, status: "found", category: "dev", responseCode: 200 }],
  "alice",
);
assert.ok(foundFormatted.includes("GitHub"));
assert.ok(foundFormatted.includes("dev"));

console.log(
  "ok recon-username-enum-runtime (normalizeUsername, buildSiteUrl, checkUsername, formatUsernameEnumResults, bounds, timeout/error handling, message detection)",
);

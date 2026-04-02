#!/usr/bin/env node
/* eslint-disable no-console */

const baseUrl = process.env.NEXUS_RELEASE_BASE_URL ?? "http://127.0.0.1:3000";

function fail(message) {
  console.error(`❌ route-integrity: ${message}`);
  process.exit(1);
}

async function fetchRoute(pathname) {
  try {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
    const text = await response.text();
    return { response, text };
  } catch (error) {
    fail(
      `${pathname} could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function normalizeLocation(location) {
  if (!location) return null;
  try {
    return new URL(location, baseUrl).pathname;
  } catch {
    return location;
  }
}

async function expectRedirect(from, to) {
  const { response, text } = await fetchRoute(from);
  const location = normalizeLocation(response.headers.get("location"));
  const appRouterRedirect =
    response.status === 200 &&
    text.includes(`NEXT_REDIRECT;replace;${to};307;`);

  const httpRedirect =
    [307, 308].includes(response.status) && location === to;

  if (!httpRedirect && !appRouterRedirect) {
    fail(
      `${from} expected redirect to ${to}, got ${response.status} -> ${location ?? "no-location"}`,
    );
  }
  console.log(`✅ ${from} -> ${to}`);
}

async function expectOk(pathname) {
  const { response } = await fetchRoute(pathname);
  if (!response.ok) {
    fail(`${pathname} expected 200, got ${response.status}`);
  }
  console.log(`✅ ${pathname} ${response.status}`);
}

async function main() {
  console.log(`route-integrity against ${baseUrl}`);

  await expectRedirect("/", "/hq");
  await expectRedirect("/home", "/hq");
  await expectRedirect("/signals", "/labs/signals");
  await expectRedirect("/ops", "/labs/ops");
  await expectRedirect("/security", "/labs/security");
  await expectRedirect("/skills", "/internal/skills");
  await expectRedirect("/vehicle", "/internal/vehicle");
  await expectRedirect("/iot", "/internal/iot");
  await expectRedirect("/reset", "/internal/reset");

  await expectOk("/hq");
  await expectOk("/command");
  await expectOk("/labs/signals");
  await expectOk("/labs/ops");
  await expectOk("/labs/security");
  await expectOk("/internal/skills");
  await expectOk("/internal/vehicle");
  await expectOk("/internal/iot");

  console.log("✅ route-integrity passed");
}

main();

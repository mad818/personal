#!/usr/bin/env node
/* eslint-disable no-console */

const baseUrl = process.env.NEXUS_RELEASE_BASE_URL ?? "http://127.0.0.1:3000";
const token = process.env.NEXUS_TOKEN ?? "";

if (!token.trim()) {
  console.error("❌ auth-regression: NEXUS_TOKEN is required");
  process.exit(1);
}

let cookieJar = "";

function fail(message) {
  console.error(`❌ auth-regression: ${message}`);
  process.exit(1);
}

function extractCookiePair(setCookie) {
  if (!setCookie) return "";
  const match = setCookie.match(/^([^;]+)/);
  return match?.[1] ?? "";
}

function updateCookieJar(res) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return;
  cookieJar = extractCookiePair(setCookie);
}

function normalizeLocation(location) {
  if (!location) return null;
  try {
    return new URL(location, baseUrl);
  } catch {
    return null;
  }
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (cookieJar && !headers.has("Cookie")) {
    headers.set("Cookie", cookieJar);
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...options,
    headers,
  });
  updateCookieJar(response);
  return response;
}

async function expectJsonOk(pathname) {
  const response = await request(pathname);
  if (!response.ok) {
    fail(`${pathname} expected 200, got ${response.status}`);
  }
  return response.json();
}

async function main() {
  console.log(`auth-regression against ${baseUrl}`);

  const health = await expectJsonOk("/api/health");
  const diagnostics = await expectJsonOk("/api/auth-diagnostics");

  if (!diagnostics?.auth?.tokenConfigured) {
    fail("/api/auth-diagnostics reports NEXUS_TOKEN is not configured");
  }

  if (
    diagnostics?.runtime?.bootId &&
    health?.runtime?.bootId &&
    diagnostics.runtime.bootId !== health.runtime.bootId
  ) {
    console.warn(
      `⚠️ auth-regression: process-local runtime ids differ between /api/health (${health.runtime.bootId}) and /api/auth-diagnostics (${diagnostics.runtime.bootId})`,
    );
  }
  console.log(`✅ runtime boot ${diagnostics?.runtime?.bootId ?? "unknown"}`);

  const invalidForm = new URLSearchParams({
    token: "__invalid_nexus_token__",
    next: "/hq",
  });
  const invalidConnect = await request("/auth/connect", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: invalidForm.toString(),
  });
  const invalidLocation = normalizeLocation(invalidConnect.headers.get("location"));
  if (invalidConnect.status !== 303) {
    fail(`/auth/connect invalid expected 303, got ${invalidConnect.status}`);
  }
  if (
    invalidLocation?.pathname !== "/hq" ||
    invalidLocation.searchParams.get("authError") !== "invalid"
  ) {
    fail("/auth/connect invalid did not redirect to /hq?authError=invalid");
  }
  console.log("✅ invalid form handoff redirects with authError=invalid");

  const validForm = new URLSearchParams({
    token,
    next: "/hq",
  });
  const validConnect = await request("/auth/connect", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: validForm.toString(),
  });
  const validLocation = normalizeLocation(validConnect.headers.get("location"));
  if (validConnect.status !== 303) {
    fail(`/auth/connect valid expected 303, got ${validConnect.status}`);
  }
  if (validLocation?.pathname !== "/hq") {
    fail(`/auth/connect valid expected redirect to /hq, got ${validLocation?.pathname ?? "none"}`);
  }
  if (!cookieJar.startsWith("nexus_session_token=") || cookieJar === "nexus_session_token=") {
    fail("valid login did not produce a usable session cookie");
  }
  console.log("✅ valid form handoff creates session cookie");

  const authedDiagnostics = await expectJsonOk("/api/auth-diagnostics");
  if (!authedDiagnostics?.auth?.authenticated) {
    fail("/api/auth-diagnostics did not report authenticated session after login");
  }
  console.log("✅ auth diagnostics detect authenticated session");

  const statusResponse = await request("/api/status");
  if (!statusResponse.ok) {
    fail(`/api/status expected 200 after login, got ${statusResponse.status}`);
  }
  console.log("✅ protected /api/status succeeds after login");

  const logoutResponse = await request("/auth/logout?next=/hq");
  const logoutLocation = normalizeLocation(logoutResponse.headers.get("location"));
  if (logoutResponse.status !== 303 || logoutLocation?.pathname !== "/hq") {
    fail(`/auth/logout expected 303 redirect to /hq, got ${logoutResponse.status} -> ${logoutLocation?.pathname ?? "none"}`);
  }
  console.log("✅ logout redirects to /hq");

  const postLogoutDiagnostics = await expectJsonOk("/api/auth-diagnostics");
  if (postLogoutDiagnostics?.auth?.authenticated) {
    fail("/api/auth-diagnostics still reports authenticated session after logout");
  }
  console.log("✅ session cookie cleared after logout");

  const postLogoutStatus = await request("/api/status");
  if (![401, 403].includes(postLogoutStatus.status)) {
    fail(`/api/status expected auth gate after logout, got ${postLogoutStatus.status}`);
  }
  console.log(`✅ protected /api/status re-locks after logout (${postLogoutStatus.status})`);

  console.log("✅ auth-regression passed");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});

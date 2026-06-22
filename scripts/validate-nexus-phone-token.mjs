#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function fail(message) {
  console.error(`x nexus-phone-token: ${message}`);
  process.exit(1);
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

const authSession = readProjectFile("lib", "authSession.ts");
const tokenRoute = readProjectFile("app", "api", "token", "route.ts");
const connectRoute = readProjectFile("app", "auth", "connect", "route.ts");
const envExample = readProjectFile(".env.example");
const phoneDoc = readProjectFile("docs", "deployment", "phone-access-free-local.md");

assertIncludes(authSession, "getConfiguredNexusPhoneToken", "authSession.ts");
assertIncludes(authSession, "resolveConfiguredLoginToken", "authSession.ts");
assertIncludes(authSession, 'NexusSessionAuthTier = "master" | "phone"', "authSession.ts");
assertIncludes(tokenRoute, "resolveConfiguredLoginToken", "token route");
assertIncludes(tokenRoute, "phoneTokenConfigured", "token route");
assertIncludes(connectRoute, "resolveConfiguredLoginToken", "auth connect route");
assertIncludes(envExample, "NEXUS_PHONE_TOKEN", ".env.example");
assertIncludes(phoneDoc, "NEXUS_PHONE_TOKEN", "phone-access-free-local.md");

console.log("ok nexus-phone-token (dual login token lane wired)");

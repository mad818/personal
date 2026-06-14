#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8")
}

function fail(message) {
  console.error(`❌ phone-access: ${message}`)
  process.exit(1)
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`)
  }
}

const phoneDoc = readProjectFile("docs", "deployment", "phone-access-coolify.md")
const coolifyDoc = readProjectFile("docs", "deployment", "coolify.md")
const deploymentReadme = readProjectFile("docs", "deployment", "README.md")
const webRunbook = readProjectFile("docs", "deployment", "web-operator-runbook.md")
const envExample = readProjectFile(".env.example")
const dockerfile = readProjectFile("Dockerfile")
const manifest = readProjectFile("public", "manifest.json")
const routePolicy = readProjectFile("lib", "security", "routePolicy.ts")

for (const [source, label] of [
  [phoneDoc, "phone access runbook"],
  [coolifyDoc, "Coolify runbook"],
  [webRunbook, "web operator runbook"],
  [envExample, "env example"],
]) {
  assertIncludes(source, "NEXUS_DEPLOYMENT_PROFILE=web-self-hosted", label)
  assertIncludes(source, "NEXUS_NETWORK_MODE=internal", label)
  assertIncludes(source, "NEXUS_ENABLE_HIGH_RISK_TOOLS=false", label)
  assertIncludes(source, "NEXUS_ALLOW_PAID_APIS=false", label)
}

assertIncludes(phoneDoc, "phone-local browser state", "phone access runbook")
assertIncludes(phoneDoc, "Desktop Ollama is unavailable", "phone access runbook")
assertIncludes(phoneDoc, "npm run release:smoke", "phone access runbook")
assertIncludes(phoneDoc, "Add to Home Screen", "phone access runbook")
assertIncludes(phoneDoc, "GROQ_API_KEY", "phone access runbook")
assertIncludes(phoneDoc, "Provider health", "phone access runbook")
assertIncludes(deploymentReadme, "phone-access-coolify.md", "deployment readme")
assertIncludes(coolifyDoc, "phone-access-coolify.md", "Coolify runbook")
assertIncludes(webRunbook, "phone-access-coolify.md", "web operator runbook")
assertIncludes(dockerfile, "EXPOSE 3000", "Dockerfile")
assertIncludes(dockerfile, "HOSTNAME=0.0.0.0", "Dockerfile")
assertIncludes(manifest, '"display": "standalone"', "PWA manifest")
assertIncludes(manifest, '"start_url": "/hq"', "PWA manifest")
assertIncludes(routePolicy, 'return mode === "connected" && highRiskEnabled', "route policy")

console.log("Phone access readiness OK (Coolify runbook, env defaults, PWA, Docker, and route posture wired).")

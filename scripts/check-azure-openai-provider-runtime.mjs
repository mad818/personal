#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isAzureOpenAIConfigured,
  normalizeAzureOpenAIDeployment,
  normalizeAzureOpenAIEndpoint,
  readAzureOpenAIConfig,
} from "../lib/azureOpenAI.ts";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function read(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function requireText(source, needle, label) {
  assert.ok(source.includes(needle), `${label} is missing ${needle}`);
}

const openAiHost = normalizeAzureOpenAIEndpoint(
  "https://example.openai.azure.com/openai/v1/",
);
assert.equal(
  openAiHost.chatCompletionsUrl,
  "https://example.openai.azure.com/openai/v1/chat/completions",
);
assert.equal(openAiHost.baseUrl, "https://example.openai.azure.com/openai/v1/");

const foundryHost = normalizeAzureOpenAIEndpoint(
  "https://example.services.ai.azure.com/openai/v1/chat/completions",
);
assert.equal(
  foundryHost.chatCompletionsUrl,
  "https://example.services.ai.azure.com/openai/v1/chat/completions",
);

for (const endpoint of [
  "http://example.openai.azure.com/openai/v1",
  "https://example.openai.azure.com.evil.test/openai/v1",
  "https://user:pass@example.openai.azure.com/openai/v1",
  "https://example.openai.azure.com:8443/openai/v1",
  "https://example.openai.azure.com/openai/v1?api-version=preview",
  "https://example.openai.azure.com/api/projects/demo",
]) {
  assert.throws(() => normalizeAzureOpenAIEndpoint(endpoint));
}

assert.equal(normalizeAzureOpenAIDeployment("gpt-5.6-sol"), "gpt-5.6-sol");
for (const deployment of ["", "bad deployment", "../other", "x".repeat(129)]) {
  assert.throws(() => normalizeAzureOpenAIDeployment(deployment));
}

const configuredEnv = {
  AZURE_OPENAI_API_KEY: "runtime-check-key",
  AZURE_OPENAI_ENDPOINT: "https://example.services.ai.azure.com/openai/v1",
  AZURE_OPENAI_DEPLOYMENT: "gpt-5.6-sol",
};
const configured = readAzureOpenAIConfig(configuredEnv);
assert.equal(configured.configured, true);
if (configured.configured) {
  assert.equal(configured.config.deployment, "gpt-5.6-sol");
  assert.equal(
    configured.config.chatCompletionsUrl,
    "https://example.services.ai.azure.com/openai/v1/chat/completions",
  );
}
assert.equal(isAzureOpenAIConfigured(configuredEnv), true);
assert.equal(
  readAzureOpenAIConfig({
    ...configuredEnv,
    AZURE_OPENAI_API_KEY: "",
  }).reason,
  "missing-key",
);
assert.equal(
  readAzureOpenAIConfig({
    ...configuredEnv,
    AZURE_OPENAI_ENDPOINT: "https://evil.test/openai/v1",
  }).reason,
  "invalid-endpoint",
);
assert.equal(
  readAzureOpenAIConfig({
    ...configuredEnv,
    AZURE_OPENAI_DEPLOYMENT: "bad deployment",
  }).reason,
  "invalid-deployment",
);

const aiRoute = read("app", "api", "ai", "route.ts");
const providerPreference = read("lib", "aiProviderPreference.ts");
const agent = read("lib", "agent.ts");
const settingsRoute = read("app", "api", "settings", "route.ts");
const providerHealth = read("app", "api", "health", "providers", "route.ts");
const envExample = read(".env.example");
const spec = read("specs", "features", "azure-openai-credit-lane.md");

requireText(aiRoute, 'name: "azure"', "AI route");
requireText(aiRoute, '"api-key": key', "AI route");
requireText(aiRoute, "max_completion_tokens", "AI route");
requireText(aiRoute, "getProviderDefaultModel", "AI route");
requireText(providerPreference, '"azure"', "provider preference");
requireText(agent, 'provider: "azure"', "agent loop");
requireText(settingsRoute, '"AZURE_OPENAI_ENDPOINT"', "settings route");
requireText(settingsRoute, '"AZURE_OPENAI_DEPLOYMENT"', "settings route");
requireText(providerHealth, 'case "azure"', "provider health");
requireText(envExample, ["AZURE_OPENAI_API_KEY", ""].join("="), "env example");
requireText(spec, "Ollama remains the default provider", "feature spec");

console.log(
  "ok azure-openai-provider (Azure host boundary, deployment pinning, server-key route, provider/agent/settings/health wiring)",
);

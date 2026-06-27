#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`LYRA prompt forge validation failed: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) fail(`${parts.join("/")} is missing`);
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} is missing ${JSON.stringify(needle)}`);
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} must not contain ${JSON.stringify(needle)}`);
}

const optimizer = readRequired("lib", "promptOptimizer.ts");
const component = readRequired("components", "skills", "LyraPromptForge.tsx");
const skillsPage = readRequired("app", "skills", "page.tsx");
const store = readRequired("store", "useStore.ts");
const canonical = readRequired("lib", "assistantCanonicalRegistry.ts");
const governance = readRequired("lib", "governanceCatalog.ts");
const capabilities = readRequired("lib", "assistantCapabilityRegistry.ts");
const sessions = readRequired("lib", "assistantSessionRegistry.ts");
const routing = readRequired("lib", "chatCapabilityRouting.ts");
const dispatch = readRequired("lib", "assistantDispatch.ts");
const liveContext = readRequired("lib", "liveContext.ts");
const promptRecipes = readRequired("lib", "promptRecipes.ts");
const packageJson = readRequired("package.json");

requireText(optimizer, "THE 4-D METHODOLOGY", "optimizer engine");
requireText(component, "Hello! I'm Lyra, your AI prompt optimizer.", "Prompt Forge welcome");
requireText(component, "callAIWithSystemPrompt", "Prompt Forge AI boundary");
requireText(component, "navigator.clipboard.writeText", "copy-only result action");
requireText(component, "data-testid=\"lyra-prompt-forge\"", "Prompt Forge test id");
forbidText(component, "useStore(", "Prompt Forge component");
forbidText(component, "localStorage", "Prompt Forge component");
forbidText(component, "sessionStorage", "Prompt Forge component");
forbidText(component, "fetch(", "Prompt Forge component");

requireText(skillsPage, "LyraPromptForge", "Skills page");
requireText(skillsPage, '{ id: "prompts", label: "LYRA Prompt Forge" }', "Skills view registry");
requireText(store, "'forge' | 'prompts' | 'blacksite' | 'brain' | 'library'", "Skills view state");
requireText(canonical, 'allowedViews: ["forge", "prompts", "blacksite", "brain", "library"]', "canonical Skills views");
requireText(canonical, '"skills-prompt-forge": "prompts"', "canonical LYRA focus");

requireText(governance, '"prompt-optimization"', "governance capability");
requireText(capabilities, 'id: "prompt-optimization"', "assistant capability registry");
requireText(sessions, '| "skills-prompt-forge"', "assistant workspace type");
requireText(sessions, 'id: "skills-prompt-forge"', "assistant workspace registry");
requireText(routing, '"optimize this prompt"', "chat capability routing");
requireText(dispatch, "PROMPT_OPTIMIZATION_RE", "assistant route-action rule");
requireText(dispatch, 'capabilityMatch.capability.id === "prompt-optimization"', "JANSKY optimizer routing");

requireText(liveContext, "buildPromptRecipeBlock", "prompt recipe live-context wiring");
requireText(promptRecipes, "PROMPT_RECIPES", "prompt recipe registry");
requireText(packageJson, '"lyra:check"', "LYRA package check");
requireText(packageJson, '"prompt-recipes:check"', "prompt recipe package check");

console.log("LYRA Prompt Forge wiring OK (transient UI, Skills route, HQ dispatch, and prompt recipes).");

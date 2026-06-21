#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function fail(message) {
  console.error(`x prompt-recipes: ${message}`);
  process.exit(1);
}

function readRequired(...parts) {
  const filePath = path.join(root, ...parts);
  if (!fs.existsSync(filePath)) {
    fail(`${parts.join("/")} is missing`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label} is missing "${needle}"`);
  }
}

const recipes = readRequired("lib", "promptRecipes.ts");
const liveContext = readRequired("lib", "liveContext.ts");

requireText(recipes, "PROMPT_RECIPES", "promptRecipes.ts");
requireText(recipes, "buildPromptRecipeBlock", "promptRecipes.ts");
requireText(recipes, "recipesForAgent", "promptRecipes.ts");
requireText(recipes, "constraint-cage", "promptRecipes.ts");
requireText(liveContext, "buildPromptRecipeBlock", "liveContext.ts");

console.log("ok prompt-recipes (registry + live-context wiring)");

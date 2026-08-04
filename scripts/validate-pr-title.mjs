#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";

const TITLE_PATTERN =
  /^(feat|fix|docs|chore|refactor|perf|test|build|ci|revert)(\([a-z0-9][a-z0-9._/-]*\))?!?: [A-Za-z0-9][^\r\n]{0,70}$/;
const MAX_LENGTH = 72;

export function validatePullRequestTitle(title) {
  if (typeof title !== "string" || title.trim() !== title) {
    return "title must be a trimmed string";
  }
  if (title.length > MAX_LENGTH) {
    return `title exceeds ${MAX_LENGTH} characters`;
  }
  if (!TITLE_PATTERN.test(title)) {
    return "title must use a concise conventional form such as feat: add capability";
  }
  return null;
}

const titleFlag = process.argv.indexOf("--title");
const requestedTitle =
  process.env.NEXUS_PR_TITLE ??
  (titleFlag >= 0 ? process.argv[titleFlag + 1] : undefined);

if (requestedTitle !== undefined) {
  const error = validatePullRequestTitle(requestedTitle);
  if (error) {
    console.error(`x pull-request-title: ${error}`);
    process.exit(1);
  }
  console.log(`ok pull-request-title (${requestedTitle})`);
  process.exit(0);
}

for (const valid of [
  "docs: publish Nexus Prime showcase and retention baseline",
  "feat: add adaptive capability assurance",
  "chore(release): prepare Nexus Prime rc1",
]) {
  assert.equal(validatePullRequestTitle(valid), null, valid);
}
for (const invalid of [
  "Add adaptive capability assurance",
  "feat:add missing space",
  "feat: ",
  `feat: ${"x".repeat(80)}`,
]) {
  assert.notEqual(validatePullRequestTitle(invalid), null, invalid);
}

console.log("ok pull-request-title (fixtures=7; max=72; conventional=true)");

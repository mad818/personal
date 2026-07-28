#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  AGENT_MAX_ITERATIONS,
  normalizeAgentIterationBudget,
} from "../lib/agentExecutionContract.ts";

assert.equal(AGENT_MAX_ITERATIONS, 12);
assert.equal(normalizeAgentIterationBudget(undefined, 6), 6);
assert.equal(normalizeAgentIterationBudget(0, 6), 1);
assert.equal(normalizeAgentIterationBudget(999, 6), 12);
assert.equal(normalizeAgentIterationBudget(Number.POSITIVE_INFINITY, 8), 8);
assert.equal(normalizeAgentIterationBudget(4.9, 6), 4);

console.log("ok workflow-pattern-family-runtime (iteration-budget=1..12)");

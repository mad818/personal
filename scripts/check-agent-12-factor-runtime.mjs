import assert from "node:assert/strict";
import {
  AGENT_CONTEXT_MAX_CHARS,
  AGENT_CONTEXT_MESSAGES_MAX_CHARS,
  AGENT_CONTEXT_SYSTEM_MAX_CHARS,
  AGENT_EXECUTION_EVENT_LIMIT,
  AGENT_TOOL_RESULT_MAX_CHARS,
  compactAgentToolResult,
  createAgentExecutionState,
  normalizeAgentToolInputForTransport,
  prepareAgentContext,
  reduceAgentExecutionState,
  summarizeAgentExecutionState,
  validateAgentToolInput,
} from "../lib/agentExecutionContract.ts";
import { parseToolsPostBody } from "../lib/toolsRequestSchema.ts";

const FIXTURE_TOOLS = [
  {
    name: "web_search",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "compare_repos",
    input_schema: {
      type: "object",
      properties: {
        repo_refs: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 3,
        },
      },
      required: ["repo_refs"],
    },
  },
];

function sampleForSchema(schema) {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }
  switch (schema.type) {
    case "string":
      return "fixture";
    case "array":
      return Array.from({ length: Math.max(1, schema.minItems ?? 0) }, () =>
        sampleForSchema(schema.items ?? { type: "string" }),
      );
    case "number":
    case "integer":
      return 1;
    case "boolean":
      return true;
    case "object": {
      const value = {};
      for (const key of schema.required ?? []) {
        value[key] = sampleForSchema(schema.properties?.[key] ?? {});
      }
      return value;
    }
    default:
      return "fixture";
  }
}

const compactContext = prepareAgentContext({
  systemPrompt: `SYSTEM-HEAD:${"s".repeat(54_000)}:SYSTEM-TAIL`,
  messages: Array.from({ length: 8 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message-${index}-head:${String(index).repeat(11_900)}:message-${index}-tail`,
  })),
});
assert.equal(compactContext.compacted, true);
assert.ok(compactContext.omittedMessageCount > 0);
assert.ok(compactContext.systemPrompt.length <= AGENT_CONTEXT_SYSTEM_MAX_CHARS);
assert.ok(
  compactContext.messages.reduce(
    (total, message) => total + message.content.length,
    0,
  ) <= AGENT_CONTEXT_MESSAGES_MAX_CHARS,
);
assert.ok(compactContext.outputChars <= AGENT_CONTEXT_MAX_CHARS);
assert.match(compactContext.systemPrompt, /SYSTEM-HEAD/);
assert.match(compactContext.systemPrompt, /SYSTEM-TAIL/);
assert.match(compactContext.messages.at(-1)?.content ?? "", /message-7-tail/);
assert.ok(compactContext.omittedChars > 0);

const smallContext = prepareAgentContext({
  systemPrompt: "owned system prompt",
  messages: [{ role: "user", content: "bounded request" }],
});
assert.equal(smallContext.compacted, false);
assert.equal(smallContext.systemPrompt, "owned system prompt");
assert.deepEqual(smallContext.messages, [
  { role: "user", content: "bounded request" },
]);

for (const tool of FIXTURE_TOOLS) {
  const sample = sampleForSchema(tool.input_schema);
  assert.deepEqual(
    validateAgentToolInput(FIXTURE_TOOLS, tool.name, sample),
    { ok: true },
    `${tool.name} should accept its declared minimum schema`,
  );
}
assert.equal(validateAgentToolInput(FIXTURE_TOOLS, "web_search", {}).ok, false);
assert.equal(
  validateAgentToolInput(FIXTURE_TOOLS, "web_search", { query: 7 }).ok,
  false,
);
assert.equal(
  validateAgentToolInput(FIXTURE_TOOLS, "web_search", {
    query: "bounded",
    surprise: "field",
  }).ok,
  false,
);
assert.equal(
  validateAgentToolInput(FIXTURE_TOOLS, "unknown_tool", {}).ok,
  false,
);
assert.equal(
  validateAgentToolInput(FIXTURE_TOOLS, "web_search", undefined).ok,
  false,
);
assert.equal(
  validateAgentToolInput(FIXTURE_TOOLS, "web_search", {
    query: "x".repeat(20_001),
  }).ok,
  false,
);
assert.deepEqual(
  validateAgentToolInput(FIXTURE_TOOLS, "compare_repos", {
    repo_refs: ["owner/one", "owner/two"],
  }),
  { ok: true },
);
assert.equal(
  validateAgentToolInput(FIXTURE_TOOLS, "compare_repos", {
    repo_refs: ["owner/one"],
  }).ok,
  false,
);
assert.equal(
  validateAgentToolInput(FIXTURE_TOOLS, "compare_repos", {
    repo_refs: ["owner/one", 2],
  }).ok,
  false,
);

const normalized = normalizeAgentToolInputForTransport({
  repo_refs: ["owner/one", "owner/two"],
  confirmed: true,
  limit: 2,
});
assert.deepEqual(normalized, {
  repo_refs: "owner/one vs owner/two",
  confirmed: "true",
  limit: "2",
});
assert.deepEqual(
  parseToolsPostBody({ tool: "compare_repos", input: normalized }),
  {
    ok: true,
    data: { tool: "compare_repos", input: normalized },
  },
);

const largeToolResult = `RESULT-HEAD:${"r".repeat(12_000)}:RESULT-TAIL`;
const compactedResult = compactAgentToolResult(largeToolResult);
assert.equal(compactedResult.compacted, true);
assert.ok(compactedResult.content.length <= AGENT_TOOL_RESULT_MAX_CHARS);
assert.match(compactedResult.content, /RESULT-HEAD/);
assert.match(compactedResult.content, /RESULT-TAIL/);
assert.match(compactedResult.content, /TOOL RESULT COMPACTED/);
assert.ok(compactedResult.omittedChars > 0);

const idle = createAgentExecutionState();
const launched = reduceAgentExecutionState(idle, {
  type: "launch",
  now: 100,
  runId: "run-contract-fixture",
  objectiveChars: 42,
  maxIterations: 8,
});
assert.equal(idle.status, "idle");
assert.equal(launched.status, "running");
assert.equal(launched.events.length, 1);
let state = reduceAgentExecutionState(launched, {
  type: "context_prepared",
  now: 110,
  inputChars: 80_000,
  outputChars: 64_000,
  compacted: true,
  omittedMessageCount: 3,
});
state = reduceAgentExecutionState(state, {
  type: "phase",
  now: 120,
  phase: "executing",
});
state = reduceAgentExecutionState(state, {
  type: "iteration",
  now: 130,
  iteration: 2,
});
state = reduceAgentExecutionState(state, {
  type: "tool_started",
  now: 140,
  tool: "propose_project_edit",
});
state = reduceAgentExecutionState(state, {
  type: "human_wait",
  now: 150,
  tool: "propose_project_edit",
});
assert.equal(state.status, "waiting_for_human");
assert.equal(state.pendingHumanTool, "propose_project_edit");
state = reduceAgentExecutionState(state, { type: "resume", now: 160 });
state = reduceAgentExecutionState(state, {
  type: "tool_finished",
  now: 170,
  tool: "propose_project_edit",
});
state = reduceAgentExecutionState(state, { type: "complete", now: 180 });
assert.equal(state.status, "completed");
assert.equal(state.phase, "done");
assert.equal(state.toolCallCount, 1);
assert.equal(state.humanContactCount, 1);
assert.equal(state.pendingHumanTool, undefined);
const summary = summarizeAgentExecutionState(state);
assert.equal(summary.contextCompacted, true);
assert.equal(summary.objectiveChars, 42);
assert.equal("events" in summary, false);
assert.equal(JSON.stringify(summary).includes("propose_project_edit"), false);

let boundedEvents = launched;
for (let index = 0; index < AGENT_EXECUTION_EVENT_LIMIT + 12; index += 1) {
  boundedEvents = reduceAgentExecutionState(boundedEvents, {
    type: "phase",
    now: 200 + index,
    phase: `phase-${index}`,
  });
}
assert.equal(boundedEvents.events.length, AGENT_EXECUTION_EVENT_LIMIT);
assert.ok(boundedEvents.events[0].sequence > 1);

const failed = reduceAgentExecutionState(launched, {
  type: "fail",
  now: 999,
  errorCode: "provider_unavailable",
});
assert.equal(failed.status, "failed");
assert.equal(failed.errorCode, "provider_unavailable");
const relaunched = reduceAgentExecutionState(failed, {
  type: "launch",
  now: 1_000,
  runId: "run-contract-relaunched",
  objectiveChars: 9,
  maxIterations: 3,
});
assert.equal(relaunched.status, "running");
assert.equal(relaunched.errorCode, undefined);
assert.equal(relaunched.events.length, 1);
assert.equal(relaunched.events[0].sequence, 1);

console.log(
  `ok agent-12-factor-runtime (fixture-tools=${FIXTURE_TOOLS.length}; bounded context, schema rejection, structured transport, compacted results, immutable state, human wait/resume, metadata summary)`,
);

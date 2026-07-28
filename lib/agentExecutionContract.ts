export const AGENT_CONTEXT_MAX_CHARS = 64_000;
export const AGENT_CONTEXT_SYSTEM_MAX_CHARS = 38_000;
export const AGENT_CONTEXT_MESSAGES_MAX_CHARS =
  AGENT_CONTEXT_MAX_CHARS - AGENT_CONTEXT_SYSTEM_MAX_CHARS;
export const AGENT_CONTEXT_MESSAGE_MAX_CHARS = 12_000;
export const AGENT_TOOL_RESULT_MAX_CHARS = 8_000;
export const AGENT_EXECUTION_EVENT_LIMIT = 48;
export const AGENT_TOOL_INPUT_MAX_CHARS = 64_000;
export const AGENT_TOOL_STRING_MAX_CHARS = 20_000;
export const AGENT_TOOL_ARRAY_MAX_ITEMS = 100;
export const AGENT_MAX_ITERATIONS = 12;

export interface AgentContextMessage {
  role: string;
  content: string;
}

export interface PreparedAgentContext {
  systemPrompt: string;
  messages: AgentContextMessage[];
  inputChars: number;
  outputChars: number;
  compacted: boolean;
  omittedMessageCount: number;
  omittedChars: number;
}

interface AgentJsonSchema {
  type?: string;
  properties?: Readonly<Record<string, AgentJsonSchema | undefined>>;
  required?: readonly string[];
  enum?: readonly unknown[];
  items?: AgentJsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
}

export interface AgentToolDefinitionLike {
  name: string;
  input_schema: AgentJsonSchema;
}

export interface AgentToolInputValidation {
  ok: boolean;
  error?: string;
}

export function normalizeAgentIterationBudget(
  requested: number | undefined,
  fallback: number,
): number {
  const value = requested ?? fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), AGENT_MAX_ITERATIONS);
}

export type AgentExecutionStatus =
  | "idle"
  | "running"
  | "waiting_for_human"
  | "completed"
  | "failed";

export interface AgentExecutionEvent {
  sequence: number;
  at: number;
  type:
    | "launch"
    | "context_prepared"
    | "phase"
    | "iteration"
    | "tool_started"
    | "tool_finished"
    | "human_wait"
    | "resume"
    | "complete"
    | "fail";
  phase?: string;
  tool?: string;
  errorCode?: string;
}

export interface AgentExecutionState {
  schemaVersion: 1;
  runId: string;
  status: AgentExecutionStatus;
  phase: string;
  iteration: number;
  maxIterations: number;
  objectiveChars: number;
  contextInputChars: number;
  contextOutputChars: number;
  contextCompacted: boolean;
  omittedMessageCount: number;
  toolCallCount: number;
  humanContactCount: number;
  pendingHumanTool?: string;
  errorCode?: string;
  startedAt: number;
  updatedAt: number;
  events: AgentExecutionEvent[];
}

export type AgentExecutionAction =
  | {
      type: "launch";
      now: number;
      runId: string;
      objectiveChars: number;
      maxIterations: number;
    }
  | {
      type: "context_prepared";
      now: number;
      inputChars: number;
      outputChars: number;
      compacted: boolean;
      omittedMessageCount: number;
    }
  | { type: "phase"; now: number; phase: string }
  | { type: "iteration"; now: number; iteration: number }
  | { type: "tool_started"; now: number; tool: string }
  | { type: "tool_finished"; now: number; tool: string }
  | { type: "human_wait"; now: number; tool: string }
  | { type: "resume"; now: number }
  | { type: "complete"; now: number }
  | { type: "fail"; now: number; errorCode: string };

export interface AgentExecutionSummary {
  schemaVersion: 1;
  runId: string;
  status: AgentExecutionStatus;
  phase: string;
  iteration: number;
  maxIterations: number;
  objectiveChars: number;
  contextInputChars: number;
  contextOutputChars: number;
  contextCompacted: boolean;
  omittedMessageCount: number;
  toolCallCount: number;
  humanContactCount: number;
  pendingHumanTool?: string;
  errorCode?: string;
  eventCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compactMiddle(
  value: string,
  maxChars: number,
  label: string,
): { text: string; omittedChars: number } {
  if (value.length <= maxChars) return { text: value, omittedChars: 0 };
  const omittedChars = value.length - maxChars;
  const receipt = `\n[${label}: ${omittedChars} characters omitted]\n`;
  const available = Math.max(0, maxChars - receipt.length);
  const headChars = Math.ceil(available * 0.62);
  const tailChars = Math.max(0, available - headChars);
  return {
    text: `${value.slice(0, headChars)}${receipt}${value.slice(
      value.length - tailChars,
    )}`,
    omittedChars,
  };
}

export function prepareAgentContext(input: {
  systemPrompt: string;
  messages: readonly AgentContextMessage[];
}): PreparedAgentContext {
  const inputChars =
    input.systemPrompt.length +
    input.messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );
  const compactedMessages = input.messages.map((message, sourceIndex) => {
    const compacted = compactMiddle(
      message.content,
      AGENT_CONTEXT_MESSAGE_MAX_CHARS,
      "MESSAGE COMPACTED",
    );
    return {
      role: message.role,
      content: compacted.text,
      omittedChars: compacted.omittedChars,
      sourceIndex,
    };
  });

  const kept: typeof compactedMessages = [];
  let messageChars = 0;
  for (let index = compactedMessages.length - 1; index >= 0; index -= 1) {
    const message = compactedMessages[index];
    if (
      kept.length > 0 &&
      messageChars + message.content.length > AGENT_CONTEXT_MESSAGES_MAX_CHARS
    ) {
      continue;
    }
    const remaining = AGENT_CONTEXT_MESSAGES_MAX_CHARS - messageChars;
    if (remaining <= 0) continue;
    const bounded =
      message.content.length <= remaining
        ? message
        : {
            ...message,
            ...compactMiddle(message.content, remaining, "MESSAGE COMPACTED"),
          };
    kept.unshift(bounded);
    messageChars += bounded.content.length;
  }

  const keptIndexes = new Set(kept.map((message) => message.sourceIndex));
  const omittedMessageCount = compactedMessages.length - kept.length;
  const omittedMessageChars = compactedMessages
    .filter((message) => !keptIndexes.has(message.sourceIndex))
    .reduce((total, message) => total + message.content.length, 0);
  const perMessageOmittedChars = compactedMessages.reduce(
    (total, message) => total + message.omittedChars,
    0,
  );
  const contextReceipt =
    omittedMessageCount > 0
      ? `\n\n[CONTEXT COMPACTED: ${omittedMessageCount} older message(s) and ${omittedMessageChars} characters omitted; newest messages preserved.]`
      : "";
  const compactedSystem = compactMiddle(
    `${input.systemPrompt}${contextReceipt}`,
    AGENT_CONTEXT_SYSTEM_MAX_CHARS,
    "SYSTEM CONTEXT COMPACTED",
  );
  const messages = kept.map(({ role, content }) => ({ role, content }));
  const outputChars =
    compactedSystem.text.length +
    messages.reduce((total, message) => total + message.content.length, 0);
  const omittedChars = Math.max(0, inputChars - outputChars);

  return {
    systemPrompt: compactedSystem.text,
    messages,
    inputChars,
    outputChars,
    compacted:
      omittedMessageCount > 0 ||
      compactedSystem.omittedChars > 0 ||
      perMessageOmittedChars > 0,
    omittedMessageCount,
    omittedChars,
  };
}

function validateSchemaValue(
  value: unknown,
  schema: AgentJsonSchema,
  path: string,
  depth: number,
): string | null {
  if (depth > 4) return `${path} exceeds the supported schema depth.`;
  if (schema.enum && !schema.enum.some((candidate) => candidate === value)) {
    return `${path} is not an allowed value.`;
  }
  switch (schema.type) {
    case "string": {
      if (typeof value !== "string") return `${path} must be a string.`;
      const maxLength = Math.min(
        schema.maxLength ?? AGENT_TOOL_STRING_MAX_CHARS,
        AGENT_TOOL_STRING_MAX_CHARS,
      );
      if (value.length < (schema.minLength ?? 0) || value.length > maxLength) {
        return `${path} has an invalid length.`;
      }
      return null;
    }
    case "array": {
      if (!Array.isArray(value)) return `${path} must be an array.`;
      const maxItems = Math.min(
        schema.maxItems ?? AGENT_TOOL_ARRAY_MAX_ITEMS,
        AGENT_TOOL_ARRAY_MAX_ITEMS,
      );
      if (value.length < (schema.minItems ?? 0) || value.length > maxItems) {
        return `${path} has an invalid item count.`;
      }
      for (let index = 0; index < value.length; index += 1) {
        const error = validateSchemaValue(
          value[index],
          schema.items ?? {},
          `${path}[${index}]`,
          depth + 1,
        );
        if (error) return error;
      }
      return null;
    }
    case "object": {
      if (!isRecord(value)) return `${path} must be an object.`;
      const properties = schema.properties ?? {};
      for (const required of schema.required ?? []) {
        if (!(required in value)) return `${path}.${required} is required.`;
      }
      for (const [key, nested] of Object.entries(value)) {
        const propertySchema = properties[key];
        if (!propertySchema) return `${path}.${key} is not allowed.`;
        const error = validateSchemaValue(
          nested,
          propertySchema,
          `${path}.${key}`,
          depth + 1,
        );
        if (error) return error;
      }
      return null;
    }
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? null
        : `${path} must be a finite number.`;
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value)
        ? null
        : `${path} must be an integer.`;
    case "boolean":
      return typeof value === "boolean" ? null : `${path} must be a boolean.`;
    case undefined:
      return null;
    default:
      return `${path} uses an unsupported schema type.`;
  }
}

export function validateAgentToolInput(
  tools: readonly AgentToolDefinitionLike[],
  toolName: string,
  input: unknown,
): AgentToolInputValidation {
  const tool = tools.find((candidate) => candidate.name === toolName);
  if (!tool) return { ok: false, error: `Unknown tool "${toolName}".` };
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return { ok: false, error: "Tool input must be serializable JSON." };
  }
  if (typeof serialized !== "string") {
    return { ok: false, error: "Tool input must be serializable JSON." };
  }
  if (serialized.length > AGENT_TOOL_INPUT_MAX_CHARS) {
    return { ok: false, error: "Tool input exceeds the size limit." };
  }
  const error = validateSchemaValue(input, tool.input_schema, "input", 0);
  return error ? { ok: false, error } : { ok: true };
}

export function normalizeAgentToolInputForTransport(
  input: Readonly<Record<string, unknown>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (typeof value === "string") return [key, value];
      if (
        Array.isArray(value) &&
        value.every((item) => typeof item === "string")
      ) {
        return [key, value.join(" vs ")];
      }
      return [key, JSON.stringify(value) ?? "null"];
    }),
  );
}

export function compactAgentToolResult(value: string): {
  content: string;
  compacted: boolean;
  omittedChars: number;
} {
  const compacted = compactMiddle(
    value,
    AGENT_TOOL_RESULT_MAX_CHARS,
    "TOOL RESULT COMPACTED",
  );
  return {
    content: compacted.text,
    compacted: compacted.omittedChars > 0,
    omittedChars: compacted.omittedChars,
  };
}

export function createAgentExecutionState(): AgentExecutionState {
  return {
    schemaVersion: 1,
    runId: "",
    status: "idle",
    phase: "idle",
    iteration: 0,
    maxIterations: 0,
    objectiveChars: 0,
    contextInputChars: 0,
    contextOutputChars: 0,
    contextCompacted: false,
    omittedMessageCount: 0,
    toolCallCount: 0,
    humanContactCount: 0,
    startedAt: 0,
    updatedAt: 0,
    events: [],
  };
}

function appendEvent(
  state: AgentExecutionState,
  action: AgentExecutionAction,
): AgentExecutionEvent[] {
  const priorEvents = action.type === "launch" ? [] : state.events;
  const event: AgentExecutionEvent = {
    sequence: (priorEvents.at(-1)?.sequence ?? 0) + 1,
    at: action.now,
    type: action.type,
    ...("phase" in action ? { phase: action.phase } : {}),
    ...("tool" in action ? { tool: action.tool } : {}),
    ...("errorCode" in action ? { errorCode: action.errorCode } : {}),
  };
  return [...priorEvents, event].slice(-AGENT_EXECUTION_EVENT_LIMIT);
}

export function reduceAgentExecutionState(
  state: AgentExecutionState,
  action: AgentExecutionAction,
): AgentExecutionState {
  const events = appendEvent(state, action);
  switch (action.type) {
    case "launch":
      return {
        ...createAgentExecutionState(),
        runId: action.runId,
        status: "running",
        phase: "interpreting",
        maxIterations: action.maxIterations,
        objectiveChars: action.objectiveChars,
        startedAt: action.now,
        updatedAt: action.now,
        events,
      };
    case "context_prepared":
      return {
        ...state,
        contextInputChars: action.inputChars,
        contextOutputChars: action.outputChars,
        contextCompacted: action.compacted,
        omittedMessageCount: action.omittedMessageCount,
        updatedAt: action.now,
        events,
      };
    case "phase":
      return {
        ...state,
        phase: action.phase,
        updatedAt: action.now,
        events,
      };
    case "iteration":
      return {
        ...state,
        iteration: Math.min(
          Math.max(0, action.iteration),
          Math.max(0, state.maxIterations),
        ),
        updatedAt: action.now,
        events,
      };
    case "tool_started":
      return {
        ...state,
        toolCallCount: state.toolCallCount + 1,
        updatedAt: action.now,
        events,
      };
    case "tool_finished":
      return { ...state, updatedAt: action.now, events };
    case "human_wait":
      return {
        ...state,
        status: "waiting_for_human",
        pendingHumanTool: action.tool,
        humanContactCount: state.humanContactCount + 1,
        updatedAt: action.now,
        events,
      };
    case "resume":
      return {
        ...state,
        status: "running",
        pendingHumanTool: undefined,
        updatedAt: action.now,
        events,
      };
    case "complete":
      return {
        ...state,
        status: "completed",
        phase: "done",
        pendingHumanTool: undefined,
        updatedAt: action.now,
        events,
      };
    case "fail":
      return {
        ...state,
        status: "failed",
        phase: "done",
        pendingHumanTool: undefined,
        errorCode: action.errorCode,
        updatedAt: action.now,
        events,
      };
  }
}

export function summarizeAgentExecutionState(
  state: AgentExecutionState,
): AgentExecutionSummary {
  return {
    schemaVersion: 1,
    runId: state.runId,
    status: state.status,
    phase: state.phase,
    iteration: state.iteration,
    maxIterations: state.maxIterations,
    objectiveChars: state.objectiveChars,
    contextInputChars: state.contextInputChars,
    contextOutputChars: state.contextOutputChars,
    contextCompacted: state.contextCompacted,
    omittedMessageCount: state.omittedMessageCount,
    toolCallCount: state.toolCallCount,
    humanContactCount: state.humanContactCount,
    pendingHumanTool: state.pendingHumanTool,
    errorCode: state.errorCode,
    eventCount: state.events.length,
  };
}

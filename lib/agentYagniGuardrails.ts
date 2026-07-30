/**
 * YAGNI-first prompt guardrails for Nexus agents.
 *
 * Patterns adapted from ponytail (DietrichGebert/ponytail) — a minimal
 * agent framework whose core insight is that agents degrade when they are
 * given tools, context, or reasoning steps they don't actually need.
 *
 * These constants are injected into ORBIT and skill-runner prompts so
 * agents self-check scope before generating work.
 */

/**
 * Short directive appended to agent system prompts to enforce YAGNI discipline:
 * skip every tool call, file read, or reasoning chain that isn't load-bearing
 * for the immediate task.
 */
export const YAGNI_AGENT_DIRECTIVE = `
YAGNI (You Aren't Gonna Need It) discipline:
- Only call a tool if its output is required for the very next step.
- Do not read files speculatively; read only what you need to make the current edit.
- Do not plan sub-tasks that are not part of the stated goal.
- Do not create scaffolding, helpers, or abstractions unless they directly unblock a required task.
- Stop and report rather than expanding scope.
`.trim();

/**
 * Self-check questions an agent should be able to answer "yes" to before
 * issuing any tool call, code edit, or file creation.
 */
export const YAGNI_SELF_CHECK = [
  "Does this action directly advance the current stated goal?",
  "Is there a simpler action that achieves the same result?",
  "Would removing this action break the task?",
  "Am I adding this because it is needed now, not because it might be needed later?",
] as const;

/**
 * Patterns detected as YAGNI violations in agent traces.
 * Used by SkillSpector-style skill policy checks to flag over-engineered plans.
 */
export const YAGNI_VIOLATION_PATTERNS = [
  "create a utility for future use",
  "refactor while I'm here",
  "add test coverage for unrelated",
  "scaffold a generic abstraction",
  "read the whole file just in case",
  "plan the full feature before starting",
] as const;

/** Hard cap on tool calls per agent run (ponytail step-budget pattern). */
export const YAGNI_MAX_TOOL_CALLS_PER_RUN = 12;

/**
 * Reader-contract and build-order discipline block.
 *
 * Adapted from fainir/most-capable-agent-system-prompt — the repo's
 * NON-NEGOTIABLE RULES establish that long prompts must open with a
 * reader contract (who this is for, what it solves), state build order
 * explicitly, and define the first milestone before any code is generated.
 *
 * Nexus adaptation: injected into buildSystemPrompt so the assistant
 * always reads the operator profile and live context before proposing
 * work, states its intended next step, and names the first deliverable.
 */
export const FAINIR_READER_CONTRACT_BLOCK = `
READER CONTRACT (build-order discipline):
1. Read the operator profile and live context before proposing edits or a plan.
2. State the intended build order: list the top-level steps in sequence before executing.
3. Name the first milestone: the smallest working, testable change that proves the approach.
4. Do not skip steps silently — if a step cannot be completed, surface the blocker immediately.
5. Confirm the first milestone is done before moving to the next step.
`.trim();

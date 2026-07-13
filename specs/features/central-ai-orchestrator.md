# CENTRAL-AI-ORCHESTRATOR

## What it does

Makes MAX the single operator-facing orchestrator for cross-domain work. Simple requests keep the existing single-agent fast path. Multi-domain requests are decomposed into at most three specialist missions, delegated through the existing agent tool loop, returned as typed handoffs, and synthesized by MAX into one answer.

## Surface

- Existing HQ assistant and command bar; no new top-level tab or sixth durable agent
- Existing `TeamOrchestrationStrip`, relabeled as the central-orchestrator plan
- New `delegate_specialist` tool, exposed only to MAX when cross-domain orchestration is detected
- Focused static/runtime acceptance: `npm run orchestrator:check`

## Roles and data flow

1. `resolveAssistantDispatch()` detects whether the request spans multiple specialist lanes.
2. Single-lane requests retain the existing direct specialist route.
3. Cross-domain requests route to MAX, which frames the mission and may delegate to EL, DUSTIN, HOPPER, or LUCAS.
4. Each delegated worker receives one bounded mission plus any context MAX explicitly supplies.
5. Each worker returns a typed handoff with status, summary, deliverable, proposed code, file references, evidence, notes, risks, verification, and next action.
6. MAX reads the handoffs, resolves conflicts and unsupported claims, and produces the only operator-facing synthesis.

## Safety and scope

- Maximum three delegated workers per runtime run.
- Workers are advisory and cannot call tools, write files, save memory, contact external services, or address the operator directly.
- Proposed code is labeled as a proposal; it is not proof that a file changed.
- Project mutation remains under the existing `propose_project_edit` / approval policy.
- Worker output is process-local tool output and is not persisted as memory automatically.
- All model execution continues through the existing `/api/ai` and internal AI wrappers.
- No upstream Squad binary, SQLite database, terminal launcher, daemon, or background process is installed.

## Source assimilation boundary

This tranche adapts the manager/worker/inspector roles, structured task lifecycle, capability-aware handoffs, and explicit completion summaries from `mco-org/squad` `v0.7.6`. Nexus keeps its own TypeScript runtime and existing five-agent taxonomy. Squad remains an architectural reference rather than a vendored runtime.

## Edge cases

- Invalid worker IDs are rejected before a provider call.
- Missing or oversized missions return a typed blocked handoff.
- Malformed model JSON is converted into a degraded handoff instead of breaking MAX's run.
- The per-run delegation cap returns an explicit blocker.
- Provider failure returns a failed handoff that MAX can disclose or work around.
- A worker may report insufficient context rather than inventing file or evidence claims.

## Acceptance

- Cross-domain dispatch selects MAX; single-lane dispatch remains unchanged.
- MAX receives `delegate_specialist` only for a detected orchestrated run.
- The tool route enforces the worker allowlist and three-worker run cap.
- Worker responses normalize to the documented handoff schema.
- The HQ orchestration strip shows MAX as central lead and the selected specialist missions.
- Focused orchestrator checks, source-parity validation, `npx tsc --noEmit`, lint, and full verify pass.

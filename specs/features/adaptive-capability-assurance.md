# Adaptive Capability Assurance

## Outcome

Nexus continuously improves from verified outcomes while every assistant
capability truthfully communicates what information it can provide, which
actions it can perform, its current readiness, and the most efficient safe path
forward. Improvement is evidence-backed and approval-gated; it is not
autonomous source modification or silent prompt mutation.

## Current gap

- The 13 assistant capabilities resolve through
  `lib/assistantCapabilityRegistry.ts`, but they do not share one versioned
  information/action contract.
- `AgentRunArtifact` already records verification, tool, continuity, and
  efficiency evidence, but not the resolved capability or a reusable outcome
  receipt.
- active HQ code reads and writes `/api/agent-learnings`, while `origin/main`
  has no route handler. Those failures are swallowed, so the visible learning
  loop can look empty instead of unavailable.
- the native capability audit measures workflow, memory, context, governance,
  and browser posture, but not per-capability verified outcomes.

## Product contract

### 1. Versioned capability truth

Every assistant capability has one explicit assurance contract containing:

- schema and capability-contract version;
- information products with source, freshness, retained-data, and unavailable
  behavior;
- actions with mode (`navigate`, `prepare`, `propose`, or `execute`), risk,
  approval, prerequisites, expected effect, verification, and recovery;
- the free/local-first selection posture and bounded efficiency targets;
- the exact default route and recovery route.

The contract inventory must exactly match the canonical assistant capability
registry. Missing, extra, unreachable, or unsafe action contracts fail a
repository gate.

### 2. Honest readiness

Runtime aggregation uses explicit states:

- `unverified`: contract exists but no qualifying execution evidence exists;
- `ready`: recent verified outcomes satisfy the contract;
- `degraded`: recent evidence includes failed verification or repeated failure;
- `retained`: current information is unavailable but previously verified
  evidence remains usable;
- `unavailable`: prerequisites or current evidence cannot support the claim;
- `approval_required`: the next useful action is valid but human-gated.

No count, default value, successful HTTP shell, or old result may masquerade as
current proof.

### 3. Privacy-safe outcome receipts

Every completed agent run may produce one bounded receipt containing only:

- capability, agent, route, provider posture, run status, and action mode;
- start/finish/duration, context size, tool count, risk tier, and verification
  result;
- bounded evidence labels and a fixed failure code.

Receipts never persist prompts, answers, tool arguments/output, secrets,
hidden reasoning, private archive content, or operator identifiers. The local
store lives under ignored `data/capability-assurance/` and rotates to a bounded
history.

### 4. Verified reinforcement

- verified success strengthens the capability's evidence score;
- failed or degraded outcomes can produce a deduplicated learning proposal;
- no proposal influences prompt context until the operator explicitly approves
  it and its evidence gate passes;
- rejected or stale proposals do not influence future runs;
- reinforcement decays with age and remains traceable to receipt IDs;
- the compatibility `/api/agent-learnings` lane returns only approved lessons
  by default and reports unavailable state honestly.

### 5. Efficient safe selection

For each capability, compute bounded execution evidence including verified
success rate, recent failure pressure, average duration, average context size,
local/free posture, and last proof. Recommend the lowest-cost valid action that
meets readiness and governance requirements. A high-risk or unavailable action
cannot outrank a safe ready action.

### 6. Shared operator surfaces

One reusable Capability Assurance panel appears in existing Nexus seams:

- COMMAND for operational readiness and recent failures;
- Skills for learning proposals and reinforced behavior;
- Field Manual/System for the complete capability contract and evidence view.

Each capability displays:

- readiness and last verified time;
- information products and their live/retained/unavailable semantics;
- actions, approval posture, prerequisites, verification, and recovery;
- verified run count, success rate, efficiency posture, and known weakness;
- the strongest safe next action;
- visible loading, unavailable, empty, retained, and retry states.

## Safety boundaries

- No autonomous source edits, self-granted permissions, automatic proposal
  approval, background provider call, or invisible action execution.
- No direct provider call; active inference continues through Nexus AI routes.
- No prompt/answer persistence or tracked live learning data.
- No phone/PWA, deployment, new top-level route, provider, dependency,
  telemetry service, or unrelated visual redesign.
- Existing correction memory remains human-owned and cannot be overwritten by
  aggregate reinforcement.

## Verification

- pure fixtures prove contract coverage, state transitions, evidence decay,
  deduplication, approval gating, readiness aggregation, and safe ranking;
- API fixtures prove validation, fixed local paths, bounded rotation,
  compatibility behavior, no-content persistence, and honest failures;
- static reachability proves both assurance routes and all mounted panels;
- UI fixtures prove loading, empty, unavailable, ready, degraded, retained,
  approval-required, retry, information, action, verification, and recovery
  content;
- `npm run capability:assurance:check` is part of canonical `npm run verify`;
- TypeScript, lint, formatting, publication safety, security boundaries,
  production build, and exact-scope verification pass.

## Benefits

- Operators can distinguish a declared feature from a recently proven one.
- The system learns from real verified outcomes without silently rewriting its
  own rules.
- Failures become reviewable improvements instead of disappearing into
  best-effort requests.
- Capability choice becomes faster and cheaper because reliable local paths
  outrank unnecessary provider or high-risk work.
- Future capabilities must arrive with truthful information, action,
  readiness, recovery, and verification contracts rather than UI-only claims.

## Completion proof

- `npm run capability:assurance:check` passes with 13 contracts, six readiness
  states, bounded privacy checks, two-failure proposal gating, approval rules,
  protected route coverage, and all three shared UI mounts.
- `npm run verify` passes for the exact implementation revision, including
  TypeScript, lint, formatting, publication, dependency, security, and
  infrastructure lanes.
- `npm run build` produces all 41 static pages and includes
  `/api/agent-learnings`, `/api/capability-assurance`, and `/api/recon/status`.
- `npm run performance:check` passes after the production build; the largest
  generated app chunk remains under the repository budget.
- Authenticated Edge QA proves the panel in COMMAND, Skills, and Field Manual,
  contract drill-down, a verified local receipt changing one capability to
  `ready`, and zero missing-route responses. Isolated connector calls continue
  to fail closed with their expected `403` responses.
- The temporary QA runtime and browser sessions are stopped, and the local
  evidence store plus browser artifacts remain ignored or removed rather than
  entering publication scope.

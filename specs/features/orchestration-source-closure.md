# Orchestration Source Closure

## Outcome

Close the feasible orchestration patterns reviewed from mco-org/squad, OpenAI
Symphony, and Ruflo without adding a second autonomous agent platform.

## Product behavior

1. MAX remains the only operator-facing manager.
2. MAX can route at most three bounded specialist missions in one request.
3. Specialists have no tools, browser, durable memory, or mutation authority.
4. Every specialist returns a parsed, bounded handoff with status, result,
   evidence, risks, verification, and next action.
5. Malformed and failed worker output degrades into an operator-visible handoff
   instead of escaping manager control.
6. The HQ orchestration strip shows the deterministic manager, worker, and
   review phases.
7. Nexus does not adopt durable worker leases, freeform cross-worker messaging,
   autonomous issue claiming, concurrent repository mutation, arbitrary agent
   DSLs, plugin daemons, or generic replay of mutating agent steps.

## Source corrections

- The current Symphony repository is an Apache-2.0 engineering preview for
  tracker-driven isolated Codex implementation runs, not the declarative
  YAML/JSON multi-agent framework described by the earlier matrix.
- Squad is treated as a CLI and SQLite task/message coordination source; its
  durable worker lifecycle is not implied by Nexus's request-scoped workers.
- Ruflo is treated as a broad swarm, plugin, MCP, hook, and daemon ecosystem;
  Nexus adapts only the useful visible orchestration-plan pattern.

## Verification

- `npm run orchestration-source:check`
- `npm run orchestrator:check`
- `npm run source:parity:check`
- `npm run type-check`
- focused zero-warning lint

## Benefits

- Existing orchestration behavior is credited with reachable proof.
- Stale source claims no longer overstate Symphony's design or license.
- Specialist concurrency stays bounded and non-mutating.
- Unsafe platform-scale worker features are closed with explicit reasons rather
  than left as indefinite implementation debt.

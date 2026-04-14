# Awesome Claude Code Assimilation — Batch 1

## Why this batch exists

The [`awesome-claude-code`](https://github.com/hesreallyhim/awesome-claude-code) repo is useful to Nexus as a pattern library, not as a dependency. The highest-signal ideas for this codebase are:

- usage monitors that make token/context waste visible
- slash-command ergonomics that make workflows legible and governable
- hook posture that shows what automation and writeback behavior is active

Nexus already has the beginnings of all three. This batch converges them into explicit local product surfaces instead of leaving them as hidden repo knowledge.

## Scope

This batch intentionally stays inside the existing Nexus architecture:

- no vendored third-party code
- no new external services
- no cloud dependency
- no public exposure of restricted memory
- no change to the current product boundary

## Implementation

### ACC1.a — publish the plan

- Record the assimilation rationale and keep the scope disciplined.
- Treat the upstream repo as inspiration for patterns, not a package to import.

### ACC1.b — upgrade the usage monitor

- Turn the existing runtime efficiency card into a local usage monitor.
- Keep the current metrics, but add actionable recommendations for:
  - oversized tool packs
  - duplicate reads
  - large live context without compaction
  - full-context runs that bypass the preferred agent-scoped baseline

### ACC1.c — expose workflow / hook governance

- Extend HQ workflow command definitions with governance metadata:
  - aliases
  - posture
  - risk
  - output layer
  - defensive-only flag
  - automation-ready status
  - hook notes
- Surface that metadata in COMMAND via a dedicated operator card.
- Show the current hook posture explicitly:
  - workflow writeback
  - scheduler writeback
  - reply memory bridge
  - visibility clamp
  - mission-template follow-up

### ACC1.d — verify and hand off

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`

## Expected improvements

- Operators can see not only the latest waste signals, but what to fix next.
- HQ slash workflows become easier to trust, audit, and extend.
- Hook-like behavior stops being tribal knowledge and becomes visible product posture.
- The project benefits from the strongest `awesome-claude-code` ideas without importing a second workflow framework into Nexus.

## Non-goals

- No direct import of community hooks, skills, or commands
- No replacement of Nexus-native workflows with external schemas
- No change to auth, billing, or provider routing in this batch

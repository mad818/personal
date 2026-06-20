# Feynman Autoresearch Loop

## Summary

A measured experiment loop that accepts operator-defined variant definitions,
scores each variant with a deterministic scorer (fixture in tests, operator-
provided metrics at runtime), appends a JSONL history entry under
`agent-workspace/feynman/autoresearch/`, keeps the best-scoring variant, and is
bounded to a maximum number of variants per run.

Adapted from `skills/autoresearch/SKILL.md` in the Feynman source.

## Invariants

- No paid APIs, no background cron, no external execution.
- No authentication beyond local session (BYOK rules apply to any AI scorer).
- All scoring is deterministic and reproducible for the same input in tests.
- Maximum variants per run: `FEYNMAN_AUTORESEARCH_LIMITS.maximumVariantsPerRun` (8).
- History is append-only JSONL; the store is never rewritten in full.
- Scores are clamped to [0, 100] before recording.
- Topic is required and bounded to 512 chars.
- Variant ids must be unique within a run; duplicates are rejected.

## Actions (feynman_autoresearch tool)

| action       | description                                                      |
|--------------|------------------------------------------------------------------|
| `run`        | Score the provided variants for a topic; append history; return receipt. |
| `history`    | Read the last N JSONL history entries for a topic.               |

## Storage

History is appended to:
`agent-workspace/feynman/autoresearch/<topic-slug>.jsonl`

Each line is a `LoopHistoryEntry` JSON object.

## Key exports (`lib/feynmanAutoresearchLoop.ts`)

- `FEYNMAN_AUTORESEARCH_LIMITS` — bounded constants
- `normalizeVariantDefinitions(raw)` — validates and clamps variant array
- `normalizeTopic(raw)` — validates topic string
- `fixtureScorer(variant, topic)` — deterministic SHA-256 scorer for tests
- `formatAutoresearchReceipt(result)` — bounded evidence receipt
- `runAutoresearchLoop(topic, variants, workspace, deps)` — main loop

## Guardrails

- No authentication, paid APIs, or external execution are used.
- Workspace is always resolved from the configured `AGENT_WORKSPACE` path.
- The tool is registered as `"mutate"` capability because it appends local files.

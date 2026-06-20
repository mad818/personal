# Feynman Research Watch

## Summary

Operator-approved recurring research watches: create, list, enable, and disable
watches stored in `agent-workspace/feynman/watches.json`. A `run_check` action
compares a sanitized snapshot hash for a watch topic to detect material changes.

No background cron. Checks are explicit operator actions only.

Adapted from `skills/watch/SKILL.md` in the Feynman source.

## Invariants

- No paid APIs, no background cron, no authentication beyond local session.
- No authentication, paid APIs, or scheduled execution are used.
- Watch store is a single `watches.json` file, capped at 50 watches.
- Snapshots are sanitized (whitespace-normalised, truncated) before hashing.
- Hashes are SHA-256 truncated to 16 hex chars (collision-safe for this use).
- Only enabled watches can be checked; disabled watches are skipped.
- `run_check` records the new hash regardless of change detection.

## Actions (feynman_watch tool)

| action        | description                                                         |
|---------------|---------------------------------------------------------------------|
| `create`      | Create a new approved watch for a topic (starts enabled).           |
| `list`        | List all watches with status, last check, and last change dates.    |
| `enable`      | Enable a disabled watch.                                            |
| `disable`     | Disable an enabled watch.                                           |
| `run_check`   | Compare current sanitized snapshot hash to baseline; record result. |

## Storage

`agent-workspace/feynman/watches.json` — `ResearchWatchStore` schema:

```json
{
  "schemaVersion": 1,
  "watches": [ ...ResearchWatch ]
}
```

## Key exports (`lib/feynmanResearchWatch.ts`)

- `FEYNMAN_WATCH_LIMITS` — bounded constants
- `normalizeWatchTopic(raw)` — validates topic string
- `normalizeWatchLabel(raw)` — validates label string
- `normalizeWatchId(raw)` — validates id format
- `sanitizeSnapshot(raw)` — whitespace-normalise + truncate before hashing
- `hashSnapshot(sanitized)` — SHA-256 truncated to 16 hex chars
- `buildFixtureSnapshot(topic)` — stable no-network snapshot for tests
- `createResearchWatch(id, label, topic, workspace, deps)` — create action
- `listResearchWatches(workspace, deps)` — list action
- `setResearchWatchStatus(id, status, workspace, deps)` — enable/disable action
- `runResearchWatchCheck(id, workspace, deps)` — run_check action
- `formatWatchList(watches)` — bounded formatted list
- `formatWatchCheckResult(result)` — bounded formatted check receipt

## Guardrails

- No authentication, paid APIs, or external execution are used.
- Workspace is always resolved from the configured `AGENT_WORKSPACE` path.
- The tool is registered as `"mutate"` capability because it writes local files.

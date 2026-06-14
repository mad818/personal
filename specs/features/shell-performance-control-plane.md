# Shell Performance Control Plane

## Goal

Improve authenticated-route startup, background efficiency, and local development speed without removing Nexus capabilities or changing the approved interface.

## Runtime contract

- Route-owned data loaders start immediately on the routes that use them.
- Non-route-owned background intelligence loaders remain available and start after browser idle or the operator's first interaction.
- Memory durability and cron automation remain available and start through the same bounded idle activation lane.
- Duplicate mounts of the same polling capability share one timer, one listener set, and one in-flight run.
- Polling pauses while the document is hidden or internet polling is intentionally paused.
- Route transitions do not require a full page reload.

## Workflow contract

- Normal `npm run dev` preserves `.next` cache state.
- `npm run dev:fresh` explicitly clears `.next` when a clean runtime is required.
- Full `npm run verify` remains the required completion and pre-push gate.
- A verified-build command may skip duplicate Next build checks only after the full verification gate has passed.

## Performance budgets

- Root shell code must not statically import heavy background loaders or the cron scheduler.
- Generated JavaScript chunks and route chunks must remain under explicit high-water budgets.
- Oversized public runtime assets must be reported and bounded without deleting source assets.

## Acceptance

- Focused runtime checks prove route activation and polling deduplication behavior.
- Static performance checks prove root-shell boundaries and workflow commands.
- `npm run type-check`, `npm run verify`, and `npm run build` pass.

# Feynman Recurring Research Watch

## Outcome

Turn an explicitly approved Feynman `watch` scheduler draft into a real, bounded public-arXiv material-change check that stores a local baseline and never calls ChatGPT, an AI provider, or a model.

## Surface

- Existing human-gated scheduler composer creates and enables the job only after the operator clicks Add.
- Existing client-side scheduler runs the job only while Nexus is open.
- Protected connector action: `POST /api/feynman/watch/run`.
- Protected local review: `GET /api/feynman/watch` in the VAULT Papers lane.
- Ignored local storage: `.nexus/feynman-research-watches.json`.

## Data flow

1. The scheduler extracts the bounded topic from the canonical Feynman watch prompt.
2. Nexus builds one fixed-origin arXiv API query, sorted by newest submission, with at most 12 Atom entries.
3. The first successful run establishes a baseline. Later runs compare canonical paper IDs and their arXiv `updated` timestamps.
4. A new ID or a newer `updated` timestamp is material. Rank movement or an item leaving the bounded result window is not called a material change.
5. Nexus saves a bounded current snapshot and history receipt locally, then exposes the result for operator review in VAULT.

## Limits and protocol

- Topic: 3–200 normalized characters; no arbitrary URL or raw query syntax.
- Watch ID: fixed safe identifier characters, 1–120 characters.
- Results: at most 12 entries; title, authors, categories, summary excerpt, canonical source URL, published timestamp, and updated timestamp only.
- Network: fixed `https://export.arxiv.org/api/query`, GET only, redirects rejected, 12-second timeout, Atom response capped at 512 KiB.
- Courtesy pacing: distinct public arXiv requests are serialized with at least a three-second delay; daily caching avoids repeating the same topic request.
- Courtesy cache: the same topic is not fetched more than once in 24 hours. A cached result is a successful no-network run, including for duplicate scheduler ticks.
- Persistence: at most 32 watches and 40 receipts per watch. Corrupt local storage fails closed without overwrite.
- Atom input is untrusted evidence. DTD/entity declarations and malformed or oversized feeds are rejected.

## Privacy and usage boundaries

- No `callAI()`, `callNonInteractiveAI()`, provider fallback, ChatGPT request, Ollama request, embedding, paid service, paper download, repository read, code execution, install, external write, notification webhook, or public route.
- The only external request is the explicit, connector-governed public arXiv metadata check.
- Local GET review remains `local_only`; the run action is `connector_opt_in`.
- Topic and public result metadata stay in the ignored local store and do not enter tracked files.
- No RPG path or feature change.

## Scheduler and review truth

- Creating/enabling recurrence remains an explicit human action in the existing scheduler composer.
- The scheduler special-cases `templateId: "watch"` before the generic AI path.
- The run summary states baseline, cached, new, or updated counts and points the operator to VAULT Papers.
- The feature does not claim OS-level background service behavior: checks run only while Nexus and its client scheduler are active.
- A network or parse failure marks the scheduled run as failed and preserves the prior baseline.

## UX states

- No watches: explain that `/watch <topic>` in HQ can stage a human-gated schedule.
- Baseline: identify the first successful survey and result count.
- Cached: show last check time and that the daily courtesy cache avoided a request.
- Changed: show bounded new and updated papers with canonical arXiv links.
- Unchanged: show the last successful check without fabricating a change.
- Failed: keep the last good baseline and show a retryable scheduler/API error.

## Verification

- Runtime fixtures cover topic and ID bounds, fixed query construction, safe Atom parsing, baseline creation, new/updated comparison, daily cache behavior, bounded retention, corrupt-store rejection, and failed-fetch preservation.
- Static validation proves protected route policy, no-AI scheduler branching, VAULT review surface, ignored storage, package wiring, source-parity proof, and canonical verification wiring.
- Required gates: focused feature check, complete Feynman chain, source parity, security boundaries, TypeScript, lint, format, canonical `npm run verify`, production build, handoff freshness, `git diff --check`, and zero RPG changed paths.

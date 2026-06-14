# Vault and Command Bundle Isolation

## Goal

Reduce initial JavaScript parsing and execution on Vault while preserving every archive, graph, publishing, and export capability, and lock the already-isolated Command route against bundle regressions.

## Design

- Keep Vault Archive, document intake, saved clips, memory ask, and compiled-page continuity immediate.
- Extract the hidden Relations and Publish chambers into route-local components loaded with `next/dynamic`.
- Keep Vault graph construction, filtering, selection, URL synchronization, and store synchronization in the route page so behavior remains unchanged.
- Preserve Command's existing dynamic module boundaries and add a production route-owned chunk budget.

## Contract

- Existing Vault and Command routes, query parameters, focus links, persisted filters, graph behavior, and actions remain unchanged.
- Archive remains the default Vault chamber.
- Relations and Publish load when selected or deep-linked.
- Existing containers remain the loading boundaries; no new visible loading UI is added.
- No provider, state contract, dependency, security posture, public route, HQ, or RPG code changes.

## Acceptance

- The source performance gate fails until Vault Relations and Publish use dynamic route boundaries.
- The source performance gate rejects regressions in Command's existing deferred modules.
- Focused browser acceptance proves Vault Relations, Vault Publish, and collapsed Command diagnostics remain available when local-browser policy permits it; otherwise production artifact proof must confirm the hidden chamber bodies are outside Vault's initial route manifest.
- Fresh production output shows a smaller Vault route-owned chunk and locks achieved Vault and Command budgets.
- Fast verification, full verification, production build, handoff checks, and diff checks pass.

## Result

- Vault route-owned production chunk: 40.9 KB to 31.1 KB, a 9.8 KB reduction of about 24%.
- Vault first-load JavaScript is now 324 KB.
- Command route-owned production chunk remains 29.5 KB with 332 KB first-load JavaScript.
- Enforced route-owned budgets: Vault 45 KB and Command 45 KB.
- Production artifact inspection confirms the Relations and Publish chamber bodies are outside Vault's initial route manifest.
- The focused browser test is committed, but live browser acceptance was blocked because the in-app browser security policy refused the local `127.0.0.1:3100` target.

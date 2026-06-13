# Cyber and Intel Bundle Isolation

## Goal

Reduce initial JavaScript parsing and execution on Cyber and Intel without changing their approved layouts, navigation, data loading, security posture, or available capabilities.

## Design

- Keep Cyber Triage immediate, including governed baseline, threat-intelligence signals, AI exposure review, and caseflow.
- Move Cyber Matrix, Review, Evidence, and Drone chamber render trees into one route-local deferred chamber boundary.
- Keep Intel News immediate.
- Move Intel World, Markets, and Sweeps render trees into one route-local deferred segment boundary.
- Keep route state, URL synchronization, focus handling, data loaders, store reads, and route-level specs in the page files.
- Add production route-owned chunk budgets for Cyber, Intel, Alpha, and Recon. Alpha and Recon are already lean enough to budget without adding extraction complexity.

## Contract

- Existing routes, query parameters, focus links, persisted views, loaders, and actions remain unchanged.
- Cyber Triage and Intel News remain the default immediate surfaces.
- Hidden chambers and segments load when selected or deep-linked.
- Existing containers remain the loading boundaries; no new visible loading UI is added.
- No provider, dependency, security, state-contract, public-route, HQ, or RPG changes.

## Acceptance

- The source performance gate fails until Cyber and Intel use the new deferred route boundaries.
- Focused browser coverage exercises representative Cyber and Intel deep links.
- Fresh production output shows smaller Cyber and Intel route-owned chunks.
- Cyber, Intel, Alpha, and Recon receive conservative production budgets.
- Fast verification, full verification, production build, handoff checks, and diff checks pass.

## Result

- Cyber's route-owned production chunk fell from `27.5 KB` to `25.5 KB` (`-2.0 KB`, about `7%`); first-load JS remains `327 KB`.
- Intel's route-owned production chunk fell from `17.3 KB` to `11.5 KB` (`-5.8 KB`, about `34%`); first-load JS fell from `321 KB` to `319 KB`.
- Alpha remains lean at `15.2 KB` route-owned and `319 KB` first-load JS; Recon remains lean at `10.0 KB` route-owned and `309 KB` first-load JS.
- Conservative route-owned production budgets are locked at Cyber `40 KB`, Intel `25 KB`, Alpha `25 KB`, and Recon `20 KB`.
- Production artifact inspection confirmed Cyber Review and Intel World/Sweeps bodies are outside their initial route manifests.
- Focused deep-link coverage was added. Live in-app browser acceptance was attempted, but local browser policy refused `http://127.0.0.1:3100`; no alternate browser surface was used.

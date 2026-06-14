# Route Bundle Isolation

## Goal

Reduce feature-specific first-load JavaScript on tabbed workbenches without removing capabilities or changing the approved interface.

## Scope

- Skills: dynamically load Forge, Blacksite, Brain, and Library chamber panels.
- Security: dynamically load doctrine, AI-surface, and physical-operations panels.
- Resources: dynamically load the active console instead of statically bundling every console.

## Contract

- Existing route URLs, query parameters, persisted view state, and focus links remain unchanged.
- The active chamber still opens automatically.
- Inactive chambers do not enter the route's initial app chunk.
- No panel, action, source, security boundary, or local-first behavior is removed.
- Existing container layout remains the loading boundary; no new visible loading UI is introduced.

## Acceptance

- The performance source gate rejects static imports of chamber-only panels.
- Fresh production build output shows smaller Skills, Security, and Resources route chunks.
- Focused route E2E, full verification, production build, and production budgets pass.

## Result

- Skills first-load JS: about 504 KB to 362 KB.
- Security first-load JS: about 432 KB to 302 KB.
- Resources first-load JS: about 434 KB to 368 KB.
- Route-owned production chunks: Skills 32.0 KB, Security 31.0 KB, Resources 24.2 KB.
- Enforced route-owned budgets: Skills 50 KB, Security 50 KB, Resources 45 KB.

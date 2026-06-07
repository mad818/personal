# Local Acceleration Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the protected Nexus integration for the complete useful TurboVec and TurboQuant capability surfaces.

**Architecture:** A server-only TypeScript client owns endpoint validation, bounded requests, health, controls, and graceful degradation. A loopback-only Python companion bridge exposes the contract without vendoring upstream code. Protected Next.js routes call the bridge, VAULT writes/search use TurboVec opportunistically, and the existing AI proxy explicitly routes to a separately installed TurboQuant vLLM runtime.

**Tech Stack:** Next.js App Router, TypeScript, Node fetch, local HTTP sidecars, Ollama embeddings, TurboVec Rust runtime, TurboQuant vLLM runtime.

---

### Task 1: Lock parity and validation contracts

**Files:**
- Create: `docs/ideas/source-parity/turbovec.json`
- Create: `docs/ideas/source-parity/turboquant.json`
- Create: `scripts/validate-local-acceleration-plane.mjs`
- Modify: `package.json`

- [x] Write the validator before implementation and confirm it fails on missing runtime files.
- [x] Inventory every useful source capability with implemented, adapted,
  excluded, or pending disposition.
- [x] Wire `local:acceleration:check` into `npm run verify`.

### Task 2: Implement the server-only acceleration client

**Files:**
- Create: `lib/localAcceleration.ts`
- Create: `scripts/check-local-acceleration-runtime.mjs`

- [x] Write fixture tests for endpoint policy, config modes, TurboVec controls,
  TurboQuant controls, bounded payloads, and degraded fallback.
- [x] Run the fixture test and confirm it fails while the client is missing.
- [x] Implement the smallest server-only client that passes the fixture.
- [x] Re-run the fixture test.

### Task 3: Add protected API and route policy

**Files:**
- Create: `app/api/local-acceleration/route.ts`
- Modify: `lib/security/routePolicy.ts`

- [x] Add protected status and bounded action operations.
- [x] Classify the route as `local_only`.
- [x] Ensure errors are sanitized and service failures return degraded posture.

### Task 4: Integrate TurboVec with VAULT

**Files:**
- Modify: `lib/memoryPagesStore.ts`
- Modify: `app/api/memory/pages/route.ts`

- [x] Opportunistically index new non-restricted compiled pages.
- [x] Add protected semantic search with allowlist/filter metadata.
- [x] Preserve existing keyword/list behavior when the service is unavailable.

### Task 5: Integrate TurboQuant with the AI proxy

**Files:**
- Modify: `app/api/ai/route.ts`
- Modify: `app/api/health/providers/route.ts`
- Modify: `.env.example`

- [x] Add explicit free/local TurboQuant provider configuration.
- [x] Permit it in isolated mode only when explicitly enabled.
- [x] Route through existing privacy, token, rate-limit, and fallback controls.
- [x] Surface boolean configuration and model posture without secrets.

### Task 6: Document operations and verify

**Files:**
- Create: `docs/deployment/local-acceleration-plane.md`
- Create: `scripts/local-acceleration-service.py`
- Modify: `docs/ideas/assimilated-ecosystem.md`
- Modify: `docs/ideas/external-links-mapping.md`
- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [x] Implement the loopback companion bridge with private persistence, local
  embeddings, sanitized receipts, and double-gated TurboQuant commands.
- [x] Document install/start/configuration and MacBook/iPad/Tailscale topology.
- [x] Run focused runtime and static validators.
- [x] Run source parity, type-check, full verify, and production build.
- [x] Record honest completion status and remaining external-runtime acceptance.

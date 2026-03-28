# Nexus Prime — Comprehensive improvement roadmap (2026)

**Status:** living document — prioritise with `tasks/todo.md` before large builds.  
**Related:** [expansion-plan.md](../expansion-plan.md) (data feeds & features), [architecture.md](../architecture.md), [CLAUDE.md](../../CLAUDE.md).

---

## 1. Executive summary

Nexus Prime is a **dual-surface** product: the historical `nexus-final.html` artefact and the **Next.js 14** app (active). The app already combines **multi-provider AI** (`/api/ai`), **Zustand** state, **tabbed intel/markets/cyber**, **agent tooling** (`lib/agent.ts`), and **strict server-side secrets**. This roadmap aligns **security**, **hybrid AI** (cloud + local), **information density**, and **operator UX** with minimal scope creep.

**Recent concrete additions (this cycle):**

- **MiniMax** as a first-class provider: [OpenAI-compatible API](https://platform.minimax.io/docs/api-reference/text-openai-api) at `https://api.minimax.io/v1`, env `MINIMAX_API_KEY`, optional user default via Settings (`aiProvider: minimax`), auto/research fallback chains, and an **OpenAI-style tool loop** for the agent (`runMiniMaxAgent`).
- **Unsloth** documented in the in-app **Field manual** ([GitHub: unslothai/unsloth](https://github.com/unslothai/unsloth)) as a **sibling** local training/inference stack — not embedded in the Next bundle.
- **CSP** already hardens the app; NASA FIRMS was added to `connect-src` for the free live map.

---

## 2. Current architecture snapshot

| Layer | Role |
|--------|------|
| `app/api/ai/route.ts` | Provider registry + fallback chains; keys only in `process.env`. |
| `lib/ai.ts` | Client `callAI` / `streamAI` → `/api/ai` for cloud providers. |
| `lib/agent.ts` | Tool-use loops: Anthropic messages API vs OpenAI-compat (Ollama, MiniMax). |
| `store/useStore.ts` | Persisted UI settings; sensitive keys mirrored to `.env.local` via `/api/settings`. |
| `next.config.js` | Security headers + CSP (`connect-src` allowlist for public data APIs). |

**Design invariant:** the browser never receives raw cloud API keys for Anthropic / OpenAI / MiniMax; local keys (Ollama, OpenRouter, etc.) use user-supplied endpoint + optional bearer token.

---

## 3. Strategic pillars

### 3.1 Security & compliance

- **Secret hygiene:** keep `SENSITIVE_KEYS` in `/api/settings` in sync with every new provider; surface boolean “configured” in `/api/status` (done for MiniMax).
- **CSP:** when adding new **client-side** fetch hosts, extend `connect-src` (pattern established with USGS, OpenSky, NASA FIRMS).
- **Agent tool risk:** maintain `NEXUS_TOOL_POLICY_MODE`, proposed-edit flow, and runtime eval hooks; extend **audit log** exports if you add multi-user or shared deploys.
- **Dependency & supply chain:** periodic `npm audit`, pin major AI SDK upgrades, document restart requirement after `.env.local` writes.

### 3.2 Hybrid AI (local + cloud)

- **Unsloth:** per [unsloth README](https://github.com/unslothai/unsloth), Studio runs as a **local process** (`unsloth studio`); Core installs via `uv`/`pip`. **Integration pattern for Nexus:** expose an OpenAI-compatible HTTP surface (or bridge) and set **Local LLM Endpoint** in Settings — no need to vendor Python into the Next repo.
- **Ollama:** remains the default local path; task routing in `lib/aiModelRouting.ts` should stay the single source of truth.
- **MiniMax:** use for **cost/latency diversification** and models listed in [MiniMax OpenAI API docs](https://platform.minimax.io/docs/api-reference/text-openai-api); default chat/agent model constants live in `lib/aiModelRouting.ts` (`MINIMAX_DEFAULT_*`).

### 3.3 Information & intel

- Execute high-value items from [expansion-plan.md](../expansion-plan.md): feed hub, risk board, timelines, maps — each scoped as its own spec under `specs/features/` per project rules.
- Preserve **free-tier** guarantees for maps and public APIs (`lib/opsMapFreeTier.ts` pattern).

### 3.4 UX & performance

- **Nav / IA:** Field manual (`/resources`) for curated links; avoid tab sprawl — prefer collapsible sections inside Intel/Cyber.
- **Performance:** dynamic-import heavy panels (already used for maps); consider **React Server Components** only where data is static/read-only.
- **Accessibility:** continue `aria-label` on critical controls; keyboard trap audit on `SettingsDrawer` and command bar.

### 3.5 Observability

- Extend `/api/status` “readiness” JSON with **version/git sha** (build-time env) and **last successful provider** sample (optional, rate-limited).
- Centralise client error toasts for AI failures (user-visible, no secret leakage).

---

## 4. Phased delivery plan

### Phase 0 — Foundation (ongoing)

- [x] Multi-provider `/api/ai` with whitelist and token cap.
- [x] MiniMax provider + agent tool path + Settings + status flag.
- [x] Field manual + Unsloth card.
- [ ] Document MiniMax model overrides (optional env `NEXUS_MINIMAX_MODEL`) if you need non-default weights.

### Phase 1 — Intel expansion (2–4 weeks, pick 2–3 items)

- Implement **1.1 Multi-Domain Feed Hub** or **1.4 Live World Event Map** from expansion-plan (highest visual + signal ROI).
- Add **source health** badges (last fetch, error count) per feed.

### Phase 2 — Agent quality (2–3 weeks)

- **Unified OpenAI-compat agent runner** to deduplicate `runOllamaAgent` and `runMiniMaxAgent` (shared loop, inject `requestFn`).
- **Structured tool validation** (zod or lightweight JSON schema) before `executeTool`.
- Optional: **OpenAI**-native agent path when `aiProvider === 'openai'` and server key present (today the UI may still route to Anthropic tool format in some paths — verify product intent).

### Phase 3 — Security hardening (1–2 weeks)

- Optional `public/.well-known/security.txt` with **your** contact (RFC 9116) for public deploys.
- Rate limit `/api/ai` per IP or per `NEXUS_TOKEN` when exposed beyond localhost.
- Review **HSTS** impact on local dev (some teams gate `Strict-Transport-Security` on `NODE_ENV === 'production'` only).

### Phase 4 — Local ML operator experience (1 week docs + glue)

- Short **runbook** in `docs/deployment/` : “Ollama + Unsloth + Nexus on one machine” — ports, GPU, firewall.
- Optional **docker-compose** example (not mandatory; keep optional to avoid maintenance burden).

---

## 5. Risk register (abbreviated)

| Risk | Mitigation |
|------|------------|
| MiniMax API or model renames | Constants in one module; monitor [official docs](https://platform.minimax.io/docs/api-reference/text-openai-api). |
| Tool-calling drift across providers | Shared `toOAITools` + single OpenAI-compat loop (Phase 2). |
| CSP breaks new client fetch | Integration checklist: add host to `connect-src`, run smoke test in browser console. |
| Secret leakage via logs | Never log request bodies in `/api/ai`; strip keys in client error messages. |

---

## 6. Definition of done (for any milestone)

1. `npm run verify` (tsc, lint, path collisions) passes.  
2. No new client-exposed secrets.  
3. Settings / status reflect new env keys.  
4. User-facing copy states **free vs paid** data where relevant.  
5. Update `tasks/lessons.md` if you hit a correction loop (per `CLAUDE.md`).

---

## 7. References

- [MiniMax — Compatible OpenAI API](https://platform.minimax.io/docs/api-reference/text-openai-api)  
- [Unsloth — GitHub](https://github.com/unslothai/unsloth)  
- [Nexus expansion-plan.md](../expansion-plan.md)  
- [Nexus architecture.md](../architecture.md)  

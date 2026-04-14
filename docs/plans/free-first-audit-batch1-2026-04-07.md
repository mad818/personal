## Free-First Audit Batch 1 — provider normalization and stale gate removal

### Why this batch is critical
- The persisted default AI provider still points at a paid lane (`openai`), which undermines the project's free-first posture.
- Settings currently accept arbitrary provider text, so invalid or stale paid values can drift into runtime state without correction.
- Several panels still gate useful AI or file actions on the legacy `settings.apiKey` field, even though the product now supports local Ollama and server-side BYOK routes.

### Goals
1. Make the default AI lane local-first again.
2. Normalize persisted provider values so invalid or stale settings auto-correct to a safe supported lane.
3. Replace the freeform provider field with constrained provider choices that keep advanced paid lanes hidden unless explicitly unlocked.
4. Remove stale `settings.apiKey` checks from affected UI flows so local/server-backed AI keeps working.

### Implementation
1. Add a canonical provider-preference helper.
   - Define the supported provider ids.
   - Mark which providers are advanced/paid-compatible.
   - Normalize unknown values back to `ollama`.
2. Apply that helper in persisted settings.
   - Change the default `aiProvider` to `ollama`.
   - Normalize `aiProvider` inside store updates and persisted-state migration.
   - Normalize runtime reads in `lib/ai.ts`.
3. Constrain the Settings UI.
   - Replace the freeform AI provider text field with a select.
   - Show primary free-first lanes by default.
   - Only show advanced paid-compatible lanes when `NEXUS_ALLOW_PAID_APIS=true`.
4. Remove stale `apiKey`-only gates.
   - `HomeChat` draft finalization should not require an AI key at all.
   - `JobRiskAnalyzer`, `BusinessBuilder`, and `FocusPanel` should rely on `callAI()` error handling instead of the legacy browser-side API key field.
   - Update user-facing copy to mention local/free-first posture rather than only paid API keys.

### Verification
- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Confirm the dev server is listening on `127.0.0.1:3000`
- Confirm live reachability for `/` and `/hq`

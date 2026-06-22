# Overall Quality — Wave 18

Status: complete  
Date: 2026-06-20

**Goal:** Close the three largest agent-platform gaps after Wave 17 — live MCP execution, Forecast Lab eval spike, and binary document intake — without adding paid compute or operator complexity.

## Pillars

| Pillar | Wave 18 slice | Why |
|--------|---------------|-----|
| Agent platform | Bounded live MCP gateway POST | POST was 501; now proxies to operator-configured mcporter with allowlist + step-up |
| Forecast Lab | TimesFM eval spike (`lib/timesFmForecast.ts`) | Advisory zero-shot time-series forecasting; no paid compute; TIMESFM_ENDPOINT BYOK |
| VAULT intake | MarkItDown binary subprocess (`lib/markitdownSubprocess.ts`) | Optional local `markitdown` CLI converts PDF/DOCX/PPTX; graceful fallback |

## Implementation

### MCP Live Gateway POST (`app/api/mcp/gateway/route.ts`)
- Parses `{ tool, args?, stepUpToken? }` from request body
- Calls `executeMcpGatewayTool` in `lib/mcpGatewayAdapter.ts`
- Returns 501 when gateway disabled, 503 when URL not configured, 403 for allowlist/step-up failure
- GET health endpoint unchanged
- Operator: `NEXUS_MCP_GATEWAY_ENABLED=1`, `NEXUS_MCP_GATEWAY_URL`, optionally `NEXUS_MCP_STEP_UP_TOKEN`, `NEXUS_MCP_ALLOWED_TOOLS`

### TimesFM Forecast Lab (`lib/timesFmForecast.ts`)
- `evaluateTimesFmReadiness()` — descriptor for INTEL capabilities block
- `callTimesFmForecast({ context, horizon })` — proxies to `TIMESFM_ENDPOINT/predict`
- `buildTimesFmCapabilityBlock()` — embed in live context
- Advisory-only: bounded to operator-local endpoint; no billing

### MarkItDown Subprocess (`lib/markitdownSubprocess.ts`)
- `resolveMarkItDownBin()` — checks `MARKITDOWN_BIN` env then PATH probe
- `convertBinaryWithMarkItDown(filePath)` — spawns CLI, 30s timeout, 50KB output cap
- `buildMarkItDownIntakeNote()` — status line for VAULT intake responses
- Server-only (`import "server-only"`); graceful fallback on any failure

## Gate

`npm run nexus:complete:check` → chains `assimilation:wave18:check` → `wave17:check` → all prior waves.

## Next (Wave 19+ — deferred)

- git commit/push, NEXUS_RELEASE_BASE_URL, signing thumbprint, phone proof
- Prompt-recipe eval CI hook
- Repo assimilation P1.3 polish

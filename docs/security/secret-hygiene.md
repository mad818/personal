# Secret Hygiene

Nexus treats API keys, bearer tokens, companion endpoints, and internal auth tokens as server-side secrets. They belong in local runtime environment files such as `.env.local`, never in tracked source, docs, SVGs, screenshots, or generated demo artifacts.

## Canonical Placeholder Forms

Use these placeholder styles in tracked files:

- `NEXUS_TOKEN=<set-in-local-env-only>`
- `ANTHROPIC_API_KEY=replace-with-provider-key`
- `OPENAI_API_KEY=replace-with-provider-key`
- `LIGHTPANDA_URL=<set-in-local-env-only>`
- `docker run --env-file .env.local ...`

Do not use real-looking examples such as `sk-ant-...`, `ghp_...`, `AKIA...`, or fake “random” token strings in tracked docs. They normalize unsafe habits and trigger the repo scanner by design.

## Secret Inventory

| Scope | Keys | Owner | Used by | Rotate when |
| --- | --- | --- | --- | --- |
| Route auth | `NEXUS_TOKEN`, `OPENCLAW_TOKEN` | operator | `/api/*` auth gate, local shell access | any suspected copy/paste leak, lost machine, or auth anomaly |
| AI providers | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_AI_KEY`, `OPENROUTER_API_KEY`, `MINIMAX_API_KEY` | operator | `lib/ai.ts` provider boundary | provider dashboard shows unusual usage, model drift, or public exposure |
| Browser / companion | `LIGHTPANDA_URL`, `LIGHTPANDA_WS_ENDPOINT`, `NEXUS_BROWSER_OPS_ENDPOINT` | operator | guarded recon/browser readiness | companion endpoint becomes public, loopback policy changes, or browser ops are moved |
| Intel / data feeds | `BRAVE_SEARCH_KEY`, `COINGECKO_KEY`, `FINNHUB_KEY`, `GUARDIAN_KEY`, `NVD_KEY`, `OTX_KEY`, `FRED_KEY`, `AISSTREAM_KEY`, `FIRMS_MAP_KEY`, `FIRECRAWL_KEY`, `HIBP_API_KEY`, `VT_API_KEY`, `SHODAN_API_KEY` | operator | `app/api/*` feed adapters | provider quota anomalies, team offboarding, or any tracked exposure |
| Free-tier alternates | `CEREBRAS_API_KEY`, `SAMBANOVA_API_KEY`, `NVIDIA_API_KEY`, `HYPERBOLIC_API_KEY`, `TOGETHER_API_KEY`, `SILICONFLOW_API_KEY`, `ZAI_API_KEY`, `IFLOW_API_KEY`, `DEEPINFRA_API_KEY`, `FIREWORKS_API_KEY`, `SCALEWAY_API_KEY`, `DASHSCOPE_API_KEY`, `HUGGINGFACE_API_KEY`, `CODESTRAL_API_KEY`, `PERPLEXITY_API_KEY`, `CLOUDFLARE_API_TOKEN` | operator | optional AI/fetch lanes | provider dashboard shows misuse or the key appears outside `.env.local` |

## Local and CI Guardrails

- `npm run security-scan` checks the tracked repo for secret-like content and blocks on tracked secret findings; broader security-pattern findings remain advisory until they are intentionally promoted into a blocking tranche.
- `npm run security-scan:staged` runs in `.husky/pre-commit` so unsafe staged snippets fail fast.
- `.husky/pre-push` runs `npm run security-scan` in addition to handoff, type-check, and lint.
- `.github/workflows/secret-scan.yml` blocks PRs and protected pushes on tracked-file secret findings.

## History Audit and Remediation

Run:

```bash
npm run security-scan:history
```

This audits git history for likely secret-bearing commits. Treat results with this decision tree:

1. If the finding is placeholder-only and never carried a live credential:
   - sanitize the current working tree
   - keep the history note for awareness

2. If a live credential appeared only in local/unpublished history:
   - rotate the credential immediately
   - reset or rewrite the unpublished branch before sharing it

3. If a live credential reached a pushed branch, tag, release artifact, fork, screenshot, or public cache:
   - rotate the credential immediately
   - purge or rewrite history where feasible
   - invalidate downstream sessions or tokens
   - notify affected operators or downstream consumers
   - capture the incident and rotation outcome in the deployment/security runbook

## Route and UI Rules

- Settings, diagnostics, and readiness routes may expose only booleans, counts, or posture labels. Never return raw secret values or partial values.
- Client UI may explain where a secret belongs, but it must never instruct users to commit secrets or to store them in tracked files.
- Browser companions stay behind protected server routes and explicit approval posture. Companion endpoints are readiness metadata, not client-side command channels.

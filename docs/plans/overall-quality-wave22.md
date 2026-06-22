# Overall quality — Wave 22

Balanced tranche: fix broken wiring, improve HQ session memory, and reopen **Idea link intake** for the next GitHub/X batch.

## Scope

| Lane | Change |
|------|--------|
| **Reliability** | `boostRagConfidenceWithEntities` in `lib/ragRouter.ts`; optional `registryId` on `CacheConfig` |
| **HQ memory** | `passiveMemoryTrail` in store + OfficeCommandCenter prompt injection + post-run persistence |
| **Idea link intake** | `pending-links.json`, `/api/ideas/intake`, RECON panel, `npm run ideas:register`, operator guide |

## Idea link intake

Operators can paste links in **RECON → Repo intel → Idea link intake** or run:

```bash
npm run ideas:register -- <url> [url...]
```

Each link gets a pending queue row and a stub `docs/ideas/source-parity/<id>.json` matrix (`foundation`).

## Gates

```bash
npm run passive-session-memory:check
npm run ideas:link-intake:check
npm run overall-quality:wave22:check
```

## Out of scope

- No new top-level tab
- No upstream vendoring
- No OpenClaw / paid API additions

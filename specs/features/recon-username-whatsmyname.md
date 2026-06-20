# RECON Username Enumeration — WhatsMyName Assimilation

## Summary

Server-side username enumeration across a curated manifest of ~25–30 high-signal
platforms. Adapted from the WhatsMyName open-source project patterns.

Clients call `POST /api/recon/username-enum` with a username. The server fans out
HEAD/GET requests across the pinned site manifest with bounded concurrency (max 5
parallel) and per-site timeouts. Results merge into the existing Username OSINT
panel in `ReconLookup`.

No Python vendoring. No external Blackbird AI calls. No unbounded scans.

## Invariants

- Max 30 sites per request; default 25.
- Max concurrency: 5 simultaneous outbound requests.
- Per-site timeout: 8 s. Total guard timeout: 30 s.
- Username must be 1–39 chars, `[a-zA-Z0-9._-]` only, no path traversal sequences.
- Route is `connector_opt_in` — blocked in isolated network mode.
- Rate limit: 6 requests per minute per identity.
- No paid APIs. No credentials stored or forwarded.
- No scheduled or background execution.
- Results are display-only HTML; never persisted.

## Detection modes

| Mode          | Description                                                       |
|---------------|-------------------------------------------------------------------|
| `status_code` | HTTP status 200 = found; 404 = not found.                         |
| `message`     | GET body checked for `found_string` / `miss_string` substrings.   |

## Site manifest

`lib/recon/whatsMyNameSites.json` — 30 high-signal sites across:
`dev` · `social` · `blog` · `forum` · `creative` · `career`

## API shape

```
POST /api/recon/username-enum
Authorization: Bearer <nexus-session-cookie via middleware>

{ "username": "alice", "maxSites": 25 }

→ {
    "username": "alice",
    "checked": 25,
    "found": 3,
    "results": [
      { "name": "GitHub", "uri": "https://github.com/alice", "found": true,
        "status": "found", "category": "dev", "responseCode": 200 },
      ...
    ]
  }
```

## Files

| File | Role |
|------|------|
| `lib/recon/whatsMyNameSites.json` | Pinned site manifest |
| `lib/recon/usernameEnum.ts` | Core logic: normalize, fan-out, concurrency pool |
| `app/api/recon/username-enum/route.ts` | POST endpoint, rate-limited |
| `lib/security/routePolicy.ts` | `connector_opt_in` entry |
| `components/recon/ReconLookup.tsx` | UI: merges results into Username OSINT panel |
| `scripts/validate-recon-username-enum.mjs` | Static contract validation |
| `scripts/check-recon-username-enum-runtime.mjs` | Unit runtime tests |

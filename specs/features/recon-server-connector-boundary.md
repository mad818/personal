# RECON Server Connector Boundary

## Objective

Move the active RECON lookup suite from direct browser-to-provider requests to one authenticated, same-origin Nexus API route while preserving the existing lookup set and operator-facing results.

## Problem

`ReconLookup` and `PassiveDnsPanel` currently contact third-party providers from browser code. That exposes lookup destinations in the browser network surface, requires broad `connect-src` permissions, and causes optional HIBP, VirusTotal, and Shodan credentials to cross the client boundary.

## Contract

- The browser calls only `POST /api/recon/lookup` through `apiFetch()`.
- The request contains one allowlisted operation plus a validated target and, only for VirusTotal, a validated target type.
- The server constructs every provider URL. The client cannot supply a URL, headers, provider name, or credential.
- `HIBP_API_KEY`, `VT_API_KEY`, and `SHODAN_API_KEY` are read only on the server.
- Provider calls have a fixed timeout and bounded response body.
- Responses expose only a small stable taxonomy: invalid request, key required, rate limited, or upstream unavailable. Raw provider errors and credentials never cross the route.
- The route remains `connector_opt_in`, protected, no-store, and rate-limited.

## Preserved lookup coverage

- Domain and IP RDAP
- DNS A, MX, NS, and TXT records
- Certificate transparency
- IP and domain geolocation
- Subdomain enumeration
- SPF, DMARC, and default-selector DKIM review
- Email reputation
- GitHub and Gravatar username discovery
- HIBP, VirusTotal, and Shodan optional BYOK panels
- CIRCL passive DNS and HackerTarget reverse-IP discovery

## Non-goals

- Adding providers or dependencies
- Accepting arbitrary proxy destinations
- Changing RECON layout or casefile behavior
- Phone/PWA acceptance work
- RPG changes
- Live provider traffic during automated validation

## Acceptance

- Active RECON client components contain no third-party provider URL or provider credential read.
- Normal browser CSP no longer authorizes the migrated provider hosts.
- Invalid operations/targets fail before fetch; missing keys fail without provider contact.
- HIBP 404 remains a successful empty-breach result.
- Provider rate limits, oversized bodies, timeouts, malformed JSON, and network failures return safe bounded errors.
- Focused validation, TypeScript, lint, format, canonical verification, production build, publication safety, handoff checks, and changed-path boundary audit pass.

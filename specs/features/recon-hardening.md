# Feature Spec — Recon Surface Hardening

## Route

`/recon`

## Objective

Ensure the RECON tab remains stable under smoke and degraded conditions, with all 15 panels loading or failing gracefully.

## Smoke contract

- Page loads and renders the RECON shell within the performance budget.
- At least the RDAP/WHOIS and DNS panels render without error.
- Username OSINT panel mounts and shows an input field (30-site server route via `/api/recon/username-enum`).
- No hydration mismatch on first load.

## Degraded-state contract

- If any individual RECON panel API fails (crt.sh, ipapi.co, haveibeenpwned, etc.), that panel shows a panel-level error state without crashing adjacent panels.
- BYOK panels (HIBP, VirusTotal, Shodan) render a configure-key prompt when keys are absent.
- Username OSINT server route returning a partial result (some sites down) still renders available results rather than failing entirely.
- Email or domain inputs that return empty results show an empty-state message rather than a blank area.

## Validator proof

`npm run ga:surfaces:check` confirms `specs/features/recon-hardening.md` exists and references `/recon`.

## Non-Goals

- No feature removal.
- No scanning of third-party hosts without user-provided input and intent.

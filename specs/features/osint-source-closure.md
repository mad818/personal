# OSINT Source Closure

## Outcome

Adapt the useful analyst-workbench patterns from OSIRIS into Nexus's existing
INTEL and RECON surfaces while keeping public-profile discovery passive,
bounded, reviewed, and privacy-preserving.

## Product behavior

1. INTEL, RECON, and COMMAND remain the governed multi-domain situational
   awareness surfaces rather than embedding a second dashboard.
2. The INTEL fusion strip joins significant events to regions and reviewed
   operational follow-up.
3. The RECON casefile links a subject, goal, user-supplied passive findings,
   source references, pivots, gaps, reviewed next moves, and prior continuity.
4. Casefiles preserve visible evidence strength and file into the durable VAULT
   workflow only after the analyst acts.
5. The bounded username lookup may check GitHub and Gravatar for an explicitly
   supplied username; it does not claim multi-site Maigret parity.
6. Nexus does not mass-enumerate accounts, auto-build person dossiers, recurse
   through aliases, maintain a fingerprint database, or route through proxy
   chains.

## Verification

- `npm run osint-source:check`
- `npm run recon:server-boundary:check`
- `npm run source:parity:check`
- `npm run type-check`

## Benefits

- Analysts get durable, source-traced investigations without a duplicate app.
- Reviewed pivots reduce false attribution.
- Privacy and operational accountability stay explicit.
- Useful situational awareness remains available without identity profiling.

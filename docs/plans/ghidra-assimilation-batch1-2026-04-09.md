# Ghidra Assimilation Batch 1 — local binary triage lane

## Why this batch exists

Ghidra’s strongest portable idea for Nexus is not “ship a decompiler in the browser.” It is the staged reverse-engineering workflow: identify the artifact, inspect structure, pull obvious indicators, and hand the operator a clean starting point for deeper analysis.

Nexus already has target-led RECON, metadata extraction, OPSEC checks, and security workflows, but it does not yet have a local-first binary triage lane for suspicious files.

## Problems to solve

1. RECON has no first-class local binary triage surface for suspicious files or malware prep.
2. Operators can inspect image/PDF metadata, but not hashes, signatures, entropy, strings, or IOC hints from executables and archives.
3. The RECON surface audit does not yet advertise reverse-engineering prep as one of the route’s real strengths.

## Scope for this batch

1. Add a local-only binary triage panel in RECON.
2. Compute hashes, file signatures, entropy, printable strings, and IOC candidates entirely in-browser.
3. Add a focused RECON landing for the new binary triage lane.
4. Update the surface audit copy so the capability is discoverable from Resources.

## Out of scope

- Embedding Ghidra itself
- Full decompilation or disassembly
- YARA engine integration
- Server-side sample upload or sandbox detonation

## Constraints

- Everything must remain free-first and local-first.
- No uploaded file leaves the browser.
- The lane must be honest about being triage/prep, not full reverse engineering.
- The site must still run at the end of the batch, with live route checks.

## Acceptance signals

1. RECON includes a clearly labeled binary triage lane.
2. The lane can analyze a local file in-browser and show at least hashes, likely format, entropy, printable strings, and IOC candidates.
3. Resources surface audit can jump into the new focused RECON binary lane.
4. Repo verification and live route checks remain green.

## Verification

- `npm run type-check`
- `npm run verify`
- `npm run handoff:write`
- Live route checks on `/recon?view=binary&focus=recon-binary` and `/resources?view=surfaces&surface=recon`

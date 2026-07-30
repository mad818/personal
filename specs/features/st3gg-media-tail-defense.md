# ST3GG Media-Tail Defense

## Outcome

Make the existing browser-local RECON binary-triage lane flag bytes appended after the logical end of PNG, JPEG, or PDF files without extracting, decoding, or executing the trailing content.

## Source boundary

- Primary source: `https://github.com/elder-plinius/ST3GG`, repository version `3.0.0` reviewed on 2026-07-18.
- Source license: AGPL-3.0-or-later. Nexus copies no implementation and independently adapts only the defensive lesson that trailing bytes after a media/document terminator are a cheap, explainable hidden-data indicator.
- Encoding, decoding, payload extraction, brute force, statistical LSB analysis, metadata extraction, polyglot creation, network channels, AI agents, provider calls, Python dependencies, and upstream code remain external.

## Existing Nexus seam

- `lib/binaryTriage.ts` already owns local file signatures, entropy, printable strings, IOC extraction, report notes, and VAULT draft generation.
- `components/recon/BinaryTriagePanel.tsx` already reads and hashes the full selected file in the browser and uploads only the derived report when the operator explicitly files it.
- No API route, persistent raw-file store, new tab, new provider, or new dependency is required.

## Contract

1. Add a pure, bounded detector for bytes after a structurally valid PNG IEND chunk, JPEG EOI marker, or final PDF `%%EOF` marker.
2. Ignore PDF trailing ASCII whitespace and report no clean-file warning.
3. Return only category, trailing-byte count, byte offset, and an optional recognized nested-format signature; never return trailing bytes or decoded content.
4. Treat the result as an indicator requiring deeper local review, not proof of steganography or maliciousness.
5. Include the indicator in the visible triage notes, copied report, and operator-approved VAULT draft while preserving the local-only raw-file boundary.
6. Add malformed-input, clean-file, appended-data, nested-signature, and canonical-wiring fixtures.

## Benefits

- Finds a common PNG/polyglot and post-terminator hiding pattern using data the browser already reads.
- Gives RECON a concrete, explainable follow-up signal instead of a vague steganography caveat.
- Preserves privacy because raw files and appended content never leave the browser.
- Adds no dependency, network request, model call, persistence, decoder, or execution authority.

## Verification

- Focused static and runtime media-tail checks.
- Company Map and source-parity checks.
- `npm run type-check` and `npm run lint`.
- `npm run verify` and `npm run build`.
- Publication, handoff, diff, and changed-path proof with zero phone/PWA and RPG implementation changes.

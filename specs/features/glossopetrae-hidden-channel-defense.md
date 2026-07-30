# GLOSSOPETRAE Hidden-Channel Defense

## Outcome

Make the existing Nexus AgentShield skill-review lane reject tracked skill instructions that contain Unicode characters capable of hiding or reordering prompt content, while preserving normal multilingual text and emoji.

## Source boundary

- Primary source: `https://github.com/elder-plinius/GLOSSOPETRAE`, reviewed at repository version `3.1.0` on 2026-07-18.
- Source license: AGPL-3.0. Nexus copies no implementation and adapts only the defensive lesson that model/monitor tokenization can disagree about Unicode channels.
- The upstream language engine, covert-channel encoders, steganography, tokenizer exploitation, guardrail evasion, experiments, provider calls, and generated languages remain external and excluded.

## Existing Nexus seam

- `lib/skillSpectrumPolicy.ts` already owns skill capability rules and CSS-hidden prompt detection.
- `scripts/validate-skill-capabilities.mjs` already inspects skill Markdown, but currently scans only the legacy `.claude/skills` root and is not mandatory under the canonical AgentShield command.
- `scripts/agentshield-check.mjs` is already part of `npm run verify` and is the narrowest existing enforcement seam.

## Contract

1. Add a pure, Nexus-owned Unicode hidden-channel detector that reports category, code point, line, column, and a printable excerpt without decoding or transforming content.
2. Block Unicode tag characters, bidi embedding/override/isolate controls, zero-width/format controls used for hidden text, and private-use code points.
3. Preserve ordinary ASCII, accents, non-Latin scripts, combining marks, emoji, variation selectors, and joiner-based emoji sequences.
4. Scan tracked `SKILL.md` and `GUIDE.md` files under `.agents/skills`, `.claude/skills`, and `docs/ideas/skills` with deterministic ordering and no symlink traversal.
5. Run the repository-owned scanner unconditionally from `agentshield:check`; keep the optional external AgentShield CLI non-authoritative.
6. Add focused fixtures for every blocked family, supplementary-plane code points, benign multilingual/emoji content, scanner roots, and canonical wiring.

## Benefits

- Closes a real blind spot left by CSS-only prompt-smuggling checks.
- Protects the current Codex skill root as well as legacy and project-local skill bundles.
- Makes the protection part of the verifier that already governs agent-skill security.
- Adds no runtime dependency, provider call, network request, persistence, UI, or execution authority.

## Verification

- Focused static and runtime detector/scanner tests.
- `npm run agentshield:check`.
- `npm run source:parity:check`.
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm run verify`.
- `npm run publication:safety:check`.
- `npm run handoff:write` and `npm run handoff:check`.
- `git diff --check` and a changed-path audit proving zero phone/PWA and RPG paths.

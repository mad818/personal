# REPO_CONTEXT.md

## What this is

GLOSSOPETRAE 3.1.0 is an AGPL-3.0 procedural-language research program with generation, acquisition, measurement, and dual-use covert-channel modules. Nexus uses only its defensive inspection lesson: different model tokenizers can disagree about which Unicode content is visible.

## Stack

- JavaScript ES modules with a static browser interface.
- Nexus-reviewed source version: 3.1.0 on 2026-07-18.
- No declared runtime dependencies in `package.json`; experiments use external provider access separately.
- License: AGPL-3.0.

## How it works

The main `Glossopetrae` class composes a seeded language engine from phonology, morphology, lexicon, translation, glyph, audio, evolution, quality, and optional dual-use modules. Separate experiments measure in-context acquisition, tokenizer survival, monitor visibility, and covert-channel detection across models. Nexus does not import or run that engine; it translates the visibility-gap finding into a deterministic local scan of tracked skill Markdown.

## File map

- `README.md` — capability inventory, research claims, experiment map, and explicit dual-use boundary.
- `package.json` — version 3.1.0, ES-module posture, and the local smoke-test command.
- `src/Glossopetrae.js` — large composition entry point for the language engine.
- `src/modules/` — generation, translation, quality, steganography, and tokenizer-oriented modules.
- `experiments/` — acquisition, tokenizer-survival, detection, and falsification harnesses with raw results.
- `VALIDATION.md` — validation claims and evidence map.

## Entry points

For the upstream program, start with `README.md`, then `src/Glossopetrae.js` and the specific experiment being reviewed. In Nexus, the implementation entry point is `lib/skillSpectrumPolicy.ts`, enforced by `scripts/validate-skill-capabilities.mjs` under the canonical AgentShield check.

## Dependencies

The core package manifest declares no runtime packages. Provider-backed experiments require external model access, but Nexus neither installs the repository nor calls those providers. The AGPL source remains external; Nexus-owned detector code is written independently from the documented defensive concept.

## Plan

### To use / integrate

1. Detect Unicode tag, bidi-control, zero-width/format, and private-use channels in tracked skill instructions.
2. Preserve ordinary multilingual text, combining marks, emoji variation selectors, and joiner-based emoji.
3. Run the read-only scan across current Codex, legacy, and project-local skill roots under `agentshield:check`.
4. Expose the concrete security benefit and license boundary in the existing Nexus Company Map.

### To extend / modify

Keep future changes inside the pure detector and fixed tracked-root scanner. Add a character family only with benign fixtures and a clear prompt-smuggling rationale. Do not add decoding, payload creation, language generation, provider-backed experiments, or copied upstream implementation.

## Open questions

- Semantic steganography cannot be proven absent by a Unicode scanner; Nexus makes no such claim.
- Detector coverage is intentionally narrower than every Unicode formatting character to avoid breaking legitimate multilingual text and emoji.
- The remaining elder-plinius portfolio still needs repository-specific review before any additional product work.

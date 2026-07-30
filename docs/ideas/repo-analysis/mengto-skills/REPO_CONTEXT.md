# REPO_CONTEXT.md

## What this is

`MengTo/Skills` is an MIT collection of portable Markdown operating procedures for Codex, Claude, Cursor, and similar coding agents. It is a workflow library, not an application runtime. Its primary value is the procedural contract inside each `SKILL.md`: clear triggers, defaults, steps, pitfalls, and acceptance checks, with optional references, assets, scripts, or demos.

The reviewed `main` snapshot contains 121 skill folders. The root README still says 118, so the folder inventory and individual `SKILL.md` files are the authoritative source:

| Category         | Current folders | Nexus decision                                                             |
| ---------------- | --------------: | -------------------------------------------------------------------------- |
| Codex            |              18 | Adapt 17; exclude `implement-fog-of-war`                                   |
| Customer support |               2 | Adapt as evidence-first, authority-gated procedures                        |
| Game development |              19 | Exclude all                                                                |
| Media            |               2 | Adapt with licensing and connector prerequisites                           |
| UI               |               1 | Adapt into the design-brief family                                         |
| Web design       |              79 | Adapt into marketing, visual-system, motion, WebGL, and UI-detail families |
| Total            |             121 | 101 adapted; 20 excluded                                                   |

The exhaustive item-by-item ledger lives in `docs/ideas/source-parity/mengto-skills.json`.

## Stack and architecture

- Markdown `SKILL.md` packages under `agent-skills/<category>/<skill-name>/`.
- Optional `REFERENCES.md`, `ARTICLE.md`, `assets/`, `scripts/`, and `demo/` support files.
- No central application server, provider router, database, or required runtime dependency.
- Skills are selected by trigger description and loaded as narrow operating context.
- Visual skills often prove the technique through a standalone demo and recreation/remix prompts.
- Workflow skills emphasize evidence, review boundaries, realistic inputs, and explicit validation.

## Main capability families

### Workflow extraction and source transformation

Articles, HTML, screenshots, and video become reusable procedures or interaction prompts after a source ledger, originality pass, and proof step.

### Audit and verification

Claims are compared with direct evidence. Verification strength is labeled, legal conclusions are avoided, and the final explanation stays readable.

### Capture

Browser video and stitched full-page capture use real rendered state, viewport discipline, lazy-load/reveal handling, and output inspection instead of assuming a screenshot is valid.

### Support, voice, social, and media

These procedures depend on external accounts or content sources. They are useful only when identity, thread/account matching, financial authority, send approval, licensing, and post-action read-back are explicit.

### Performance

Web animation work focuses on visibility pausing, cleanup, reduced motion, measured evidence, and CPU/GPU discipline. Apple profiling additionally requires a macOS/Xcode/Instruments host.

### Design and marketing systems

The portfolio contains landing/pricing/product-proof structures, editorial and enterprise page systems, reference-inspired art direction, typography/layout recipes, and many named visual lanes.

### Motion and WebGL

GSAP, scroll narratives, reveal patterns, particles, Three.js, globe renderers, shaders, and package-specific effects all require semantic fallbacks, reduced motion, cleanup, bounded pixel density, and dependency review.

### UI detail

Border, shadow, mask, frame, icon, blur, corner, loading-state, and numeric-detail recipes are small composable techniques rather than reasons to replace the existing Nexus component system.

## Entry points

- Repository overview: `README.md`
- Skill contract: `agent-skills/<category>/<skill-name>/SKILL.md`
- Demo index: `DEMOS.md`
- License: `LICENSE`

## Nexus fit

- Existing surface: `/skills?view=library&focus=skills-library`
- Existing execution boundary: protected `/api/tools`
- Existing design authority: `DESIGN.md`, `docs/NEXUS_TASTE_CONTRACT.md`, and project components/tokens
- Existing agent authority: `lib/agent.ts`, `lib/ai.ts`, and `lib/security/toolCapabilityPolicy.ts`
- Existing source accounting: `docs/ideas/source-parity/`

## Integration decision

Nexus should not bulk-install or vendor the upstream folders. It should own one typed atlas that:

1. accounts for every current upstream capability;
2. resolves each accepted non-game item into a complete project-native operating contract;
3. exposes that contract through the existing Skill Library and read-only agent tools;
4. labels connector, host, and dependency prerequisites honestly;
5. blocks the complete game portfolio from active registration.

This preserves the reusable procedural value while keeping Nexus local-first, review-gated, design-consistent, and free of a second skill runtime.

## Key risks

- README counts can drift behind the actual folder tree.
- A skill description is not proof that its third-party account or host tool is available.
- Bulk visual recipes can create incoherent UI if they override the project taste contract.
- Package-specific effects can create dependency, SSR, accessibility, cleanup, and performance debt.
- External media and reference recreation require attribution, licensing, and originality review.
- Support and social workflows can create real-world account or communication side effects and must stay authority-gated.
- Any active game skill would violate the current product direction and retirement contract.

## Verification plan

- Exact 121-row source ledger.
- Exact 101-entry active registry.
- Exact 20-entry excluded game set.
- Unique IDs and source URLs.
- Full contract resolution for every active entry.
- Runtime search/filter/availability proof.
- Static UI/tool/security/routing/prompt/package wiring proof.
- Canonical staged-scope verification without touching unrelated redesign files.

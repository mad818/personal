# MW6U/V Generator-Assisted Game Art Pipeline

`Aether Reliquary` now treats high-quality illustrated 2D as the primary visual production path. GPT Image 2 and Seedance 2.0 can support that path as optional operator-approved tools for game art and motion reference, but they do not replace the legal asset pipeline. The game still ships only assets with recorded provenance, reviewed rights, normalized frames, and manifest validation.

Operator correction: high-quality illustrated 2D means painterly/rendered RPG imagery, not flat vector glyphs or dashboard-like icon cards. Any generated or hand-authored output that looks like UI placeholder art should be rejected, retained only for provenance if needed, and replaced before it appears as production game art.

Use the Hero Kit sheets as the quality reference before approving new generated outputs. The style target is machine-readable in `lib/arpgVisualDirectionContent.json` and validated by `npm run arpg:visual:check`.

## Tool Roles

| Tool | Primary role | Runtime posture |
| --- | --- | --- |
| GPT Image 2 | Static item icons, sprite seed frames, sprite-sheet edits, tileset references, VFX reference sheets | May create committed runtime art only after operator approval, prompt record capture, rights review, normalization, and `arpg:assets:check` pass. |
| Seedance 2.0 | Attack timing, idle motion studies, hit reaction references, spell/VFX timing, animation feel | Prefer as motion reference. Runtime frames may ship only if the specific output is rights-cleared, normalized, and fully recorded. |

## Optional Sprite Tooling Candidates

Mario-provided tooling links are tracked in `lib/arpgAssetToolCandidateSources.json` and validated by `npm run arpg:asset-candidates:check`. They are tooling references, not asset packs, not runtime dependencies, and not proof that any generated output can ship.

| Tool | License | Best use | Guardrail |
| --- | --- | --- | --- |
| Agent Sprite Forge | MIT | Codex-first sprite, FX, and layered-map production workflow for original Aether prompts | Do not vendor automatically, do not use showcase/franchise examples, and route every output through prompt records, rights review, normalization, and manifest intake. |
| Sprite Fusion Pixel Snapper | MIT | Local Rust/WASM cleanup for grid-snapping sprite, tile, or preview art | Cleanup does not create rights. Source art and cleaned output still need provenance, fixed frame metadata, and asset validation. |

## Non-Negotiable Rules

- No forced paid dependency: if a tool or model requires a paid tier for the needed game output or commercial-use posture, the pipeline must keep a project-original or CC0 fallback.
- No untracked generation: every committed output needs a prompt record under `docs/game/aether-reliquary/generation-records/` or an equivalent repo-relative record path.
- No unclear rights: generated output must be marked `operator-verified-commercial-use` before it can enter `public/arpg/`.
- No franchise prompts: do not reference Warhammer, Space Marines, Titus, Homefront, ripped games, famous characters, studios, logos, or protected armor silhouettes.
- No raw one-shot drift: sprite strips should start from an approved seed frame, then be generated or edited as a whole strip, normalized to fixed frame size, and reviewed in-engine.
- No dashboard regression: new art should make `/hq` read more like a game while keeping command input, reduced-motion settings, and local-first save behavior intact.

## Production Workflow

1. Define the target asset: item icon, enemy frame, character seed, attack strip, tile motif, or VFX reference.
2. Create or select an approved seed frame with the correct silhouette, palette, and bottom-center anchor.
3. Write a prompt record before committing any output. Include tool, model, date, prompt, negative constraints, source seed, intended runtime path, rights posture, and cost posture.
4. Generate static art with GPT Image 2 or motion reference with Seedance 2.0 only when the operator has approved the tool and access path for that batch.
5. Hand-splice, clean, or paint over the output as needed so it becomes Aether Reliquary original production art, not a raw model dump.
6. Normalize sprite sheets to fixed dimensions, transparent backgrounds, shared scale, and bottom-center anchors.
7. Add or update `lib/arpgAssetManifestData.json` with `generation` metadata and the `generator-assisted` tag.
8. Run `npm run arpg:assets:check`, then inspect the asset in `/hq` before accepting it.

If Agent Sprite Forge or Pixel Snapper is used in a future batch, record the tool id, source URL, license proof URL, exact command/process, and transformation notes in the prompt or output review record. Do not commit the external tool repository into Nexus unless a later plan explicitly approves vendoring and security review.

## Illustrated 2D Asset Bench

The active bench is recorded in `lib/arpgIllustratedAssetBenchContent.json`. Editable source sheets live under `assets/arpg/illustrated/source/`, normalized runtime PNG sheets live under `public/arpg/illustrated/`, and prompt/provenance records live under `docs/game/aether-reliquary/generation-records/`.

Run `npm run arpg:illustrated:generate` after editing a bench source sheet. The script rejects source/output dimension drift, oversized runtime files, and missing source paths before `npm run arpg:assets:check` validates the manifest and prompt record links.

The first visible-impact batch targets:

- 8 gear and item icons.
- 4 enemy and boss cards.
- 3 character or class portraits.
- 3 early location cards.
- 6 skill, status, or VFX icons.

The first promoted generated production batch is `MW6U/V-HERO-KIT-IMAGE-ASSETS`: 3 hero/class portraits, 3 class outfit cards, 12 weapon/item icons, and 8 armor/equipment icons. Its source contact sheets live in `assets/arpg/illustrated/generated-source/`, its runtime outputs live in `public/arpg/illustrated/`, and its review record is `docs/game/aether-reliquary/generation-records/2026-04-27-hero-kit-image-assets.md`.

## Manifest Metadata

Generator-assisted runtime assets must include:

- `generation.toolId`: `gpt-image-2`, `seedance-2.0`, or `other-operator-approved`.
- `generation.use`: sprite seed, sprite sheet, item icon, tileset reference, FX reference, animation reference, or motion study.
- `generation.promptRecordPath`: repo-relative path to the prompt and review record.
- `generation.operatorApproved`: `true`.
- `generation.termsReviewedAt`: `YYYY-MM-DD`.
- `generation.rightsPosture`: `operator-verified-commercial-use`.
- `generation.costPosture`: never `forced-paid-dependency`.
- `generation.transformation`: what was hand-spliced, edited, normalized, or redrawn before runtime use.

## First Best Targets

- Item icons: weapon families, potion tiers, relic dust, upgrade shards, monster parts, city currencies, rings, charms, and amulets.
- Enemy silhouettes: elite variants, sub-city champions, boss weak-point reads, and status-state overlays.
- Animation references: dodge, basic slash, bow shot, staff cast, shield guard, stagger, death, loot burst, and relic activation.
- VFX references: rune pulses, ward bloom, ember hit sparks, poison clouds, chill impact, curse tether, and relic fury.

## Acceptance

- The first viewport still reads as a playable Phaser RPG.
- Art improves item/enemy recognition at game scale.
- Approved illustrated portraits, enemy cards, location cards, gear icons, and skill icons render in `/hq` before procedural placeholders where available.
- Prompt/rights records are present before manifest intake.
- The in-game Assets/Credits drawer can explain generated or external provenance when needed.
- `npm run arpg:assets:check` rejects missing records, unsupported generated tools, unclear rights, absolute paths, forced paid dependencies, and unnormalized frames.

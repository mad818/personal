# REPO_CONTEXT.md

## What this is

`zarazhangrui/frontend-slides` is an MIT coding-agent skill for creating zero-dependency HTML presentations, converting PowerPoint decks to web slides, and improving existing HTML decks. It uses visual style previews and fixed-stage browser output rather than serving as a presentation runtime inside Nexus.

## Stack

- Markdown skill and design references.
- Single-file HTML output with inline CSS and JavaScript.
- Python plus `python-pptx` for optional PPT/PPTX extraction.
- Shell scripts for optional Vercel deployment and PDF export.
- Claude plugin metadata plus a core skill usable by Codex and other filesystem-capable coding agents.

## How it works

The skill gathers deck purpose, length, content, and density; evaluates supplied images; and generates three concrete style previews. After the user selects a direction, it progressively loads only the chosen design recipe, builds a fixed 1920×1080 slide stage that scales to the viewport, and visually checks the result. PPT conversion extracts text, images, order, notes, and other content before running the same visual workflow.

## File map

- `README.md` — capability overview, installation variants, styles, and workflow.
- `SKILL.md` — authoritative content, style-discovery, generation, conversion, delivery, and export workflow.
- `STYLE_PRESETS.md` — safe visual directions.
- `bold-template-pack/` — progressively loaded design systems and preview index.
- `viewport-base.css` — fixed 16:9 scaling, visibility, and reduced-motion foundation.
- `html-template.md` — presentation structure, navigation, and editing behavior.
- `animation-patterns.md` — motion reference.
- `scripts/extract-pptx.py` — optional PowerPoint extraction.
- `scripts/deploy.sh` and `scripts/export-pdf.sh` — optional external sharing and static export.

## Entry points

- Read `SKILL.md` directly in Codex or another local coding agent.
- Claude plugin command: `/frontend-slides:frontend-slides` after marketplace installation.
- PowerPoint extraction: `python scripts/extract-pptx.py <input.pptx> <output_dir>`.

## Dependencies

- New HTML decks have no runtime package dependency.
- PowerPoint conversion optionally installs `python-pptx`.
- PDF export and browser verification depend on the supplied shell/browser tooling.
- Vercel sharing requires an explicit account login and external deployment.

## Plan

### To use / integrate

1. Keep Frontend Slides as an optional Codex/reference workflow under Design and Marketing.
2. Generate decks as operator-selected local artifacts outside the Nexus application runtime.
3. Require explicit approval before installing Python packages, exporting, or publishing externally.
4. For ChatGPT, use an attached-source/file workflow or presentation-capable app; a normal chat can produce the brief but cannot run local scripts or save the deck.

### To extend / modify

1. Adapt only accepted design-discovery and artifact-QA patterns under the Nexus taste contract.
2. Preserve fixed-stage scaling, reduced motion, source fidelity, and rendered screenshot checks.
3. Do not add Vercel deployment or arbitrary file conversion to the Nexus runtime without a separate protected feature and retention review.

## Open questions

- Whether Mario wants the external skill installed for Codex or retained as a linked presentation recipe.
- Whether future Nexus briefs should have an explicit export-to-presentation handoff without embedding a slide editor in Nexus.

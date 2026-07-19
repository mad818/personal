# REPO_CONTEXT.md

## What this is

ST3GG 3.0.0 is an AGPL-3.0-or-later dual-use steganography suite for creating, detecting, and decoding hidden content across media, text, documents, archives, code, and network captures. Nexus may learn from its defensive visibility model, but must not install, copy, or expose its payload-generation and decoding runtime.

## Stack

- Python 3.9+ with Pillow, NumPy, Typer, and Rich for the core CLI.
- Optional Textual, NiceGUI/FastAPI, Streamlit, and cryptography interfaces.
- A standalone HTML/JavaScript browser implementation plus Python CLI, TUI, web UI, and agent-oriented entry points.

## How it works

The Python package routes files through format-aware analysis and steganography functions, while separate CLI and browser surfaces expose encode, decode, and analyze operations. Its defensive analysis registry covers magic-byte identification, Unicode and metadata checks, PNG chunk inspection, and statistical image analysis; the same repository also contains extensive offensive creation and extraction capabilities. The narrow Nexus-relevant lesson is that bytes after a format's logical terminator are a cheap, explainable indicator worth surfacing before deeper analysis.

## File map

- `README.md` — scope, supported modalities, offensive/defensive claims, interfaces, and license boundary.
- `pyproject.toml` — package version, Python support, dependencies, scripts, and AGPL-3.0-or-later metadata.
- `analysis_tools.py` — large format-aware analysis registry, including PNG chunk and appended-data inspection.
- `steg_core.py` — image encoding, decoding, capacity, statistical analysis, and configuration primitives.
- `cli.py` — operator CLI entry point for encode, decode, and analyze flows.
- `test_comprehensive.py` — broad functional checks for core techniques and interfaces.

## Entry points

- `stegg` / `cli:main_cli` — interactive CLI.
- `stegg-cli` / `stegg_cli:main` — structured agent-oriented CLI.
- `stegg-tui` and `stegg-web` — optional terminal and web interfaces.
- `index.html` — standalone browser surface.

## Dependencies

- Pillow and NumPy power image parsing and pixel/statistical work.
- Typer and Rich provide the primary CLI.
- Optional UI, encryption, and service dependencies widen the upstream runtime substantially and are not required by Nexus.

## Plan

### To use / integrate

1. Do not install or call ST3GG; retain it as an external AGPL reference.
2. Independently add a pure TypeScript indicator for bytes after valid PNG IEND, JPEG EOI, or PDF EOF markers inside the existing browser-local RECON binary triage.
3. Report only format, offset, trailing byte count, and a bounded nested-signature hint; never extract or decode a payload.
4. Preserve the current local-only file boundary and file only the derived report into VAULT.

### To extend / modify

Implement in `lib/binaryTriage.ts`, surface through `components/recon/BinaryTriagePanel.tsx`, and protect it with fixture-driven runtime/static checks. Keep statistical LSB analysis, metadata extraction, brute force, payload generation, covert channels, network capture, OpenRouter calls, upstream Python, and copied AGPL code outside Nexus.

## Open questions

Broader statistical steganalysis would require a separately approved, measurable local-analysis target and false-positive contract; it is intentionally outside this tranche.

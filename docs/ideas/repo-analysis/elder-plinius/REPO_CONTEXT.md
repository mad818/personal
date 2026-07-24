# REPO_CONTEXT.md

## What this is

`elder-plinius` is a public GitHub portfolio of AI experiments, prompt-transparency projects, text utilities, red-team tools, and agent prototypes. Nexus reviewed the current 45-repository portfolio as an idea source, then selected eight patterns that fit existing product boundaries without vendoring an upstream application.

## Stack

- Portfolio: TypeScript, JavaScript, Python, HTML, and Java projects.
- Reviewed shortlist: React/Vite/Convex, static JavaScript, and small Python/Streamlit or Gradio prototypes.
- Licenses: mixed; the shortlisted repositories include Apache-2.0, AGPL-3.0, and one repository with no visible license on its GitHub page.

## How it works

The repositories are independent experiments, not one composable platform. Nexus therefore maps their useful ideas into its existing Company Map, AI boundary, eval gates, evidence model, and review surfaces. No upstream runtime, provider client, account system, database, or dependency is installed.

## File map

- `AutoTemp/autotemp.py` — generates candidates at several temperatures and compares them with judge rubrics and optional metrics.
- `LEAKHUB/convex/` — stores prompt-transparency submissions, verification state, requests, users, and leaderboard data.
- `LEAKHUB/src/` — React interface for browsing, submitting, and verifying claims.
- `P4RS3LT0NGV3/src/transformers/` — large taxonomy of encodings, ciphers, Unicode transforms, and text mutations.
- `AutoStoryGen/app.py` — staged agentic story-generation interface.
- `ourobopus/ouro.py` — small self-review and improvement-loop prototype.
- `GLOSSOPETRAE/README.md` and `experiments/` — model/monitor Unicode visibility-gap evidence used only for defensive skill inspection.
- `ST3GG/README.md`, `pyproject.toml`, and `analysis_tools.py` — dual-use steganography suite reviewed only for bounded post-terminator media indicators.
- `NATURALIS-FUTURA/README.md` and `package.json` — AI-risk and countermeasure teaching pattern reviewed only at the explanatory-structure level.
- `portfolio-inventory.json` — current repository-by-repository evidence, benefit, boundary, and final disposition for all 45 public repositories.

## Entry points

Start with each repository README and license. In Nexus, the entry point is `lib/nexusCompanyMap.ts`; the Company Map exposes the reviewed benefit and its boundary to the relevant department.

## Dependencies

- AutoTemp uses direct model clients and evaluation libraries; Nexus keeps model calls behind `lib/ai.ts` instead.
- LeakHub uses Convex and GitHub OAuth; Nexus adopts only provenance and verification-state cues.
- P4RS3LT0NGV3 is AGPL-3.0; Nexus uses its taxonomy as a reference and copies no implementation.
- AutoStoryGen and ourobopus use direct provider clients; Nexus translates their workflow shapes into existing governed lanes.

## Plan

### To use / integrate

1. Surface AutoTemp's rubric, variance, cost, and operator-choice pattern in Operations and Engineering source guidance.
2. Surface LeakHub's provenance and corroboration pattern in Research and Trust, limited to defensive transparency work.
3. Surface P4RS3LT0NGV3's normalization/encoding taxonomy in Research and Trust, excluding hidden-message creation and copied AGPL code.
4. Surface AutoStoryGen's plan/draft/critique/revise stages in Marketing and creative work.
5. Surface ourobopus's measure/propose/review loop in Operations and Engineering without autonomous self-modification.
6. Apply GLOSSOPETRAE's tokenizer-visibility lesson as a local Unicode hidden-channel scan in the existing AgentShield skill-review lane.
7. Apply ST3GG's format-terminator lesson as a browser-local PNG/JPEG/PDF trailing-data indicator in existing RECON binary triage.
8. Apply NATURALIS FUTURA's evidence-first risk-briefing structure in Research and Legal & Trust: technical threat, one illustrative analogy, mitigations, uncertainty, and verification evidence.

### To extend / modify

Add future capabilities only through existing Nexus routes, `lib/ai.ts`, protected storage, explicit approval, and focused verification. Re-review the exact upstream version and license before translating any implementation detail.

## Portfolio closure

- `portfolio-inventory.json` reconciles the 45 public repositories reported by GitHub on 2026-07-23; there is no remaining catch-all portfolio item.
- AutoTemp and NATURALIS FUTURA expose no visible license in the reviewed primary evidence, so both remain idea-only references and no source material is copied.
- Offensive red-team, jailbreak, prompt-exfiltration, model-safeguard removal, Flipper-control, adversarial-image, cryptocurrency, physical-actuation, and empty or undocumented projects are individually excluded or marked as insufficient evidence.

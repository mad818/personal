# REPO_CONTEXT.md

## What this is

`elder-plinius` is a public GitHub portfolio of AI experiments, prompt-transparency projects, text utilities, red-team tools, and agent prototypes. Nexus reviewed the portfolio as an idea source, then selected five patterns that fit existing product boundaries without vendoring an upstream application.

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

### To extend / modify

Add future capabilities only through existing Nexus routes, `lib/ai.ts`, protected storage, explicit approval, and focused verification. Re-review the exact upstream version and license before translating any implementation detail.

## Open questions

- The profile reports 45 repositories, but this pass goes deep only on the five strongest product-safe patterns.
- AutoTemp shows no license on the reviewed repository page, so it remains an idea-only reference.
- Offensive red-team, jailbreak, prompt-exfiltration, Flipper-control, and adversarial-image projects are not runtime candidates for Nexus.

# Spec-Driven Development Batch 1 — Spec-First Working Lane

Date: 2026-04-09
Owner: Codex

## Why this batch

Nexus already has strong playbooks, system maps, and impact analysis, but work can still begin from implementation instincts instead of an explicit spec. The best safe assimilation of spec-driven development is to make “problem -> constraints -> acceptance -> verification” a first-class working lane inside Resources, connected to the exact same repair sessions and subsystem maps already in use.

## Goals

1. Add a reusable spec-first contract for common Nexus work shapes like high-risk changes, safe refactors, security boundary work, and future-hardware prep.
2. Expose that contract in a new `Resources > Specs` lane with copyable and downloadable spec starters.
3. Connect spec starters to existing `System Design`, `Impact`, HQ, scheduler, VAULT, RECON, and VEHICLE exact-session links.
4. Make playbooks point to the spec-first lane when the task should start with a written spec before code changes.

## Guardrails

- Keep this local-first and free-first.
- Do not add a heavy requirements system, new backend state, or external spec tooling.
- Reuse the existing audit-to-repair model instead of building a parallel workflow language.
- Prefer compact, operator-usable specs over essay-length templates.

## Planned changes

1. Create a shared `lib/specDrivenDevelopment.ts` contract with spec templates, core sections, anti-patterns, verification checks, and exact jump-offs.
2. Add `components/resources/SpecDrivenConsole.tsx` for reusable spec starters and brief export.
3. Add a `Specs` view to the Resources workbench and store contract.
4. Add a `spec-driven-development` playbook that points to the new lane and the strongest subsystem anchors.
5. Re-run `type-check`, `verify`, `handoff:write`, and live route checks on `/resources`, `/resources?view=specs`, and the new playbook view.

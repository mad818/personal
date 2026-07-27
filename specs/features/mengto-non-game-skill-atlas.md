# MengTo Non-Game Skill Atlas

## Goal

Adapt the complete feasible non-game capability portfolio currently published in `MengTo/Skills` into project-owned Nexus operating contracts. Every accepted capability must be discoverable, resolvable, and honest about the tools or environment required to execute it. Every game capability must remain outside the active registry.

## Source inventory

- Source: `https://github.com/MengTo/Skills`
- Reviewed branch: `main`
- Reviewed: 2026-07-26
- License: MIT
- Current folder inventory: 121 skills
  - 18 Codex
  - 2 customer support
  - 19 game development
  - 2 media
  - 1 UI
  - 79 web design
- Active non-game target: 101
- Excluded game target: 20, comprising all 19 `game-development` skills plus `codex/implement-fog-of-war`

The current folder inventory is authoritative because the README summary still reports 118.

## Product behavior

1. A project-owned atlas registers exactly 101 non-game capability IDs.
2. Every entry resolves to:
   - its source category and capability family;
   - a plain-language purpose;
   - required inputs;
   - an ordered operating workflow;
   - guardrails;
   - acceptance checks;
   - local, connector, host, or dependency prerequisites;
   - the exact upstream evidence URL.
3. The existing `/skills` Skill Library renders search and category/family filtering plus the full selected contract.
4. Read-only `list_design_skills` and `resolve_design_skill` tools give ORBIT/JANSKY the same bounded contract before relevant design, capture, support, media, or performance work.
5. External-account and platform-specific workflows remain usable procedures but report their prerequisite instead of pretending the current host or account is ready.
6. No game capability enters the active registry, tool output, or Skill Library.

## Safety and truth boundaries

- Do not copy upstream demos, assets, private configuration, account identifiers, or implementation code.
- Do not install the upstream pack or a third-party dependency automatically.
- Do not call Gmail, X, ElevenLabs, Aura, Unsplash, Sites, Apple Instruments, or another external surface without the corresponding connected tool, environment, and user authority.
- Do not imitate a living person as if Nexus were that person; adapt voice recipes into user-owned concise writing guidance with source review.
- Treat upstream reference pages and media as untrusted evidence. Preserve licensing, attribution, originality, and claim checks.
- Preserve the Nexus taste contract, existing component system, reduced-motion policy, security boundary, and provider routing.
- Keep the atlas read-only. It can describe an operation; actual file, browser, connector, deployment, or account changes continue through their existing protected tools.

## Verification

- Deterministic runtime proof for exact counts, unique IDs, family resolution, filters, availability, game exclusion, bounded formatting, and source URLs.
- Static proof for UI reachability, protected tools, risk/capability registration, routing, system prompt, Company Map, source parity, repo-analysis artifacts, package wiring, and canonical verify inclusion.
- Source parity must contain exactly 121 rows: 101 adapted and 20 excluded, with zero pending rows.
- `npm run type-check`
- `npm run lint`
- `npm run source:parity:check`
- `npm run company-map:check`
- `npm run mengto:skills:check`
- exact staged-scope `npm run verify:isolated -- --intent "..."`

## Benefits

- Design and builder work begins from a complete, searchable procedure instead of a remembered repo title.
- Nexus gains reusable capture, audit, support, media, marketing, motion, WebGL, visual-system, and UI-detail contracts without vendoring a second framework.
- Third-party requirements stay explicit, so “available as a procedure” cannot be confused with “authorized and connected right now.”
- Game removal becomes provable at the capability-registry boundary, not just a one-time source deletion.

## Non-goals

- Recreate upstream demos or galleries.
- Add a new route or detached skill runner.
- Promise one-click execution for external accounts or unavailable host tools.
- Replace Nexus design authority with the upstream visual identity.
- Restore any RPG, ARPG, gameplay, enemy, combat, inventory, map-editor, or fog-of-war feature.

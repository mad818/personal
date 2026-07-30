# Nexus Company Map

## Goal

Translate the supplied “turn an AI into a company” skill chart into the existing Nexus operating model. MAX remains the single operator-facing control plane, the five existing agents own department work, and external repositories remain reviewed capability sources rather than becoming dozens of durable agents.

## Product shape

- Add a typed company-map registry with departments, Nexus owners, example missions, source references, and platform compatibility.
- Extend `/skills?view=library&focus=skills-library` inside the existing Agency Role Library.
- Let the operator select a department, inspect its owner and sources, open a bounded mission in HQ, or copy a portable ChatGPT brief.
- Label sources as Nexus-native, Codex skill, MCP/tool, reference, or translation required.

## Compatibility boundary

- Codex can use project skills, durable `AGENTS.md` guidance, plugins, and MCP tools.
- A normal ChatGPT conversation receives a copied mission brief; live ChatGPT integrations require an app or MCP-backed tool surface.
- Claude plugin pages and Claude-only install commands are not presented as directly installable in ChatGPT or Nexus.
- Graphify is treated accurately as a local-first knowledge-graph tool with Codex support, not as the company/org-chart engine.
- Last30Days is treated as an optional Codex-compatible recent-signal research skill; Nexus does not inherit its external account, browser-session, API-key, or direct-provider behavior.
- Emil Kowalski's design-engineering skills are treated as review-first animation and interface references under the existing Nexus taste contract, not as a replacement design system.
- Frontend Slides is treated as an optional presentation-production workflow; browser artifacts remain local by default and deployment/export requires an explicit operator decision.
- Matt Pocock's engineering pack is selected skill-by-skill, and merged PR #505 remains a separate in-progress architecture reference rather than an install-ready Nexus boundary migration.
- David Ondrej's broad catalog is reviewed per skill; shell hooks, self-scheduling, server changes, and other mutating workflows are never inherited automatically.
- Repeated source URLs are deduplicated so a repository already present in the Company Map is not added twice.

## In scope

- Command and operations, engineering, design, research and knowledge, marketing and social, finance and business, and legal and trust departments.
- Mapping each department to MAX plus the narrowest existing Nexus specialist.
- Source status and compatibility language for the links supplied in the request.
- Scoped analysis and source-parity records for newly supplied repositories before any installation or deeper adaptation.
- A deterministic mission brief builder and focused runtime/static validation.

## Polish slice

- Present department selection as a compact operational rail with a clear active marker, lead-agent orientation, and source count.
- Give the selected mission the dominant workplane while sources read as a quieter evidence rail instead of a second competing card.
- Preserve compact utility copy, existing shell tokens, responsive stacking, and reduced-motion behavior.
- Make keyboard focus visible and return explicit live feedback for ChatGPT copy attempts.
- Keep department/source data, HQ prompt routing, external-link behavior, and copy-only ChatGPT output unchanged.

## Out of scope

- New durable agents, worker daemons, autonomous departments, or a new top-level route.
- Installing or vendoring third-party skill packs.
- Direct provider calls, new API keys, paid services, or Nexus-side billing.
- Legal, accounting, payroll, or compliance automation presented as professional advice.
- Automatic persistence of copied ChatGPT briefs or department missions.

## Acceptance

- The company map exposes every department with a valid lead and at least one source.
- Every source has an explicit compatibility kind and honest install posture.
- HQ handoff stays inside existing routing and ChatGPT output is copy-only.
- The active department is unambiguous by text and shape, not color alone; keyboard focus remains visible.
- Department changes use restrained motion that is disabled by reduced-motion preferences.
- Mission and source columns collapse cleanly without horizontal overflow on narrow viewports.
- `npm run company-map:check`, `npm run source:parity:check`, `npx tsc --noEmit`, `npm run lint`, and `npm run verify` pass.

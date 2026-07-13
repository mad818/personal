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

## In scope

- Command and operations, engineering, design, research and knowledge, marketing and social, finance and business, and legal and trust departments.
- Mapping each department to MAX plus the narrowest existing Nexus specialist.
- Source status and compatibility language for the links supplied in the request.
- A deterministic mission brief builder and focused runtime/static validation.

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
- `npm run company-map:check`, `npm run source:parity:check`, `npx tsc --noEmit`, `npm run lint`, and `npm run verify` pass.

# Agency Agents Native Role Taxonomy

## Goal

Apply the useful part of `msitarzewski/agency-agents` inside Nexus Prime as a local specialist-role taxonomy, not as an installed upstream agent pack.

The source repo is useful because it organizes AI specialists by role, use case, workflows, deliverables, and success criteria. Nexus should absorb that structure into the existing five-agent bench:

- JANSKY: orchestration, triage, project management, support, synthesis.
- ORBIT: engineering, architecture, code review, DevOps, technical writing.
- NOVA: research, product discovery, trend analysis, synthesis, source review.
- CIPHER: security, compliance, incident response, defensive review.
- FLUX: markets, finance, paid-media style measurement, signal analysis.

## In Scope

- Add a curated typed taxonomy in `lib/agentRoleTaxonomy.ts`.
- Keep the source attribution and explicit no-vendoring guardrails in code.
- Add compact role-pack guidance to `buildCapabilitiesBlock()` through `lib/liveContext.ts`.
- Use taxonomy routing keywords in `components/home/office/prompts.ts` so agent detection benefits from the new role packs.
- Add a visible role-library panel to `/skills?view=library` so the operator can inspect the curated packs and test routing examples.
- Add a local validator command and wire it into `npm run verify`.

## Out of Scope

- Running upstream `install.sh` or `convert.sh`.
- Copying upstream agent Markdown bodies.
- Generating `.codex/agents/*.toml`.
- Creating hundreds of runtime agents.
- Adding a new route.
- Changing provider calls or bypassing `lib/ai.ts`.

## Done When

- `npm run agent:taxonomy:check` passes.
- `npm run type-check` passes.
- `npm run verify` passes.
- The taxonomy is available to prompts through live-context capability injection.
- The router has role-pack keywords for the existing specialist agents.
- `/skills?view=library` surfaces the curated role packs, source guardrails, and prompt-routing preview.

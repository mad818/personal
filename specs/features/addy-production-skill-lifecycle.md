# Addy Production Skill Lifecycle

## Outcome

Adapt the current feasible `addyosmani/agent-skills` lifecycle into Nexus's approved tracked project-skill root so future Codex sessions can discover and follow complete production-engineering workflows without installing or executing upstream code.

## Source truth

- Primary source: `https://github.com/addyosmani/agent-skills`
- Current reviewed shape: 24 skills covering define, plan, build, verify, review, ship, and one routing meta-skill.
- License: MIT.
- The prior six-capability matrix is stale and must not be treated as an exhaustive current inventory.

## Existing Nexus seams

- `docs/ideas/skills/` is an approved tracked project-skill root already scanned by the Nexus skill-security gate.
- `.agents/skills/` remains canonical for built-in project skills but is read-only in this managed workspace; this change must not bypass that boundary.
- `AGENTS.md` owns project instructions and skill routing.
- `scripts/validate-skill-capabilities.mjs` scans approved skill roots for hidden channels, dependencies, cycles, and privilege escalation.
- `npm run verify` owns the canonical local acceptance lane.

## Contract

1. Represent every current upstream lifecycle skill as one project-owned `docs/ideas/skills/production-engineering/<name>/SKILL.md` workflow.
2. Give every skill precise trigger metadata, explicit authority boundaries, an ordered process, stop conditions, and evidence-based verification.
3. Keep instructions Nexus-specific and concise; do not copy upstream prose, install the upstream plugin, or grant new execution authority.
4. Provide human-facing `agents/openai.yaml` metadata for every new skill.
5. Route multi-skill work through `using-agent-skills` with an acyclic, deterministic dependency graph and an explicit `AGENTS.md` trigger.
6. Validate the exact 24-skill inventory, frontmatter, required workflow sections, UI metadata, source parity, and graph safety.
7. Preserve the current task's explicit constraints: no phone work, no game/RPG content, and no overlap with the unrelated redesign.

## Benefits

- Replaces ad-hoc agent behavior with repeatable senior-engineering workflows from idea through shipping.
- Makes reviews, tests, performance work, migration, documentation, and recovery evidence consistent across future sessions.
- Keeps every workflow local, inspectable, and security-scanned instead of relying on a mutable global plugin install.
- Adds routing without adding autonomous authority: a skill can guide an authorized task but cannot widen it.

## Verification

- Focused production-skill catalog and metadata validator.
- Skill dependency/hidden-channel validation.
- Source-parity and script-reachability validation.
- Agent-instruction and publication-safety validation.
- TypeScript and lint.
- Canonical isolated verification for the exact staged scope.
- Handoff write/check, diff audit, and isolated commit.

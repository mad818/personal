# Skill Dependency Privilege Graph

## Outcome

Extend the existing SkillSpector-inspired skill security lane so Nexus resolves local skill-to-skill references and detects unresolved dependencies, cycles, and transitive privilege escalation before merge.

## Existing Nexus seam

- `lib/skillSpectrumPolicy.ts` owns the capability risk table and direct-capability evaluator.
- `scripts/validate-skill-capabilities.mjs` deterministically scans `SKILL.md` and `GUIDE.md` files under the three approved repository roots.
- `components/skills/SkillSpectrumValidatorStrip.tsx` explains the active read-only policy on the Skills Workflow Forge.
- `npm run agentshield:check` is already part of canonical verification.

## Contract

1. Model each skill directory as one node containing its declared capabilities and explicit `@.../SKILL.md` references from its instruction and guide files.
2. Resolve dependencies only within `.agents/skills`, `.claude/skills`, and `docs/ideas/skills`; support the single legacy `.Codex/skills` → `.agents/skills` compatibility alias and report every other unresolved reference instead of guessing.
3. Detect dependency cycles with deterministic paths.
4. Traverse dependency chains and report when a skill inherits a higher capability-risk level than it declares directly.
5. Fail the repository gate on unresolved references, cycles, or any transitive blocked capability; retain review-level escalation as visible review evidence.
6. Cover clean, unresolved, cyclic, review-escalation, and blocked-escalation fixtures without adding runtime execution authority.

## Benefits

- Catches a low-privilege skill that quietly reaches a higher-privilege helper through one or more dependencies.
- Prevents dead instruction links and recursive skill chains from reaching operators.
- Reuses the current local, deterministic AgentShield lane with no provider, network, persistence, GPU, or private-data requirement.
- Makes the final pending NVIDIA SkillSpector capability honest and project-native.

## Verification

- Focused graph runtime fixtures.
- Repository skill-root scan.
- `npm run agentshield:check`.
- `npm run source:parity:check`.
- `npm run type-check`.
- `npm run lint`.
- `npm run verify`.
- `npm run handoff:write` and `npm run handoff:check`.
- `git diff --check`.

# OPERATIONAL-STARTUP-AND-SKILL-LINKAGE

## Outcome

Nexus has one supported Windows double-click launcher and one package command
that either opens a verified healthy local runtime or exits with a specific
recovery action. The four July project skills are linked through root
instructions, the production workflow router, the Company Map, and the live
assistant capability context.

## Source truth and seams

- `scripts/start-runtime.mjs` owns the supported Next.js runtime selection.
- `app/api/health/route.ts` owns the public runtime-health contract.
- `.env.local` remains the one ignored local configuration file.
- `docs/ideas/skills/*/SKILL.md` owns project-skill procedures.
- `docs/ideas/skills/production-engineering/using-agent-skills/SKILL.md` owns
  workflow routing.
- `AGENTS.md` owns repository session triggers.
- `lib/liveContext.ts` owns assistant capability injection.
- `lib/nexusCompanyMap.ts` owns operator-facing source ownership and benefits.
- `README.md` owns the public local-start instructions.

## Functional contracts

1. `npm run operational:start` validates the supported Node/npm majors, local
   dependencies, configuration posture, port, and runtime mode before launch.
2. An already healthy Nexus runtime is reused. A non-Nexus process on the
   requested port fails closed with an exact recovery action.
3. A new runtime starts only through `scripts/start-runtime.mjs`. Startup waits
   for `/api/health`, requires the exact Nexus service/status shape, and opens
   `/hq` only after verified health.
4. Startup has a bounded timeout, terminates the child it owns on failure, and
   reports whether the process exited, the port was occupied, or health timed
   out. The operational parent requests shutdown through a fixed local stdin
   handshake so the runtime wrapper can stop its direct Next.js child on
   Windows without external process-tree authority. It never opens a dead page.
5. `--check` performs a no-start/no-browser readiness inspection. `--json`
   exposes only non-secret posture. `--no-open` supports headless verification.
   `--smoke` starts a free-port runtime, proves the exact health contract, stops
   only the child tree it owns, confirms health is gone, and exits.
6. `NexusPrime.bat` is the single supported Windows double-click entry point.
   It does not install packages, start a second shell, poll with unbounded
   loops, or continue after failure.
7. A typed project-skill registry links:
   `concise-technical-output`, `deterministic-media-production`,
   `review-external-agent-skill`, and `run-status-summary` to exact skill
   files, triggers, and Nexus agents.
8. The production router and `AGENTS.md` name all four skills. The live
   assistant capability block receives only the skills assigned to the active
   agent, with paths and trigger summaries.
9. Focused validation fails if launcher wiring, health-gating, skill paths,
   router dependencies, root instruction triggers, Company Map paths, or live
   capability injection drift.

## Failure and recovery behavior

- Missing or unsupported Node/npm: exit nonzero with the supported major.
- Missing dependencies: exit nonzero with `npm install`; do not install
  automatically.
- Missing/weak `NEXUS_TOKEN`: exit nonzero with the existing secure token
  initialization command; do not print or replace the value.
- Invalid or occupied port: exit nonzero before spawning.
- Child exit before health: report its exit state and preserve its visible
  logs.
- Health timeout: stop only the child created by this command and report a
  retry plus the health URL.
- Browser-open failure after verified health: keep the runtime alive and print
  the exact HQ URL for manual opening.

## Boundaries and exclusions

- No phone/PWA acceptance work.
- No package install, dependency change, network provider probe, deployment,
  Git publication automation, or secret output.
- No replacement of `lib/ai.ts`, assistant governance, provider selection, or
  Company Map ownership.
- No claim that every future runtime error is impossible. The contract is
  bounded detection, fail-closed behavior, recovery guidance, and proof for
  the supported local path.
- Do not stage or rewrite the unrelated Aurora/redesign work or `main.bat`.

## Verification

- `npm run operational:start -- --check --json`
- `npm run operational:start -- --smoke --port=3188`
- `npm run operational:start:check`
- `npm run agent:instructions:check`
- `npm run production:skills:check`
- `npm run skill:dependency-graph:check`
- `npm run company-map:check`
- `npm run github-skill-intake:check`
- Real local launch with `--no-open`, verified `/api/health`, and owned-process
  cleanup
- `npm run type-check`
- `npm run lint`
- `npm run verify`
- `npm run handoff:write`
- `npm run handoff:check`

## Rollback

Remove the operational-start scripts and package wiring, restore the previous
batch file, remove the project-skill registry/live-context block, and remove
the four new root/router references. Existing runtime, skill files, Company
Map, and provider configuration remain independently usable.

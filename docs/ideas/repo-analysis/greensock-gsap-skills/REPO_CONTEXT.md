# REPO_CONTEXT.md

## Repository Thesis

`greensock/gsap-skills` is the MIT-licensed official Agent Skills guidance for
GSAP. It teaches core tweens, timelines, ScrollTrigger, plugins, utilities,
React/framework lifecycle, and performance. Nexus should use these rules only
when GSAP is deliberately selected, not add GSAP to every animation.

## Repository Shape

- The current `main` tree contains eight skills, examples, assets, and
  Claude/Cursor/agent instruction metadata.
- The README uses the portable Agent Skills format and documents Codex plus
  other hosts.
- The source covers core API, timelines, ScrollTrigger, plugins, utilities,
  React, performance, and other frameworks.

## Execution Model

The repository supplies instruction files rather than a rendering runtime.
Actual behavior requires the separate `gsap` package and any framework
integration. React guidance emphasizes scoped selectors and cleanup; performance
guidance favors transforms and bounded work.

## Nexus Adaptation

The existing `frontend-ui-engineering` and
`deterministic-media-production` skills now require scoped lifecycle cleanup,
transform/opacity preference, deliberate timelines, and reduced-motion handling
when GSAP is already present. They explicitly prohibit implicit dependency
installation.

## Quality Signals and Risks

The guidance is official, narrowly structured, portable, and explicitly
licensed. The main risk is tool monoculture: a skill recommendation is not proof
that GSAP is the smallest choice for a Nexus interaction. Current product
dependencies and design authority remain controlling. Reviewed 2026-07-27.

# REPO_CONTEXT.md

## What this is

`Varnan-Tech/OpenDirectory` is an MIT-licensed agent-skill catalog for founder,
go-to-market, growth, visual-production, research, and developer-tool work. The
current `main` README lists 62 skills across eight categories and supports
installation into multiple coding-agent hosts.

This was a strategic remote review of the current README, package manifest,
license, catalog shape, installation paths, contribution posture, and selected
skill descriptions. GitHub's connected contents API supplied the primary files
because the local shell could not reach GitHub over port 443. No clone,
dependency execution, installer run, or exhaustive audit of every upstream
prompt body is claimed.

The prior Nexus review described an older general resource directory with three
capabilities. That is not the current repository.

## Stack

- Markdown `SKILL.md` procedures under `skills/`.
- TypeScript CLI and build scripts in a pnpm workspace.
- Interactive category/search/install TUI distributed through npm.
- Optional skills.sh, Claude plugin, desktop ZIP, and host-specific installers.
- Vitest, Zod, gray-matter, Sharp, and repository automation.

## Current inventory

- Visual & Media: 10
- Content: 10
- Launch: 5
- GTM Intelligence: 16
- Outreach: 2
- Research: 9
- Developer Tools: 9
- Other: 1
- Total: 62

## How it works

The README presents a browsable category catalog, then lets the operator choose
a skill and target host. The CLI or another installer copies selected skill
material into that host. Individual workflows range from local drafting and
artifact production to live research, media rendering, advertising, social
posting, cloud publication, repository mutation, and lead/outreach automation.

That mix means source availability is not execution authority. Some procedures
can run locally from user-owned evidence; others require browser, media,
provider, repository, social, or business-system connectors and explicit
account-level approval.

## File map

- `README.md` - current 62-skill inventory, categories, descriptions, and
  installation choices.
- `skills/*/SKILL.md` - individual source procedures.
- `packages/cli/` - interactive discovery and multi-host installation.
- `.claude-plugin/` - Claude marketplace distribution.
- `CONTRIBUTING.md` - skill format and validation requirements.
- `scripts/` - catalog and plugin generation.
- `package.json` - private workspace manifest, version `1.0.1`, and validation
  dependencies.
- `LICENSE` - MIT license.

## Entry points

- Start with `README.md` for the current category and capability inventory.
- Read only the selected `skills/<id>/SKILL.md` when source-specific detail is
  needed.
- Treat npm, skills.sh, plugin, desktop ZIP, and host-native paths as
  distribution options, not required Nexus dependencies.

## Dependencies

The procedure text is Markdown, but individual skills may rely on Gemini,
Groq, Taddy, SerpApi, Chart.js, Playwright, FFmpeg, Ghost, Notion, Slack,
Linear, GitHub, social platforms, cloud storage, advertising accounts, or
other external systems. Nexus must report those prerequisites instead of
pretending they are connected.

## Plan

### To use / integrate

1. Replace the stale three-row matrix with all 62 current skill IDs.
2. Adapt the 58 safe and product-relevant workflows into original,
   project-owned operating contracts.
3. Group them by the eight source categories and eight bounded Nexus procedure
   families.
4. Expose search, filters, full procedure resolution, availability, and source
   evidence in the existing Skill Library.
5. Give agents bounded read-only list and resolve tools.
6. Keep actual source reads, renders, providers, files, accounts, messages,
   ads, posts, PRs, dependency changes, and publication on existing protected
   paths.

### To exclude

- `cold-email-verifier`: autonomous address guessing and enrichment.
- `npm-downloads-to-leads`: personal-contact lead harvesting from maintainer
  activity.
- `yc-intent-radar-skill`: authenticated-session login-bypass scraping.
- `claude-md-generator`: a competing legacy authority file.
- The upstream CLI, marketplace, plugin, bulk install, and host-global mutation.

## Open questions

None for the bounded catalog adaptation. Live execution remains dependent on
the separately selected source, tool, connector, account, and operator
authority.

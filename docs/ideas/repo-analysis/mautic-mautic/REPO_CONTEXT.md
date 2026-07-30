# REPO_CONTEXT.md

## What this is

`mautic/mautic` is a GPL-3.0 open-source marketing automation application. Its
current default branch is `7.x`. Mautic's product covers campaigns, contacts,
segments, forms, messages, analytics, integrations, and a large self-hosted
PHP application surface.

This was a strategic remote review of the current README, Composer manifest,
license, and official Campaign Builder documentation. GitHub and official
Mautic documentation supplied primary evidence because the local shell could
not reach GitHub over port 443. No clone, dependency installation, PHP
execution, deployment, or exhaustive audit of the upstream application is
claimed.

The useful Nexus pattern is narrower than Mautic's product: a visual workflow
editor whose steps can be arranged, edited, cloned, reviewed, and explicitly
activated. Nexus adapts that pattern into its existing local Workflow Forge,
not into a marketing automation service.

## Stack

- PHP application built around Symfony components.
- Composer workspace with first-party Mautic packages and plugins.
- JavaScript/CSS frontend assets and campaign-canvas interaction.
- Database-backed contacts, segments, forms, campaigns, events, and reports.
- Console/cron processing for campaign updates and triggers.
- GPL-3.0 license, with compatible third-party notices in `LICENSE.txt`.

## How the relevant source works

Official documentation describes the Campaign Builder as a visual canvas.
Mautic campaigns begin from contact sources, then connect actions, decisions,
and conditions. Events can be dragged, arranged, copied, and pasted. External
campaign execution depends on the wider contact database, message channels,
integrations, and scheduled console triggers.

Those surrounding systems are precisely what Nexus does not inherit. The
project-owned adaptation treats each node as a reviewable draft-work step,
rebuilds one deterministic sequence after structural edits, persists locally,
and blocks a staged run while edits remain unsaved.

## File map

- `README.md` - product identity, privacy, self-hosting, and customization
  posture.
- `composer.json` - project manifest, package topology, and GPL-3.0 declaration.
- `LICENSE.txt` - GPL-3.0 terms and compatible third-party notices.
- `app/bundles/CampaignBundle/` - upstream campaign domain implementation.
- Official `campaigns/campaign_builder.html` documentation - canvas, event,
  decision, condition, drag, navigation, cloning, and trigger behavior.

## Entry points

- Start with the current `7.x` README and `composer.json` for product and
  license truth.
- Use official Campaign Builder documentation for the interaction contract.
- Do not copy or import CampaignBundle code, frontend assets, styles, schemas,
  text, or runtime dependencies.

## Dependencies and authority

Mautic's complete runtime expects PHP, Symfony components, a database, workers
or cron, mail and marketing channels, contact data, and optional integrations.
None of those are implied by the visual-builder pattern. Nexus gains no
contact, provider, account, sending, scheduling, tracking, or campaign
activation authority from this source.

## Plan

### To use / integrate

1. Add an original human-gated Campaign Draft Studio template to Workflow
   Forge.
2. Merge missing built-in workflows into existing local state without
   replacing operator definitions.
3. Complete node editing, add/duplicate/remove, drag ordering, equivalent
   keyboard controls, deterministic edges, save, clone, export, and dirty-state
   run gating.
4. Validate all saved graphs at the protected server route.
5. Keep output local and draft-only until a human separately authorizes any
   external action.

### To exclude

- The marketing automation platform and deployment/runtime.
- Contacts, segmentation, behavioral tracking, scoring, forms, and CRM.
- Email, webhook, ad, social, integration, or other outbound execution.
- PHP/Symfony architecture and all upstream code/assets.
- Infinite-canvas and branching semantics that would add complexity without a
  current Nexus execution need.

## Open questions

None for the bounded linear draft-builder adaptation. Branching should remain a
separate future product decision backed by a real Nexus use case.

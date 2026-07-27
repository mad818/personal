# Mautic Campaign Draft Builder

## Outcome

Complete the feasible `mautic/mautic` campaign-builder pattern inside the
existing Nexus Workflow Forge as a local, human-approved campaign-draft
editor. The result must support the whole Nexus editing lifecycle rather than
shipping a static example: discover, create, edit, reorder, duplicate, remove,
save, clone, export, and stage a reviewed local run.

## Source truth

- Primary source: `https://github.com/mautic/mautic`
- Reviewed branch: `7.x`
- Reviewed: 2026-07-26
- Reviewed README blob: `5bdf397ee9bb394b70590369b9e757fdd681f8a0`
- License: GPL-3.0
- Product evidence: Mautic describes itself as an open-source, self-hostable
  marketing automation application.
- Campaign-builder evidence: current Mautic documentation describes a visual
  canvas with draggable sources and events, action/decision/condition paths,
  event cloning, and explicit activation.

The previous Nexus matrix pointed at the obsolete `main` branch and left the
visual builder as a one-line pending idea.

## Existing Nexus seams

- `/skills?view=workflow-forge` already exposes a reachable Workflow Forge.
- `lib/assimilation/seeds.ts` owns built-in workflow templates.
- `lib/assimilation/storage.ts` owns local JSON persistence.
- `/api/workflows` owns workflow list/save operations.
- `/api/workflow-runs` stages reviewed local run artifacts.
- `docs/ideas/source-parity/` owns exhaustive implementation and exclusion
  proof.

## Product contract

1. Add one built-in `Campaign Draft Studio` workflow with an approved brief,
   evidence/audience synthesis, channel-package drafting, human sanction, and
   draft-package output.
2. Merge newly introduced built-in workflows into existing local state by ID
   without overwriting operator-edited definitions.
3. Make every workflow graph editable through:
   - node title, detail, and bounded type controls;
   - add, duplicate, and remove actions;
   - drag-and-drop ordering;
   - visible left/right controls as the keyboard-accessible equivalent;
   - deterministic linear edge reconstruction after structural edits.
4. Persist the current draft nodes and edges on save, clone the current draft,
   and copy the current draft JSON.
5. Clearly distinguish unsaved graph state and refuse to stage a run until the
   current draft is saved.
6. Validate workflow payloads server-side with bounded strings, identifiers,
   tags, node/edge counts, valid node types, unique IDs, contained edges, and
   an approval node for campaign-tagged `human_gate` definitions.
7. Keep the campaign template draft-only and human-gated. It may produce a
   local draft artifact; it must not send email, mutate contacts, publish,
   schedule, call Mautic, or activate an external campaign.

## Safety and truth boundaries

- No upstream PHP, Symfony code, JavaScript, styles, assets, text templates, or
  product UI is copied.
- GPL source is used only as documented pattern evidence; the implementation
  is original project-native TypeScript/React.
- No CRM, contact store, segmentation, tracking pixel, lead scoring,
  behavioral profiling, email sender, webhook, ad account, or integration.
- No autonomous campaign activation, cron trigger, scheduler, provider call,
  browser action, or new external API.
- Existing operator workflows are never overwritten by a new built-in seed.
- No phone/PWA or game/RPG work.

## Verification

- Deterministic runtime proof for default merging, edit normalization, edge
  rebuilding, schema rejection, human-gate enforcement, and unsafe campaign
  boundary rejection.
- Static proof for the reachable editor controls, drag and keyboard ordering,
  dirty-state run guard, current-draft save/clone/export, source parity,
  repository analysis, benefits, package wiring, and canonical verification.
- `npm run mautic:campaign-builder:check`
- `npm run source:parity:check`
- `npm run components:detached:check`
- `npm run type-check`
- `npm run lint`
- Exact staged-scope canonical isolated verification and an isolated commit.

## Benefits

- Campaign planning becomes a reusable visual workflow instead of an informal
  checklist.
- Mouse and keyboard operators can fully shape a draft without editing JSON.
- Existing installations receive new project templates safely while retaining
  their own changes.
- Server validation prevents malformed or oversized graphs from becoming
  trusted local state.
- The useful visual-builder pattern is gained without importing Mautic's CRM,
  surveillance, sending, scheduling, or deployment surface.

## Non-goals

- Reproduce Mautic, its infinite canvas, CRM, automation engine, conditions,
  contact decisions, campaign analytics, or multi-channel delivery.
- Import, execute, install, or connect the upstream repository.
- Add free-form graph branching in this tranche; Nexus Workflow Forge keeps a
  deterministic reviewable sequence.
- Create a new route, provider, background process, or credential store.

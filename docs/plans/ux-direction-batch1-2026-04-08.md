# UX Direction Batch 1 — intuitive, interactive, cohesive Nexus improvement brief

Date: 2026-04-08
Owner: Codex

## Why this batch

Nexus already has strong capability depth:

- HQ as a command room
- COMMAND as an operator surface
- INTEL / ALPHA / CYBER / RECON as domain-specific workspaces
- VAULT as memory/archive
- VEHICLE as future hardware readiness

The current problem is not lack of features. It is **orientation and coherence**:

- new users can land in a powerful surface without immediately understanding the best first action
- several tabs still feel text-heavy, especially when guidance, controls, and diagnostics all compete at once
- cross-surface flows exist, but they are not always framed as one connected mission

The goal is to improve Nexus **without removing what exists**. We should make it easier to understand, easier to explore, and more satisfying to operate.

## External inspiration to absorb

### 1. My Brain Is Full Crew

Useful pattern:

- chat is the interface
- guided onboarding over tool hunting
- the system feels like a crew, not a pile of utilities
- honest, low-friction framing for overwhelmed users

Nexus translation:

- make the primary entry question obvious: “What do you want to do right now?”
- use guided task rails and prefills more aggressively
- reduce the feeling that users must understand the entire information architecture before doing one useful action

### 2. Taste Skill

Useful pattern:

- avoid generic dashboard-card sprawl
- use strong spacing, visual hierarchy, and motion intentionally
- control the output with a few dials like density and motion instead of random variation

Nexus translation:

- define explicit UX dials for future improvements:
  - `CLARITY_PRIORITY`: how aggressively copy/UI are simplified
  - `VISUAL_DENSITY`: how much fits on screen before the surface becomes overwhelming
  - `MOTION_INTENSITY`: how cinematic vs restrained a surface should feel
- use these dials consistently across HQ, scheduler, and VAULT, instead of surface-by-surface improvisation

### 3. xyOps

Useful pattern:

- job scheduling, monitoring, alerts, and incident context all live in one connected loop
- action, telemetry, and auditability are linked

Nexus translation:

- keep strengthening the “everything talks to everything else” model:
  - workflows -> scheduler -> artifacts -> memory pages -> vault graph
  - alerts -> relevant tab -> prefilled investigation lane
  - route transitions -> preserved context -> next best action

## Product principles for Nexus

1. **Do not remove tabs.**
   Keep HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT, and VEHICLE.

2. **Do not flatten Nexus into a generic SaaS dashboard.**
   Preserve the command-room identity, cinematic HQ, and operator feel.

3. **Make first action obvious.**
   Every major surface should answer:
   - what is happening
   - what matters most
   - what I can do next

4. **Prefer progressive disclosure over visible complexity.**
   Guidance should stay available, but not all at once.

5. **Preserve free-first and local-first defaults.**
   No UX improvement should quietly assume a paid provider or cloud service.

## Highest-priority UX improvements

### P1 — Add a cross-app “mission rail” without removing tabs

Tabs should remain, but the user should also have a task-first layer:

- Observe
- Investigate
- Automate
- Archive
- Launch

Each route can prefill the relevant tab instead of replacing it.

Example:

- `Observe` -> COMMAND / INTEL summary
- `Investigate` -> CYBER / RECON / memory ask
- `Automate` -> scheduler workflows
- `Archive` -> VAULT / compiled pages / graph
- `Launch` -> VEHICLE / drone readiness / checklist

Why:

- preserves current architecture
- reduces “where do I start?” friction
- gives first-time users a job-oriented mental model

### P2 — Make HQ the best “start here” surface

HQ should feel like the universal operator entrypoint, not just the coolest one visually.

Improve:

- stronger “Start with…” quick actions
- clearer mission chips
- more obvious handoff destinations
- less persistent explanatory text

Keep:

- 3D room
- command chronicle
- agent identity

### P3 — Reduce text overload with collapsible operator notes everywhere

We already started this pattern. Keep spreading it intentionally.

Good candidates:

- VAULT graph/help text
- VEHICLE onboarding and future-hardware readiness notes
- RECON tool guidance
- CYBER doctrine/compliance explanation

Rule:

- one sentence visible
- deeper explanation expandable
- actionable chips nearby

### P4 — Improve cross-tab continuity

Nexus is already close here. We should make it more explicit.

Ideas:

- when a route opens another tab, show a small “why you were sent here” breadcrumb
- preserve the original question or trigger in a compact strip
- keep one-click return to origin

This makes the app feel like one system, not disconnected sections.

### P5 — Turn more state into understandable posture

Many Nexus surfaces expose power but still make the user infer meaning.

Improve with compact posture blocks:

- Fresh / local / degraded
- Manual / automated / review-only
- Simulated / bridge / live
- Safe / internal / restricted

The point is not more badges. The point is clearer trust language.

## Strong interaction ideas that fit Nexus

### 1. “Continue mission” chips

At the bottom of key responses/panels:

- `Investigate in RECON`
- `Save to VAULT`
- `Schedule this`
- `Ask memory`
- `Open compliance review`

These already exist in pieces. Standardize them.

### 2. Surface-specific micro-motions

- HQ: cinematic, sparse, room-aware
- COMMAND: crisp, tactical, fast
- VAULT: soft reveal, archive-like
- VEHICLE: checklist/status confidence cues

Motion should reinforce function, not decorate it.

### 3. “What changed” pulses

Instead of raw refresh cues, use subtle “updated” signals on:

- scheduler results
- memory updates
- graph refreshes
- live intel panels

### 4. Guided empty states

Empty states should not just say “nothing here.”
They should say:

- what this surface is for
- what to do first
- one immediate action

## Prompt dials for future UI work

Use these when redesigning or polishing any Nexus surface:

- `CLARITY_PRIORITY`: `high`
- `VISUAL_DENSITY`: `medium`
- `MOTION_INTENSITY`: `medium`
- `OPERATOR_GUIDANCE`: `progressive`
- `SURFACE_PERSONALITY`: route-specific, not uniform

## Rewritten Nexus-specific prompt

Use this instead of the generic website prompt:

---

**Improve Nexus Prime, a local-first intelligence command system, without removing or replacing its existing core surfaces.**

Nexus already includes these major tabs and capabilities:

- HQ as the cinematic command room and universal operator entry point
- COMMAND for status, workflows, and decision support
- INTEL / ALPHA / CYBER / RECON for domain-specific investigation
- VAULT for memory, compiled pages, archive, and graph exploration
- VEHICLE for future drone and hardware readiness

The goal is not to redesign Nexus into a generic SaaS dashboard. The goal is to make the current product more intuitive, interactive, and cohesive while preserving its identity.

### Design goals

- Improve clarity without removing depth
- Make first actions obvious for new and returning users
- Reduce visible text overload through progressive disclosure
- Preserve the premium, cinematic, operator-grade feel
- Keep the UI fast, smooth, and readable on mobile and desktop
- Maintain free-first and local-first defaults

### Product constraints

- Do not remove tabs, workflows, memory, scheduler, or the HQ command-room concept
- Do not replace the 3D HQ experience with a generic flat interface
- Do not introduce cloud-only assumptions or paid-only defaults
- Improve by refining, clarifying, and connecting what already exists

### UX objectives

- Every major surface should immediately answer:
  - what is happening
  - what matters most
  - what I can do next
- Navigation should feel mission-based, not just tab-based
- Cross-tab transitions should preserve context and explain why the user was routed
- Guidance should be compact by default and expandable when needed
- The most important action on each surface should visually dominate

### Interaction goals

- Use subtle but meaningful motion, not decorative animation
- Add micro-feedback for updates, route transitions, and successful actions
- Use reusable “continue mission” actions like:
  - Investigate in RECON
  - Save to VAULT
  - Ask memory
  - Schedule this
  - Open compliance review
- Keep interactions satisfying and fast, especially in operator workflows

### Visual direction

- Premium but restrained
- Strong spacing and hierarchy
- Dense where useful, never cramped
- Utility-first copy on operational surfaces
- Cinematic atmosphere in HQ, cleaner tactical posture in COMMAND, archive calm in VAULT
- Avoid dashboard-card sprawl and repetitive chrome

### Specific improvement targets

- Make HQ feel like the best universal starting surface
- Add a mission-oriented layer on top of existing tabs (Observe / Investigate / Automate / Archive / Launch)
- Reduce text overload in scheduler, VAULT, RECON, CYBER, and VEHICLE through compact notes and expandable help
- Improve state trust language with clearer posture labels such as:
  - fresh / local / degraded
  - manual / automated / review-only
  - simulated / bridge / live
  - safe / internal / restricted
- Strengthen onboarding and “empty state” guidance so the app is understandable without prior context

### Technical requirements

- Use the existing Next.js, React, Zustand, and shell component architecture
- Keep code reusable and split large files into smaller sections/hooks/components where helpful
- Protect performance, accessibility, and SEO
- Prefer local data flow and protected local routes over browser-direct external dependencies
- Make every improvement compatible with the project’s existing free-first, self-hosted posture

### Success criteria

- The app feels easier to understand within the first 30 seconds
- The user needs fewer clicks and less guesswork to reach the right workflow
- Tabs feel connected instead of siloed
- Dense surfaces remain powerful but easier to scan
- The experience feels premium, smooth, and intentionally designed without losing the current Nexus identity

---

## Suggested next implementation order

1. Add a mission-oriented entry layer over existing tabs.
2. Tighten HQ start actions and route breadcrumbs.
3. Continue spreading compact-note + expandable-help patterns.
4. Standardize “continue mission” actions across tabs.
5. Keep splitting heavy route files as UX seams become clearer.

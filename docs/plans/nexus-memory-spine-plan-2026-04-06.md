## Nexus Memory Spine Plan — 2026-04-06

### Why this matters

Nexus already has fragments of long-term memory:

- saved articles
- agent learnings
- mode briefings
- agent run artifacts
- Vault graph and synthesis

But those fragments do not yet form one explicit memory system.

This plan turns Nexus from:

- a dashboard with chat and archive features

into:

- a local-first command workspace with a compounding memory spine

The product value of that shift:

1. better answers from durable context, not just live context
2. lower token waste by querying compiled memory instead of rehydrating raw prompt state
3. stronger operator trust through provenance, evidence, and recall
4. higher product defensibility because work compounds into institutional memory

### Product framing

Map the Karpathy / Nick workflow and StixDB memory pattern into Nexus:

- `raw` → clips, feeds, sweep snapshots, transcripts, telemetry, notes
- `wiki` → doctrine, learnings, dossiers, incident pages, theses
- `outputs` → briefs, compare matrices, evidence packs, reports, recaps

Nexus should own the product shell and memory contract.
Any future StixDB-style sidecar should be optional infrastructure behind that contract, not the product itself.

### Principles

1. Local-first and inspectable
2. No hidden writeback without clear provenance
3. Raw, knowledge, and output layers remain distinct
4. Every derived artifact keeps its sources visible
5. Search should work before a server or sidecar is required

---

## Phase 1 — Memory Spine Foundation

### Goal

Make the memory model explicit and queryable with existing data.

### Deliverables

1. Shared memory types and layer taxonomy:
   - `raw`
   - `knowledge`
   - `output`
2. A derivation layer that unifies:
   - `savedArticles`
   - `agentLearnings`
   - `agentRunHistory`
   - `modeBriefings`
3. Lightweight search and stats over that spine
4. A visible VAULT overview surface

### Why

This gives the app a real memory vocabulary without waiting on database work or a sidecar process.

### Success criteria

- Operators can search across multiple memory sources from one surface.
- The product clearly shows the difference between raw artifacts, compiled knowledge, and derived outputs.
- The layer is pure and portable so future APIs or StixDB-sidecar integration can reuse it.

---

## Phase 2 — Compiler Layer

### Goal

Promote raw artifacts into curated knowledge pages.

### Deliverables

1. Compiled memory page type:
   - doctrine page
   - entity dossier
   - incident page
   - market thesis
2. Background or on-demand compile jobs
3. Contradiction, orphan, stale, and unsupported-claim checks
4. Registry custody rules for compiled outputs

### Why

Raw data is not memory. Curated linked knowledge is memory.

### Success criteria

- VAULT contains true compiled pages, not only saved clips.
- The librarian can propose maintenance actions against compiled pages.

---

## Phase 3 — Query APIs + Retrieval Contract

### Goal

Expose the memory spine to agents and UI through one contract.

### Deliverables

1. `/api/memory/search`
2. `/api/memory/stats`
3. `/api/memory/ask`
4. `/api/memory/graph`

Every answer should return:

- answer
- confidence
- sources
- related items

### Why

This is where memory stops being a UI-only concept and becomes reusable infrastructure for HQ, scheduler missions, and future hardware lanes.

### Success criteria

- HQ workflows can cite memory sources directly.
- Scheduled jobs can retrieve from compiled memory instead of re-sending bulky prompts.

---

## Phase 4 — Output Loop Closure

### Goal

Make high-value workflows write back into memory automatically and safely.

### Deliverables

1. `/deepresearch` writes a brief artifact
2. `/compare` writes a decision matrix artifact
3. `/threat-hunt` writes an evidence ledger
4. `/evidence-pack` writes an incident package
5. Vehicle and hardware sessions write mission artifacts

### Why

Without writeback, memory does not compound.

### Success criteria

- High-value workflows leave reusable artifacts behind.
- Weekly synthesis and operator recall improve automatically over time.

---

## Phase 5 — Scheduler and Mission Integration

### Goal

Turn memory workflows into recurring missions.

### Deliverables

1. Scheduler-ready memory missions
2. Mission outputs routed to:
   - Vault
   - notify
   - review
3. Support for memory refresh / compile / synthesize jobs

### Why

This is the point where Nexus becomes a self-maintaining command memory, not just a manually operated workspace.

### Success criteria

- Operators can run recurring research, synthesis, and vault health jobs.
- Scheduler output increases memory quality rather than producing isolated text.

---

## Phase 6 — Optional StixDB Sidecar Evaluation

### Goal

Evaluate whether a StixDB-like engine materially improves retrieval, graph quality, or ask performance.

### Rules

- Feature flag only
- local-only
- Nexus contract remains the product boundary
- no hard dependency before a measurable win

### Why

The idea is valuable. Lock-in to a sidecar before the product contract is stable is not.

### Success criteria

- measurable retrieval win
- better graph / ask quality
- no regression in local-first inspectability

---

## Immediate execution batch

### Batch M1 — explicit memory spine

1. publish this plan
2. add a pure `lib/memorySpine.ts`
3. derive unified memory items from existing store sources
4. add search + stats helpers
5. add a `MemorySpineOverview` surface inside VAULT
6. update backlog and handoff

### Batch M2 — query endpoints

1. expose `search` and `stats` via local routes
2. feed HQ and scheduler from the same contract

### Batch M3 — compiler + writeback

1. compiled pages
2. workflow artifact writeback
3. registry custody

---

## What this improves

### HQ

- less repeated context stuffing
- better recall across sessions
- more trustworthy briefs

### VAULT

- stops being only a saved-clips bucket
- becomes the visible memory backbone

### CYBER

- evidence packs and incident pages become durable memory

### INTEL

- research briefs and compare matrices become reusable assets

### Scheduler

- recurring jobs can maintain memory quality, not just generate text

### Future hardware lanes

- manuals, telemetry artifacts, incident bundles, and replay notes can all enter the same memory system

---

## Sell

If we do this right, Nexus stops feeling like:

- a smart dashboard

and starts feeling like:

- a self-compiling operational memory for the operator and their agents

That is a stronger product, a stronger moat, and a stronger reason for this project to exist.

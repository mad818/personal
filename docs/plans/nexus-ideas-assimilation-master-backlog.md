# Nexus Ideas Assimilation Master Backlog — Agent Platform First

> Status: Canonical ecosystem roadmap.
> Scope: Master backlog only. This document does not replace the active UXA3 merged-main queue in `tasks/todo.md`.
> Sources: `docs/ideas/external-links-mapping.md`, `docs/ideas/assimilated-ecosystem.md`, `docs/plans/a-evolve-assimilation-plan.md`, `docs/plans/nexus-runtime-assimilation-plan.md`

---

## 1) Summary

This roadmap turns the latest GitHub intake into a **broader ecosystem-backed agent-platform program**. It is not a UI sprint and it is not a request to vendor external repos. It exists to improve the Nexus runtime where those repos actually fit:

- memory quality
- eval discipline
- privacy shielding
- isolated execution
- safer artifact and repo intelligence

The program runs **adjacent to** the current UXA3 merged-main work. UXA3 remains the live product cleanup lane. This backlog governs what comes next on the **agent/platform** side once a tranche is selected.

### Program rules

1. **Platform gains first, visible surfaces second.**
2. **Local-first, review-first, advisory-only** remain the default operating posture.
3. **No vendoring** of third-party repos.
4. **No offensive automation** and no widening CYBER/RECON into exploit tooling.
5. Every tranche must land through existing Nexus seams before any new top-level surface is considered.

### Existing seams to extend

- `lib/assistantSessionMemory.ts`, `lib/assistantSessionRegistry.ts`, `lib/liveContext.ts`
- `lib/agent.ts`, `docs/metrics/*`, runtime eval and diagnostics routes
- `app/api/ai/route.ts`, `lib/privacyShieldClient.ts`, trust/runtime posture surfaces
- `app/api/tools/route.ts`, tool capability policy, local data policy, protected-action flow
- `lib/repoAssimilation.ts`, `lib/repoCompare.ts`, `lib/serverRepoIntel.ts`, VAULT continuity and artifact flows

---

## 2) Ranked Backlog

## P0 — Build First

### P0.1 Correction Memory + Context Spine

**Primary inputs:** `pro-workflow`, `claude-mem`, `prompt-master`

**Why first**
- Nearly every later idea depends on better memory retrieval and less prompt pollution.
- Nexus already has memory, lessons, live-context compaction, and repo/session registries; the missing piece is a typed correction-memory layer with provenance and weighting.

**Ship**
- Durable correction-memory entries separate from generic lessons and generic memory.
- Retrieval weighted by:
  - route/surface
  - agent ID
  - repo path or subsystem
  - task type
  - recency / approval state
- Approval-gated promotion from ephemeral correction candidates into durable memory.
- Visible provenance in the runtime or diagnostics when a memory item influenced a plan, answer, or repo-assimilation brief.

**Fit to current seams**
- Memory capture and retrieval should extend `assistantSessionMemory`, `assistantSessionRegistry`, `liveContext`, and lesson-promotion flows rather than invent a parallel subsystem.
- Repo/workflow memory should connect to the existing VAULT continuity and compiled-page reopen logic.

**Acceptance**
- Relevant corrections are retrieved for matching route/agent/path/task contexts.
- Unrelated lessons do not pollute prompts.
- Operators can tell when a durable memory item influenced a run.

### P0.2 Eval-First Runtime Improver

**Primary inputs:** `a-evolve`, `atlas-gic`, `karpathy/autoresearch`, `openevolve`

**Why first**
- Nexus already has runtime eval, recorded metrics, thresholds, and diagnostics.
- The missing capability is a bounded experiment harness for prompt/routing/memory policy variants that can prove wins without mutating production behavior.

**Ship**
- Experiment variant definitions for:
  - prompt deltas
  - routing changes
  - context/memory policies
  - tool-catalog / tool-selection rules
- A benchmark lane that runs variants against the existing eval stack and stores the result as repo-native artifacts.
- Automatic keep/reject recommendations based on measured wins only.
- Experiment archive and reproducible result summaries in metrics/artifact storage.

**Hard boundary**
- No autonomous production self-modification.
- Variant acceptance only produces a recommendation and evidence bundle, never a silent live mutation.

**Acceptance**
- Variant runs are reproducible.
- A losing variant is rejected without affecting the live runtime.
- A winning variant is promotable only through explicit human review.

### P0.3 Privacy Shield 2.0

**Primary inputs:** `LLM-anonymization`, existing privacy-shield posture

**Why first**
- Privacy guarantees affect every cloud-bound AI call and every future intelligence feature.
- The repo already surfaces privacy-shield state; the missing layer is deterministic redaction with visible operator evidence.

**Ship**
- Deterministic redaction classes for:
  - secrets and tokens
  - local repo paths
  - internal hostnames / service names
  - credentials and auth material
  - sensitive incident evidence
  - sensitive operator-entered payload fragments
- Structured redaction metadata returned alongside current privacy-shield posture.
- Operator-visible summaries explaining what was redacted and why.
- A hard rule that raw sensitive payloads never leave the local boundary unless posture and policy explicitly allow it.

**Fit to current seams**
- Extend `app/api/ai/route.ts` and the privacy-shield client/trust surfaces instead of introducing a separate gateway abstraction first.

**Acceptance**
- Secrets and sensitive evidence are redacted before cloud-bound dispatch.
- Operators can inspect summary-level redaction evidence without exposing the underlying secret values.
- Local-only flows still work without false-positive over-redaction.

### P0.4 Isolated Tool Execution Substrate

**Primary inputs:** `CubeSandbox`, `agent-infra/sandbox`

**Why first**
- Tool safety is already a first-class concept in Nexus through capability classes and protected actions.
- The missing capability is a pluggable isolated runner for the highest-risk classes.

**Ship**
- An isolated-execution adapter boundary behind the current tool capability policy.
- Explicit separation between:
  - local safe read
  - approval-gated mutation
  - sandbox-required execution
- Clear fallback behavior when isolation is unavailable:
  - fail closed
  - degrade with operator-visible reason
  - never silently run outside the required boundary

**Fit to current seams**
- Extend `app/api/tools/route.ts` and tool-capability policy rather than replacing the tool API.

**Acceptance**
- High-risk execution either runs in isolation or fails closed with a clear reason.
- Existing safe read and approval-gated mutation flows continue to work unchanged.

---

## P1 — Highest ROI After P0

### P1.1 Artifact Classification for VAULT and Project Inspection

**Primary input:** `magika`

**Ship**
- Typed artifact classification for uploads, project files, generated briefs, and evidence bundles.
- Metadata such as:
  - `artifactType`
  - `confidence`
  - `sensitive`
  - `parserHint`
- Integration with VAULT continuity and future inspection surfaces.

**Why it matters**
- This improves repo assimilation, local file triage, and future upload handling without widening into a general file-analysis product.

### P1.2 Passive AI Exposure Review Packs

**Primary inputs:** `ai_osint`, `Anthropic-Cybersecurity-Skills`, `deep-eye`, `hackingtool`

**Ship**
- Passive-first advisory review packs for:
  - exposed LLM endpoints
  - leaked key patterns
  - vector store exposure
  - MCP exposure
  - unsafe agent deployment posture
- RECON/CYBER checklist and taxonomy upgrades only.

**Boundary**
- No exploit chains.
- No scanning automation.
- No target expansion beyond passive/advisory boundaries.

### P1.3 Repo Assimilation Workflow Upgrade

**Primary inputs:** `pro-workflow`, `agency-agents`, current repo-assimilation stack, ORBIT handoff patterns

**Ship**
- Stronger bounded repo-fit briefs.
- Correction-memory reuse for repeated ecosystem comparisons and repo-adoption reviews.
- Explicit `adopt / adapt / reject` outcomes.
- Handoffs that reference actual repo extension points, not only abstract fit language.

**Why it matters**
- Nexus already has repo intel, compare, and assimilation flows. This tranche makes them sharper and more reusable instead of creating a new feature family.

### P1.4 Bounded Background Missions

**Primary inputs:** `gnhf`, `aeon`, existing scheduler/n8n/auto-job posture

**Ship**
- Reviewed “overnight work” missions with:
  - explicit scope
  - target agent
  - output target
  - approval policy
  - expiry
  - re-entry summary
- Defaults remain local-only and review-first.

**Boundary**
- No silent autonomous expansion.
- No hidden background mutation of durable guidance or product code.

---

## P2 — Important, But Only After P0/P1 Stabilize

### P2.1 External MCP Tool Bridge

**Primary input:** `mcporter`

**Ship later**
- Structured external tool descriptors
- OAuth-aware tool contracts
- image/result envelopes
- adapter boundaries so external MCP integrations do not leak provider-specific semantics into the core loop

### P2.2 Visual Editing / Design Workflow Companion

**Primary inputs:** `onlook`, `taste-skill`

**Ship later**
- Docs and optional workflow references only
- external-tool patterns for design-to-code or visual iteration

**Non-goal**
- Do not build a visual editor into Nexus during the agent-platform program.

### P2.3 Knowledge Graph and Memory Graphing

**Primary inputs:** `create-context-graph`, `OpenMythos`

**Ship later, if at all**
- Graph views built on top of proven correction-memory and retrieval primitives

**Rule**
- No graph-first build before the memory spine proves itself.

---

## 3) Recommended Tranche Order

This roadmap is a **master backlog**, not “build everything now.” The recommended order is:

### Tranche A — Memory + Privacy

- P0.1 Correction Memory + Context Spine
- P0.3 Privacy Shield 2.0

**Reason**
- These improve almost every future repo-assimilation, research, and tool-execution path.
- They provide value without widening product scope.

### Tranche B — Eval + Isolation

- P0.2 Eval-First Runtime Improver
- P0.4 Isolated Tool Execution Substrate

**Reason**
- After memory and privacy are trustworthy, experiment governance and isolated execution become safer and easier to measure.

### Tranche C — Artifact + Advisory Intelligence

- P1.1 Artifact Classification
- P1.2 Passive AI Exposure Review Packs
- P1.3 Repo Assimilation Workflow Upgrade

**Reason**
- These extend existing Nexus workflows directly and make the new ecosystem batch visibly useful without breaking the security boundary.

### Tranche D — Bounded Mission Layer

- P1.4 Bounded Background Missions
- P2.1 External MCP Tool Bridge, only if mission/tool orchestration pressure proves real

### Tranche E — Optional Workflow / Graph Companions

- P2.2 Visual Editing / Design Workflow Companion
- P2.3 Knowledge Graph / Memory Graphing

---

## 4) Locked Non-Goals

The following remain out of scope for Nexus implementation unless a later plan explicitly changes policy:

- `pentestagent`, `AutoAR`, `oasis`, or similar offensive / automation-heavy security repos
- direct exploit tooling
- general network sniffing
- media-production features based on `hyperframes`, `Recordly`, or the audio cockpit example
- hardware/radio-sensing integrations based on `RuView`
- vendoring external repos into the main app

---

## 5) Interface and Contract Changes

No public routes are required for the first tranche.

The internal contracts that are expected to expand are:

1. **Memory/context**
   - `assistantSessionMemory` and `liveContext` gain typed correction-memory and experiment-variant inputs.

2. **AI route**
   - `app/api/ai` gains structured redaction metadata on top of the current privacy-shield posture.

3. **Tool route**
   - `app/api/tools` gains an isolated-execution adapter boundary and explicit sandbox-required outcomes.

4. **Artifact flows**
   - VAULT and related artifact continuity flows gain typed classification metadata:
     - `artifactType`
     - `confidence`
     - `sensitive`
     - `parserHint`

If new routes are ever added for this program, they should be **internal-only** and narrowly scoped to:
- corrections
- artifact classification
- variant eval
- sandbox execution

---

## 6) Test and Acceptance Criteria

Every selected tranche should keep the standard repo proof lane, plus tranche-specific checks.

### Memory spine
- Relevant corrections are retrieved by route/agent/file/task scope.
- Irrelevant lessons do not pollute prompts.
- Provenance is visible when memory influenced the run.

### Eval improver
- Variants can be benchmarked, accepted, rejected, and archived.
- The live runtime is not mutated automatically.

### Privacy shield
- Secrets and sensitive evidence are redacted before cloud-bound dispatch.
- Redaction preserves enough structure for useful downstream reasoning.

### Sandbox adapter
- High-risk tool paths either run in isolation or fail closed with clear reasons.

### Artifact classification
- Mixed file types route to the correct parser/class.
- Sensitive files are not misclassified as safe.

### Boundary checks
- RECON/CYBER additions remain passive/advisory.
- No exploit automation or third-party scanning posture leaks into the app.

### Standard proof lane
- `type-check`
- `verify`
- runtime eval
- auth / route / tab coverage
- any route-specific regression checks touched by the selected tranche

---

## 7) Defaults and Assumptions

- This document is the **master backlog** for the new ecosystem batch plus the strongest already-assimilated agent-platform ideas.
- It does **not** displace the active merged-main UXA3 queue.
- The first real implementation tranche should be **P0.1 + P0.3**.
- Local-first, review-first, and advisory-only security posture remain non-negotiable.
- Visible product surfaces should only widen after the supporting platform seams are strong enough to keep them safe and explainable.

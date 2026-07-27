# HumanLayer 12-Factor Agent Runtime

## Outcome

Correct the obsolete `humanlayer/12-factor-agents` inventory and complete the
current twelve-factor design as a bounded, original hardening layer inside the
active Nexus agent runtime. The result must change real execution behavior and
preserve existing provider, security, approval, continuity, and verification
seams.

## Source truth

- Primary repository: `https://github.com/humanlayer/12-factor-agents`
- Reviewed branch: `main`
- Reviewed: 2026-07-26
- Current repository inventory: 273 commits visible on the reviewed GitHub
  repository page.
- License: CC BY-SA 4.0 for content/images and Apache-2.0 for code.
- Current factor order:
  1. Natural Language to Tool Calls
  2. Own your prompts
  3. Own your context window
  4. Tools are just structured outputs
  5. Unify execution state and business state
  6. Launch/Pause/Resume with simple APIs
  7. Contact humans with tool calls
  8. Own your control flow
  9. Compact Errors into Context Window
  10. Small, Focused Agents
  11. Trigger from anywhere, meet users where they are
  12. Make your agent a stateless reducer

The prior Nexus matrix used a different factor order after Factor 1, labeled the
source MIT-only, and therefore could not serve as an implementation contract.

## Existing Nexus seams

- `lib/agent.ts` owns tool catalogs, provider loops, deterministic execution,
  approval routing, verification, and final run artifacts.
- `lib/liveContext.ts`, `lib/contextPolicy.ts`, and the HQ prompt builder own
  project context and prompt composition.
- `store/useStore.ts` owns visible execution/business state and a bounded
  persisted run history.
- `propose_project_edit`, pending-edit UI, and unfinished-session continuity
  already provide human contact and explicit re-entry seams.
- UI dispatch, protected HTTP routes, scheduled missions, and the Tauri shell
  are the supported Nexus trigger/delivery surfaces.

## Product contract

1. Add one environment-neutral `agentExecutionContract` module with:
   - an immutable, serializable execution-state reducer;
   - launch, phase, iteration, tool, human-wait, resume, complete, and fail
     actions;
   - bounded event history and a compact persisted summary;
   - hard system/message/total context-character budgets;
   - deterministic middle compaction that preserves authority headers, recent
     instructions, and the latest conversation;
   - bounded tool-result/error compaction with explicit omitted-character
     receipts;
   - tool-input validation against the active tool's declared JSON-schema
     subset, including required fields, allowed properties, enums, strings,
     arrays, item types, and size bounds.
2. Integrate context preparation before every provider path in the active Nexus
   runtime. No provider may receive the unbounded prompt/message set.
3. Validate every model-produced tool input before browser execution, local
   memory/edit handling, or `/api/tools` transport. Unknown tools, unknown
   fields, missing requirements, wrong types, oversized values, and malformed
   arrays fail closed as tool results.
4. Normalize validated structured arguments for the current protected string
   transport without widening the server route. Preserve the existing
   `compare_repos` array behavior deterministically.
5. Compact tool output only in the model context. Keep operator-visible
   feedback and bounded diagnostic proof separate so a large result or error
   cannot consume the next context window.
6. Drive one reducer state through the real agent loop and store its compact
   final summary on the existing `AgentRunArtifact`.
7. Preserve:
   - provider routing through existing Nexus APIs;
   - high-risk proposal/approval behavior;
   - verification adapters and continuity receipts;
   - focused JANSKY/ORBIT/NOVA/CIPHER/FLUX roles;
   - UI, protected HTTP, scheduled-mission, web, and desktop trigger/delivery
     boundaries.

## Twelve-factor proof map

1. Natural language to tool calls: the active model-facing catalog emits named
   structured calls and never executes free-form code.
2. Own prompts: prompts remain project-owned files and `lib/ai.ts`/HQ builders.
3. Own context: the new hard budget prepares every provider request.
4. Structured outputs: declared schemas validate every model-produced tool
   argument before execution.
5. Unified state: reducer summary joins runtime status, objective, context,
   tools, human waits, and completion on the existing run artifact.
6. Launch/pause/resume: reducer APIs plus pending human actions and durable
   unfinished-session re-entry make those transitions explicit.
7. Contact humans: `propose_project_edit` and `ask_max` remain typed human
   contact calls with visible state.
8. Own control flow: provider/tool loops, budgets, retries, and fallbacks remain
   deterministic TypeScript.
9. Compact errors: bounded result compaction protects the next model turn.
10. Small focused agents: the five-role taxonomy and intent-scoped tool packs
    remain authoritative.
11. Trigger/deliver: Nexus supports its owned UI, protected HTTP,
    scheduled-mission, web, and desktop surfaces without pretending Slack,
    email, or arbitrary connectors are installed.
12. Stateless reducer: every execution transition is a pure
    `state + action -> new state` operation with runtime fixtures.

## Safety and truth boundaries

- No upstream prose, images, sample code, packages, CLI, framework, or
  HumanLayer/CodeLayer runtime is copied.
- No direct provider call, new provider, agent framework, queue, webhook,
  messaging connector, email sender, or global installation.
- Factor 11 is scoped to Nexus-owned reachable surfaces. External channels
  remain unavailable until separately connected and authorized.
- The reducer records metadata only; it does not persist prompts, tool
  arguments, tool output, secrets, hidden reasoning, or private context.
- Compaction is explicit and measured; it cannot manufacture a summary of
  omitted source material.
- No phone/PWA or game/RPG work.

## Verification

- Runtime fixtures prove:
  - immutable launch/phase/tool/human-wait/resume/complete/fail transitions;
  - event bounds and metadata-only summaries;
  - total/system/message context ceilings;
  - preservation of prompt head/tail and newest messages;
  - explicit compaction receipts;
  - bounded tool results/errors;
  - valid tool inputs and rejection of unknown/missing/wrong/oversized fields;
  - structured-array transport for repo comparison.
- Static proof maps all twelve current factors to reachable active seams and
  rejects the obsolete matrix names/license.
- `npm run agent:12-factor:check`
- `npm run source:parity:check`
- `npm run type-check`
- `npm run lint`
- Exact staged-scope canonical isolated verification and isolated commit.

## Benefits

- Every provider sees a predictable context ceiling instead of unbounded prompt
  growth.
- Malformed model tool output fails before it reaches browser, memory, edit, or
  protected server execution.
- Large tool responses and verbose failures cannot crowd the next reasoning
  turn.
- One reducer-backed run summary makes launch, phase, tool, human-wait, and
  completion state testable and replay-friendly without storing private
  content.
- The source-parity ledger becomes truthful about the current twelve factors
  and the boundaries of Nexus-supported delivery surfaces.

## Non-goals

- Replace `lib/agent.ts`, Zustand, existing provider routing, or approval UI.
- Add a general agent framework, distributed queue, background daemon, or
  autonomous scheduler.
- Claim arbitrary trigger sources or external Slack/email/messaging delivery.
- Persist full prompts, tool payloads, tool results, or chain of thought.

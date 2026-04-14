# Behavior-First Assimilation Plan — 2026-04-10

## Why this plan exists

Nexus has assimilated a strong set of ideas from external repos, but the next step is not to keep exposing those ideas as more visible controls. The stronger interpretation is behavioral:

- `fff.nvim` should improve how work is found and resumed
- `obsidian-mind` should improve how knowledge shapes itself over time
- `autoskills` should improve next-best action emergence
- spec-driven development should improve how risky work begins and stays grounded
- reverse-engineering and second-brain ideas should improve durable follow-through

The product should now absorb those ideas into how it behaves:

- smarter defaults
- stronger conversational routing
- quieter but more useful guidance
- more passive continuity between surfaces
- more self-healing when state or context drifts

## Core thesis

External idea assimilation should improve the way Nexus functions before it adds more buttons, chips, or permanent controls.

If a pattern can be expressed as:

- automatic routing
- passive context retrieval
- background memory shaping
- next-step emergence from current state
- self-healing around stale state or weak context

then that is the preferred implementation path.

Visible controls should only be added when the behavior would otherwise be undiscoverable or too opaque.

## North-star outcome

Nexus should increasingly feel like:

- a capable assistant with memory
- a system that quietly opens the right working context
- a workspace that improves continuity on its own
- a product that explains itself only when explanation is necessary

and less like:

- a dashboard that requires constant manual steering
- a control surface with too many persistent action rows
- a collection of smart utilities that still depend on the operator to glue them together

## Anti-patterns to avoid

1. Converting every good idea into a new lane, drawer, or permanent action cluster.
2. Letting audit or runtime posture dominate simple conversational answers.
3. Surfacing five equal-looking “next steps” when one strong contextual continuation is enough.
4. Making the archive more durable without making it more self-shaping.
5. Treating specs/playbooks as documentation-only instead of execution anchors.
6. Adding retrieval or verification language without making the system actually retrieve or verify.

## Product principles

1. Chat should feel like a real assistant first, not an operator dashboard with a text box attached.
2. The strongest next action should emerge from state and intent, not from dense permanent control rows.
3. Memory should shape future work quietly through linking, resurfacing, and continuity, not only through manual filing actions.
4. Audit/spec/playbook systems should bias toward exact working context automatically instead of asking the operator to navigate repeatedly.
5. New behavior must preserve free-first and local-first defaults.
6. Background intelligence should outperform explicit controls whenever the system has enough confidence to help safely.
7. The UI should reveal depth progressively; power remains available, but it should not crowd first-view interaction.

## Behavior-first implementation test

Before shipping an idea-assimilation change, ask:

1. Can this be expressed as smarter routing, retrieval, memory shaping, or recovery instead of another visible control?
2. Does the operator need to decide manually here, or can Nexus infer the strongest next step safely?
3. Does this reduce friction in the most common path, or only add power to a niche path?
4. If a new visible action is being introduced, is there a real discoverability gap that behavior alone cannot solve?

If the answer to the first two questions is yes, the change should bias toward behavior.

## High-priority workstreams

### BF1 — Conversational HQ

Make HQ respond like a capable chat assistant by default.

#### Problems

- Replies can over-index on runtime/audit posture instead of answering the question.
- Composer interactions still feel too mode-led for casual or direct requests.
- Latest/current questions do not consistently escalate into internet-backed context when that is the correct behavior.

#### Direction

- Add a clear conversational assist path ahead of heavy operator framing.
- Detect latest/current/live/news/recent queries and route them into a verified-web retrieval path automatically.
- Distinguish casual chat, product-navigation help, repo-work help, and live-information requests before composing the answer.
- Keep slash workflows as a power-user override, not the default answer style.
- Prefer direct answers first, then compact evidence or runtime posture only when the question is actually evidence-sensitive.

#### Architectural touchpoints

- HQ send pipeline in `components/home/office/OfficeCommandCenter.tsx`
- answer-style routing helper in `lib/agent.ts` or a new dedicated routing module
- retrieval escalation contract in `lib/liveContext.ts`, `lib/ai.ts`, and protected server routes
- chronicle presentation in `components/home/office/HQTerminalSection.tsx`
- persistence of conversational continuity in `store/useStore.ts`

#### Large-batch breakdown

##### BF1A — Answer-style routing
- classify prompts into conversational, live/current, product-help, repo-work, or structured workflow
- make conversational the default for low-friction inputs
- suppress mode-heavy output unless explicitly requested

Execution slices:
- BF1A1 — pure HQ intent classifier + answer-style contract
- BF1A2 — answer-style-aware context scoping (live context, memory diff, RAG, lessons)
- BF1A3 — reply presentation self-heal when casual turns drift into audit-shaped formatting

##### BF1B — Verified live retrieval
- detect unstable/time-sensitive questions automatically
- escalate into verified retrieval instead of local speculative context
- return compact source-aware answers instead of internal project summaries

Execution slices:
- BF1B1 — retrieval-sensitive prompt detector in the HQ send path
- BF1B2 — verified-retrieval requirement block + honest degraded fallback when retrieval is unavailable

##### BF1C — Recovery and fallback behavior
- if retrieval is unavailable, say so clearly and fall back without pretending to know
- if the model drifts into tool/audit narration for a simple question, reroute presentation toward the assistant answer
- maintain provenance cues when evidence matters

Execution slices:
- BF1C1 — evidence/provenance visibility only on evidence-sensitive turns
- BF1C2 — assistant-first chronicle rendering for conversational and product-help answers
- BF1C3 — route-level fallback copy that keeps chat natural even when tooling/runtime posture is degraded

#### Measures of success

- fewer first-turn replies that begin with internal status or task tracker summaries
- fewer manual retries for “latest/current” questions
- more direct-answer first responses in HQ
- lower need for operator correction around “this does not feel like chat”

#### Acceptance

1. Simple questions get direct assistant-style answers without audit noise.
2. “Latest” or “current” questions automatically use verified retrieval instead of speculative local-context prose.
3. HQ only exposes tool/runtime posture when it meaningfully affects the answer.

### BF2 — Intent-First Routing

Turn the current route/focus infrastructure into quieter automatic behavior.

#### Problems

- Many smart links exist, but they still rely too much on explicit launch actions.
- The app knows the right next surface often, but still makes the operator decide manually.

#### Direction

- Let chat responses stamp exact follow-through context in the background.
- Reopen unfinished or adjacent work automatically where confidence is high.
- Prefer one strong inline continuation suggestion over multiple equal-looking actions.
- Make route continuity feel like a property of the system, not a visible workflow feature.

#### Architectural touchpoints

- `lib/missionHandoff.ts`
- `lib/sessionFinder.ts`
- `components/ui/MissionHandoffStrip.tsx`
- exact-session/focus handling across route pages
- session/recents state in `store/useStore.ts`

#### Large-batch breakdown

##### BF2A — Session memory
- remember the strongest unfinished working contexts
- reopen likely continuation lanes automatically from HQ, Finder, and archive artifacts
- reduce reliance on explicit “open route” actions

##### BF2B — Single strongest continuation
- replace multiple same-weight action chips with one best-next continuation
- keep broader options accessible but less visually dominant
- prefer contextual suggestions over permanent route-action rows

##### BF2C — Quiet exact-session transport
- propagate exact-session context through chat, playbooks, specs, and archive pivots
- maintain continuity after auth refresh or route restarts where possible
- self-heal malformed or partial focus links into the nearest valid working session

#### Measures of success

- fewer route-top landings when a specific panel was implied
- fewer visible action rows in dense surfaces
- more direct continuation from answer to work without extra navigation

#### Acceptance

1. Work started in HQ reopens in the right lane with less manual steering.
2. The number of always-visible jump actions decreases over time.
3. Focus routing feels natural rather than like a separate subsystem.

### BF3 — Passive Second-Brain Shaping

Move second-brain value from explicit export features toward passive knowledge improvement.

#### Problems

- Durable export exists, but the archive still depends too much on manual upkeep.
- Strong notes can stop at “saved” instead of naturally feeding higher-order summaries.

#### Direction

- Auto-suggest filing or promotion only when evidence crosses a useful threshold.
- Increase automatic related-note linking by route, artifact type, and mission continuity.
- Surface lightweight archive-health nudges in context instead of separate upkeep-only flows.
- Make knowledge quality compound quietly in the background.

#### Architectural touchpoints

- `lib/secondBrainExport.ts`
- `lib/vaultStewardship.ts`
- `lib/binaryTriage.ts`
- compiled-memory creation and rendering paths
- promotion logic and archive metadata contracts

#### Large-batch breakdown

##### BF3A — Automatic linking
- expand route/topic/artifact linking heuristics
- use session continuity to create better related-note clusters
- avoid requiring manual tag cleanup for common patterns

##### BF3B — Promotion rules
- promote strong RE/research artifacts into higher-order briefs when they cross a usefulness threshold
- reopen existing higher-order artifacts instead of duplicating them
- keep promotion local, deterministic, and reversible

##### BF3C — Contextual maintenance
- surface one compact archive-health cue in relevant working surfaces
- bias toward “fix in place” rather than “go open stewardship separately”
- reserve dedicated maintenance views for deeper cleanup only

#### Measures of success

- fewer route-less or weakly linked pages in VAULT
- more durable artifacts with meaningful related context
- less manual archive grooming to keep the second brain useful

#### Acceptance

1. Good artifacts naturally become better linked and more reusable.
2. The archive produces fewer route-less, weakly tagged, or isolated entries over time.
3. The second brain helps active work without demanding constant explicit maintenance.

### BF4 — Background Guidance Instead Of Button Rows

Convert more guidance from visible control clutter into contextual intelligence.

#### Problems

- Some assimilated ideas currently appear as new visible actions even when the system already has enough context to suggest the next move implicitly.
- Heavy surfaces still risk turning into “toolbars plus explanation” instead of focused workspaces.

#### Direction

- Replace repeated permanent controls with compact contextual suggestions.
- Let state determine which recommendation appears, not static UI density.
- Keep only the primary action visible on dense surfaces.
- Move more intelligence into defaults, disclosure, and inferred next steps.

#### Architectural touchpoints

- HQ chronicle/composer surfaces
- scheduler sections
- VAULT detail cards
- Resources consoles
- shared action cluster components

#### Large-batch breakdown

##### BF4A — Action-density audit
- audit current high-density surfaces for controls that can become contextual
- preserve capability while reducing first-view clutter
- standardize what counts as a primary visible action

##### BF4B — Progressive disclosure
- hide secondary controls behind compact menus or inferred next-step affordances
- keep important but infrequent actions accessible without making them permanent
- ensure disclosure patterns stay consistent across surfaces

##### BF4C — State-led guidance
- generate inline recommendations from current task state, degraded posture, or artifact quality
- make recommendation components lightweight and self-explanatory
- avoid duplicate explanatory copy around them

#### Measures of success

- fewer persistent button rows on heavy surfaces
- cleaner first-view scanning on HQ, VAULT, scheduler, and audit consoles
- fewer duplicate “what should I do next?” explanations

#### Acceptance

1. Dense surfaces get easier to scan without losing power.
2. The app feels more intelligent with fewer visible controls.
3. Secondary actions migrate into contextual menus, focused sessions, or inferred follow-up.

### BF5 — Spec-Anchored Behavior

Make spec-driven development shape live workflows, not just Resources documentation.

#### Problems

- Specs, playbooks, and system maps exist, but work can still start from implementation instinct instead of anchored intent.
- High-risk tasks still require too much manual cross-navigation between spec, impact, and execution.

#### Direction

- When a risky task is detected, attach the best-fit spec starter automatically.
- Prefill Impact/System Design seeds from the chosen spec or playbook without extra clicks.
- Add spec drift cues when the implementation path starts to exceed the original scope.
- Make planning feel embedded in execution, not adjacent to it.

#### Architectural touchpoints

- `lib/specDrivenDevelopment.ts`
- `lib/engineeringPlaybooks.ts`
- `lib/systemDesignMaps.ts`
- `lib/sessionFinder.ts`
- execution entry points in HQ and Resources

#### Large-batch breakdown

##### BF5A — Automatic spec attachment
- detect risky/high-blast-radius work from prompt content or selected workflow
- suggest or preselect the right spec starter before implementation proceeds
- reuse existing exact-session routes instead of adding a separate planning flow

##### BF5B — Spec-to-execution seeding
- open Impact/System Design/focused repair sessions with the strongest matching seed automatically
- keep spec, blast radius, and implementation context synchronized
- make Finder and Playbooks honor that same seed path

##### BF5C — Spec drift awareness
- show when implementation is exceeding problem/non-goal/constraint boundaries
- create lightweight review prompts instead of heavy governance bureaucracy
- make drift visible before it becomes rework

#### Measures of success

- more risky work begins from specs than from ad hoc implementation
- fewer disconnects between planning and execution contexts
- clearer operator trust that the AI is working inside a declared scope

#### Acceptance

1. High-risk work begins from a spec-first flow more often than from ad hoc implementation.
2. Specs, impact, and exact work sessions feel like one pipeline.
3. The operator sees fewer disconnected planning surfaces.

### BF6 — Session Integrity, Safeguards, and Auto-Heal

Make route continuity resilient enough that stale links, malformed focus params, and old associations quietly recover instead of dumping the operator into the wrong place.

#### Problems

- Exact-session links can drift as routes, focus ids, and audit associations evolve.
- Different consoles can encode the same route intent slightly differently, which creates stale aliases and mismatched deep links.
- A malformed `focus`, `view`, `compiledFilter`, or `graphAudit` param can land the operator on a broad route top instead of the intended repair session.

#### Direction

- Centralize exact-session normalization in one place and treat it as the canonical route-association contract.
- Self-heal stale path aliases and mismatched view/focus combinations quietly on load.
- Correct invalid repair filters and graph-audit pairings to the nearest valid working session instead of letting them fail loosely.
- Normalize launchers before navigation so the same repair session always resolves the same way no matter which console opened it.

#### Architectural touchpoints

- `lib/exactSessionLinks.ts`
- `hooks/useSessionHrefAutoHeal.ts`
- route shells in `app/*/page.tsx`
- launchers in `components/ui/ActionSessionCluster.tsx`
- fast-open flows in `components/resources/SessionFinderConsole.tsx`
- HQ continuity in `components/home/office/OfficeCommandCenter.tsx`

#### Large-batch breakdown

##### BF6A — Canonical session associations
- centralize path aliases, focus-to-view mappings, and repair-filter ownership
- eliminate per-console stale-link repair logic
- keep canonical route labels in one source of truth

##### BF6B — Quiet route self-heal
- normalize malformed or partial route params on load
- redirect stale aliases to the nearest valid session without operator intervention
- preserve exact-session continuity after auth refreshes and old bookmarks

##### BF6C — Launcher integrity
- normalize launch targets before navigation from Finder, Playbooks, System Design, Surfaces, Impact, and VAULT repair views
- keep `Exact panel` versus `Route` labeling tied to normalized links
- prevent stale associations from spreading back into session memory or recents

#### Measures of success

- fewer route-top landings caused by malformed or stale deep links
- fewer duplicate link-association rules across consoles
- more successful reopen behavior from old bookmarks, audit cards, and stored sessions

#### Acceptance

1. Stale or malformed exact-session links self-correct into the nearest valid working session.
2. Launchers and audit consoles share one canonical route-association layer instead of duplicating repair logic.
3. Link continuity survives route evolution with less operator confusion and fewer dead-end landings.

## Repo idea reinterpretation map

### `fff.nvim`
- Best interpretation: fast intent resolution and ranked reopening
- Avoid: turning Nexus into a search utility with extra chrome

### `obsidian-mind`
- Best interpretation: passive graph stewardship and archive shaping
- Avoid: treating maintenance as a separate dashboard-only habit

### `autoskills`
- Best interpretation: next-best-session emergence from current state
- Avoid: recommendation rows everywhere

### `claude-howto`
- Best interpretation: workflow discipline and repeatable execution
- Avoid: static advice catalogs

### Spec-driven development
- Best interpretation: spec-as-source for risky implementation
- Avoid: template libraries that do not affect behavior

### Ghidra / RE workflows
- Best interpretation: durable investigation-to-brief memory loop
- Avoid: RE-only UI islands that do not feed the rest of the system

## Suggested implementation order

1. Fix HQ chat behavior so it answers like an assistant and auto-retrieves current information when needed.
2. Reduce explicit action density by moving more continuations into background routing and one strong contextual suggestion.
3. Strengthen passive archive shaping and promotion rules so second-brain value compounds automatically.
4. Tighten spec/playbook/audit pipelines so risky work starts anchored and stays anchored.
5. Continue removing redundant visible controls where behavior can carry the interaction instead.

## Expanded execution program

### Phase P1 — Restore conversational trust

Target outcome:
- HQ behaves like a real assistant for normal questions
- current/live requests use verified retrieval automatically

Primary batches:
- BF1A
- BF1B
- BF1C

### Phase P2 — Reduce steering load

Target outcome:
- the system chooses and restores the most useful next working context more often
- fewer permanent route/action controls are needed

Primary batches:
- BF2A
- BF2B
- BF4A

### Phase P3 — Make memory compound

Target outcome:
- saved work improves archive quality and future usefulness with less manual upkeep

Primary batches:
- BF3A
- BF3B
- BF3C

### Phase P4 — Planning becomes execution scaffolding

Target outcome:
- specs, playbooks, impact, and focused sessions form one practical path

Primary batches:
- BF5A
- BF5B
- BF5C

### Phase P5 — Quiet polish and density reduction

Target outcome:
- remaining heavy surfaces feel simpler because behavior carries more of the experience

Primary batches:
- BF4B
- BF4C
- follow-up density cleanup on HQ, scheduler, VAULT, and Resources

### Phase P6 — Session integrity and recovery

Target outcome:
- exact-session routing keeps working even as route names, filters, and associations evolve
- stale links quietly recover instead of becoming support issues

Primary batches:
- BF6A
- BF6B
- BF6C

## Shared implementation practices

1. Prefer data-driven helpers over one-off per-surface behavior branches.
2. Add self-healing around stale session, stale focus, stale policy, and malformed route context wherever the user can realistically hit it.
3. Keep retrieval, evidence posture, and uncertainty visible when relevant, but never let them dominate casual responses.
4. Keep all behavior local-first and free-first unless the user explicitly enables a network/cloud lane.
5. Every large batch should end with both code verification and a live route check on the touched surface.

## Validation and metrics

### Experience metrics

- direct-answer rate for simple HQ prompts
- live-query verified retrieval rate
- continuation click reduction on common flows
- archive hygiene improvement across route-less/untagged/isolated notes

### Product-shape metrics

- visible action count on key heavy surfaces
- number of static “helper” rows replaced by contextual guidance
- number of routes that reopen exact sessions successfully

### Trust metrics

- fewer hallucination-style operator complaints
- fewer “this doesn’t feel like chat” corrections
- fewer manual route hops between spec, impact, and execution

## Large-plan exit criteria

This program is successful when:

1. HQ feels conversational by default.
2. Latest/current/live questions are treated as retrieval-sensitive automatically.
3. The strongest next working context appears with less explicit navigation.
4. Memory quality improves with less manual upkeep.
5. Spec/playbook/audit systems behave like execution scaffolding, not sidecar documentation.
6. The overall interface gets quieter while the product gets more helpful.
7. Stale deep links and malformed session params self-heal into the right working context instead of stranding the operator.

## First concrete batch suggestions

### Batch BF1 — Conversational HQ Recovery

1. Add an answer-style router in the HQ send path:
   - conversational
   - live/current
   - product-help
   - repo-work
   - structured workflow
2. Auto-escalate live/current prompts into verified retrieval.
3. Suppress operator/audit framing for simple conversational requests.
4. Keep evidence posture visible only when the answer is actually evidence-sensitive.

Expanded rollout:
1. Land a pure intent classifier first so routing and self-heal logic share one contract.
2. Scope live context, memory diff, RAG, and lesson injection by answer style instead of treating every message like an operator brief.
3. Add a reply normalizer so conversational/product-help turns recover from Background/Analysis/Recommendation drift without hiding meaningful evidence on research turns.
4. Add browser or web-search verification requirements for latest/current/news prompts before generation starts.
5. Add explicit degraded fallback copy for retrieval-sensitive prompts so the assistant stays honest when verification is unavailable.

### Batch BF2 — Quiet Continuation

1. Reduce static chip density in HQ.
2. Replace some existing route-action rows with one contextual continuation.
3. Auto-stamp the next best exact session from the result instead of asking the operator to choose from many.

### Batch BF3 — Passive Second-Brain Lift

1. Add stronger automatic related-note linking.
2. Add promotion thresholds for RE and research artifacts.
3. Surface one compact maintenance nudge in context instead of extra upkeep controls.

## Done when

1. Nexus feels more like an assistant with a strong memory and less like a dashboard with many buttons.
2. Idea assimilation improves behavior, routing, and continuity more often than it adds controls.
3. Operators can ask a question naturally and get a natural answer, with current-information retrieval when needed.
4. Specs, playbooks, memory, and repair sessions work together as one flow instead of separate utilities.

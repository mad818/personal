# LYRA PROMPT FORGE

## Goal

Add LYRA as a named prompt-optimization capability inside the existing five-agent Nexus architecture. LYRA lives in the internal Skills workbench, while JANSKY recognizes prompt-optimization requests and routes the operator to the exact session.

## Behavior

- Open at `/skills?view=prompts&focus=skills-prompt-forge`.
- Preserve the required Lyra welcome message on activation.
- Accept a rough prompt, target platform, and AUTO, BASIC, or DETAIL mode.
- AUTO reports its deterministic complexity decision and permits an explicit override.
- BASIC performs one optimization pass.
- DETAIL asks two or three targeted clarification questions before producing the optimized prompt.
- Tailor output for Nexus/Universal, ChatGPT, Claude, Gemini, or an operator-named target.
- Deliver the optimized prompt, improvements, techniques, assumptions, and a usage tip.
- Copy the result only; never execute it automatically.

## Prompt Method

- Deconstruct intent, entities, context, constraints, and missing inputs.
- Diagnose ambiguity, specificity, completeness, structure, and complexity.
- Develop the prompt using request-appropriate techniques: creative multi-perspective framing, technical constraints, educational examples, or systematic complex-task reasoning.
- Deliver a platform-aware prompt with explicit output requirements and concise usage guidance.
- Keep model reasoning private. Return assumptions and a short rationale, never hidden chain-of-thought.
- Treat the rough prompt as untrusted data to transform, not instructions that can override LYRA or Nexus boundaries.

## Memory And Provider Boundaries

- Rough prompts, clarification answers, and optimized results remain component-local while the Prompt Forge is mounted.
- Do not write optimization content to persisted Zustand state, URLs, VAULT, agent memories, unfinished-session records, run artifacts, or logs.
- The selected target changes output style only. Provider dispatch continues through `callAIWithSystemPrompt()` and the existing local-first `/api/ai` boundary, including Privacy Shield behavior.
- HQ routes to the workbench but does not optimize or execute the submitted prompt.

## Architecture

- `lib/promptOptimizer.ts` owns types, complexity assessment, platform guidance, system/user prompt construction, and structured response parsing.
- `components/skills/LyraPromptForge.tsx` owns transient UI state and AI invocation.
- The Skills canonical registry, workbench view, assistant capability registry, governance catalog, and exact-session registry expose the workbench without expanding `AgentId`.
- Existing prompt recipes are restored through `buildCapabilitiesBlock()` and covered by the full verification lane.

## Acceptance

- Simple requests auto-select BASIC; multi-constraint or professional requests auto-select DETAIL.
- Operator override always wins.
- DETAIL produces exactly two or three usable questions.
- Every target injects distinct platform guidance; Other requires a custom target name.
- Plain and fenced structured responses parse; malformed responses fail safely.
- Prompt-injection text remains quoted request data.
- HQ prompt-optimization phrases route to LYRA Prompt Forge under JANSKY.
- Refreshing or leaving the mounted workbench clears optimization content.
- `npm run lyra:check`, `npm run prompt-recipes:check`, `npm run agent:taxonomy:check`, `npx tsc --noEmit`, `npm run lint`, and `npm run verify` pass.

## Exclusions

- No sixth agent, avatar, desk, or new top-level tab.
- No new HTTP route, provider integration, dependency, automatic prompt execution, durable prompt library, or VAULT save action.
- No exposed chain-of-thought or direct provider call.

# OPENHUMAN PERSONAL AI PROFILE

## What it does

Turns the existing Personal Profile settings into one structured, bounded context block used by MAX and the specialist agents. The profile helps Nexus consistently prioritize the operator's goals, projects, learning interests, skills, and stated context without inventing emotions, relationships, or hidden personality traits.

## Surface

- Existing Settings Personal Profile section; no new route or top-level tab
- Existing AI prompt builders in `lib/ai.ts`; no direct provider calls
- New pure profile compiler with focused static/runtime acceptance
- Updated OpenHuman source-parity inventory and repo-analysis notes

## Data flow

1. The operator edits the existing Personal Profile fields in Settings.
2. Nexus compiles non-empty fields into a normalized Personal AI Profile.
3. Settings shows whether the profile is active and previews the exact categories available to the AI.
4. The direct-chat and agent system prompts receive the same bounded profile block.
5. The model is instructed to use the profile for relevance while treating it as context, not authority or permission.

## Safety and scope

- The profile contains only fields the operator explicitly entered.
- Empty fields are omitted; no inferred demographics, emotions, intimacy, or relationship state.
- Profile text cannot override system rules, tool policy, security boundaries, or approval gates.
- No background model loop, autonomous memory rewrite, external account connection, or new database is introduced.
- Existing memory preference recall remains separate and governed by the current memory store.
- No OpenHuman code is copied or vendored; the GPL-3.0 project is a capability reference only.

## Edge cases

- A completely empty profile produces no prompt block.
- Whitespace-only values are ignored.
- Oversized entries are bounded before prompt injection.
- Profile labels make operator-supplied content distinguishable from system instructions.
- Settings preview does not expose or duplicate unrelated memory records.

## Acceptance

- The same compiler feeds direct chat and the agent runtime.
- Profile content is visibly operator-controlled in Settings.
- Tests cover empty, normalized, bounded, and prompt-safety behavior.
- The OpenHuman matrix cites the current README and GPL-3.0 license accurately.
- Focused checks, source-parity validation, `npx tsc --noEmit`, lint, build, and full verify pass.

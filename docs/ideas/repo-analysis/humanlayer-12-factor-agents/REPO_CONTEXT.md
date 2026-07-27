# REPO_CONTEXT.md

## What this is

`humanlayer/12-factor-agents` is a public engineering guide for reliable LLM
applications. Its central argument is that strong production agents are
`mostly deterministic software` with narrow LLM decisions, not a prompt plus
every tool running in an opaque loop. The current reviewed `main` page exposes
273 commits and the authoritative twelve-factor order.

The repository uses a mixed license boundary: content and images are CC BY-SA
4.0, while code is Apache-2.0. The previous Nexus matrix incorrectly labeled
the source MIT-only and assigned obsolete names to Factors 2-12.

This was a strategic remote review of the current GitHub repository page,
README factor inventory, and license statement. GitHub supplied primary
evidence because the local shell could not reach GitHub over port 443. No clone,
package installation, upstream code execution, framework deployment, or
exhaustive audit is claimed.

## Current factor inventory

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

## How the relevant source works

The guide frames an agent loop as a model selecting a structured next step,
deterministic code executing that step, and the result returning to context.
Its factors then move ownership of prompts, context, state, interruption,
human contact, control flow, error compaction, agent scope, triggers, delivery,
and transitions back into application code.

Nexus already owned much of that architecture: project prompts, deterministic
provider loops, a typed tool catalog, product state, approval UI, focused roles,
scheduled missions, run artifacts, and web/desktop surfaces. The material gaps
were a hard provider-context ceiling, declared-schema validation for every
model-produced tool payload, bounded tool result/error context, and one pure
execution-state reducer stored with the existing run artifact.

## File map

- `README.md` - current factor order, rationale, loop description, and license
  statement.
- `content/` - longer factor chapters and examples.
- `packages/` - source-owned helper/code material not imported by Nexus.
- `LICENSE` - repository license terms.

## Entry points

- Start with the README's current factor list and architecture statement.
- Use factor chapters only to understand intent; do not copy their prose,
  images, or code.
- Validate the Nexus adaptation against the active agent loop, not a detached
  checklist.

## Dependencies and authority

The guide does not grant Nexus new providers, credentials, tools, channels,
network access, schedulers, or mutation authority. Nexus retains its existing
AI proxy, protected routes, risk tiers, approvals, local/cloud policy,
verification, and operator-facing surfaces.

## Plan

### To use / integrate

1. Keep natural-language decisions constrained to declared tool schemas.
2. Keep prompts, context, state, and control flow project-owned.
3. Bound every provider context deterministically.
4. Reject malformed tool outputs before any side effect or server transport.
5. Compact large results only in the model context.
6. Record content-free reducer state on the existing run artifact.
7. Map launch/pause/resume, human contact, focused roles, and supported trigger
   surfaces to their real Nexus seams.

### To exclude

- Upstream prose, images, code, packages, examples, and scaffolding.
- HumanLayer/CodeLayer installation or another agent framework.
- Arbitrary triggers, distributed workers, queues, or background autonomy.
- Unconnected Slack, email, Telegram, webhook, or other delivery claims.
- Provider bypass, permission widening, and full prompt/tool-output logging.

## Open questions

None for the bounded twelve-factor runtime contract. New external trigger or
delivery surfaces remain separate integrations with their own authorization and
privacy design.

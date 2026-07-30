# REPO_CONTEXT.md

## Repository Thesis

`openai/codex-plugin-cc` is an Apache-2.0 Claude Code plugin that launches Codex
for read-only review, adversarial review, delegated rescue work, background job
management, and Claude-to-Codex session transfer. It is a bridge *into* Codex,
not a plugin Nexus or project-aware ChatGPT/Codex needs to call itself.

## Repository Shape

- The current default branch contains Claude plugin metadata, a `plugins/codex`
  implementation, scripts, tests, a Node package manifest, and an Apache-2.0
  license/notice.
- The README requires Node 18.18+ and a Codex login through a ChatGPT
  subscription or API key.
- Commands cover setup, review, adversarial review, rescue, transfer, status,
  result, cancel, and an optional review gate.

## Execution Model

The plugin wraps the local Codex app server through the global `codex` binary.
Background commands persist job state; transfer imports a Claude transcript
from the Claude projects directory. The optional stop hook can create a
long-running cross-agent review loop and consume usage quickly.

## Nexus Adaptation

- Native Codex review, current task continuation, status, cancellation, and
  project workflow already provide the useful destination-side behavior.
- `run-status-summary` gives project-aware ChatGPT/Codex a compact status
  contract without pretending to parse Claude transcripts.
- Read-only and adversarial review remain separate from implementation
  authority.

## Quality Signals and Risks

This is an official OpenAI source with tests and an explicit license. The
Claude plugin lifecycle, stop hook, transcript path, and transfer transport are
host-specific, so Nexus records them as product-purpose exclusions rather than
false ChatGPT parity. Reviewed 2026-07-27.

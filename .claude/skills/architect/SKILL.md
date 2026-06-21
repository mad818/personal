---
name: architect
description: Architecture design for Nexus Prime — surfaces, data flow, and acceptance proof before implementation. Use for new tabs, APIs, or multi-file features.
allowed-tools: Read, Grep, Glob
---

# Architect — Quick Reference

## Trigger
- New tab, API route, agent tool, or 3+ file feature
- User asks "how should we structure this?"

## Steps
1. Read `AGENTS.md`, relevant `specs/features/`, and surrounding code
2. Write plan to `tasks/todo.md` or `specs/features/<name>.md` before coding
3. Map: route → component → lib → store → API
4. List proof commands (`npm run …:check`) that will gate completion
5. Call out exclusions (paid APIs, OpenClaw, GPL vendoring) explicitly

## Success criteria
- Plan fits Nexus surfaces (HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT)
- Security boundaries documented for any new external fetch or tool
- Implementation order is 3–7 surgical steps, not a monolith

## YAGNI
Design the minimum slice that proves the idea; defer optional phases.

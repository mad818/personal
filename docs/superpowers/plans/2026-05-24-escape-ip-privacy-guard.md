# Escape IP Privacy Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent accidental public-IP exposure from stream connect tiles by locking public links until the operator confirms an external privacy route.

**Architecture:** Extend the deterministic link inspector with network-scope metadata. Keep the guard client-side and local: no IP lookup, no network fetch, no proxy. Reuse the existing connect shelf UI and disable public connect actions unless the session-level privacy confirmation is active.

**Tech Stack:** Next.js 14, React client component, TypeScript, existing protected Escape state.

---

### Task 1: Link Scope Metadata

**Files:**
- Modify: `lib/secureLink.ts`

- [ ] **Step 1: Add network scope type**

Add `SecureLinkNetworkScope` with `unknown`, `same-app`, `private`, `public`, and `blocked` values.

- [ ] **Step 2: Return IP privacy requirement**

Add `networkScope` and `requiresIpPrivacy` to `SecureLinkInspection`.

- [ ] **Step 3: Classify HTTPS hosts**

Treat HTTPS private hosts as private and public HTTPS as public requiring privacy confirmation.

### Task 2: Stream Shelf Guard UI

**Files:**
- Modify: `components/resources/SecureLinkOpenPanel.tsx`

- [ ] **Step 1: Add privacy-route confirmation state**

Add a session-only checkbox for VPN/Tailscale exit-node/privacy route confirmation.

- [ ] **Step 2: Lock public connect actions**

For each tile, re-inspect the saved URL and disable Connect when `requiresIpPrivacy` is true and confirmation is false.

- [ ] **Step 3: Surface posture**

Show locked public link counts and link scope badges without displaying or looking up the user's IP.

### Task 3: Verify And Close Out

**Files:**
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`

- [ ] **Step 1: Verify**

Run `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and live route proof for `/api/health`, `/resources?view=escape`, and protected Escape APIs.

- [ ] **Step 2: Update state docs**

Mark the task complete in `tasks/todo.md`, add the shipped guard to `docs/SYSTEM_STATE.md`, then run `npm run handoff:write` and `npm run handoff:check`.

- [ ] **Step 3: Commit and attempt push**

Commit locally and attempt `npm run git:safe -- push`, recording the Codex-shell port 443 blocker if it recurs.

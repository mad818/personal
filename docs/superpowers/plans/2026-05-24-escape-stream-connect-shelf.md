# Escape Stream Connect Shelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the secure link opener into a streaming-style private connect shelf where approved links become secure launch tiles.

**Architecture:** Persist safe link records in the existing Subscription Escape state file. Reuse `inspectSecureLink` for deterministic validation, filter unsafe imported records during normalization, and render all connect actions as protected no-referrer external opens.

**Tech Stack:** Next.js 14, React client component, TypeScript, existing protected Escape API, existing shell UI primitives.

---

### Task 1: Data Contract

**Files:**
- Modify: `lib/subscriptionEscape.ts`
- Modify: `lib/subscriptionEscapeStore.ts`

- [ ] **Step 1: Add secure stream-link types**

Define `SecureStreamLinkCategory`, `SecureStreamLink`, and category labels in `lib/subscriptionEscape.ts`.

- [ ] **Step 2: Add state field**

Add `secureStreamLinks: SecureStreamLink[]` to `SubscriptionEscapeState` and the default state factory.

- [ ] **Step 3: Normalize safely**

In `lib/subscriptionEscapeStore.ts`, normalize categories and reject persisted links that `inspectSecureLink` does not allow.

### Task 2: Streaming Connect UI

**Files:**
- Modify: `components/resources/SecureLinkOpenPanel.tsx`
- Modify: `components/resources/SubscriptionEscapeConsole.tsx`

- [ ] **Step 1: Accept persisted links**

Change `SecureLinkOpenPanel` props to accept `links`, `onChangeLinks`, and `saveStatus`.

- [ ] **Step 2: Add paste-to-tile flow**

Use `inspectSecureLink` on pasted input, generate a readable title from the safe URL, and add the tile only when `inspection.canOpen` is true.

- [ ] **Step 3: Render shelf controls**

Add search, category filter, sort mode, favorite toggle, copy, remove, and secure connect actions.

- [ ] **Step 4: Mount persistence**

Add `updateSecureStreamLinks` in `SubscriptionEscapeConsole` and pass `state.secureStreamLinks`.

### Task 3: Verification And Closeout

**Files:**
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`

- [ ] **Step 1: Verify**

Run `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and live route proof for `/api/health`, `/resources?view=escape`, and protected Escape APIs.

- [ ] **Step 2: Update docs**

Mark the task complete in `tasks/todo.md`, add the shipped tranche to `docs/SYSTEM_STATE.md`, and run `npm run handoff:write` plus `npm run handoff:check`.

- [ ] **Step 3: Commit and attempt push**

Commit the slice locally and attempt `npm run git:safe -- push`, recording the Codex-shell GitHub port 443 blocker if it recurs.

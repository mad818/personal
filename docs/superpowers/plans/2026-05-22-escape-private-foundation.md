# Escape Private Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Escape media lane with Tailscale-first access tracking, local backup/restore, and protected local cover/poster assets.

**Architecture:** Keep `data/subscription-escape.json` as the MacBook/local source of truth, extend the existing state contract with access records, and add a local-only protected asset store under `data/subscription-escape-assets/`. The UI stays inside `/resources?view=escape`; no new tab, no paid APIs, and no public media endpoint.

**Tech Stack:** Next.js 14 App Router, React client components, TypeScript, protected Nexus API middleware, local filesystem storage.

---

### Task 1: State And Spec

**Files:**

- Create: `specs/features/escape-private-foundation.md`
- Modify: `tasks/todo.md`
- Modify: `lib/subscriptionEscape.ts`
- Modify: `lib/subscriptionEscapeStore.ts`

- [ ] Add access posture and authorized access record types.
- [ ] Add defaults for Tailscale-first, Nexus-auth-required, cloud-backup-optional posture.
- [ ] Normalize persisted access records so old JSON files still load.

### Task 2: Private Asset API

**Files:**

- Create: `lib/subscriptionEscapeAssets.ts`
- Create: `app/api/subscription-escape/assets/route.ts`
- Create: `app/api/subscription-escape/assets/[file]/route.ts`
- Modify: `.gitignore`

- [ ] Store uploaded image files under `data/subscription-escape-assets/`.
- [ ] Accept only small image files with safe generated filenames.
- [ ] Serve image files through protected API routes with no-store headers.

### Task 3: UI Wiring

**Files:**

- Create: `components/resources/EscapeAccessBackupPanel.tsx`
- Modify: `components/resources/SubscriptionEscapeConsole.tsx`
- Modify: `components/resources/MediaEscapeLibrary.tsx`

- [ ] Add backup export/import controls.
- [ ] Add access posture and revocation checklist.
- [ ] Add authorized people/device tracker.
- [ ] Add private cover/poster upload to the media form.

### Task 4: Proof And Closeout

**Files:**

- Modify: `docs/SYSTEM_STATE.md`
- Modify: `tasks/todo.md`

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run verify`.
- [ ] Run route proof for `/api/health`, `/resources?view=escape`, and protected Escape APIs.
- [ ] Run `npm run handoff:write` and `npm run handoff:check`.

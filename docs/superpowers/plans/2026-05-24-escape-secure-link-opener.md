# Escape Secure Link Opener Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected Escape-lane option for validating and securely opening links.

**Architecture:** Keep link inspection local and deterministic in `lib/secureLink.ts`. Render a client-only panel that never fetches or stores pasted links, and mount it inside the existing Escape console.

**Tech Stack:** Next.js 14, React client component, TypeScript, existing shell UI primitives.

---

### Task 1: Secure Link Inspection Helper

**Files:**
- Create: `lib/secureLink.ts`

- [ ] **Step 1: Add link classification types**

Define `SecureLinkRisk`, `SecureLinkInspection`, and helper constants for allowed private hosts.

- [ ] **Step 2: Add deterministic validation**

Implement `inspectSecureLink(input: string)` so it returns a blocked result for empty, oversized, credential-bearing, unsafe-scheme, and public plain-HTTP inputs.

- [ ] **Step 3: Add private-host handling**

Allow private/local HTTP for localhost, loopback, RFC1918 addresses, Tailscale CGNAT, `.local`, and `.ts.net` hosts with a review posture.

### Task 2: Escape Panel UI

**Files:**
- Create: `components/resources/SecureLinkOpenPanel.tsx`

- [ ] **Step 1: Render input and posture**

Create a client component with a URL input, posture badge, reason text, and safe normalized URL preview.

- [ ] **Step 2: Add copy and open controls**

Add a copy action with `try/catch` around `navigator.clipboard.writeText`, plus an anchor that opens only when `inspection.canOpen` is true.

- [ ] **Step 3: Apply browser protections**

Set `target="_blank"`, `rel="noopener noreferrer"`, and `referrerPolicy="no-referrer"` on the open action.

### Task 3: Mount And Verify

**Files:**
- Modify: `components/resources/SubscriptionEscapeConsole.tsx`
- Modify: `tasks/todo.md`
- Modify: `docs/SYSTEM_STATE.md`

- [ ] **Step 1: Mount the panel**

Import `SecureLinkOpenPanel` and place it near the Escape access/backup section.

- [ ] **Step 2: Verify**

Run `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and route proof for `/api/health`, `/resources?view=escape`, and protected Escape APIs.

- [ ] **Step 3: Close out**

Update task/system state, run `npm run handoff:write`, run `npm run handoff:check`, commit, and attempt push.

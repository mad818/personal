# Whole-App Operator Result Truth

## One-sentence contract

Every active browser export and operator-triggered posture change must distinguish a request from a completed result, expose recoverable failure, and never label an unavailable external check as a verified local finding.

## Surface and scope

- Thirteen direct anchor-download initiations across eleven active components: vehicle artifacts, Escape backups, VAULT graph and second-brain exports, Spec Driven and Playbooks briefs, scheduler audits, memory exports, runtime diagnostics, Knowledge Base, and Learning Log.
- RECON OPSEC browser checks, including the user-triggered Google STUN boundary and intentionally unavailable Tor status.
- CYBER security-doctrine status changes.
- One shared browser download-request helper plus the secondary-surface TypeScript-AST validator.
- Active TSX sources under `app/` and `components/`, excluding the private `components/home/arpg/` lane.
- No new route, provider, dependency, archive format, persistent state, API key, background task, or visual system.

## Visual, content, and interaction thesis

- **Visual:** preserve every existing workplane and control; reuse terse inline status and the compact toast signal without adding cards, banners, or modal language.
- **Content:** say that a browser download was requested rather than claiming file completion, name the artifact without exposing its contents, disclose Google STUN, explain why Tor is not queried, and call unavailable verification unknown.
- **Interaction:** one export action creates one or more bounded browser requests, always releases busy state, preserves retry after failure, prevents duplicate doctrine writes, and never changes doctrine state until the protected route accepts it.

## Data and state

- The shared download helper receives transient content, creates and removes a hidden anchor, delays object-URL revocation until after the click turn, and returns whether the browser request was initiated.
- Success feedback states only that the download was requested and tells the operator to check browser downloads; it never claims the file reached disk.
- Failure feedback contains the artifact label and one retry instruction, never exported content.
- Existing components with inline status can suppress helper toasts and use the returned boolean to retain their local status language.
- OPSEC scoring is derived from the three local/browser posture results; Tor remains informational and cannot raise or lower the score because Nexus does not send the browser IP to a direct external API.
- Security doctrine keeps its current scenario until the POST succeeds and exposes one in-flight scenario plus named success/failure feedback.

## Implementation

1. Add a client-only `requestTextDownload()` helper using the existing toast surface, guarded DOM/URL access, hidden-anchor cleanup, and delayed object-URL revocation.
2. Replace all thirteen direct anchor-download calls across the eleven active components; retain component-local status where it already exists and use shared feedback elsewhere.
3. Make VAULT second-brain export report the number of browser requests and warn that the browser may require permission for multiple downloads.
4. Add an explicit OPSEC `unknown` state, remove the direct Tor Project client call and Tor availability from the score, and replace the false local-only disclosure with the exact Google STUN boundary plus the unqueried Tor posture.
5. Add action-specific doctrine busy state and truthful toast feedback; retain the current scenario after failure.
6. Extend the secondary-surface AST gate to reject direct clicks on anchors created through `document.createElement("a")`, while accepting file-input clicks and the shared helper.

## Acceptance criteria

- Independent AST audit reports zero direct anchor-download clicks across active non-RPG TSX sources and thirteen shared-helper call sites replacing the audited paths.
- Every migrated export reports request initiation or failure and never uses “downloaded” or “exported” as proof that the browser wrote a file.
- OPSEC copy names Google STUN, states that the browser IP is not sent to Tor Project, renders Tor unknown, treats incomplete STUN as unknown, and excludes Tor from the score.
- Doctrine controls disable during the active write, update only after `response.ok`, and expose named success/failure feedback while preserving retry state.
- Validator fixtures reject direct anchor clicks and accept file-input activation plus helper delegation.
- `npm run surface:polish:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Operators receive honest browser handoff language instead of unverifiable disk-write claims or silence.
- Object URLs are cleaned up safely without racing the download request.
- OPSEC no longer hides its STUN boundary, sends the browser IP to a direct external API, or converts an incomplete probe into a false anonymity result.
- Security-doctrine controls remain retryable and cannot imply a saved status after route failure.
- Future direct-download regressions fail the normal repository gate.

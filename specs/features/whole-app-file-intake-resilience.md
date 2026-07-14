# Whole-App File Intake Resilience

## One-sentence contract

Every active non-RPG file intake must expose a native keyboard-operable chooser, allow the same file to be selected again, and keep local processing state truthful without changing the existing storage or upload boundary.

## Surface and scope

- Six active file-input paths under `components/`, excluding the private `components/home/arpg/` lane.
- RECON Binary Triage and Metadata Extractor drop zones.
- Vehicle artifact, Escape backup, scheduler saved-view, and private media-cover imports.
- No new route, provider, dependency, durable state, external upload, background task, or file-system access.

## Visual, content, and interaction thesis

- **Visual:** preserve the existing dashed RECON intake planes and compact importer controls; use native button semantics with browser chrome reset instead of adding cards or dialogs.
- **Content:** say “choose or drop,” name local processing, and expose failures without including file contents.
- **Interaction:** Enter, Space, pointer, and drag/drop reach the same chooser/processor; one active local analysis owns the result; every picker selection is cleared immediately so the same file can be retried.

## Data and state

- Selected `File` objects remain component-local and are not persisted.
- Binary Triage and Metadata Extractor continue to process bytes only in the browser.
- Private cover images continue to use the existing protected Nexus asset route; no other intake uploads data.
- A shared `takeSelectedFile()` helper reads the first selected file and clears the native input before async work starts.
- RECON busy state prevents overlapping picker/drop actions from racing an older result over a newer one.

## Implementation

1. Add the shared selection-and-reset helper and migrate all six active file inputs.
2. Replace the two hidden-input label drop zones with focusable native buttons plus hidden, programmatically activated file inputs.
3. Add busy, status, alert, and responsive result semantics without changing each workplane's visual hierarchy.
4. Extend the whole-app accessibility/polish validator to reject hidden file inputs nested in labels and active file inputs that bypass the shared reset boundary.

## Acceptance criteria

- Independent source proof finds six active non-RPG file inputs, six shared reset calls, and zero hidden file inputs nested in labels.
- Binary Triage and Metadata Extractor open their picker with Enter or Space and retain drag/drop.
- Selecting the same file twice invokes processing twice across all six inputs.
- RECON processing cannot overlap, busy state is announced, and failure remains visible and retryable.
- Existing upload/local-only boundaries, accepted file types, routes, layouts, and result data remain unchanged.
- `npm run shell:accessibility:check`, `npm run surface:polish:check`, `npx tsc --noEmit`, targeted lint, `npm run verify`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Keyboard and switch-device users can operate both RECON intake surfaces.
- Operators can retry a corrected or reprocessed file without choosing a different file first.
- Older async work cannot silently overwrite a newer RECON selection.
- File-processing status is explicit for assistive technology and visible failure remains recoverable.
- Future hidden-label and same-file retry regressions fail the normal repository gate.

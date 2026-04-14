# Research / Graph / Document Assimilation — Batch 2

## Goal

Add a secure, local-only document intake path that prepares Nexus for future OCR and document-heavy research workflows without introducing any cloud dependency.

## Scope

### RGD4 — OCR-ready local document intake

- accept pasted extracted document text in VAULT
- allow optional local document metadata:
  - origin label
  - mime type
  - page count
- file into compiled memory pages using the existing protected local route
- default to explicit visibility selection with server-side escalation if the content appears sensitive

### RGD4.a — Metadata sanitization

- strip raw path segments down to safe origin labels
- validate mime type shape
- bound page count
- withhold restricted document metadata from shared surfaces by default

### RGD4.b — Operator UX

- add a VAULT-side intake panel
- no upload required
- no background sync to third parties
- immediate local refresh of compiled pages after successful filing

### RGD4.c — Future readiness

This batch does not add OCR itself. It creates the safe landing zone so a later local OCR or document extraction sidecar can feed the same contract.

## Success criteria

- operators can file pasted document text into compiled memory locally
- safe document metadata is visible on compiled pages
- restricted pages keep document metadata withheld by default
- no backend, cloud, or paid dependency is introduced

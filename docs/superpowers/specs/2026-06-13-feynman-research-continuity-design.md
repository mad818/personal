# Feynman Research Continuity Design

## Goal

Make Feynman research resumable, auditable, and locally exportable without adding a second session system or changing the existing Nexus visual surfaces.

## Architecture

The existing `feynman_research` tool remains the only research execution entry point, and VAULT compiled pages remain the final human-facing output. A focused local continuity store extends that path:

1. The tools route starts a collision-safe Feynman session before research begins.
2. `runFeynmanResearch()` emits best-effort chronological progress events as Researcher, Writer, Verifier, and Reviewer stages advance.
3. The continuity store appends those events to a lab notebook inside the session folder.
4. When the run completes, the store writes the final report plus plan, evidence, claim, review, provenance, preview, and PDF artifacts.
5. The existing `feynman_outputs` tool gains list, search, resume, and export actions.
6. A protected local-only API serves only the generated preview and export artifacts.

The default storage root is `agent-workspace/feynman/sessions/`, following the project’s existing local agent-workspace convention. Callers can select only a generated session ID and a fixed artifact kind; they cannot provide a path.

## Session Contract

Each session manifest records:

- generated session ID
- workflow and topic
- status and stage posture
- creation/update timestamps
- artifact inventory
- compact resume context

Each session folder contains:

- `plan.md`
- `notebook.md`
- `report.md`
- `evidence-ledger.json`
- `claim-audit.json`
- `reviewer-findings.json`
- `provenance.json`
- `preview.html`
- `report.pdf`
- `session.json`

## Search And Resume

Search ranks local Feynman sessions by exact and token matches across topic, workflow, title, summary, and report text. Resume returns a bounded context packet containing the previous question, workflow, stage posture, unresolved failures, artifact links, and final report excerpt. It does not silently execute another run.

## Preview And Export

The preview is a self-contained local HTML document with escaped report content. The PDF is generated locally with a dependency-free minimal PDF writer. `/api/feynman/artifacts` is protected by the existing middleware and classified `local_only`; it can serve only known artifact kinds from validated session IDs.

## Failure Posture

Continuity is a best-effort durability layer. Storage or export failures are swallowed at the tools boundary so the primary research answer still returns. The session manifest records degraded stage posture and collection failures when available.

## Out Of Scope

- New route, tab, panel, or visual redesign
- Automatic continuation or execution
- Cloud storage or remote export
- Remaining Feynman paper inspection, replication, autoresearch, watch, or specialized workflow parity

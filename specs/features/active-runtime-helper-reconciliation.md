# Active Runtime Helper Reconciliation

## Purpose

Make the non-RPG runtime source tree match what the application and maintained project tooling actually use. File-existence validators and detached helper modules currently preserve false implementation claims, while the restored Forecast Lab readiness panel requests a status field the server never returns.

## Runtime contract

- Treat every JavaScript or TypeScript file under `app/` as an active application root.
- Follow static imports, re-exports, CommonJS `require()` calls, and literal dynamic imports through `app/`, `components/`, `hooks/`, `lib/`, and `store/`.
- Require every non-RPG hook and library code file to be application-reachable or listed in a narrow script-only inventory whose importer is an active package command.
- Keep private RPG library paths outside this reconciliation.
- Fail when a script-only helper becomes reachable, disappears, loses its maintained script importer, or when any other non-RPG hook/library file becomes unreachable.

## Product repair

- Return one sanitized `readiness.agentPlatform` snapshot from protected `/api/status` for the existing INTEL Forecast Lab panel.
- Report only configuration posture; never return configured endpoint URLs or secret values.
- Preserve truthful unknown/retained behavior when status loading fails.
- Remove uncalled execution helpers from the readiness modules so a visible configuration badge is not mistaken for a shipped forecast, scrape, or conversion action.

## Source reconciliation

- Retire detached duplicate helpers, abandoned bridges, unused managers, and file-existence-only validators.
- Point source-parity records to live application seams where the adapted behavior exists.
- Return capabilities that were never integrated to an honest excluded or pending disposition instead of treating dead files as product proof.
- Preserve the two maintained script-only libraries used by canonical motion validation and local-acceleration acceptance.

## Verification

- Prove all active hooks are application-reachable.
- Prove all active non-RPG library code is application-reachable except the exact maintained script-only inventory.
- Exercise the status-readiness contract without calling external providers or subprocess-backed capability actions.
- Run focused runtime, source-parity, documentation, type, lint, format, publication, canonical verification, production build, handoff, and changed-path checks.

## Boundaries

- No new provider, dependency, external request, forecast execution, scrape execution, document conversion, plugin runtime, WebSocket runtime, phone/PWA implementation, or RPG implementation.
- No claim that optional tools are operational merely because configuration is present.
- No historical plan rewrite; only current source-parity and current-state truth are corrected.

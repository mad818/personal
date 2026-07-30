# Retired Desktop Packaged Runtime Snapshot

## Purpose

Remove the tracked `desktop/packaged-runtime/` build snapshot from active source control. The current Tauri configuration, desktop runbook, and runtime launcher use the repo-root `.next/standalone` output; the old snapshot is unreferenced, advertises commands that no longer exist, duplicates project-owned files, and embeds a generated absolute workstation path in `server.js`.

## Contract

- Keep repo-root `package.json` as the only authoritative npm manifest.
- Keep `desktop/src-tauri/tauri.conf.json` pointed at `../../.next/standalone` and keep desktop builds delegated through `npm run desktop:build-runtime`.
- Remove all eighteen tracked files under `desktop/packaged-runtime/` and ignore that generated directory so a local build cannot re-enter source control.
- Update toolchain validation to prove the active Tauri/root-standalone contract instead of reading a stale packaged-runtime manifest.
- Preserve ignored local build caches on disk; this tranche removes tracked source-control artifacts only.

## Verification

- Prove the stale manifest and generated server are absent and the generated directory is ignored.
- Prove no active source or operator documentation references the retired snapshot.
- Run toolchain, instruction, documentation, publication, TypeScript, lint, format, canonical verification, production build, handoff, and changed-path checks.

## Boundaries

- Do not modify Tauri runtime behavior, signing state, dependencies, local `.next` output, ignored `node_modules`, provider state, phone/PWA implementation, or RPG implementation.
- Do not delete local ignored build output; only remove the tracked snapshot entries from Git.
- Historical specs may continue to describe the snapshot as it existed during their own tranches.

# Whole-App Audit Verdict Truth

## One-sentence contract

`npm run audit:full` must earn its local-health verdict by running the canonical verifier itself, with no caller-controlled bypass and no claim about remote publication or CI state.

## Exact defect

- `node scripts/audit.js --verified` currently prints `npm run verify` as passed without executing it.
- The package script makes that bypass look safe only by convention; direct invocation can spoof a green audit.
- The dormant direct-check fallback still invokes deprecated `next lint`, so it has drifted from the supported root lint command.
- A local-only audit currently says “safe to push” even when GitHub connectivity and remote CI are unknown.

## Surface and scope

- `scripts/audit.js` owns one canonical `npm run verify` child process and reports its actual exit status.
- `package.json` invokes only `node scripts/audit.js`; no `&&` proof convention or `--verified` flag remains.
- `scripts/validate-toolchain-cleanliness.mjs` protects the audit command, canonical verify delegation, no-bypass rule, supported npm runner, and local-only verdict wording.
- `tasks/todo.md`, `tasks/lessons.md`, and `docs/SYSTEM_STATE.md` record the corrected contract and benefits.
- Generated packaged-runtime snapshots, dependency versions, lockfiles, runtime/UI behavior, providers, routes, and private RPG surfaces remain unchanged.

## Security and compatibility thesis

- **Truth:** the audit process that prints the verdict must own the verifier process and inspect its exit status.
- **Execution safety:** use npm's current `npm_execpath` through `process.execPath`, fixed arguments, `shell: false`, inherited output, and a realistic bounded timeout.
- **Boundary:** green local checks do not prove GitHub reachability, push success, or remote CI state.
- **Compatibility:** `npm run audit:full` remains the operator command and still prints task posture after verification.

## Implementation

1. Remove the `--verified` trust path and stale per-tool fallback from `scripts/audit.js`.
2. Run `npm run verify` once through npm's actual CLI module, reject unsupported arguments, and preserve the real child exit code.
3. Protect the contract in the toolchain validator and report top-level Next Up plus total checkbox posture accurately.
4. Prove bypass rejection, focused validation, canonical full-audit success, production build, handoff, diff, commit, and push-attempt status.

## Acceptance criteria

- `node scripts/audit.js --verified` exits nonzero before printing a pass verdict.
- `npm run audit:full` executes the complete current `npm run verify` chain exactly once and exits with its real status.
- Neither active audit code nor the root audit command contains `next lint` or `--verified`.
- A green audit says local verification passed and explicitly keeps publication/CI separate.
- `npm run toolchain:check`, `npx tsc --noEmit`, `npm run audit:full`, `npm run build`, handoff checks, and `git diff --check` pass.

## Benefits

- Operators can trust that a green full audit represents executed current gates rather than a caller assertion.
- The audit cannot silently regress to the deprecated Next.js lint runner.
- Windows execution remains shell-injection-safe and follows the same npm installation already running the command.
- Local health, publication readiness, and remote CI become distinct, honest signals.

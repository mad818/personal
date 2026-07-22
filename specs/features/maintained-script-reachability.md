# Maintained Script Reachability

## Purpose

Make the active `scripts/` tree reflect commands and runtime helpers Nexus actually maintains. Unreachable validators currently preserve file-existence proof, several operator tools have no package entrypoint, and an unowned Windows startup sync path can fetch, commit, and push in the background without a current operator command or approval boundary.

## Reachability contract

- Treat every script path named by a root `package.json` command as a maintained root.
- Follow direct script imports and fixed script-path references between JavaScript, PowerShell, batch, and VBS files.
- Permit a narrow exact inventory of scripts invoked by reachable server libraries, and require each listed importer to reference the helper by name.
- Keep ten exact phone/RPG script paths outside this reconciliation and fail if that private inventory drifts.
- Fail when any other script is unreachable, when an operational helper disappears, or when a package-root command loses its target.

## Reconciliation

- Add stable package entrypoints for the two Homefront media generators and the two desktop-signing operator tools.
- Preserve the runtime-owned tool-isolation runner and Windows optimization snapshot without presenting them as direct operator commands.
- Remove broken Dependabot closure wrappers whose required report script no longer exists; current dependency audit commands remain authoritative.
- Remove the unowned Windows startup auto-sync path because it can stage, commit, and push background changes without current operator intent.
- Remove superseded completion bundles, duplicate runtime wrappers, and source-parity validators that are not reachable from maintained commands.
- Point source-parity proof at the live application seams rather than keeping detached validators as evidence.

## Verification

- Prove zero unreviewed non-phone/non-RPG script files.
- Prove the four operator commands resolve to real scripts and the two live helpers remain referenced by reachable server code.
- Run source parity, documentation, instruction, type, lint, format, publication, canonical verification, production build, handoff, and changed-path checks.

## Boundaries

- Do not run the signing preflight, media generators, external GitHub mutations, startup installation, provider calls, phone/PWA work, or RPG work.
- Do not change generated Homefront assets, desktop signing state, dependency state, OS startup state, live runtime behavior, or private RPG/phone scripts.
- Historical plans remain unchanged; only current source-parity and current-state truth are corrected.

# Cloud and Local File Boundary

Nexus is public on GitHub, so the repo needs a clear boundary:

- **Cloud-safe:** source code, app routes, UI components, public docs, placeholder config, sanitized metrics, deterministic manifests, and generated public assets with provenance.
- **Local-only:** real secrets, `.env.local`, private runtime state, local recovery bundles, private media data, phone/iPad proof receipts, raw GitHub exports, worktrees, logs, generated research sessions, raw asset intake, and key material.

The machine-readable contract lives in `docs/repo-hygiene/cloud-local-file-boundary.json`. `npm run publication:safety:check` reads that contract and fails if local-only paths are tracked or if `.gitignore` stops protecting required local-only patterns.

## Good Cloud Files

These are appropriate for GitHub when they contain placeholders or sanitized data:

- `app/`, `components/`, `hooks/`, `lib/`, `store/`, `scripts/`, `specs/`
- `.env.example`, `.npmrc`, `package.json`, `package-lock.json`, `next.config.js`, `tsconfig*.json`
- `docs/`, including sanitized runbooks and sanitized `docs/metrics/*.json`
- `public/` assets that are original, licensed, or generated with recorded provenance
- CI/workflow, dependency, SBOM, and source-parity manifests that do not include secrets or raw personal proof

## Local-Only Critical Files

Keep these on the machine and out of GitHub:

- `.env.local` and any real environment file
- `.nexus/` backups, local acceleration state, recovery bundles, and runtime identity
- `data/subscription-escape*.json`, `data/subscription-escape-assets/`, and phone acceptance receipts
- `.worktrees/`, `.git-push-*/`, temporary runtime folders, logs, cache folders, and build output
- raw Dependabot exports such as `docs/metrics/dependabot-alerts-source*.json`
- generated research sessions under `agent-workspace/feynman/sessions/`
- raw asset intake under `assets/arpg/intake/raw/` and `assets/arpg/intake/work/`
- private key or certificate files such as `.pem`, `.key`, `.p12`, and `.pfx`

## Operator Rule

Before adding a file to GitHub, ask: "Could this reveal a real token, account, device, host, receipt, path, private media item, raw export, or machine-only state?" If yes, keep it local and add a sanitized placeholder, summary, or runbook instead.

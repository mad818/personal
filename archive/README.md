# Archive

This folder preserves retired reference files only. Nothing here is part of the active Nexus Prime runtime.

Do not restore legacy package manifests under their live names. Historical dependency files are kept with archival suffixes:

- `package.archived.json`
- `pnpm-lock.archived.yaml`

Keeping those files away from standard manifest names prevents GitHub and local tooling from treating retired code as production dependencies.

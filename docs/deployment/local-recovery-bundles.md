# Local Recovery Bundles

Nexus can protect its private local state without a cloud service or subscription. Recovery bundles stay under the ignored `.nexus/backups/` directory on the host and contain only the allowlisted Escape library state, private Escape assets, and phone acceptance receipts.

## Create A Snapshot

```powershell
npm run local:recovery -- create
```

The command copies allowlisted state into a new bundle and records each relative path, byte count, and SHA-256 hash in `manifest.json`. It does not print file contents.

## List And Verify

```powershell
npm run local:recovery -- list
npm run local:recovery -- verify --bundle=<bundle-id>
```

Verification rejects missing, extra, modified, symlinked, unsafe, or disallowed files. Run it before moving a bundle to another operator-controlled disk or encrypted backup location and again before restore.

## Restore Safely

Start with a dry run:

```powershell
npm run local:recovery -- restore --bundle=<bundle-id>
```

The dry run verifies the bundle and reports how many files would be restored plus any conflicts. It writes nothing.

Apply only after reviewing the dry run:

```powershell
npm run local:recovery -- restore --bundle=<bundle-id> --apply --confirm=RESTORE_LOCAL_STATE
```

Existing files remain protected. Replacing them additionally requires `--overwrite`:

```powershell
npm run local:recovery -- restore --bundle=<bundle-id> --apply --confirm=RESTORE_LOCAL_STATE --overwrite
```

## Boundaries

- Recovery is offline and dependency-free.
- Bundles do not include `.env` files, keys, certificates, git data, arbitrary workspace files, or file contents in terminal output.
- Nexus does not upload, schedule, delete, rotate, or restore bundles automatically.
- Keep a reviewed copy on another operator-controlled disk or encrypted backup location if host-loss recovery matters.

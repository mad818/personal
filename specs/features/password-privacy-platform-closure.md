# Password, privacy, and local-platform source closure

## Outcome

Close the remaining transferable capabilities from AuthPass, Bitwarden Server,
Buttercup Desktop, gopass, HashiCorp Vault, KeePassXC, KeeWeb, LessPass, Padloc,
Umbrel, and CloakBrowser without turning Nexus into a password manager, browser,
server marketplace, or remote secrets service.

## Product-native implementation

- Preserve the existing sealed-vault outer envelope and its Web Crypto contract.
- Migrate legacy inner payload version 1 to version 2 after decryption.
- Add validated slash-separated paths to encrypted records.
- Retain at most 12 encrypted prior revisions per record and provide an explicit
  one-step restore action that consumes the newest retained revision.
- Retain at most 200 content-free mutation receipts for create, update, restore,
  delete, and re-key operations inside the encrypted payload.
- Keep the receipt claim honest: it is bounded local history, not an immutable
  external audit trail.
- Reuse the existing ephemeral Web Crypto credential generator for the safe
  zero-storage LessPass pattern.
- Reuse curated Skills, readiness surfaces, health surfaces, connector policy,
  and network guards for the safe KeeWeb, Umbrel, and CloakBrowser patterns.

## Compatibility and migration

- The persisted envelope remains `nexus.sealed-vault.envelope.v1`.
- Payload version 1 remains readable and normalizes to path `General`, no
  revisions, and no receipts.
- The normalized version 2 payload is written only on a subsequent mutation or
  re-key, so merely unlocking an older export does not create storage churn.
- Existing passphrases, exports, AES-GCM additional data, and PBKDF2 parameters
  remain compatible.

## Explicit exclusions

- No password-manager server, organization sharing, cloud vault sync, or
  encrypted sharing links without authenticated recipients and key lifecycle.
- No Git-backed live vault because repository retention and metadata expand the
  disclosure boundary.
- No claim of immutable browser-local auditing.
- No Argon2 dependency swap without an audited browser/native migration and
  recovery plan.
- No deterministic master-password credential derivation.
- No SRP server authentication without a remote server product mode.
- No arbitrary community plugin execution or one-click third-party app install.
- No fingerprint spoofing, proxy rotation, or embedded privacy browser.
- No service-worker caching or background synchronization of protected data.
  Phone/PWA expansion remains deferred by current operator direction.

## Acceptance

- Legacy and version 2 payloads validate and round-trip through real Web Crypto.
- Record paths reject unsafe or unbounded hierarchy.
- Revision and receipt limits remain bounded under repeated updates.
- Restore, deletion, and re-key mutations produce the expected encrypted
  receipts without including note titles or bodies.
- All eleven source-parity matrices are complete, current as of 2026-07-27, and
  contain no pending capability.
- `npm run privacy-platform:check`, `npm run source:parity:check`,
  `npm run type-check`, and focused lint pass.

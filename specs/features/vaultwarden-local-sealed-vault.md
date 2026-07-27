# Vaultwarden-Informed Local Sealed Vault

## Outcome

Complete the feasible client-encryption idea associated with
`dani-garcia/vaultwarden` as an original Nexus-local sealed-notes capability in
the existing VAULT route. The result must cover the whole bounded lifecycle:
create, unlock, add/edit/delete, reseal, change passphrase, automatic/manual
lock, encrypted export, validated encrypted import, and recovery guidance.

## Source truth

- Primary repository: `https://github.com/dani-garcia/vaultwarden`
- Reviewed branch: `main`
- Reviewed: 2026-07-26
- Current release: `1.36.0` (2026-05-03)
- License: AGPL-3.0
- Product evidence: Vaultwarden is an unofficial Rust implementation of the
  Bitwarden Client API, compatible with official clients and intended for
  self-hosted server deployment.
- Boundary evidence: the upstream README requires a secure context for the Web
  Crypto API; encryption is a client responsibility rather than a Vaultwarden
  server implementation.
- KDF reference: current official Bitwarden documentation identifies PBKDF2
  HMAC-SHA-256 at 600,000 client iterations as its current default/minimum,
  while also supporting Argon2id.

The previous Nexus matrix incorrectly phrased client encryption as if it were a
Vaultwarden server capability and left it pending without a product contract.

## Existing Nexus seams

- `/vault` already owns local archive and memory workflows.
- The Archive chamber already provides a compact sub-lane selector.
- Client components already use local browser storage for bounded local state.
- The project has no password-server, secret-sync, or external vault runtime.

## Product contract

1. Add a reachable `Sealed notes` lane to the existing VAULT Archive chamber.
2. Store one versioned encrypted envelope in browser-local storage. Plaintext,
   passphrases, and derived keys must never be persisted.
3. Derive a non-extractable AES-GCM 256 key through Web Crypto PBKDF2
   HMAC-SHA-256 with:
   - a fresh random 16-byte salt on every seal;
   - 600,000 iterations;
   - a fresh random 12-byte IV on every seal;
   - fixed authenticated additional data identifying the Nexus envelope
     schema.
4. Validate the envelope before decrypting and validate the plaintext payload
   after decrypting. Bound envelope bytes, record count, title/body/tag lengths,
   identifiers, timestamps, algorithm names, iterations, salt, and IV.
5. Support:
   - first-vault creation with passphrase confirmation;
   - unlock with generic failure feedback;
   - create, edit, and delete for bounded private notes;
   - fresh resealing after every mutation;
   - passphrase change through full resealing;
   - manual lock, five-minute inactivity lock, and lock when the document is
     hidden;
   - sealed JSON download;
   - sealed JSON import with schema validation and explicit overwrite
     confirmation.
6. Make backup and recovery limits visible: there is no recovery key, forgotten
   passphrases cannot be reset, clearing browser storage loses the local copy,
   and encrypted exports are the operator's backup.
7. Label the capability honestly:
   - local browser encryption at rest, not end-to-end sync;
   - private-note storage, not password management;
   - not audited or compatible with Bitwarden/Vaultwarden;
   - vulnerable to a compromised active browser origin/XSS while unlocked.

## Safety and truth boundaries

- No Vaultwarden/Bitwarden code, UI, assets, schemas, protocol, brand identity,
  or server runtime is copied.
- No password manager, autofill, credential generator, password sharing,
  attachment store, organization vault, Send, sync API, account, or recovery
  service.
- No server route, provider call, network request, dependency, background
  worker, telemetry, or plaintext logging.
- Import never decrypts until the operator explicitly unlocks it.
- Existing browser data is never overwritten on import without confirmation.
- No phone/PWA or game/RPG work.

## Verification

- Deterministic runtime proof with real Web Crypto for:
  - seal/unseal round-trip;
  - randomized salt/IV/ciphertext;
  - wrong-passphrase and tamper rejection;
  - algorithm, work-factor, size, record, ID, timestamp, and approval bounds;
  - mutation and deletion;
  - sealed export/import validation;
  - absence of plaintext and passphrase from the serialized envelope.
- Static proof for:
  - reachable VAULT lane;
  - create/unlock/edit/delete/reseal/change/lock/import/export controls;
  - inactivity and hidden-document locking;
  - local-only storage;
  - honest limitations;
  - current source/license/release evidence and complete source parity.
- `npm run vault:sealed:check`
- `npm run source:parity:check`
- `npm run components:detached:check`
- `npm run type-check`
- `npm run lint`
- Exact staged-scope canonical isolated verification and an isolated commit.

## Benefits

- Sensitive personal notes can be encrypted before they enter persistent
  browser storage.
- A stolen local-storage dump or sealed export does not expose note content
  without the passphrase.
- Automatic locking narrows the plaintext session window.
- Strict import validation and bounded records reduce corruption and
  resource-exhaustion risk.
- Honest limits keep this useful local privacy layer from masquerading as an
  audited password manager or synchronized end-to-end vault.

## Non-goals

- Reimplement Vaultwarden, Bitwarden clients, or the Bitwarden encryption
  protocol.
- Claim equivalent security, interoperability, audit coverage, or threat-model
  parity.
- Protect against code executing in the same browser origin while the vault is
  unlocked.
- Store credentials, payment data, recovery codes, or production secrets.
- Add cross-device sync, accounts, organizations, sharing, or server backup.

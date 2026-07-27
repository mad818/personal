# REPO_CONTEXT.md

## What this is

`dani-garcia/vaultwarden` is an AGPL-3.0, unofficial Rust implementation of the
Bitwarden Client API for self-hosted deployment with official Bitwarden
clients. The current reviewed release is `1.36.0` on the `main` branch.
Vaultwarden is the compatible server; encryption is performed by the clients.
The upstream Web Vault therefore requires HTTPS or another secure browser
context for Web Crypto.

This was a strategic remote review of the current repository README, releases,
license, and official Bitwarden cryptography documentation. Primary web
evidence was used because the local shell could not reach GitHub over port 443.
No clone, Rust build, container deployment, dependency installation, protocol
audit, interoperability test, or exhaustive upstream review is claimed.

The useful Nexus pattern is narrower than the upstream product: seal a bounded
private-note payload before it enters persistent browser storage, keep
passphrases and plaintext transient, and make locking, backup, recovery, and
threat-model limits explicit. Nexus implements its own format inside VAULT, not
a Vaultwarden server, Bitwarden client, password manager, or synchronized
end-to-end vault.

## Stack

- Rust server implementing a Bitwarden-compatible API.
- Browser Web Vault and official Bitwarden clients.
- Self-hosted container and database deployment options.
- Administrative and organization features around stored vault data.
- AGPL-3.0 license.

## How the relevant source works

Vaultwarden presents a compatible server surface to official clients. The
clients own encryption and decryption, while the server stores and synchronizes
the resulting data. Official Bitwarden documentation describes PBKDF2
HMAC-SHA-256 and Argon2id key-derivation choices; its current PBKDF2
default/minimum is 600,000 client iterations.

Nexus does not reproduce that protocol. The project-owned adaptation uses Web
Crypto to derive a non-extractable AES-GCM-256 key from a passphrase with
PBKDF2-SHA-256, a fresh 16-byte salt, 600,000 iterations, a fresh 12-byte IV,
and authenticated schema context on every seal. The result is one
browser-local encrypted JSON envelope with no account or sync layer.

## File map

- `README.md` - product identity, compatibility, deployment guidance, and
  secure-context requirement.
- `LICENSE.txt` - AGPL-3.0 terms.
- GitHub Releases - current release evidence.
- Official Bitwarden KDF documentation - client KDF choices and current
  PBKDF2 work factor.
- Official Bitwarden security whitepaper - client/server cryptographic
  responsibility and threat-model evidence.

## Entry points

- Start with the current `main` README and releases for upstream product truth.
- Use official Bitwarden security documentation for client cryptography, not
  Vaultwarden server code.
- Do not copy or import upstream code, UI, assets, schemas, protocols, text, or
  runtime dependencies.

## Dependencies and authority

Vaultwarden's complete runtime expects a server, database, client accounts,
official clients, secure transport, deployment operations, and optional
organization features. None of those are implied by the local sealing lesson.
Nexus gains no credential, sync, sharing, recovery, account, network, or server
authority from this source.

## Plan

### To use / integrate

1. Add an original Sealed notes lane to the existing VAULT Archive chamber.
2. Validate one versioned local envelope and one bounded decrypted payload.
3. Complete creation, unlock, note mutation, resealing, passphrase change,
   manual/automatic locking, encrypted export, validated import, and deletion.
4. Keep plaintext, passphrases, and derived keys out of persistent storage.
5. Explain backup, forgotten-passphrase, same-origin code, and audit limits in
   the operator surface.

### To exclude

- Vaultwarden server, database, deployment, administration, and organization
  features.
- Bitwarden-compatible APIs, clients, schemas, protocols, and interoperability.
- Passwords, credentials, autofill, generation, attachments, Send, or sharing.
- Accounts, cross-device sync, recovery keys, server backup, and remote access.
- Upstream code, assets, interface text, and AGPL runtime.

## Open questions

None for the bounded local sealed-notes lifecycle. Any future sync or credential
scope would require a separate security design and cannot inherit this review.

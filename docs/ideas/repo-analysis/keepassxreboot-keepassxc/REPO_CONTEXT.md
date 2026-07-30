# REPO_CONTEXT.md

## What this is

`keepassxreboot/keepassxc` is a mature cross-platform local password manager.
Nexus is not adopting that product; this review isolates its configurable
password/passphrase generator as one useful, self-contained security pattern.

The current reviewed repository page uses `develop` as its default branch and
shows 4,980 commits. The current Getting Started guide identifies itself as
version `2.7.11`.

This was a strategic remote review of the public repository page, README,
license statement, and current official password-generator documentation.
GitHub and the official KeePassXC documentation supplied primary evidence
because the local shell could not reach GitHub over port 443. No clone,
installation, upstream code execution, or exhaustive audit is claimed.

## Stack

- C++ and Qt - desktop application and user interface
- CMake - native build system
- KDBX - encrypted password-database format
- Platform integrations - browser messaging, SSH agent, hardware keys, and
  desktop security controls

## How it works

KeePassXC stores sensitive records inside a local encrypted KDBX database and
provides entry, search, browser, autofill, TOTP, key, and reporting workflows.
Its generator is a smaller independent utility: password mode selects a length
and character sets, while passphrase mode selects words from a word list with
operator-controlled count, separator, and case. Both support regeneration and
copying.

Nexus needs only that generator contract. The clean-room adaptation uses
browser Web Crypto, a project-owned compound-word list, in-memory settings, and
the existing VAULT surface. It does not import KeePassXC's password-manager
runtime or code.

## File map

- `README.md` - product purpose, core feature inventory, and license summary
- `COPYING` - file-level and third-party license notices
- `src/` - C++/Qt application source
- `share/wordlists/` - upstream passphrase resources that Nexus does not copy
- `tests/` - native test suite
- Official Getting Started guide - current operator-facing password and
  passphrase generator behavior

## Entry points

- Start with the repository README for product and license boundaries.
- Use the official guide's Password Generator section for the current
  capability contract.
- Do not treat upstream native entry points as integration seams; Nexus owns a
  separate TypeScript/Web Crypto implementation.

## Dependencies

KeePassXC depends on a native Qt/C++ stack and multiple cryptographic,
platform, and integration libraries. None are required or imported for the
Nexus generator. Nexus uses the browser's built-in `crypto.getRandomValues`.

## Plan

### To use / integrate

1. Expose password and passphrase modes in VAULT Archive.
2. Support the current documented configuration surfaces completely.
3. Use unbiased Web Crypto selection and bounded project-owned inputs.
4. Keep generated values, imported word lists, and settings in memory only.
5. Provide explicit regenerate, reveal, copy, and clear controls with visible
   clipboard failure.
6. Record source parity and benefits without claiming password-manager parity.

### To extend / modify

1. Add pure generation contracts under `lib/`.
2. Add a reachable client panel under `components/vault/`.
3. Extend the existing archive-lane and focus routing in `app/vault/page.tsx`.
4. Add deterministic runtime/static proof and canonical verify wiring.
5. Keep KDBX, Argon2, credential storage, autofill, browser integration,
   hardware keys, TOTP, breach lookup, and sync outside this tranche.

## Open questions

Argon2 remains a separate pending source capability because no reviewed
dependency-free, memory-hard browser implementation exists in the current
project. It must not be implied by this generator.

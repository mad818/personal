# KeePassXC-informed local credential generator

## What it does

Adds one browser-local VAULT utility that generates cryptographically random
passwords and memorable passphrases without persisting, transmitting, or
logging generated values.

## Surface

- Route: `/vault?view=archive&focus=vault-credential-generator`
- Chamber: VAULT → Archive
- Lane: Generator
- Component: `components/vault/LocalCredentialGeneratorPanel.tsx`

## Source contract

Current primary evidence:

- `https://github.com/keepassxreboot/keepassxc`
- `https://keepassxc.org/docs/KeePassXC_GettingStarted#_password_generator`
- Default branch observed: `develop`
- Repository page observed: 4,980 commits
- Current guide version observed: `2.7.11`
- License boundary: project code is GPL-2.0-or-GPL-3.0; third-party files carry
  additional notices

KeePassXC provides the pattern: configurable password length and character
sets, advanced exclusions, regeneration and clipboard copying, plus passphrase
word count, separator, case, and custom word lists.

Nexus must implement that bounded capability from scratch. It must not copy
KeePassXC code, UI, assets, word lists, database behavior, browser integration,
autofill, or product language.

## Functional contract

### Password mode

- Length is an integer from 8 through 128.
- Operators can independently enable lowercase, uppercase, digits, and
  symbols.
- At least one selected character set must remain non-empty after exclusions.
- `Require every selected set` guarantees at least one character from each
  enabled non-empty set.
- `Exclude ambiguous characters` removes the declared ambiguous set.
- A bounded custom exclusion field removes exact characters selected by the
  operator.
- Every random choice and shuffle step uses `crypto.getRandomValues` with
  rejection sampling; `Math.random` is forbidden.

### Passphrase mode

- Word count is an integer from 4 through 16.
- Separator accepts 0 through 12 visible characters or spaces, but no control
  characters.
- Case supports lower, upper, and title.
- The built-in source-independent list contains exactly 1,024 project-owned
  memorable compound words.
- Operators can paste or load a local UTF-8 text word list.
- Custom lists are bounded to 128 KiB and 4,096 unique words, require at least
  32 valid words, and never persist.
- Every word selection uses the same unbiased Web Crypto sampler.

### Result lifecycle

- Generation is explicit and local.
- The generated value can be masked or revealed, regenerated, copied, or
  cleared.
- Result metadata reports mode, configuration entropy estimate, and generation
  time without persisting the value.
- The value clears after two minutes, when the document becomes hidden, when
  relevant settings change, and when the component unmounts.
- Clipboard success appears only after the browser confirms the write; failure
  is visible and retryable.
- The UI warns that the clipboard is outside Nexus control and is not
  automatically cleared.

## State and data

- React component state only.
- No Zustand slice.
- No local/session storage, IndexedDB, cookie, URL, server route, analytics,
  provider, or network call.
- Imported word-list contents and generated values remain in browser memory
  only for the active component session.

## Security and product boundaries

- This is a generator, not a password manager.
- No credential records, KDBX compatibility, sync, recovery, autofill, browser
  extension, account, login, password validation, breach lookup, TOTP, hardware
  key, or clipboard-clear guarantee.
- Entropy is labeled as a configuration estimate, not an audit or resistance
  guarantee.
- Weak custom-list configurations remain visible and receive a warning rather
  than an inflated strength claim.
- No phone/PWA or game/RPG work.

## Acceptance

1. Pure runtime fixtures prove length, selected-set inclusion, exclusions,
   unbiased source usage, passphrase word count/separator/case, custom-list
   bounds, deterministic failure cases, and entropy labeling.
2. Static proof confirms active VAULT reachability, no persistence/network/AI,
   current source truth, source parity, Company Map membership, benefits, and
   canonical verify wiring.
3. TypeScript and zero-warning lint pass.
4. Accessibility and publication/security gates pass.
5. Exact staged-scope isolated canonical verification passes with zero overlap
   against the unrelated redesign.

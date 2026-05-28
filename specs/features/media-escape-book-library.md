# Media Escape Book Library

## Goal

Add books to the existing Subscription Escape media library so movies, music, and books can live in one protected local catalog under `/resources?view=escape`.

## Scope

- Extend the existing `MediaEscapeKind` model with `book`.
- Let the library add, edit, search, filter, sort, favorite, and display books alongside movies and music.
- Let the intake queue parse common book file names and locations such as PDF, EPUB, MOBI, AZW3, CBZ, and CBR.
- Keep covers/private images on the existing protected asset route.
- Add the operator-supplied `https://fmhy.net/` link to the Escape source shelf as a reference only.

## Guardrails

- No scraping, downloading, torrenting, DRM bypass, paywall bypass, piracy workflow, or public media endpoint.
- Book paths remain metadata only; Nexus does not read local book files.
- FMHY is stored as a reference bookmark only. Operators remain responsible for using lawful, public-domain, owned, or licensed material.
- No new top-level tab, public route, cloud database, paid API, or subscription billing.

## Acceptance

- `npx tsc --noEmit` passes.
- `npm run verify` passes.
- `/resources?view=escape` still loads the protected Escape console.
- Books appear in counts, add form, filters, intake fallback type, and shelves.

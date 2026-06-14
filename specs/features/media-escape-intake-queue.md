# Media Escape Intake Queue

## What is this feature?

A local review queue for adding owned movies and music from pasted filenames or paths. It helps Mario drop in messy file names, get readable title/year guesses, catch likely duplicates, and import clean records into the visual library without turning the app into a file crawler.

## Who is it for and what problem does it solve?

This is for Mario and non-technical authorized users who need adding media to feel easy and forgiving. The problem is that real media folders are messy: names include release tags, extensions, years, and repeated items. The queue keeps those guesses reviewable before they become library records.

## Where does it live in the UI?

- Existing route: `/resources?view=escape`
- Existing chamber: `RESOURCES -> Utilities -> Escape`
- Inside the existing movie/music library, before the main add/edit form.
- No new top-level tab.
- No public unauthenticated page.

## What data does it need?

- Intake records: raw filename/path, guessed type, suggested title, year, creator, genre, path note, status, possible duplicate reference, notes, and updated time.
- Intake records stay in the existing protected local state file: `data/subscription-escape.json` by default, or `NEXUS_SUBSCRIPTION_ESCAPE_FILE`.
- Pasted file paths remain metadata only.

## Safety guardrails

- Do not scan arbitrary folders in this pass.
- Do not read local media files from disk or expose them through Nexus.
- Do not add paid metadata services or cloud as the required source of truth.
- Do not build piracy, DRM bypass, paywall bypass, ad-circumvention, or scraping of paid libraries.
- Imported records stay review-gated and editable.

## What does done look like?

- `lib/subscriptionEscape.ts` defines intake item types, status labels, filename parsing helpers, and duplicate detection helpers.
- `lib/subscriptionEscapeStore.ts` normalizes `mediaIntake` records when reading/writing the local state file.
- `components/resources/MediaIntakeReviewPanel.tsx` renders paste-to-review, duplicate badges, edit/import/ignore actions, and missing-info counts.
- `components/resources/MediaEscapeLibrary.tsx` mounts the review panel and blocks accidental manual duplicate saves behind confirmation.
- `components/resources/SubscriptionEscapeConsole.tsx` persists intake changes through the existing protected API.
- `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and route proof pass.

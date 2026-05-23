# Media Escape Intake Queue Plan

## Goal

Make adding movies and music feel safe and low-friction by adding a local review queue for pasted filenames/paths, likely duplicate detection, and missing-info visibility inside the existing Escape media library.

## Constraints

- Local-first and protected by the existing `/api/subscription-escape` auth boundary.
- No arbitrary folder scan in this slice.
- No paid metadata APIs, cloud database, public media endpoint, playback server, piracy, DRM bypass, paywall bypass, or ad-circumvention.
- Pasted paths are metadata only.

## Steps

1. Add the intake data contract to `lib/subscriptionEscape.ts`: statuses, labels, parser, duplicate helper, and default state field.
2. Normalize `mediaIntake` in `lib/subscriptionEscapeStore.ts` so older local JSON files keep loading safely.
3. Create `components/resources/MediaIntakeReviewPanel.tsx` with paste-to-review, inline edits, import/ignore actions, duplicate badges, and missing-info board.
4. Mount the panel through `MediaEscapeLibrary` and persist changes from `SubscriptionEscapeConsole`.
5. Add duplicate confirmation to the manual media save path.
6. Verify with type-check, lint, full verify, whitespace checks, and local route proof.

## Acceptance

- A pasted list of filenames creates local intake rows with guessed kind/title/year/path.
- Likely duplicates are marked before import.
- Import creates a normal media library record with `needs_metadata` status.
- Ignore keeps unwanted rows out of the active queue.
- The missing-info board highlights records without year, genre, file path, summary, or cover.
- Existing unauthenticated API access remains blocked.

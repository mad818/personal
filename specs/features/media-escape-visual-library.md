# Media Escape Visual Library

## What is this feature?

A simple movie and music catalog inside the existing Subscription Escape lane. It gives Mario one local-first place to collect owned movies, albums, and music references with cover art, plain-language editing, search, sorting, and quick shelves that feel closer to Netflix than a spreadsheet.

## Who is it for and what problem does it solve?

This is for Mario and any non-technical family member who needs to add or find a movie or album without learning the dashboard. The UI should use big obvious actions, visible cover/poster art, simple labels, and one edit form that works the same way for movies and music.

## Where does it live in the UI?

- Existing route: `/resources?view=escape`
- Existing chamber: `RESOURCES -> Utilities -> Escape`
- No new top-level tab.
- No public unauthenticated page.

## What data does it need?

- Media records: type, title, artist/director, album/subtitle, year, genre, duration, rating, cover/poster URL, local file/location note, summary, status, favorite flag, and updated time.
- The data stays in the same server-side local file as the subscription escape state: `data/subscription-escape.json` by default, or `NEXUS_SUBSCRIPTION_ESCAPE_FILE`.
- Covers can be URL or `/public` paths. Local file paths are metadata only until a playback server such as Jellyfin is installed.

## Safety guardrails

- Only catalog legally owned or operator-approved media.
- Do not build piracy, DRM bypass, paywall bypass, ad-circumvention, or scraping of paid libraries.
- Do not expose the library publicly; keep access through the protected Nexus route and private Tailscale/LAN posture.
- Do not implement streaming/playback in this pass.

## What does done look like?

- `lib/subscriptionEscape.ts` defines media item types, labels, defaults, and filter/sort helpers.
- `lib/subscriptionEscapeStore.ts` normalizes `mediaLibrary` records when reading/writing the local state file.
- `components/resources/MediaEscapeLibrary.tsx` renders movie/music shelves, a large selected item panel, search/sort/filter controls, and simple add/edit/remove actions.
- `components/resources/SubscriptionEscapeConsole.tsx` mounts the library in the Escape console and persists edits through the existing protected API.
- `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `git diff --check`, and route proof pass.

# Bellroot Commons Alchemy + Mystery Runtime

`MW6FR7-ARPG-BELLROOT-COMMONS-ALCHEMY-MYSTERY-RUNTIME` turns Bellroot Commons into the first soft-support district in Veyrhold.

This slice is intentionally practical: it adds local-first alchemy actions, Ilo-led lamp readings, recovery rewards, and mystery flags without adding a full potion economy, new route, cloud save, or final bespoke art pass.

## Runtime Contract

- Bellroot Commons opens after Veyrhold is unlocked and the player visits the district from the `/hq` Map drawer.
- The Lamp Still exposes three safe brews: Safe Health Vials, Quiet Focus Draught, and Blue Ash Cleanse.
- Ilo exposes three oath-lamp readings: House With No Door, Moth-Lamp Circle, and Root Under the Bell.
- Brew actions grant local-first inventory rewards and Veyrhold reputation.
- Reading actions record durable mystery flags, grant small rewards, and appear in the Journal.
- `/hq` Kit mirrors the brew list so recovery prep lives near consumables, not only on the town map.

## Design Intent

Bellroot Commons should feel like the warm, strange side of the first town. The player is not fighting here; they are learning to prepare, observe, and read the city.

- Healing and focus items become town services, not only enemy drops.
- Status-cleansing language starts early, but stays small.
- Ilo stays useful as a companion clue source instead of becoming dashboard text.
- Mystery flags set up later city roots, catacombs, alchemy, and relic-door content.

## Verification

- `npm run arpg:content:check`
- `npm run arpg:production:check`
- `npm run arpg:release:check`
- `npm run type-check`
- `npm run build`
- `npm run verify`

Focused `/hq` E2E expectations cover visiting Bellroot Commons, brewing a safe vial, opening the Kit brew list, recording a lamp reading, and seeing the Journal mystery row. Local Windows Playwright can still time out, so build/verify plus live `3100` route checks remain the fallback proof path.

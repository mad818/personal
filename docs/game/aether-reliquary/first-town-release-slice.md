# MW6FR1 First Town Release Slice

## Goal

The first release should feel playable and intentional before the full 12-city campaign is open. This slice narrows runtime progression to:

1. Bellroot non-combat intro.
2. North-gate route proof.
3. Veyrhold as the first open town.
4. Four Veyrhold district cards.
5. Locked previews for later cities.

The broader MW6 atlas stays canonical, but it should not feel accidentally playable before future city slices build real maps, art, quests, vendors, and encounter sets.

## Runtime Shape

- `/hq` remains the only game route.
- Phaser remains the playfield renderer.
- DOM drawers remain the readable menu/codex/map layer.
- Veyrhold opens only after the first north-gate travel route resolves.
- Other cities stay visible as future-act previews, not active buttons.
- The first town map uses the existing Veyrhold sub-city arcs: Oathmarket, Warden's Steps, Bellroot Commons, and Pilgrim Rows.

## Acceptance

- The Map drawer shows a `First release town` card with locked, route-ready, road-active, or town-open state.
- `Veyrhold` becomes the first open town after the north-gate route resolves.
- All four Veyrhold district cards are visible and selectable once town is open.
- Future cities are locked previews and cannot be selected as playable storylines.
- The 12-city/48-sub-city production registry remains intact for later MW6 expansion.
- Command input, local-first save behavior, reduced-motion posture, and route stability remain unchanged.

## Follow-Up

After this slice, the next release-grade chunk should deepen Veyrhold itself: first-town services, blacksmith/alchemy hooks, local NPCs, district-specific enemies, starter armor/accessory progression, and high-fidelity Veyrhold location art.

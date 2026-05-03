# Aether Reliquary Prologue Story Foundation

## Identity Rule

The playable hero has no fixed canon name, no fixed gender, and no fixed body presentation. The player creates the identity in the opening scene: name, lineage, class, subclass, portrait direction, palette, and visible loadout style.

The story may call the hero `Reliquary Bearer`, `bearer`, `hero`, or `protagonist` when neutral copy is needed. These are titles, not names. The runtime should prefer the saved character name once the player sets one.

## Opening Chapter: The Day The Bellroot Rang

Veyrhold was built over living roots of bronze and black stone. The city's oldest bells hang below the streets, too large for towers, too old for music, and too important for decoration. They are called the Bellroot because every civic oath, route, debt, marriage, sentence, repair, and burial once passed through them before the reliquary network fractured.

For a generation, the bells stayed quiet.

The playable hero grew up on the edge of Bellroot Commons, close enough to hear old keepers argue with dead machines and close enough to know the city keeps records the way other places keep weapons. Most people have clean name-threads in the civic archive. The hero does not. Their record was damaged during an old Bellroot failure: not erased, not cursed, simply unfinished. That gap is where the player chooses who the hero is.

On the morning the game begins, the deep bells ring for the first time in years. The sound is not loud at first. It is a pressure in the floor, a tremor in old cups, a warmth behind the ribs. The keepers do not send a champion below. They send a witness: someone the reliquary cannot reduce to a stored record, someone who can still answer for themself.

Keeper Elian opens the descent stair and gives the hero one rule:

> No blades unless the lower doors open. You are going below as a witness, not a soldier.

## First Location: The Bellroot Vestibule

The first playable space is `The Bellroot Vestibule`, the upper threshold of `The First Reliquary` below Veyrhold. It should feel safe enough to explore and strange enough that the player knows the world is larger than the room.

Visual direction:

- Bronze root-bells hang in the ceiling like sleeping moons.
- Amber oath-lamps curve across the floor and wake one by one.
- Deep teal glass memory panes display broken names, route maps, debt marks, and old civic songs.
- A brass-root desk, the Descent Ledger, records the player's chosen identity.
- The Gate Monolith waits in black stone with a seam of warm light.
- Ilo's oracle cradle is a small blue-glass perch half-hidden between the archive panes.
- The north road is visible but sealed, giving the player a clear future destination.

The mood is warm danger, not horror. The room should invite inspection before combat. Dust, light, old bells, and humming floor-lines carry the intro.

## Opening Play Flow

1. Sign the Descent Ledger.
The player confirms the hero's identity. This is where race, class, subclass, name, and palette become story-visible. The ledger does not name the hero for the player.

2. Relight the Oath-Lamps.
The player learns movement and inspection by waking lamps around the vestibule. Each lamp reveals a mural fragment about Veyrhold's first promise: roads should remember people, not own them.

3. Wake Ilo.
The hero finds a small oracle in a blue-glass cradle. Ilo is not grand or solemn. Ilo is brave, nosy, and useful.

First Ilo line:

> I was counting the quiet. Then you arrived and ruined it. Good.

4. Study the Gate Monolith.
The monolith recognizes the hero as a living witness rather than a stored record.

Monolith text:

> Name: player-kept. Oath: unbroken. Road: listening.

5. Claim the Loom-Shard Charm.
The first relic is not a weapon. It is a memory charm that lets doors, companions, and future city systems recognize the player's chosen path.

6. Hear the Quiet Forge.
The forge introduces upgrading as oathwork: shard, pressure, heat, and a choice the item can remember.

7. Enter the Warden's Antechamber.
Only after the player has explored, met Ilo, read the gate, and claimed the charm does the reliquary reveal broken sentries and the first safe combat trial.

## Prologue Characters

The player-created hero is a Veyrhold-raised reliquary bearer whose damaged civic record leaves room for the player's identity. Their missing name-thread is not a prophecy. It is a practical reason the reliquary can ask them to carry unfinished memory without overwriting who they are.

Ilo is the Little Oracle: a palm-sized blue-glass companion with a sharp mouth, bright courage, and a useful habit of turning danger into instructions.

Keeper Elian is the Bellroot keeper who sends the hero below. Elian believes the reliquary chose a witness, not a weapon.

The First Reliquary is a living civic machine. It speaks through bells, lamps, glass records, and fragments rather than normal conversation.

## First Quest

`Light the Bellroot Below`

Summary: Enter the Bellroot Vestibule, restore the oath-lamps, meet Ilo, and learn why The First Reliquary opened before the first fight begins.

Steps:

- Sign the Descent Ledger.
- Relight the oath-lamps.
- Wake Ilo, the Little Oracle.
- Study the Gate Monolith.
- Claim the Loom-Shard Charm.
- Equip the charm when the chamber recognizes you.

Required flags:

- `lore:descent-ledger`
- `lore:oath-lamp-arcade`
- `npc:oracle-met`
- `lore:gate-monolith`
- `loot:loomshard-charm`
- `equipped:loomshard-charm`

## Asset Prompts

Use these as approved prompt briefs for later image batches. They still require normal prompt/provenance review before shipping.

- Bellroot Vestibule location card: warm ancient techno-fantasy underground civic chamber, bronze root-bells, amber oath lamps, glass memory panels, black stone gate, painterly high-detail 2D browser RPG card, no text, no logos.
- Ilo companion portrait: tiny blue-glass oracle companion with brass filigree wings and bright personality, warm heroic adventure fantasy, high-detail illustrated 2D portrait, no text, no franchise references.
- Descent Ledger prop icon: brass-root civic ledger with living roots and glowing name threads, ancient techno-fantasy item art, transparent background, no text.

## Visual Batch Review

The first prologue visual batch was reviewed and rejected on 2026-04-28. The files are retained only as provenance and replacement references because the output reads as flat vector/glyph UI, not production game art. Source sheets live under `assets/arpg/illustrated/source/`, runtime PNG sheets live under `public/arpg/illustrated/`, and the provenance record is `generation-records/2026-04-28-prologue-visual-assets.md`.

- `prologue-location-cards.png`: rejected Bellroot Vestibule and Warden's Antechamber reference cards.
- `prologue-companion-portraits.png`: rejected Ilo and Keeper Elian reference portraits.
- `prologue-story-props.png`: rejected Descent Ledger, oath-lamp, oracle cradle, Gate Monolith, Loom-Shard, and Quiet Forge reference icons.

Runtime use:

- `/hq` no longer presents these files as production game art.
- Adventure, Journal, Map, People, and Assets surfaces treat the batch as rejected/reference-only until replacement high-fidelity painted/rendered 2D or approved-pack art exists.
- Future prologue art must avoid flat glyphs, dashboard icon language, and simple vector cards.

## Acceptance

- The intro does not begin with fighting.
- The first relic is a memory charm, not a weapon.
- The hero has no forced name, gender, or canon body presentation.
- The first location has enough visual detail to guide illustrated location art.
- The opening quest has durable flags for runtime, saves, journal, codex, and future intro UI.

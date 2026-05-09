export type MassiveWinPlanStatus = "active" | "planned" | "ready";

export type MassiveWinPhaseStatus = "done" | "current" | "next";

export interface MassiveWinPlanPhase {
  label: string;
  status: MassiveWinPhaseStatus;
  detail: string;
}

export interface MassiveWinPlan {
  id: string;
  title: string;
  status: MassiveWinPlanStatus;
  summary: string;
  routeTargets: string[];
  designPosture: string;
  verification: string[];
  nextAction: {
    label: string;
    href: string;
    note: string;
  };
  phases: MassiveWinPlanPhase[];
}

export const MASSIVE_WIN_PLANS: MassiveWinPlan[] = [
  {
    id: "post-uxa3-release-confidence",
    title: "Post-UXA3 release confidence",
    status: "ready",
    summary:
      "Lock in the compact Homefront shell by keeping authenticated first-viewport proof, route health, and release gates close to the operator.",
    routeTargets: ["/hq", "/command", "/security", "/vault", "/resources"],
    designPosture:
      "Summary-first mission strips, preview rails, and first-workplane visibility stay the default for every route touched next.",
    verification: [
      "npm run auth:e2e",
      "npm run route:e2e",
      "npm run tabs:e2e",
      "npm run verify",
    ],
    nextAction: {
      label: "Review UXA3 measurements",
      href: "/resources?view=impact&file=docs/metrics/uxa3-first-viewport-review.md",
      note: "Use the accepted viewport proof before widening another route.",
    },
    phases: [
      {
        label: "Accepted shell density",
        status: "done",
        detail: "COMMAND, SECURITY, HQ, VAULT, and RESOURCES have measured first-viewport coverage.",
      },
      {
        label: "Hold the line",
        status: "current",
        detail: "Keep new design work compact unless a measurement proves the route needs more room.",
      },
      {
        label: "Release rehearsal",
        status: "next",
        detail: "Move from route proof into deployment, rollback, and desktop trust evidence.",
      },
    ],
  },
  {
    id: "cinematic-ia-standardization",
    title: "Cinematic IA standardization",
    status: "ready",
    summary:
      "The protected shell now carries a typed cinematic IA contract so GA surfaces share root chrome, route stages, lead/support/continuity zones, and standardized state primitives.",
    routeTargets: ["/hq", "/command", "/intel", "/alpha", "/cyber", "/recon", "/vault", "/resources"],
    designPosture:
      "Keep the Homefront tone: operational warmth, strong typography rhythm, compact controls, and motion that explains state instead of decorating it.",
    verification: ["npm run route:e2e", "npm run tabs:e2e", "npm run type-check"],
    nextAction: {
      label: "Open surface guidance",
      href: "/resources?view=surfaces",
      note: "Use surface ownership before touching another route stack.",
    },
    phases: [
      {
        label: "Inventory route chrome",
        status: "done",
        detail: "HQ plus all GA tabs now resolve an explicit cinematic surface, posture, and hierarchy.",
      },
      {
        label: "Standardize primitives",
        status: "done",
        detail: "Root chrome, shell stages, lead/support/continuity zones, empty states, and loading states share one contract.",
      },
      {
        label: "Use as guardrail",
        status: "current",
        detail: "Future route work should extend the shared contract instead of adding route-local chrome.",
      },
    ],
  },
  {
    id: "functional-arpg-downtime-lane",
    title: "MW6 full-game production completion",
    status: "active",
    summary:
      "Finish Aether Reliquary as a complete browser RPG program: production assets, full menus, hardened saves, content tooling, balance fixtures, release gates, and honest closure tracking over the existing Phaser/local-save foundation.",
    routeTargets: ["/hq", "/resources"],
    designPosture:
      "Keep the first viewport game-forward: image-led cards and compact action strips handle choices, Phaser proves movement/combat, and DOM drawers keep text, journal, map, armory, and accessibility work readable.",
    verification: [
      "npm run arpg:content:check",
      "npm run arpg:asset-candidates:check",
      "npm run arpg:assets:check",
      "npm run arpg:production:check",
      "npm run arpg:save:check",
      "npm run arpg:balance:check",
      "npm run arpg:release:check",
      "npm run hq:e2e",
      "npm run tabs:e2e",
      "npm run type-check",
      "npm run verify",
    ],
    nextAction: {
      label: "Open completion contract",
      href: "/resources?view=impact&file=docs/game/aether-reliquary/mw6-full-game-completion.md",
      note: "Use the MW6 completion contract before closing any MW6U-AA child track or the parent full-game production lane.",
    },
    phases: [
      {
        label: "Define the loop",
        status: "done",
        detail: "V0 focuses on isometric movement, lore interaction, loot pickup, gear equip, and one training enemy.",
      },
      {
        label: "Prototype core feel",
        status: "done",
        detail: "One playable reliquary room now ships inside HQ without adding a public game route or new runtime dependency.",
      },
      {
        label: "Playfield-first expansion",
        status: "done",
        detail: "Shrink always-on UI, move detail into drawers, add proximity prompts, and formalize safe asset intake.",
      },
      {
        label: "Game-feel lab",
        status: "done",
        detail: "Add a Pixi-ready decorative layer and GSAP-safe DOM transitions for loot, equip, hit, objective, and oracle cues.",
      },
      {
        label: "Phaser RPG replacement",
        status: "done",
        detail: "Replace the R3F reliquary surface with a Phaser 2D zone, authored RPG data, gear upgrades, skills, items, and combat loops.",
      },
      {
        label: "MW6 Bible foundation",
        status: "done",
        detail: "Canonize the 12-city world, campaign, character systems, enemy taxonomy, itemization, companions, and validation gates before widening runtime content.",
      },
      {
        label: "MW6E prologue story foundation",
        status: "done",
        detail: "Author the non-combat Bellroot opening with player-created hero identity, Descent Ledger, oath-lamps, Ilo, Gate Monolith, first quest flags, and reusable visual prompt hooks.",
      },
      {
        label: "Character foundation",
        status: "done",
        detail: "Ship v3 save identity, eight race lineages, eight class trees, subclass selection, compact Hero/Skills drawers, and Phaser palette/class feedback.",
      },
      {
        label: "Combat art foundation",
        status: "done",
        detail: "Add project-original first-zone enemy/item/status art, combat profiles, statuses, target chip, hotbar/dodge actions, damage feedback, codex discovery, and validation gates.",
      },
      {
        label: "Systems + world loop foundation",
        status: "done",
        detail: "Validate MW6I-S registries and prove Map, Armory, Journal, People, Travel, crafting, reputation, and companion loops inside /hq without adding a /game route.",
      },
      {
        label: "Dungeons + endgame foundation",
        status: "done",
        detail: "Add repeatable city dungeons, relic trials, timed treasure rooms, boss rematches, arena challenges, collection goals, and cosmetics as local-first endgame proof.",
      },
      {
        label: "Image-driven browser RPG shell",
        status: "done",
        detail: "Add clickable Adventure cards, compact fight/travel/loot controls, and a card-first interaction layer so /hq reads less like a movement demo and more like a browser RPG.",
      },
      {
        label: "Completion control plane",
        status: "done",
        detail: "Track MW6U-AA production readiness in data, validation, Resources, and /hq so the parent closes only after assets, menus, saves, tooling, balance, and release gates are proven.",
      },
      {
        label: "Production readiness foundation",
        status: "done",
        detail: "Add commercial-license proof support, optional generator-assisted policy closure, save-envelope export/import, balance/playtest targets, release gates, and /hq production readiness proof.",
      },
      {
        label: "MW6W-Z-AA readiness gates",
        status: "done",
        detail: "Add dedicated save, balance, and release checks plus fixture-backed menu/save/tooling/balance/release posture in /hq before closing the remaining production tracks.",
      },
      {
        label: "MW6W/X menu + save runtime",
        status: "done",
        detail: "Expose the full 14-panel game menu launcher plus autosave/manual/checkpoint slot actions, local slot loading, guarded reset, and three-slot save envelopes inside /hq.",
      },
      {
        label: "MW6W production menus + codex",
        status: "done",
        detail: "Promote the 14-panel launcher into validated production menu surfaces with active menu context, compact tutorial/controls, codex/map/people routing, and release-gate E2E coverage.",
      },
      {
        label: "MW6Y content tooling foundation",
        status: "done",
        detail: "Add a typed content-tooling registry, fixture map, authoring helpers, progression checks, dev-only debug posture, and arpg:tools:check gate for safe full-game expansion.",
      },
      {
        label: "MW6Z balance + playtest foundation",
        status: "done",
        detail: "Add validated full-game balance fixtures for XP/session pacing, loot cadence, boss timing, potion pressure, class and lineage viability, upgrade economy, browser budgets, and city/act/endgame playtest checklists.",
      },
      {
        label: "MW6V illustrated world + codex runtime",
        status: "done",
        detail: "Approved illustrated sheets now lead more live RPG surfaces: hotbar and skill icons, map/city location cards, combat codex enemy cards, companion portraits, and Adventure art while real pack intake stays blocked until files exist.",
      },
      {
        label: "MW6V enemy/boss hifi story intro",
        status: "current",
        detail: "Promote the enemy/boss high-fidelity card sheet into /hq Adventure, Journal, and Assets surfaces while the Bellroot opening advances through non-combat story beats before the Warden's Antechamber unlocks fighting.",
      },
      {
        label: "MW6 first town release slice",
        status: "current",
        detail: "Constrain first-release progression to Bellroot into the north-gate route and Veyrhold as the first open town, with four district cards playable and the other 11 cities locked as future-act previews.",
      },
      {
        label: "MW6 Veyrhold town services",
        status: "done",
        detail: "Make Veyrhold feel like the first real town by adding blacksmith, alchemy, market, inn, oath-board services, four district hooks, and starter armor/accessory progression for helm, armor, gloves, boots, rings, and amulet.",
      },
      {
        label: "MW6 Veyrhold NPCs + mini-quests",
        status: "done",
        detail: "Add named Veyrhold locals, four district mini-quests, and service outcome cards so Map, People, and Journal prove the first town has people, jobs, and reward clarity before broader city slices open.",
      },
      {
        label: "MW6 Veyrhold district hub",
        status: "done",
        detail: "Make Veyrhold behave like a first playable town map by adding four visitable district nodes that link NPCs, services, mini-quests, rewards, and local-first visit flags inside the /hq Map drawer.",
      },
      {
        label: "MW6 Oathmarket vendor + job loop",
        status: "done",
        detail: "Make the first Veyrhold district more playable with starter wares, city-scrip pricing, accessory comparison copy, and a choice-driven ledger job surfaced through /hq Map and Kit drawers.",
      },
      {
        label: "MW6 Warden's Steps forge + armor loop",
        status: "done",
        detail: "Make the armor district playable with helm, armor, gloves, and boots fitting orders plus civic oath contracts surfaced through /hq Map and Armory drawers.",
      },
      {
        label: "MW6 Bellroot Commons alchemy + mystery loop",
        status: "done",
        detail: "Make the soft support district playable with safe alchemy brews, Ilo-led oath-lamp readings, recovery rewards, and city-mystery flags surfaced through /hq Map, Kit, and Journal drawers.",
      },
      {
        label: "MW6 Pilgrim Rows rest + road loop",
        status: "current",
        detail: "Make the inn district playable with rest/checkpoint options, road rumors, recovery rewards, route-prep flags, and compact Map, Kit, and Journal proof.",
      },
      {
        label: "MW6V/W arsenal visuals + itemization",
        status: "current",
        detail: "Add illustrated weapon-family assets, quality overlays, named weapon cards, drop/upgrade VFX, quality-specific upgrade caps, comparison copy, loot drops, equip proof, compact Kit/Gear surfaces, and next armor/accessory tier visuals for helmets, armor, gloves, boots, necklaces, and rings.",
      },
      {
        label: "MW6V Hero Kit style lock",
        status: "done",
        detail: "Use the approved Hero Kit character, outfit, weapon, and armor sheets as the visual quality target, backed by arpg:visual:check and /hq Assets drawer proof.",
      },
      {
        label: "MW6V high-fidelity asset briefs",
        status: "done",
        detail: "Queue 44 Hero Kit-quality prompts for enemies, bosses, Bellroot story art, weapon quality variants, and all 12 city cards, backed by arpg:visual-briefs:check.",
      },
      {
        label: "MW6V prologue visual assets",
        status: "current",
        detail: "Replace the rejected flat SVG/glyph Bellroot prologue sheets with higher-fidelity painted/rendered 2D or approved-pack browser RPG art; the rejected batch now remains provenance-only and is no longer presented as production game art.",
      },
    ],
  },
  {
    id: "desktop-trust-release-chain",
    title: "Desktop trust release chain",
    status: "ready",
    summary:
      "Turn release engineering into visible evidence: diagnostics, isolation proof, checksums, signing status, and rollback posture.",
    routeTargets: ["/security", "/resources", "/settings"],
    designPosture:
      "Trust surfaces should read like calm evidence panels, not alarm dashboards: clear status, bounded risk, and one next safe action.",
    verification: [
      "npm run verify",
      "npm run release:smoke",
      "desktop isolation proof",
      "checksum record",
    ],
    nextAction: {
      label: "Open security posture",
      href: "/security",
      note: "Use the existing trust rail before adding any new release surface.",
    },
    phases: [
      {
        label: "Collect evidence",
        status: "current",
        detail: "Gather build, route, runtime, and security diagnostics into one release record.",
      },
      {
        label: "Prove isolation",
        status: "next",
        detail: "Confirm desktop lockdown and no-outbound expectations under the secure runtime.",
      },
      {
        label: "Publish gate",
        status: "next",
        detail: "Require the same evidence before release or push claims are marked complete.",
      },
    ],
  },
];

export const MASSIVE_WIN_SUMMARY = {
  activePlans: MASSIVE_WIN_PLANS.filter((plan) => plan.status === "active").length,
  plannedPlans: MASSIVE_WIN_PLANS.filter((plan) => plan.status === "planned").length,
  routeTargets: new Set(MASSIVE_WIN_PLANS.flatMap((plan) => plan.routeTargets)).size,
  verificationGates: new Set(MASSIVE_WIN_PLANS.flatMap((plan) => plan.verification)).size,
};

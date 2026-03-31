// ── sprites.ts ────────────────────────────────────────────────────────────────
// Pixel-art frame data for all five agents and the crab mascot.
// Each agent has two walk frames stored as string[][]:
//   [0] = standing / default pose
//   [1] = mid-step / alternate pose
// Grids are 9 chars wide × 14 chars tall (characters map to palette.ts P{}).
// CRAB uses a separate Record<emotion, rows[]> — 12 wide × 8 tall per state.
// Edit these arrays to change sprite appearance; the Sprite() renderer handles the rest.

// ── JANSKY ─────────────────────────────────────────────────────────────────────
// MAX — auburn/red hair, red casual jacket. The boss / command agent.
// Hair: R (bright red) / r (dark red). Jacket: k (red). Shadow: r.
export const JANSKY_F: string[][] = [
  // Frame 0 — standing
  // Max: headphones + Walkman
  [
    "  RRRR   ",
    " qRssRq  ",
    " qseseq  ",
    " qssssq  ",
    "  sssss  ",
    "  uuuuu  ",
    " uuuuuuu ",
    " uUuUuUU ",
    "  u u u  ",
    "  ummMu  ",
    "  ummMu  ",
    "  d   d  ",
    "  d   d  ",
    "         ",
  ],
  // Frame 1 — mid-step (right leg forward)
  [
    "  RRRR   ",
    " qRssRq  ",
    " qseseq  ",
    " qssssq  ",
    "  sssss  ",
    "  uuuuu  ",
    " uuuuuuu ",
    " uUuUuUU ",
    "   u u   ",
    "  ummM   ",
    "  ummM   ",
    "  d   d  ",
    "   d d   ",
    "         ",
  ],
];

// ── ORBIT ──────────────────────────────────────────────────────────────────────
// EL (Eleven) — short dark hair, purple hoodie. No headphones.
// Hair: h (dark brown). Hoodie: p (purple) / o (shadow).
export const ORBIT_F: string[][] = [
  // Frame 0 — standing
  // Eleven: short hair + subtle nosebleed (x) cue
  [
    "  hhhhh  ",
    " hpSsSph ",
    " hpsesph ",
    " hpsssph ",
    "  sxsxs  ",
    "  ppppp  ",
    " ppppppp ",
    "pppppppp ",
    " ppp pp  ",
    "  pp pp  ",
    "  o   o  ",
    "  o   o  ",
    "  d   d  ",
    "         ",
  ],
  // Frame 1 — mid-step
  [
    "  hhhhh  ",
    " hpSsSph ",
    " hpsesph ",
    " hpsssph ",
    "  sxsxs  ",
    "  ppppp  ",
    " ppppppp ",
    "pppp ppp ",
    "pppp pp  ",
    "  pp pp  ",
    "  o   o  ",
    "  o   o  ",
    "   d d   ",
    "         ",
  ],
];

// ── NOVA ───────────────────────────────────────────────────────────────────────
// DUSTIN — curly brown hair, blue-grey casual jacket. Researcher / web-search agent.
// Hair: h (dark brown) / H (highlight). Jacket: w (blue-grey) / W (shadow).
export const NOVA_F: string[][] = [
  // Frame 0 — standing
  // Dustin: cap + glasses + radio (m/M) on belt
  [
    "  aaaaa  ",
    " aBssB a ",
    " qsesesq ",
    " qsSSSq  ",
    "  sssss  ",
    "  wwwwW  ",
    " wwwwwww ",
    " wWwWwww ",
    " ww  ww  ",
    " wwmMww  ",
    "  w m w  ",
    "  W   W  ",
    "  d   d  ",
    "         ",
  ],
  // Frame 1 — mid-step
  [
    "  aaaaa  ",
    " aBssB a ",
    " qsesesq ",
    " qsSSSq  ",
    "  sssss  ",
    "  wwwwW  ",
    " wwwwwww ",
    " wWwWwww ",
    "  ww  ww ",
    " wwmMww  ",
    "  w  mw  ",
    "  W   W  ",
    "   d d   ",
    "         ",
  ],
];

// ── CIPHER ─────────────────────────────────────────────────────────────────────
// HOPPER — dark hair, beard shadow (v pixels on chin), teal jacket. Security agent.
// Hair: h (dark brown). Visor: v (repurposed as beard shadow on lower face).
export const CIPHER_F: string[][] = [
  // Frame 0 — standing
  // Hopper: hat + beard + flashlight (y) in hand
  [
    "  aaaaa  ",
    " aahhhaa ",
    " hzsszzh ",
    " hzvvvzh ",
    "  sssss  ",
    "  zZzzz  ",
    " zZzZzzz ",
    " zzZzzzz ",
    " zz  zz  ",
    " zzy yzz ",
    "  z y z  ",
    "  Z   Z  ",
    "  d   d  ",
    "         ",
  ],
  // Frame 1 — mid-step
  [
    "  aaaaa  ",
    " aahhhaa ",
    " hzsszzh ",
    " hzvvvzh ",
    "  sssss  ",
    "  zZzzz  ",
    " zZzZzzz ",
    " zzZzzzz ",
    "  zz zz  ",
    " zzy yzz ",
    "  z y z  ",
    "  Z   Z  ",
    "   d d   ",
    "         ",
  ],
];

// ── FLUX ───────────────────────────────────────────────────────────────────────
// LUCAS — (male) chestnut brown hair (B), amber trading jacket (F/f). Coordinator proxy.
export const FLUX_F: string[][] = [
  // Frame 0 — standing
  // Lucas: headband + wristband stripe
  [
    "  yyyyy  ",
    " yBssByy ",
    " BsesesB ",
    "  BssssB ",
    "  sssss  ",
    "  ggggg  ",
    " ggggggg ",
    " gGgggGg ",
    " gg  gg  ",
    " ggy gg  ",
    "  g y g  ",
    "  d   d  ",
    "  d   d  ",
    "         ",
  ],
  // Frame 1 — mid-step
  [
    "  yyyyy  ",
    " yBssByy ",
    " BsesesB ",
    "  BssssB ",
    "  sssss  ",
    "  ggggg  ",
    " ggggggg ",
    " gGgggGg ",
    "  gg gg  ",
    "  ggy gg ",
    "  g y g  ",
    "  d   d  ",
    "   d d   ",
    "         ",
  ],
];

// ── CRAB ───────────────────────────────────────────────────────────────────────
// The crab mascot. 12 wide × 8 tall. One static frame per emotion state.
// Emotion states map directly to Emotion type in types.ts.
export const CRAB: Record<string, string[]> = {
  // Stranger Things-ish "Hawkins Gate" vibe while keeping the same 12x8 sprite size.
  idle: [
    "   zzzzzz   ",
    "  zZZZZZZz  ",
    "  zZyyyyZz  ",
    "  zZyyyyZz  ",
    "  zZZZZZZz  ",
    "   zzzzzz   ",
    "    z  z    ",
    "   zyyyyz   ",
  ],
  thinking: [
    "   zzzzzz   ",
    "  zZZZZZZz  ",
    "  zZyyxyZz  ",
    "  zZyyxyZz  ",
    "  zZZZZZZz  ",
    "   zzzzzz   ",
    "    z  z    ",
    "   zyyyyz   ",
  ],
  happy: [
    "   zzzzzz   ",
    "  zZZZZZZz  ",
    "  zZggggZz  ",
    "  zZggggZz  ",
    "  zZZZZZZz  ",
    "   zzzzzz   ",
    "    z  z    ",
    "   zggggz   ",
  ],
  working: [
    "   zzzzzz   ",
    "  zZZZZZZz  ",
    "  zZgyyyZz  ",
    "  zZgyyyZz  ",
    "  zZZZZZZz  ",
    "   zzzzzz   ",
    "    z  z    ",
    "   zgyyyz   ",
  ],
  excited: [
    "   zzzzzz   ",
    "  zZZZZZZz  ",
    "  zZxxxyZz  ",
    "  zZxxxyZz  ",
    "  zZZZZZZz  ",
    "   zzzzzz   ",
    "    z  z    ",
    "   zxxxyz   ",
  ],
  error: [
    "   xxxxxx   ",
    "  xxZZxxZZ  ",
    "  zZxxxxZz  ",
    "  zZxxxxZz  ",
    "  xxZZxxZZ  ",
    "   xxxxxx   ",
    "    x  x    ",
    "   zxxxxz   ",
  ],
  success: [
    "   zzzzzz   ",
    "  zZZZZZZz  ",
    "  zZggggZz  ",
    "  zZggggZz  ",
    "  zZZZZZZz  ",
    "   zzzzzz   ",
    "    z  z    ",
    "   zggggz   ",
  ],
};

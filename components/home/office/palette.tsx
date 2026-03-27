'use client'

// ── palette.ts ────────────────────────────────────────────────────────────────
// Pixel-art colour palette and the SVG sprite renderer used by all agents
// and the crab mascot. Every character in a sprite row maps to one hex value
// in P{}. Space and underscore render as transparent (no rect drawn).
// Sprite() is a pure component — same input always produces the same SVG.

// ── Colour map ────────────────────────────────────────────────────────────────
// Single ASCII character → CSS hex colour.
// Shared colours come first; agent-specific groups follow.
export const P: Record<string, string> = {
  ' ': '', _: '',              // transparent — skip rendering this cell

  // Shared skin tones + outlines used by all five agents
  s: '#e8c49a',  // skin mid-tone
  S: '#c09060',  // skin shadow
  e: '#1a1a2e',  // eye dark
  d: '#050607',  // shoe black / outline

  // Extra accents for stronger character distinction
  a: '#111827',  // near-black (hats/headbands)
  u: '#3b5b7a',  // denim/blue jacket accent
  U: '#274057',  // darker denim shadow
  m: '#9ca3af',  // metal / plastic light (props)
  M: '#6b7280',  // metal / plastic shadow (props)

  // JANSKY — navy suit, white shirt, red tie, dark brown hair
  h: '#2c1810', H: '#5a3520',  // hair body / highlight
  n: '#1e3a5f', N: '#0f1e35',  // navy suit body / shadow
  t: '#f0f0f0',                // white dress shirt
  k: '#c0392b',                // red tie

  // ORBIT — purple hoodie, black headphones
  p: '#6b2fa0', o: '#3d1a5e',  // purple hoodie body / shadow
  q: '#1a1a1a',                // headphone black

  // NOVA — red hair, blue-grey lab coat (white was invisible on the dark bg)
  r: '#9b2020', R: '#c0392b',  // red hair body / highlight
  w: '#7ba7d4', W: '#4a6fa5',  // blue-grey coat body / shadow
  l: '#87ceeb',                // light-blue collar accent

  // CRAB mascot
  c: '#d04020', C: '#8a2010',  // crab body / shadow
  y: '#f0c060',                // claw yellow
  g: '#10b981',                // green (happy / success state)
  x: '#ef4444',                // red (error state)

  // CIPHER — dark teal jacket, beard shadow (Hopper)
  z: '#14b8a6', Z: '#0f766e',  // teal jacket body / shadow
  v: '#5a3a28',                // beard/stubble dark brown

  // FLUX — gold/amber trading jacket, chestnut brown hair (Robin)
  F: '#f59e0b', f: '#b45309',  // amber suit body / shadow
  B: '#7a3c18',                // chestnut brown hair
  G: '#0b6b55',                // deep green shadow (Lucas jacket depth)
}

// ── PX ────────────────────────────────────────────────────────────────────────
// Base pixel size in CSS px. Each sprite cell = PX × PX pixels at scale 1.
// Raise scale in Sprite() to zoom a sprite without changing this constant.
export const PX = 4

// ── Sprite ────────────────────────────────────────────────────────────────────
// Renders a pixel-art sprite as a grid of coloured SVG <rect> elements.
// rows   — array of strings; each character maps to P[char]
// scale  — multiplier on PX (default 1 → 4 CSS px per pixel)
// imageRendering: pixelated prevents anti-aliasing blur on the rect edges.
export function Sprite({ rows, scale = 1 }: { rows: string[]; scale?: number }) {
  const ps = PX * scale                          // pixels per cell at this scale
  const W  = (rows[0]?.length ?? 0) * ps        // total SVG width
  const H  = rows.length * ps                   // total SVG height

  return (
    <svg width={W} height={H} style={{ imageRendering: 'pixelated', display: 'block' }}>
      {rows.flatMap((row, y) =>
        row.split('').map((ch, x) =>
          // Only render a rect when the colour is non-empty (skip ' ' and '_')
          P[ch] ? (
            <rect
              key={`${x}-${y}`}
              x={x * ps} y={y * ps}
              width={ps}  height={ps}
              fill={P[ch]}
            />
          ) : null
        )
      )}
    </svg>
  )
}

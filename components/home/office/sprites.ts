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
  [' RRRRRR  ',' RssssR  ',' RseseR  ',' RssssR  ','  sssss  ','  kkkkk  ',' kkkkkkk ',' kkkkkkk ',' kkk kk  ',' kkk kk  ','  k   k  ','  r   r  ','  d   d  ','         '],
  // Frame 1 — mid-step (right leg forward)
  [' RRRRRR  ',' RssssR  ',' RseseR  ',' RssssR  ','  sssss  ','  kkkkk  ',' kkkkkkk ',' kkkkkkk ','  kk  k  ','  kk  k  ','  k   k  ','  r   r  ','   d  d  ','         '],
]

// ── ORBIT ──────────────────────────────────────────────────────────────────────
// EL (Eleven) — short dark hair, purple hoodie. No headphones.
// Hair: h (dark brown). Hoodie: p (purple) / o (shadow).
export const ORBIT_F: string[][] = [
  // Frame 0 — standing
  [' hppph   ',' hpssph  ',' hpsesph ',' hpsssp  ','  pppppp ','pppppppp ','pppppppp ',' ppp pp  ',' ppp pp  ','  pp pp  ','  o   o  ','  o   o  ','  d   d  ','         '],
  // Frame 1 — mid-step
  [' hppph   ',' hpssph  ',' hpsesph ',' hpsssp  ','  pppppp ','pppppppp ','pppp ppp ','pppp pp  ',' ppp pp  ','  pp pp  ','  o   o  ','  o   o  ','  d   d  ','         '],
]

// ── NOVA ───────────────────────────────────────────────────────────────────────
// DUSTIN — curly brown hair, blue-grey casual jacket. Researcher / web-search agent.
// Hair: h (dark brown) / H (highlight). Jacket: w (blue-grey) / W (shadow).
export const NOVA_F: string[][] = [
  // Frame 0 — standing
  ['  hhhhh  ',' hhsshh  ',' hsleslh ',' hssssH  ','  sssss  ','  wwwww  ',' wwwwwww ',' wwwwwww ',' ww  ww  ',' ww  ww  ','  w   w  ','  W   W  ','  d   d  ','         '],
  // Frame 1 — mid-step
  ['  hhhhh  ',' hhsshh  ',' hsleslh ',' hssssH  ','  sssss  ','  wwwww  ',' wwwwwww ',' wwwwwww ','  ww  ww ',' ww  ww  ','  w   w  ','  W   W  ','   d  d  ','         '],
]

// ── CIPHER ─────────────────────────────────────────────────────────────────────
// HOPPER — dark hair, beard shadow (v pixels on chin), teal jacket. Security agent.
// Hair: h (dark brown). Visor: v (repurposed as beard shadow on lower face).
export const CIPHER_F: string[][] = [
  // Frame 0 — standing
  [' hzzzzh  ',' hzsszzh ',' hzsshzh ',' hzvvvz  ','  sssss  ','  zZzzz  ',' zZzZzzz ',' zzZzzzz ',' zz  zz  ',' zz  zz  ','  z   z  ','  Z   Z  ','  d   d  ','         '],
  // Frame 1 — mid-step
  [' hzzzzh  ',' hzsszzh ',' hzsshzh ',' hzvvvz  ','  sssss  ','  zZzzz  ',' zZzZzzz ',' zzZzzzz ','  zz zz  ','  zz zz  ','  z   z  ','  Z   Z  ','   d d   ','         '],
]

// ── FLUX ───────────────────────────────────────────────────────────────────────
// ROBIN — chestnut brown hair (B), amber trading jacket (F/f). Markets / quant agent.
export const FLUX_F: string[][] = [
  // Frame 0 — standing
  ['  BBBBB  ',' BssssBB ',' BsesssB ','  BssssB ','  sssss  ','  FfFFF  ',' FFFfFFF ',' FFFfFFF ',' FF  FF  ',' FF  FF  ','  F   F  ','  f   f  ','  d   d  ','         '],
  // Frame 1 — mid-step
  ['  BBBBB  ',' BssssBB ',' BsesssB ','  BssssB ','  sssss  ','  FfFFF  ',' FFFfFFF ',' FFFfFFF ','  FF FF  ','  FF FF  ','  F   F  ','  f   f  ','   d d   ','         '],
]

// ── CRAB ───────────────────────────────────────────────────────────────────────
// The crab mascot. 12 wide × 8 tall. One static frame per emotion state.
// Emotion states map directly to Emotion type in types.ts.
export const CRAB: Record<string, string[]> = {
  idle:     ['   cccccc   ','  cccccccc  ',' cccyeyccc  ','cccccccccccc','ccCccccccCcc',' cccccccccc ','  cc  cc  c ','  c   cc   c'],
  thinking: ['c  cccccc   ','cc cccccccc ',' cccyeyccc  ','cccccccccccc','ccCccccccCcc',' cccccccccc ','  cc  cc    ','   c  cc    '],
  happy:    ['c   cccccc c',' c cccccc c ','  ccyeyccc  ',' cccccccccc ','ccCcgggcgCcc',' cccccccccc ','  cc  cc  c ',' c c  cc c  '],
  working:  ['   cccccc   ','  cccccccc  ','cccyeyccccc ','cccccccccccc','cCccccccccCc',' cccccccccc ','cc  cc  cc  ','cc  cc  cc  '],
  excited:  ['c  cccccc  c',' c cccccc c ','  ccyRyccc  ',' cccccccccc ','ccCccgcccCcc',' gccccccccg ','  cc  cc    ',' c c  cc c  '],
  error:    ['   xxxxxx   ','  cccccccc  ',' cccxexxcc  ','xxccccccccxx','ccCccccccCcc',' cccccccccc ','  cc  cc  c ','  c   cc   c'],
  success:  ['g  cccccc  g',' g cccccc g ','  ccgegccc  ','ccccggggcccc','ccCcggggcCcc',' gccccccccg ','  cc  cc  c ',' g c  cc g  '],
}

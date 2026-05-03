# Nexus Figma Implementation Rules

This file turns the Canva concept pass and Figma plugin analysis into repo-native implementation rules for Nexus Prime.

Use it when translating a cinematic concept into production code. Do not treat the Canva board as the permanent source of truth once implementation starts.

## Active Design References

- Canva concept board view: `https://www.canva.com/d/FZ3EWE2EOWssOoF`
- Canva concept board edit: `https://www.canva.com/d/IAVbi_asV5rgiY8`
- Permanent design-system source: `DESIGN.md`
- Interpretive design contract: `docs/NEXUS_TASTE_CONTRACT.md`
- Generated runtime outputs: `app/design-md.generated.css`, `lib/generated/designMdRuntime.ts`

## 1. Design Token Definitions

Primary runtime tokens live in `DESIGN.md`. `app/design-md.generated.css` and `lib/generated/designMdRuntime.ts` are generated outputs and must not be edited by hand; `app/globals.css` consumes those variables for selectors, keyframes, layout rules, and component styling.

- Color tokens: `--bg`, `--surf*`, `--border*`, `--text*`, `--accent`, `--accent2`
- Material tokens: `--panel`, `--panel-muted`, `--panel-hero`, `--hairline`, `--accent-glow`
- Motion tokens: `--motion-*`, `--nexus-atmosphere-*`, `--nexus-sequence-*`, `--nexus-signal-*`
- Geometry tokens: `--top-rail-height`, `--shell-max-*`, `--shell-gutter`, radius and spacing scales

Surface-specific semantics are layered on top of those globals:

- `lib/nexusTasteContract.ts`: route-level workplane, rail, continuity, and directive language
- `lib/brand.ts`: visible labels, accent palettes, hero titles, and route branding notes
- `lib/surfaceMotion.ts`: atmosphere, sequence, and signal presets
- `lib/opsLayoutRegistry.ts`: layout descriptors for shell-facing surfaces

Pattern:

```ts
const taste = getNexusTasteContract("hq");
const branding = getSurfaceBranding("hq");
const atmosphere = resolveSurfaceAtmosphereSpec("hq");
```

Implementation rule:

- Add or change cinematic tokens in `DESIGN.md` first, then run `npm run design:generate`
- Use `lib/brand.ts` and `lib/nexusTasteContract.ts` for route-specific differentiation
- Do not hand-edit `app/design-md.generated.css` or `lib/generated/designMdRuntime.ts`
- Do not create a second detached token source in JSON, Figma-only notes, or component-local constants unless it is strictly local behavior

## 2. Component Library

Shared visual primitives live in `components/ui/shell.tsx`.

Primary shell primitives:

- `ShellPage`
- `ShellButton`
- `ShellBadge`
- `OpsWorkplane`
- `OpsRail`
- `OpsStrip`
- `OpsField`
- `OpsInspector`

Flagship HQ composition lives in `components/home/office/*`.

Important HQ files:

- `OfficeCommandCenter.tsx`
- `HQStrategiumDeck.tsx`
- `HQPreludePostureSection.tsx`
- `HQMissionRailSection.tsx`
- `OfficeRoom3D.tsx`

Trust chrome lives in:

- `components/ui/TrustPostureStrip.tsx`
- `components/ui/TrustOperationsRail.tsx`

There is no Storybook or separate design-system app in this repo. The production app is the component reference surface.

Pattern:

```tsx
<ShellPage surface="hq" title="HQ" description="Command table.">
  <OpsWorkplane>{children}</OpsWorkplane>
  <OpsRail>{support}</OpsRail>
  <OpsStrip>{continuity}</OpsStrip>
</ShellPage>
```

Implementation rule:

- New first-view surfaces should compose from the shell primitives before inventing route-specific wrappers
- HQ can remain more custom, but it still needs to read as one dominant workplane, one support rail, and one continuity strip

## 3. Frameworks and Libraries

Core stack from `package.json`:

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Framer Motion
- React Three Fiber + Drei

Meaning for design translation:

- Use server/client component boundaries normally; visual state and motion usually live in client components
- Tailwind is available, but the branded shell language is primarily semantic CSS in `app/globals.css`
- 3D room work belongs in the existing React Three Fiber stack, not a parallel canvas system

## 4. Asset Management

Theme and route assets live in `public/theme`.

Examples:

- Route plates: `public/theme/satops-*.svg`
- Tactical overlays: `public/theme/tactical-*.svg`
- Legacy route emblems and photo assets: `public/theme/*.svg`, `public/theme/*.jpg`

Usage pattern:

- Decorative or fixed plate assets are referenced as root-relative URLs like `"/theme/satops-hq-plate.svg"`
- Large rendered images use `next/image`
- Non-essential atmosphere layers are often CSS gradients or pseudo-elements instead of discrete assets

Pattern:

```tsx
<Image
  src="/theme/satops-hq-plate.svg"
  alt=""
  fill
  sizes="100vw"
  className="nexus-shell-stage__plateImage"
/>
```

Implementation rule:

- Prefer SVG plates and CSS overlays for the cinematic shell
- Use image assets only when they add meaning to the surface
- Do not introduce noisy wallpaper or photo-heavy hero treatments that compete with the workplane

## 5. Icon System

There is no strict centralized icon registry in the current runtime shell.

Current visual language relies more on:

- route plates
- thin contour rules
- telemetry lines
- compact text readouts
- occasional inline marks or utility glyphs

Implementation rule:

- If you add icons, keep them thin, instrumental, and stroke-led
- Avoid playful filled icon packs or bright multicolor glyphs
- Prefer using the existing shell geometry and telemetry language before adding a new icon

## 6. Styling Approach

Styling is hybrid:

- Generated design foundation in `app/design-md.generated.css`, imported before globals
- Global semantic CSS in `app/globals.css`
- Tailwind utility classes in component markup
- `lib/cn.ts` merges class strings with `clsx` + `tailwind-merge`

Pattern:

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Responsive behavior is implemented through:

- CSS grids and flex layouts
- `clamp(...)`
- CSS custom properties
- targeted media queries in `app/globals.css`

Implementation rule:

- For flagship or repeated shell surfaces, prefer semantic classes in `app/globals.css`
- Use utilities for local layout adjustments, not to recreate the full visual language inline
- Reduced-motion rules must remain authoritative from first paint

## 7. Project Structure

High-level organization:

- `app/*`: routes, layouts, and API endpoints
- `components/ui/*`: shared shell and interface primitives
- `components/home/office/*`: HQ flagship surface
- `components/<route>/*`: route-specific UI
- `lib/*`: design contracts, motion, helpers, and registries
- `public/theme/*`: route plates and visual assets

Route organization is feature-oriented, but the shell is shared.

Implementation rule:

- Keep cinematic changes centralized in shared contracts and shell styling whenever possible
- Route files should mainly choose content and emphasis, not invent alternate design systems

## Cinematic Design Rules

These are the rules Figma or Canva concepts must obey before they are translated into code:

1. Use obsidian, graphite, smoked glass, liquid chrome, electric cyan, and restrained amber.
2. Keep one dominant workplane, one support rail, and one continuity strip per route.
3. Let route plates feel widescreen and holographic, not embossed or boxed.
4. Keep copy sparse and operational; visible labels should read like instrument cues.
5. Motion must follow the same order everywhere:
   - environment fade or scan
   - route plate lock-in
   - workplane reveal
   - support rail arrival
   - continuity pulse
6. Trust chrome should read like status instrumentation: summary first, detail on demand.
7. HQ remains the flagship, but every first-view route must read as part of the same command-room family.

## Anti-Patterns

- Reintroducing card mosaics as the first impression
- Warm brass or parchment tones as the default shell identity
- Paragraph-length strip notes in first-view surfaces
- Trust UI that looks like a separate admin console
- Decorative motion loops that are louder than the actual workspace

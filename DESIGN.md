---
version: alpha
name: Homefront
description: Local-first command intelligence dashboard with a cinematic, dense, operator-grade shell.
colors:
  primary: "#05080C"
  surface: "#0A0F14"
  surface-2: "#10161D"
  surface-3: "#171F28"
  border: "#1F2934"
  border-strong: "#4B5B6D"
  text: "#EDF3F8"
  text-muted: "#BCC7D3"
  text-subtle: "#738398"
  accent: "#9FB6C8"
  accent-strong: "#DDE6EE"
  signal: "#DFE8EF"
  ember: "#9FB2C2"
  steel: "#DBE5EE"
  critical: "#D66D74"
  cyan: "#61D8FF"
  blue: "#79B8FF"
  warning: "#E7C072"
  success: "#83EFCB"
typography:
  display-xl:
    fontFamily: Bahnschrift, Segoe UI, Trebuchet MS, sans-serif
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  title-lg:
    fontFamily: Bahnschrift, Segoe UI, Trebuchet MS, sans-serif
    fontSize: 30px
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body-md:
    fontFamily: Bahnschrift, Segoe UI, Trebuchet MS, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Bahnschrift, Segoe UI, Trebuchet MS, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: Bahnschrift, Segoe UI, Trebuchet MS, sans-serif
    fontSize: 10px
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: 0.18em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 24px
  full: 9999px
spacing:
  micro: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 32px
  shell-gutter: 20px
components:
  shell-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
  shell-panel-muted:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  primary-action:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  telemetry-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.blue}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
motion:
  profileDefault: flagship
  profiles:
    reduced:
      description: Static-first; no ambient loops, parallax, plate sweeps, or room drift.
      durationScale: 0
      vfxQuality: off
    standard:
      description: Functional motion only; transitions stay crisp and 3D VFX caps at low.
      durationScale: 0.82
      vfxQuality: low
    flagship:
      description: Full cinematic choreography with ambient shell motion and HQ room cues.
      durationScale: 1
      vfxQuality: high
  durations:
    fast: 180ms
    medium: 280ms
    slow: 480ms
    reduced-fast: 10ms
    ambient-haze: 18s
    ambient-grid: 26s
    ambient-ornament: 24s
    ambient-sweep: 9.5s
  ease:
    standard: [0.4, 0, 0.2, 1]
    emphasis: [0.22, 1, 0.36, 1]
  sequence:
    order:
      - environment fade
      - route plate lock-in
      - workplane reveal
      - support rail arrival
      - continuity pulse
    heroDelay: 40ms
    primaryDelay: 110ms
    supportDelay: 180ms
    continuityDelay: 250ms
  signal:
    navBeam: 1600ms
    alertStamp: 460ms
    ribbonPulse: 1200ms
    doctrineRelight: 2200ms
    toast: 280ms
  chronicle:
    order: 320ms
    continuity: 420ms
    bandInterval: 70ms
    livePulse: 1500ms
surfaces:
  default:
    visibleLabel: Homefront
    functionalLabel: Home
    chamberTone: ceremonial
    workplaneLabel: Workplane
    supportLabel: Rail
    continuityLabel: Continuity
    routeDirective: Lead with the workplane. Keep support quiet.
    accentA: "#38D7FF"
    accentB: "#DCEFFF"
    glowStart: "rgba(56,215,255,.14)"
    glowEnd: "rgba(183,228,255,.12)"
    edge: "rgba(95,157,194,.18)"
    plate: /theme/satops-command-plate.svg
  hq:
    visibleLabel: HQ
    functionalLabel: Mission control
    chamberTone: ceremonial
    workplaneLabel: Chronicle
    supportLabel: Tactical rail
    continuityLabel: Command band
    routeDirective: Keep the chronicle loudest and the room useful.
    accentA: "#3FD8FF"
    accentB: "#E4F2FF"
    glowStart: "rgba(63,216,255,.18)"
    glowEnd: "rgba(195,234,255,.14)"
    edge: "rgba(146,176,202,.22)"
    plate: /theme/satops-hq-plate.svg
  command:
    visibleLabel: COMMAND
    functionalLabel: Operations grid
    chamberTone: tactical
    workplaneLabel: Dispatch
    supportLabel: Control rail
    continuityLabel: Ops band
    routeDirective: Make pressure and action readable at a glance.
    accentA: "#36C8FF"
    accentB: "#CDE8FF"
    glowStart: "rgba(62,205,255,.16)"
    glowEnd: "rgba(186,230,255,.12)"
    edge: "rgba(135,173,214,.18)"
    plate: /theme/satops-command-plate.svg
  intel:
    visibleLabel: INTEL
    functionalLabel: World picture
    chamberTone: spectral
    workplaneLabel: Signal plane
    supportLabel: Evidence rail
    continuityLabel: Intel band
    routeDirective: Lead with signal and suppress noise.
    accentA: "#62CFFF"
    accentB: "#D7EBFF"
    glowStart: "rgba(89,109,187,.16)"
    glowEnd: "rgba(199,170,111,.12)"
    edge: "rgba(199,170,111,.16)"
    plate: /theme/satops-intel-plate.svg
  alpha:
    visibleLabel: ALPHA
    functionalLabel: Market desk
    chamberTone: quant
    workplaneLabel: Decision plane
    supportLabel: Review rail
    continuityLabel: Market band
    routeDirective: Keep thesis and posture ahead of instruments.
    accentA: "#64D8FF"
    accentB: "#DFF4FF"
    glowStart: "rgba(158,123,50,.14)"
    glowEnd: "rgba(217,192,142,.14)"
    edge: "rgba(199,154,67,.16)"
    plate: /theme/satops-alpha-plate.svg
  cyber:
    visibleLabel: CYBER
    functionalLabel: Threat desk
    chamberTone: hardened
    workplaneLabel: Containment
    supportLabel: Repair rail
    continuityLabel: Evidence band
    routeDirective: Make evidence and repair louder than mood.
    accentA: "#7BE5FF"
    accentB: "#D6F3FF"
    glowStart: "rgba(124,46,54,.16)"
    glowEnd: "rgba(199,164,106,.12)"
    edge: "rgba(124,46,54,.18)"
    plate: /theme/satops-cyber-plate.svg
  recon:
    visibleLabel: RECON
    functionalLabel: Collection desk
    chamberTone: stealth
    workplaneLabel: Case plane
    supportLabel: Pivot rail
    continuityLabel: Case band
    routeDirective: Keep the active case in front.
    accentA: "#8FDFFF"
    accentB: "#DCEFFF"
    glowStart: "rgba(88,109,179,.14)"
    glowEnd: "rgba(198,178,133,.12)"
    edge: "rgba(126,139,173,.16)"
    plate: /theme/satops-recon-plate.svg
  vault:
    visibleLabel: VAULT
    functionalLabel: Archive spine
    chamberTone: archival
    workplaneLabel: Archive plane
    supportLabel: Steward rail
    continuityLabel: Memory band
    routeDirective: Make recall and graph state feel like one instrument.
    accentA: "#B9D8FF"
    accentB: "#EFF7FF"
    glowStart: "rgba(91,110,172,.15)"
    glowEnd: "rgba(197,165,106,.14)"
    edge: "rgba(197,165,106,.18)"
    plate: /theme/satops-vault-plate.svg
  vehicle:
    visibleLabel: VEHICLE
    functionalLabel: Systems lab
    chamberTone: tactical
    workplaneLabel: Launch plane
    supportLabel: Systems rail
    continuityLabel: Flight band
    routeDirective: Keep readiness clearer than telemetry.
    accentA: "#4FD5FF"
    accentB: "#D8EEFF"
    glowStart: "rgba(83,104,193,.14)"
    glowEnd: "rgba(197,154,82,.14)"
    edge: "rgba(197,154,82,.18)"
    plate: /theme/satops-vehicle-plate.svg
  resources:
    visibleLabel: RESOURCES
    functionalLabel: Reference desk
    chamberTone: codex
    workplaneLabel: Workbench
    supportLabel: Guide rail
    continuityLabel: Session band
    routeDirective: Keep the active tool louder than the stack.
    accentA: "#8DDCFF"
    accentB: "#DEEFFF"
    glowStart: "rgba(187,142,61,.16)"
    glowEnd: "rgba(215,204,177,.12)"
    edge: "rgba(187,142,61,.18)"
    plate: /theme/satops-resources-plate.svg
  security:
    visibleLabel: SECURITY
    functionalLabel: Control surface
    chamberTone: hardened
    workplaneLabel: Control plane
    supportLabel: Trust rail
    continuityLabel: Security band
    routeDirective: Lead with controls and protected posture.
    accentA: "#7ACFFF"
    accentB: "#DDEFFF"
    glowStart: "rgba(90,116,156,.14)"
    glowEnd: "rgba(196,211,224,.12)"
    edge: "rgba(134,162,182,.18)"
    plate: /theme/satops-security-plate.svg
  skills:
    visibleLabel: SKILLS
    functionalLabel: Workflow forge
    chamberTone: codex
    workplaneLabel: Forge plane
    supportLabel: Capability rail
    continuityLabel: Learning band
    routeDirective: Keep the active lab louder than the catalog.
    accentA: "#8DDCFF"
    accentB: "#E6F4FF"
    glowStart: "rgba(120,141,162,.14)"
    glowEnd: "rgba(196,211,224,.12)"
    edge: "rgba(160,176,190,.18)"
    plate: /theme/satops-skills-plate.svg
assets:
  routePlatePattern: /theme/satops-{surface}-plate.svg
  tacticalOverlayPattern: /theme/tactical-{surface}.svg
  iconStyle: thin contour rules, telemetry lines, compact text readouts
accessibility:
  reducedMotionDataAttribute: data-nexus-motion-profile="reduced"
  prefersReducedMotion: true
  contrastMinimum: WCAG AA
  keyboardMotionControls: true
density:
  designVariance: 7
  motionIntensity: 6
  visualDensity: 7
  workplaneRule: one dominant workplane, one support rail, one continuity strip
cssVariables:
  root:
    bg: "#05080c"
    surf: "#0a0f14"
    surf2: "#10161d"
    surf3: "#171f28"
    border: "#1f2934"
    border2: "#4b5b6d"
    text: "#edf3f8"
    text2: "#bcc7d3"
    text3: "#738398"
    accent: "#9fb6c8"
    accent2: "#dde6ee"
    r: 8px
    rs: 4px
    t: "var(--motion-fast)"
    fhi: "#d4dee7"
    fmd: "#92a6b9"
    flo: "#d66d74"
    glow-accent: "rgba(159, 182, 200, 0.12)"
    glow-green: "rgba(160, 183, 201, 0.08)"
    glow-red: "rgba(214, 109, 116, 0.16)"
    glow-purple: "rgba(123, 141, 162, 0.12)"
    signal: "#dfe8ef"
    ember: "#9fb2c2"
    violet: "#647688"
    steel: "#dbe5ee"
    space-1: 4px
    space-2: 8px
    space-3: 12px
    space-4: 16px
    space-5: 20px
    radius-sm: 4px
    radius-md: 8px
    radius-lg: 12px
    radius-pill: 999px
    fs-xs: 10px
    fs-sm: 12px
    fs-md: 13px
    fs-lg: 16px
    lh-tight: 1.35
    lh-base: 1.5
    elev-1: "0 1px 2px rgba(0, 0, 0, 0.18)"
    elev-2: "0 4px 14px rgba(0, 0, 0, 0.28)"
    ring-subtle: "0 0 0 1px rgba(103,232,249,.18)"
    top-rail-height: 108px
    shell-max-standard: 1220px
    shell-max-wide: 1440px
    shell-max-full: "min(1580px, calc(100vw - 24px))"
    shell-gutter: "clamp(14px, 1.6vw, 20px)"
    panel: "rgba(7, 12, 17, 0.92)"
    panel-muted: "rgba(8, 13, 19, 0.82)"
    panel-hero: "linear-gradient(180deg, rgba(13, 18, 24, 0.94), rgba(7, 10, 14, 0.98))"
    hairline: "rgba(148, 167, 184, 0.12)"
    hairline-strong: "rgba(219, 230, 238, 0.18)"
    text-strong: "#eff5fa"
    text-muted: "#b9c5d1"
    text-subtle: "#728297"
    accent-glow: "0 18px 48px rgba(0, 0, 0, 0.42)"
    ease-standard: "cubic-bezier(.4,0,.2,1)"
    ease-emphasis: "cubic-bezier(.22,1,.36,1)"
    motion-fast: ".18s var(--ease-standard)"
    motion-medium: ".28s var(--ease-emphasis)"
    motion-slow: ".48s var(--ease-emphasis)"
    nexus-atmosphere-haze-duration: 18s
    nexus-atmosphere-grid-duration: 26s
    nexus-atmosphere-ornament-duration: 24s
    nexus-atmosphere-sweep-duration: 9.5s
    nexus-atmosphere-world-opacity: ".28"
    nexus-atmosphere-veil-opacity: ".96"
    nexus-atmosphere-frame-opacity: ".42"
    nexus-atmosphere-focus: "50% 32%"
    nexus-atmosphere-spotlight: "50% 28%"
    nexus-sequence-hero-delay: 40ms
    nexus-sequence-primary-delay: 110ms
    nexus-sequence-support-delay: 180ms
    nexus-sequence-continuity-delay: 250ms
    nexus-signal-nav-beam-duration: 1600ms
    nexus-signal-alert-stamp-duration: 460ms
    nexus-signal-ribbon-pulse-duration: 1200ms
    nexus-signal-doctrine-relight-duration: 2200ms
    nexus-signal-toast-duration: 280ms
    nexus-chronicle-order-duration: 320ms
    nexus-chronicle-continuity-duration: 420ms
    nexus-chronicle-band-interval: 70ms
    nexus-chronicle-live-pulse: 1500ms
    nexus-taste-variance: 7
    nexus-taste-motion: 6
    nexus-taste-density: 7
  reducedMotion:
    motion-fast: ".01s linear"
    motion-medium: ".01s linear"
    motion-slow: ".01s linear"
  ux5:
    nexus-ux5-line: "rgba(195, 209, 220, 0.12)"
    nexus-ux5-line-strong: "rgba(226, 234, 241, 0.2)"
    nexus-ux5-line-soft: "rgba(195, 209, 220, 0.06)"
    nexus-ux5-surface: "rgba(8, 11, 15, 0.72)"
    nexus-ux5-surface-strong: "rgba(10, 14, 18, 0.9)"
    nexus-ux5-surface-quiet: "rgba(7, 10, 13, 0.46)"
    nexus-ux5-signal: "#dfe8ef"
    nexus-ux5-text-soft: "#a7b4bf"
  ux6:
    nexus-ux6-bg: "#05080b"
    nexus-ux6-bg-soft: "#0a0f14"
    nexus-ux6-panel: "rgba(10, 14, 18, 0.82)"
    nexus-ux6-panel-strong: "rgba(13, 18, 22, 0.92)"
    nexus-ux6-line: "rgba(166, 183, 195, 0.18)"
    nexus-ux6-line-strong: "rgba(212, 223, 230, 0.34)"
    nexus-ux6-line-soft: "rgba(166, 183, 195, 0.09)"
    nexus-ux6-text: "#e6eef4"
    nexus-ux6-text-soft: "rgba(220, 231, 239, 0.74)"
    nexus-ux6-text-muted: "rgba(190, 206, 218, 0.52)"
    nexus-ux6-accent: "#9cb8c8"
    nexus-ux6-accent-soft: "rgba(156, 184, 200, 0.24)"
  ux7:
    nexus-ux7-surface: "rgba(6, 11, 18, 0.84)"
    nexus-ux7-surface-strong: "rgba(8, 14, 23, 0.94)"
    nexus-ux7-surface-soft: "rgba(10, 18, 28, 0.72)"
    nexus-ux7-line: "rgba(116, 162, 201, 0.16)"
    nexus-ux7-line-strong: "rgba(150, 197, 236, 0.3)"
    nexus-ux7-line-faint: "rgba(137, 171, 201, 0.08)"
    nexus-ux7-text: "#e7f0f9"
    nexus-ux7-text-soft: "rgba(203, 220, 236, 0.76)"
    nexus-ux7-text-muted: "rgba(137, 166, 190, 0.82)"
    nexus-ux7-blue: "#79b8ff"
    nexus-ux7-cyan: "#61d8ff"
    nexus-ux7-alert: "#f08a94"
    nexus-ux7-warn: "#e7c072"
    nexus-ux7-good: "#83efcb"
---

# Homefront Design System

## Overview
Homefront should feel like a local-first command room: obsidian, graphite, smoked glass, liquid chrome, electric cyan, and restrained amber. The interface is dense by intention, but it should feel ordered and operational rather than cluttered. Agents should design for one dominant workplane, one quiet support rail, and one continuity strip before adding any extra chrome.

The visual voice is precise, instrumented, and slightly cinematic. HQ is the flagship 3D surface, but every route belongs to the same command-room family.

## Colors
The palette is dark and low-glare. `primary` is the effective page base, `surface` and `surface-2` form the shell, `text` and `text-muted` carry operator copy, and `accent` / `accent-strong` provide restrained instrumentation.

Use cyan or blue for live state and exact-session affordances. Use amber only for readiness, warnings, and escalation. Use red only for true critical or unsafe states.

## Typography
Typography should read as compressed display plus disciplined operator text. Labels are uppercase, compact, and letter-spaced. Body copy should stay short; a dense interface still needs generous line height when explanatory text is unavoidable.

Use typography hierarchy before adding decorative borders or motion. Route headers can be cinematic, but module labels should feel like instrument cues.

## Layout
Use a compact 4px/8px/12px/16px/20px rhythm. Protected routes should present a dominant workplane, a bounded support rail, and a continuity strip. Do not reintroduce equal-weight card mosaics as the first impression.

Wide screens may use sticky/capped rails. Narrow screens should prioritize primary controls and collapse secondary actions before the layout crowds horizontally.

## Elevation & Depth
Depth comes from tonal layers, contour lines, gradient plates, and subtle glow rather than heavy drop shadows. Panels should feel embedded into a tactical surface, not stacked as detached cards.

Route plates and ambient layers can add widescreen atmosphere, but they must never compete with active work.

## Shapes
The shape language is mostly sharp and instrumented. Use `rounded.none` for shell panels and route workplanes, small radii for compact controls, and full pills only for action chips, badges, and navigational capsules.

## Components
Shared shell components should compose from `ShellPage`, `OpsWorkplane`, `OpsRail`, `OpsStrip`, `OpsField`, `ShellPanel`, `ShellButton`, `ShellBadge`, and `ShellSegmentedTabs` before adding route-local wrappers.

HQ may stay custom because of the 3D command room, but its UI still needs to read as chronicle first, tactical rail second, and continuity band third.

## Do's and Don'ts
- Do treat this file as the source of truth for design tokens and motion contracts.
- Do generate runtime CSS and TypeScript from this file instead of hand-editing generated outputs.
- Do keep motion tied to hierarchy, interaction, or live state change.
- Do preserve reduced-motion rules from first paint.
- Don't create a second token source in component-local constants.
- Don't make ambient animation louder than the workspace.
- Don't let support rails compete with the primary workplane.
- Don't use warm brass, parchment, or decorative dashboard themes as the default identity.

## Motion
Motion follows one order everywhere: environment fade, route plate lock-in, workplane reveal, support rail arrival, continuity pulse. The `flagship` profile can use cinematic atmosphere, the `standard` profile keeps functional transitions, and `reduced` removes loops, parallax, sweeps, and 3D drift.

CSS keyframes, Framer Motion transitions, and React Three Fiber scene cues are implementation details. The policy, timings, choreography, and profile semantics live here.

## Surfaces
Surface identity comes from route plates, scan geometry, accent bias, and route-specific copy, not separate design systems. `surfaces.*.accentA` and `surfaces.*.accentB` feed runtime branding. `surfaces.*.glowStart`, `glowEnd`, and `edge` feed generated CSS surface accents.

## Runtime Generation
Run `npm run design:generate` after editing this file. Run `npm run design:check` before committing. Generated files are implementation artifacts and should not be hand-edited.

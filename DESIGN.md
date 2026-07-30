---
version: alpha
name: Homefront
description: Local-first command intelligence with Homefront Aurora — ice-cyan instrumentation, glass rails, snappy motion.
colors:
  primary: "#03070B"
  surface: "#081018"
  surface-2: "#0D1620"
  surface-3: "#14202C"
  border: "#1A2A38"
  border-strong: "#3D5A72"
  text: "#F2F7FB"
  text-muted: "#A8B9C8"
  text-subtle: "#6B8296"
  accent: "#5EE1FF"
  accent-strong: "#E8F7FF"
  signal: "#D6EEF8"
  ember: "#7EB8D0"
  steel: "#C5D8E6"
  critical: "#FF6B76"
  cyan: "#5EE1FF"
  blue: "#6EB8FF"
  warning: "#F0C05A"
  success: "#5EF0C0"
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
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
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
  shell-gutter: 24px
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
  shell-panel-raised:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
  shell-separator:
    backgroundColor: "{colors.border}"
    height: 1px
  focus-marker:
    backgroundColor: "{colors.border-strong}"
    width: 2px
    height: 24px
  quiet-label:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-subtle}"
    typography: "{typography.label-caps}"
  secondary-action:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.accent}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  telemetry-chip-signal:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.signal}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  telemetry-chip-standby:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ember}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  telemetry-chip-neutral:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.steel}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  telemetry-chip-critical:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.critical}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  telemetry-chip-live:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.cyan}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  telemetry-chip-warning:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.warning}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  telemetry-chip-success:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.success}"
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
      description: Present but restrained choreography; clear hierarchy without theatrical loops.
      durationScale: 0.92
      vfxQuality: high
  durations:
    fast: 140ms
    medium: 220ms
    slow: 360ms
    reduced-fast: 10ms
    ambient-haze: 28s
    ambient-grid: 40s
    ambient-ornament: 36s
    ambient-sweep: 14s
  ease:
    standard: [0.4, 0, 0.2, 1]
    emphasis: [0.16, 1, 0.3, 1]
  sequence:
    order:
      - environment fade
      - route plate lock-in
      - workplane reveal
      - support rail arrival
      - continuity pulse
    heroDelay: 20ms
    primaryDelay: 70ms
    supportDelay: 120ms
    continuityDelay: 170ms
  signal:
    navBeam: 1100ms
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
  visualDensity: 4
  workplaneRule: one dominant workplane, one support rail, one continuity strip
cssVariables:
  root:
    bg: "#03070b"
    surf: "#081018"
    surf2: "#0d1620"
    surf3: "#14202c"
    border: "#1a2a38"
    border2: "#3d5a72"
    text: "#f2f7fb"
    text2: "#a8b9c8"
    text3: "#6b8296"
    accent: "#5ee1ff"
    accent2: "#e8f7ff"
    r: 10px
    rs: 6px
    t: "var(--motion-fast)"
    fhi: "#d4e8f2"
    fmd: "#7fa3b8"
    flo: "#ff6b76"
    glow-accent: "rgba(94, 225, 255, 0.16)"
    glow-green: "rgba(94, 240, 192, 0.1)"
    glow-red: "rgba(255, 107, 118, 0.16)"
    glow-purple: "rgba(110, 184, 255, 0.12)"
    signal: "#d6eef8"
    ember: "#7eb8d0"
    violet: "#5a7a92"
    steel: "#c5d8e6"
    space-1: 4px
    space-2: 8px
    space-3: 12px
    space-4: 16px
    space-5: 20px
    radius-sm: 6px
    radius-md: 10px
    radius-lg: 14px
    radius-pill: 999px
    fs-xs: 10px
    fs-sm: 12px
    fs-md: 14px
    fs-lg: 16px
    lh-tight: 1.3
    lh-base: 1.55
    elev-1: "0 1px 2px rgba(0, 0, 0, 0.22)"
    elev-2: "0 8px 28px rgba(0, 0, 0, 0.36)"
    ring-subtle: "0 0 0 1px rgba(94,225,255,.22)"
    top-rail-height: 64px
    shell-max-standard: "min(100%, 1600px)"
    shell-max-wide: "min(100%, 1840px)"
    shell-max-full: "calc(100vw - (2 * var(--shell-gutter)))"
    shell-gutter: "clamp(16px, 2.2vw, 28px)"
    bp-phone: 767px
    bp-tablet: 1100px
    bp-desktop: 1440px
    panel: "rgba(6, 14, 22, 0.88)"
    panel-muted: "rgba(5, 12, 18, 0.72)"
    panel-hero: "linear-gradient(180deg, rgba(12, 22, 32, 0.96), rgba(3, 7, 11, 0.98))"
    hairline: "rgba(94, 225, 255, 0.1)"
    hairline-strong: "rgba(232, 247, 255, 0.2)"
    text-strong: "#f5fafc"
    text-muted: "#a8b9c8"
    text-subtle: "#6b8296"
    accent-glow: "0 12px 40px rgba(94, 225, 255, 0.12)"
    ease-standard: "cubic-bezier(.4,0,.2,1)"
    ease-emphasis: "cubic-bezier(.16,1,.3,1)"
    motion-fast: ".14s var(--ease-standard)"
    motion-medium: ".22s var(--ease-emphasis)"
    motion-slow: ".36s var(--ease-emphasis)"
    nexus-atmosphere-haze-duration: 28s
    nexus-atmosphere-grid-duration: 40s
    nexus-atmosphere-ornament-duration: 36s
    nexus-atmosphere-sweep-duration: 14s
    nexus-atmosphere-world-opacity: ".18"
    nexus-atmosphere-veil-opacity: ".9"
    nexus-atmosphere-frame-opacity: ".32"
    nexus-atmosphere-focus: "50% 30%"
    nexus-atmosphere-spotlight: "48% 26%"
    nexus-sequence-hero-delay: 20ms
    nexus-sequence-primary-delay: 70ms
    nexus-sequence-support-delay: 120ms
    nexus-sequence-continuity-delay: 170ms
    nexus-signal-nav-beam-duration: 1100ms
    nexus-signal-alert-stamp-duration: 360ms
    nexus-signal-ribbon-pulse-duration: 1000ms
    nexus-signal-doctrine-relight-duration: 1800ms
    nexus-signal-toast-duration: 220ms
    nexus-chronicle-order-duration: 240ms
    nexus-chronicle-continuity-duration: 320ms
    nexus-chronicle-band-interval: 55ms
    nexus-chronicle-live-pulse: 1200ms
    nexus-taste-variance: 7
    nexus-taste-motion: 6
    nexus-taste-density: 4
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
    nexus-ux6-bg: "#03070b"
    nexus-ux6-bg-soft: "#081018"
    nexus-ux6-panel: "rgba(8, 16, 24, 0.82)"
    nexus-ux6-panel-strong: "rgba(12, 22, 32, 0.94)"
    nexus-ux6-line: "rgba(94, 225, 255, 0.16)"
    nexus-ux6-line-strong: "rgba(232, 247, 255, 0.28)"
    nexus-ux6-line-soft: "rgba(94, 225, 255, 0.08)"
    nexus-ux6-text: "#f2f7fb"
    nexus-ux6-text-soft: "rgba(232, 247, 255, 0.74)"
    nexus-ux6-text-muted: "rgba(168, 185, 200, 0.55)"
    nexus-ux6-accent: "#5ee1ff"
    nexus-ux6-accent-soft: "rgba(94, 225, 255, 0.22)"
  ux7:
    nexus-ux7-surface: "rgba(6, 14, 22, 0.84)"
    nexus-ux7-surface-strong: "rgba(8, 18, 28, 0.94)"
    nexus-ux7-surface-soft: "rgba(10, 22, 34, 0.7)"
    nexus-ux7-line: "rgba(94, 225, 255, 0.14)"
    nexus-ux7-line-strong: "rgba(110, 184, 255, 0.32)"
    nexus-ux7-line-faint: "rgba(94, 225, 255, 0.07)"
    nexus-ux7-text: "#f2f7fb"
    nexus-ux7-text-soft: "rgba(200, 224, 238, 0.78)"
    nexus-ux7-text-muted: "rgba(107, 130, 150, 0.9)"
    nexus-ux7-blue: "#6eb8ff"
    nexus-ux7-cyan: "#5ee1ff"
    nexus-ux7-alert: "#ff6b76"
    nexus-ux7-warn: "#f0c05a"
    nexus-ux7-good: "#5ef0c0"
---

# Homefront Design System

## Overview
Homefront Aurora is a local-first command room: deep obsidian, ice-cyan instrumentation, soft glass rails, and snappy motion. Content expands with the viewport. One dominant workplane leads; chrome stays quiet. Motion explains hierarchy — never decoration for its own sake.

## Colors
The palette is dark and low-glare. `primary` is the effective page base, `surface` and `surface-2` form the shell, `text` and `text-muted` carry operator copy, and `accent` / `accent-strong` provide restrained instrumentation.

Use cyan or blue for live state and exact-session affordances. Use amber only for readiness, warnings, and escalation. Use red only for true critical or unsafe states.

## Typography
Typography should read as clear display plus disciplined operator text. Labels are uppercase, compact, and letter-spaced. Body copy uses a slightly larger desktop scale with generous line height; tighten only on phone.

Use typography hierarchy before adding decorative borders or motion. Route headers can be cinematic, but module labels should feel like instrument cues.

## Layout
Use a 4px/8px/12px/16px/24px rhythm with fluid shell max widths (`--shell-max-standard|wide|full`) and gutter (`--shell-gutter`). Protected routes present a dominant workplane, a bounded support rail, and a continuity strip. Do not reintroduce equal-weight card mosaics as the first impression.

Canonical layout breakpoints live in tokens: `--bp-phone` (767px), `--bp-tablet` (1100px), `--bp-desktop` (1440px). Desktop grows panels with the browser. Tablet collapses the support rail under the workplane. Phone is a dedicated single-focus layout, not a miniaturized desktop. Sticky rails only at desktop and above.

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

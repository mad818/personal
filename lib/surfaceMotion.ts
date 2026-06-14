import { DESIGN_MD_MOTION } from "@/lib/generated/designMdRuntime";

export type SurfaceMotionProfile = "reduced" | "standard" | "flagship";

export type SurfaceMotionSurface =
  | "default"
  | "hq"
  | "command"
  | "intel"
  | "alpha"
  | "cyber"
  | "recon"
  | "vault"
  | "resources"
  | "vehicle"
  | "iot"
  | "security"
  | "skills";

export interface SurfaceAmbientSpec {
  surface: SurfaceMotionSurface;
  haze: string;
  grid: string;
  sweep: string;
  signals: string;
  ornament: string;
  mobileOpacity: number;
}

export interface SurfaceAtmosphereSpec {
  surface: SurfaceMotionSurface;
  chamberTone:
    | "ceremonial"
    | "tactical"
    | "spectral"
    | "quant"
    | "hardened"
    | "stealth"
    | "archival"
    | "codex";
  focusBias: "left" | "center" | "right";
  worldOpacity: number;
  veilOpacity: number;
  frameOpacity: number;
  hazeDurationSec: number;
  gridDurationSec: number;
  ornamentDurationSec: number;
  sweepDurationSec: number;
  spotlight: string;
}

export interface SurfaceTransitionState {
  opacity: number;
  x?: number;
  y?: number;
  scale?: number;
  filter?: string;
}

export interface SurfaceTransitionPreset {
  initial: SurfaceTransitionState;
  animate: SurfaceTransitionState;
  exit: SurfaceTransitionState;
  transition: {
    duration: number;
    ease: [number, number, number, number];
    opacity?: {
      duration: number;
    };
  };
}

export interface IngressPreset {
  kind: "ceremonial" | "tactical" | "scan" | "sealed" | "manual";
  initial: SurfaceTransitionState;
  exit: SurfaceTransitionState;
  baseDuration: number;
}

export interface SurfaceSequencePreset {
  surface: SurfaceMotionSurface;
  ingress: IngressPreset;
  heroDelayMs: number;
  primaryDelayMs: number;
  supportDelayMs: number;
  continuityDelayMs: number;
  settleMs: number;
}

export interface SurfaceHeroMediaSpec {
  surface: SurfaceMotionSurface;
  composition:
    | "flagship"
    | "tactical"
    | "spectral"
    | "quant"
    | "containment"
    | "stealth"
    | "archive"
    | "blueprint";
  posterLayering: "luminous" | "stacked" | "sealed" | "scan";
  thumbPosture: "stacked" | "grid-tight" | "rail";
  badgeMood: "ceremonial" | "signal" | "analysis" | "manual";
  accentBeam: "cool" | "warm" | "spectral" | "quiet";
  vignette: "command" | "scan" | "sealed" | "manual";
  frameStyle:
    | "sanctum"
    | "campaign"
    | "librarium"
    | "altar"
    | "bastion"
    | "auspex"
    | "reliquary"
    | "codex";
}

export interface ChronicleMotionPreset {
  profile: SurfaceMotionProfile;
  shell: "flagship" | "standard" | "reduced";
  replyDurationMs: number;
  stepDurationMs: number;
  handoffDurationMs: number;
  lessonDurationMs: number;
  composerGlow: number;
  orderDurationMs: number;
  continuityDurationMs: number;
  bandIntervalMs: number;
  livePulseMs: number;
}

export interface OfficeSceneCue {
  profile: SurfaceMotionProfile;
  missionState: "standby" | "routing" | "handoff" | "executing";
  roomMood: "standby" | "routing" | "handoff" | "executing";
  lightingEmphasis: number;
  beaconStrength: number;
  tempoPulse: number;
  dispatchEmphasis: number;
  emissiveBoost: number;
  practicalWarmth: number;
  accentColor: string;
  cameraDrift: number;
  shadowContrast: number;
  alertWash: number;
}

export interface SurfaceSignalMotionSpec {
  surface: SurfaceMotionSurface;
  navBeamMs: number;
  alertStampMs: number;
  ribbonPulseMs: number;
  doctrineRelightMs: number;
  toastMs: number;
}

type OfficeVfxQuality = "off" | "low" | "high";

const SHARED_ANIMATE: SurfaceTransitionState = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  filter: "blur(0px)",
};

const AMBIENT_SPECS: Record<SurfaceMotionSurface, SurfaceAmbientSpec> = {
  default: {
    surface: "default",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(103,232,249,.12), transparent 22%), radial-gradient(circle at 82% 14%, rgba(245,158,11,.08), transparent 24%), radial-gradient(circle at 50% 0%, rgba(255,255,255,.05), transparent 28%)",
    grid:
      "linear-gradient(90deg, rgba(103,232,249,.05) 0, rgba(103,232,249,.05) 1px, transparent 1px, transparent 180px), linear-gradient(180deg, rgba(255,255,255,.04) 0, rgba(255,255,255,.04) 1px, transparent 1px, transparent 144px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(103,232,249,.12) 48%, rgba(245,158,11,.08) 52%, transparent 100%)",
    signals:
      "radial-gradient(circle at 16% 26%, rgba(103,232,249,.18) 0 2px, transparent 3px), radial-gradient(circle at 78% 18%, rgba(245,158,11,.16) 0 2px, transparent 3px), radial-gradient(circle at 54% 72%, rgba(255,255,255,.1) 0 1.5px, transparent 3px)",
    ornament:
      "conic-gradient(from 210deg at 52% 48%, transparent 0deg, rgba(103,232,249,.09) 70deg, transparent 138deg, rgba(245,158,11,.08) 198deg, transparent 360deg)",
    mobileOpacity: 0.58,
  },
  hq: {
    surface: "hq",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(103,232,249,.16), transparent 24%), radial-gradient(circle at 78% 12%, rgba(96,165,250,.16), transparent 26%), radial-gradient(circle at 50% 0%, rgba(245,158,11,.08), transparent 30%)",
    grid:
      "linear-gradient(90deg, rgba(103,232,249,.07) 0, rgba(103,232,249,.07) 1px, transparent 1px, transparent 176px), linear-gradient(180deg, rgba(103,232,249,.05) 0, rgba(103,232,249,.05) 1px, transparent 1px, transparent 138px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(103,232,249,.2) 46%, rgba(245,158,11,.12) 51%, transparent 100%)",
    signals:
      "radial-gradient(circle at 16% 24%, rgba(103,232,249,.18) 0 2px, transparent 3px), radial-gradient(circle at 80% 18%, rgba(245,158,11,.16) 0 2px, transparent 3px), radial-gradient(circle at 54% 72%, rgba(96,165,250,.16) 0 1.5px, transparent 3px)",
    ornament:
      "radial-gradient(circle at 50% 32%, rgba(255,255,255,.05) 0 12%, transparent 13%), conic-gradient(from 180deg at 50% 50%, transparent 0deg, rgba(103,232,249,.12) 82deg, transparent 148deg, rgba(245,158,11,.08) 210deg, transparent 360deg)",
    mobileOpacity: 0.62,
  },
  command: {
    surface: "command",
    haze:
      "radial-gradient(circle at 16% 20%, rgba(245,158,11,.16), transparent 24%), radial-gradient(circle at 82% 16%, rgba(251,113,133,.12), transparent 22%), radial-gradient(circle at 50% 100%, rgba(103,232,249,.06), transparent 26%)",
    grid:
      "linear-gradient(90deg, rgba(245,158,11,.07) 0, rgba(245,158,11,.07) 1px, transparent 1px, transparent 160px), linear-gradient(180deg, rgba(255,255,255,.03) 0, rgba(255,255,255,.03) 1px, transparent 1px, transparent 120px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(245,158,11,.2) 48%, rgba(251,113,133,.12) 52%, transparent 100%)",
    signals:
      "radial-gradient(circle at 18% 28%, rgba(245,158,11,.2) 0 2px, transparent 3px), radial-gradient(circle at 76% 22%, rgba(251,113,133,.16) 0 2px, transparent 3px), radial-gradient(circle at 62% 76%, rgba(103,232,249,.14) 0 1.5px, transparent 3px)",
    ornament:
      "linear-gradient(135deg, transparent 0%, rgba(245,158,11,.1) 32%, transparent 54%), linear-gradient(315deg, transparent 0%, rgba(251,113,133,.08) 28%, transparent 46%)",
    mobileOpacity: 0.6,
  },
  intel: {
    surface: "intel",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(167,139,250,.14), transparent 24%), radial-gradient(circle at 78% 14%, rgba(56,189,248,.12), transparent 24%), radial-gradient(circle at 40% 82%, rgba(255,255,255,.05), transparent 18%)",
    grid:
      "repeating-linear-gradient(180deg, rgba(167,139,250,.04) 0, rgba(167,139,250,.04) 1px, transparent 1px, transparent 10px), linear-gradient(90deg, rgba(56,189,248,.05) 0, rgba(56,189,248,.05) 1px, transparent 1px, transparent 190px)",
    sweep:
      "linear-gradient(180deg, transparent 0%, rgba(56,189,248,.18) 46%, rgba(167,139,250,.1) 52%, transparent 100%)",
    signals:
      "radial-gradient(circle at 20% 26%, rgba(167,139,250,.16) 0 2px, transparent 3px), radial-gradient(circle at 78% 18%, rgba(56,189,248,.18) 0 2px, transparent 3px), radial-gradient(circle at 58% 70%, rgba(255,255,255,.08) 0 1.5px, transparent 3px)",
    ornament:
      "radial-gradient(circle at 50% 52%, transparent 0 30%, rgba(56,189,248,.08) 31% 31.5%, transparent 32%), linear-gradient(135deg, transparent 0%, rgba(167,139,250,.08) 34%, transparent 56%)",
    mobileOpacity: 0.58,
  },
  alpha: {
    surface: "alpha",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(52,211,153,.12), transparent 24%), radial-gradient(circle at 82% 14%, rgba(250,204,21,.1), transparent 24%), radial-gradient(circle at 50% 100%, rgba(103,232,249,.05), transparent 22%)",
    grid:
      "linear-gradient(90deg, rgba(52,211,153,.05) 0, rgba(52,211,153,.05) 1px, transparent 1px, transparent 172px), repeating-linear-gradient(180deg, rgba(250,204,21,.03) 0, rgba(250,204,21,.03) 1px, transparent 1px, transparent 14px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(52,211,153,.18) 48%, rgba(250,204,21,.1) 54%, transparent 100%)",
    signals:
      "linear-gradient(90deg, transparent 0%, rgba(52,211,153,.12) 8%, transparent 18%, rgba(250,204,21,.12) 28%, transparent 38%, rgba(103,232,249,.08) 50%, transparent 62%)",
    ornament:
      "linear-gradient(180deg, transparent 0%, rgba(255,255,255,.04) 45%, transparent 55%), linear-gradient(135deg, transparent 0%, rgba(52,211,153,.08) 28%, transparent 48%)",
    mobileOpacity: 0.56,
  },
  cyber: {
    surface: "cyber",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(45,212,191,.14), transparent 22%), radial-gradient(circle at 82% 14%, rgba(251,113,133,.12), transparent 22%), radial-gradient(circle at 50% 88%, rgba(96,165,250,.05), transparent 20%)",
    grid:
      "repeating-linear-gradient(135deg, rgba(45,212,191,.05) 0, rgba(45,212,191,.05) 1px, transparent 1px, transparent 22px), repeating-linear-gradient(45deg, rgba(56,189,248,.04) 0, rgba(56,189,248,.04) 1px, transparent 1px, transparent 24px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(45,212,191,.2) 48%, rgba(251,113,133,.12) 52%, transparent 100%)",
    signals:
      "radial-gradient(circle at 20% 28%, rgba(45,212,191,.18) 0 2px, transparent 3px), radial-gradient(circle at 76% 20%, rgba(251,113,133,.16) 0 2px, transparent 3px), radial-gradient(circle at 60% 74%, rgba(56,189,248,.14) 0 1.5px, transparent 3px)",
    ornament:
      "radial-gradient(circle at 50% 50%, transparent 0 26%, rgba(45,212,191,.08) 27% 27.5%, transparent 28%), linear-gradient(90deg, transparent 0%, rgba(251,113,133,.08) 38%, transparent 58%)",
    mobileOpacity: 0.58,
  },
  recon: {
    surface: "recon",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(192,132,252,.12), transparent 24%), radial-gradient(circle at 82% 14%, rgba(103,232,249,.1), transparent 22%), radial-gradient(circle at 52% 90%, rgba(255,255,255,.04), transparent 18%)",
    grid:
      "linear-gradient(90deg, rgba(192,132,252,.04) 0, rgba(192,132,252,.04) 1px, transparent 1px, transparent 180px), linear-gradient(180deg, rgba(103,232,249,.03) 0, rgba(103,232,249,.03) 1px, transparent 1px, transparent 146px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(192,132,252,.14) 46%, rgba(103,232,249,.08) 52%, transparent 100%)",
    signals:
      "linear-gradient(90deg, transparent 0%, rgba(192,132,252,.14) 49.4%, rgba(192,132,252,.14) 50.6%, transparent 51%), linear-gradient(180deg, transparent 0%, rgba(103,232,249,.12) 49.4%, rgba(103,232,249,.12) 50.6%, transparent 51%), radial-gradient(circle at 50% 50%, rgba(192,132,252,.18) 0 2px, transparent 3px)",
    ornament:
      "radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(103,232,249,.08) 19% 19.5%, transparent 20%), radial-gradient(circle at 50% 50%, transparent 0 32%, rgba(192,132,252,.06) 33% 33.5%, transparent 34%)",
    mobileOpacity: 0.56,
  },
  vault: {
    surface: "vault",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(147,197,253,.14), transparent 24%), radial-gradient(circle at 82% 12%, rgba(253,164,175,.1), transparent 22%), radial-gradient(circle at 56% 88%, rgba(255,255,255,.05), transparent 20%)",
    grid:
      "linear-gradient(90deg, rgba(147,197,253,.04) 0, rgba(147,197,253,.04) 1px, transparent 1px, transparent 200px), linear-gradient(180deg, rgba(255,255,255,.02) 0, rgba(255,255,255,.02) 1px, transparent 1px, transparent 164px)",
    sweep:
      "linear-gradient(180deg, transparent 0%, rgba(147,197,253,.16) 48%, rgba(253,164,175,.08) 54%, transparent 100%)",
    signals:
      "radial-gradient(circle at 20% 26%, rgba(147,197,253,.16) 0 2px, transparent 3px), radial-gradient(circle at 76% 22%, rgba(253,164,175,.14) 0 2px, transparent 3px), radial-gradient(circle at 58% 72%, rgba(255,255,255,.08) 0 1.5px, transparent 3px)",
    ornament:
      "linear-gradient(90deg, transparent 0%, rgba(147,197,253,.08) 24%, transparent 42%, rgba(253,164,175,.07) 66%, transparent 84%), radial-gradient(circle at 50% 40%, rgba(255,255,255,.04), transparent 18%)",
    mobileOpacity: 0.56,
  },
  resources: {
    surface: "resources",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(251,191,36,.14), transparent 24%), radial-gradient(circle at 82% 14%, rgba(103,232,249,.12), transparent 24%), radial-gradient(circle at 44% 84%, rgba(255,255,255,.05), transparent 18%)",
    grid:
      "linear-gradient(90deg, rgba(251,191,36,.05) 0, rgba(251,191,36,.05) 1px, transparent 1px, transparent 124px), linear-gradient(180deg, rgba(103,232,249,.04) 0, rgba(103,232,249,.04) 1px, transparent 1px, transparent 108px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(251,191,36,.14) 48%, rgba(103,232,249,.12) 52%, transparent 100%)",
    signals:
      "linear-gradient(90deg, transparent 0%, rgba(251,191,36,.12) 16%, transparent 24%, rgba(103,232,249,.12) 44%, transparent 52%, rgba(251,191,36,.08) 70%, transparent 80%), radial-gradient(circle at 78% 20%, rgba(103,232,249,.14) 0 2px, transparent 3px)",
    ornament:
      "radial-gradient(circle at 24% 30%, rgba(251,191,36,.08) 0 12%, transparent 13%), radial-gradient(circle at 72% 66%, rgba(103,232,249,.08) 0 14%, transparent 15%)",
    mobileOpacity: 0.58,
  },
  vehicle: {
    surface: "vehicle",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(56,189,248,.14), transparent 24%), radial-gradient(circle at 82% 14%, rgba(245,158,11,.1), transparent 24%), radial-gradient(circle at 50% 88%, rgba(255,255,255,.04), transparent 20%)",
    grid:
      "linear-gradient(90deg, rgba(56,189,248,.05) 0, rgba(56,189,248,.05) 1px, transparent 1px, transparent 170px), linear-gradient(180deg, rgba(245,158,11,.04) 0, rgba(245,158,11,.04) 1px, transparent 1px, transparent 126px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(56,189,248,.18) 48%, rgba(245,158,11,.1) 52%, transparent 100%)",
    signals:
      "radial-gradient(circle at 20% 28%, rgba(56,189,248,.18) 0 2px, transparent 3px), radial-gradient(circle at 78% 18%, rgba(245,158,11,.16) 0 2px, transparent 3px), radial-gradient(circle at 60% 74%, rgba(255,255,255,.08) 0 1.5px, transparent 3px)",
    ornament:
      "linear-gradient(135deg, transparent 0%, rgba(56,189,248,.08) 28%, transparent 50%), linear-gradient(315deg, transparent 0%, rgba(245,158,11,.08) 28%, transparent 48%)",
    mobileOpacity: 0.56,
  },
  iot: {
    surface: "iot",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(79,213,255,.13), transparent 24%), radial-gradient(circle at 82% 14%, rgba(132,204,22,.1), transparent 24%), radial-gradient(circle at 50% 88%, rgba(255,255,255,.04), transparent 20%)",
    grid:
      "linear-gradient(90deg, rgba(79,213,255,.05) 0, rgba(79,213,255,.05) 1px, transparent 1px, transparent 154px), linear-gradient(180deg, rgba(132,204,22,.04) 0, rgba(132,204,22,.04) 1px, transparent 1px, transparent 118px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(79,213,255,.16) 48%, rgba(132,204,22,.1) 54%, transparent 100%)",
    signals:
      "radial-gradient(circle at 20% 28%, rgba(79,213,255,.18) 0 2px, transparent 3px), radial-gradient(circle at 78% 18%, rgba(132,204,22,.14) 0 2px, transparent 3px), radial-gradient(circle at 60% 74%, rgba(255,255,255,.08) 0 1.5px, transparent 3px)",
    ornament:
      "linear-gradient(135deg, transparent 0%, rgba(79,213,255,.08) 28%, transparent 50%), linear-gradient(315deg, transparent 0%, rgba(132,204,22,.08) 28%, transparent 48%)",
    mobileOpacity: 0.56,
  },
  security: {
    surface: "security",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(134,162,182,.12), transparent 24%), radial-gradient(circle at 82% 14%, rgba(196,211,224,.1), transparent 24%), radial-gradient(circle at 52% 88%, rgba(255,255,255,.04), transparent 18%)",
    grid:
      "linear-gradient(90deg, rgba(134,162,182,.05) 0, rgba(134,162,182,.05) 1px, transparent 1px, transparent 176px), linear-gradient(180deg, rgba(196,211,224,.04) 0, rgba(196,211,224,.04) 1px, transparent 1px, transparent 128px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(196,211,224,.16) 48%, rgba(134,162,182,.12) 54%, transparent 100%)",
    signals:
      "radial-gradient(circle at 20% 28%, rgba(196,211,224,.18) 0 2px, transparent 3px), radial-gradient(circle at 78% 18%, rgba(134,162,182,.14) 0 2px, transparent 3px), radial-gradient(circle at 60% 74%, rgba(255,255,255,.08) 0 1.5px, transparent 3px)",
    ornament:
      "linear-gradient(180deg, transparent 0%, rgba(196,211,224,.06) 42%, transparent 56%), linear-gradient(135deg, transparent 0%, rgba(134,162,182,.08) 28%, transparent 46%)",
    mobileOpacity: 0.56,
  },
  skills: {
    surface: "skills",
    haze:
      "radial-gradient(circle at 18% 18%, rgba(160,176,190,.12), transparent 24%), radial-gradient(circle at 82% 14%, rgba(120,141,162,.12), transparent 24%), radial-gradient(circle at 44% 84%, rgba(255,255,255,.05), transparent 18%)",
    grid:
      "linear-gradient(90deg, rgba(160,176,190,.05) 0, rgba(160,176,190,.05) 1px, transparent 1px, transparent 152px), linear-gradient(180deg, rgba(120,141,162,.04) 0, rgba(120,141,162,.04) 1px, transparent 1px, transparent 110px)",
    sweep:
      "linear-gradient(90deg, transparent 0%, rgba(160,176,190,.16) 48%, rgba(120,141,162,.12) 52%, transparent 100%)",
    signals:
      "linear-gradient(90deg, transparent 0%, rgba(160,176,190,.12) 18%, transparent 28%, rgba(120,141,162,.12) 44%, transparent 56%, rgba(255,255,255,.08) 72%, transparent 84%), radial-gradient(circle at 76% 20%, rgba(160,176,190,.14) 0 2px, transparent 3px)",
    ornament:
      "radial-gradient(circle at 24% 30%, rgba(160,176,190,.08) 0 12%, transparent 13%), radial-gradient(circle at 72% 66%, rgba(120,141,162,.08) 0 14%, transparent 15%)",
    mobileOpacity: 0.58,
  },
};

const HERO_MEDIA_SPECS: Record<SurfaceMotionSurface, SurfaceHeroMediaSpec> = {
  default: {
    surface: "default",
    composition: "flagship",
    posterLayering: "stacked",
    thumbPosture: "stacked",
    badgeMood: "signal",
    accentBeam: "cool",
    vignette: "command",
    frameStyle: "sanctum",
  },
  hq: {
    surface: "hq",
    composition: "flagship",
    posterLayering: "luminous",
    thumbPosture: "stacked",
    badgeMood: "ceremonial",
    accentBeam: "cool",
    vignette: "command",
    frameStyle: "sanctum",
  },
  command: {
    surface: "command",
    composition: "tactical",
    posterLayering: "stacked",
    thumbPosture: "rail",
    badgeMood: "signal",
    accentBeam: "warm",
    vignette: "command",
    frameStyle: "campaign",
  },
  intel: {
    surface: "intel",
    composition: "spectral",
    posterLayering: "scan",
    thumbPosture: "stacked",
    badgeMood: "analysis",
    accentBeam: "spectral",
    vignette: "scan",
    frameStyle: "librarium",
  },
  alpha: {
    surface: "alpha",
    composition: "quant",
    posterLayering: "scan",
    thumbPosture: "rail",
    badgeMood: "signal",
    accentBeam: "cool",
    vignette: "command",
    frameStyle: "altar",
  },
  cyber: {
    surface: "cyber",
    composition: "containment",
    posterLayering: "sealed",
    thumbPosture: "stacked",
    badgeMood: "signal",
    accentBeam: "spectral",
    vignette: "sealed",
    frameStyle: "bastion",
  },
  recon: {
    surface: "recon",
    composition: "stealth",
    posterLayering: "scan",
    thumbPosture: "rail",
    badgeMood: "analysis",
    accentBeam: "quiet",
    vignette: "scan",
    frameStyle: "auspex",
  },
  vault: {
    surface: "vault",
    composition: "archive",
    posterLayering: "sealed",
    thumbPosture: "grid-tight",
    badgeMood: "analysis",
    accentBeam: "quiet",
    vignette: "sealed",
    frameStyle: "reliquary",
  },
  resources: {
    surface: "resources",
    composition: "blueprint",
    posterLayering: "stacked",
    thumbPosture: "grid-tight",
    badgeMood: "manual",
    accentBeam: "warm",
    vignette: "manual",
    frameStyle: "codex",
  },
  vehicle: {
    surface: "vehicle",
    composition: "tactical",
    posterLayering: "stacked",
    thumbPosture: "rail",
    badgeMood: "signal",
    accentBeam: "cool",
    vignette: "command",
    frameStyle: "campaign",
  },
  iot: {
    surface: "iot",
    composition: "tactical",
    posterLayering: "stacked",
    thumbPosture: "grid-tight",
    badgeMood: "signal",
    accentBeam: "cool",
    vignette: "command",
    frameStyle: "campaign",
  },
  security: {
    surface: "security",
    composition: "containment",
    posterLayering: "sealed",
    thumbPosture: "rail",
    badgeMood: "manual",
    accentBeam: "quiet",
    vignette: "sealed",
    frameStyle: "bastion",
  },
  skills: {
    surface: "skills",
    composition: "blueprint",
    posterLayering: "scan",
    thumbPosture: "grid-tight",
    badgeMood: "manual",
    accentBeam: "quiet",
    vignette: "manual",
    frameStyle: "codex",
  },
};

const ATMOSPHERE_SPECS: Record<SurfaceMotionSurface, SurfaceAtmosphereSpec> = {
  default: {
    surface: "default",
    chamberTone: "ceremonial",
    focusBias: "left",
    worldOpacity: 0.18,
    veilOpacity: 0.92,
    frameOpacity: 0.34,
    hazeDurationSec: 24,
    gridDurationSec: 32,
    ornamentDurationSec: 28,
    sweepDurationSec: 14,
    spotlight:
      "radial-gradient(circle at 24% 26%, rgba(221,208,182,.1), transparent 24%), radial-gradient(circle at 72% 18%, rgba(53,93,224,.06), transparent 22%)",
  },
  hq: {
    surface: "hq",
    chamberTone: "ceremonial",
    focusBias: "left",
    worldOpacity: 0.28,
    veilOpacity: 0.96,
    frameOpacity: 0.42,
    hazeDurationSec: 28,
    gridDurationSec: 36,
    ornamentDurationSec: 30,
    sweepDurationSec: 15,
    spotlight:
      "radial-gradient(circle at 26% 24%, rgba(232,218,189,.12), transparent 24%), radial-gradient(circle at 76% 18%, rgba(53,93,224,.08), transparent 22%)",
  },
  command: {
    surface: "command",
    chamberTone: "tactical",
    focusBias: "left",
    worldOpacity: 0.24,
    veilOpacity: 0.94,
    frameOpacity: 0.38,
    hazeDurationSec: 22,
    gridDurationSec: 28,
    ornamentDurationSec: 24,
    sweepDurationSec: 12,
    spotlight:
      "radial-gradient(circle at 22% 28%, rgba(214,164,82,.1), transparent 24%), radial-gradient(circle at 78% 18%, rgba(135,52,59,.08), transparent 18%)",
  },
  intel: {
    surface: "intel",
    chamberTone: "spectral",
    focusBias: "center",
    worldOpacity: 0.2,
    veilOpacity: 0.9,
    frameOpacity: 0.32,
    hazeDurationSec: 26,
    gridDurationSec: 30,
    ornamentDurationSec: 20,
    sweepDurationSec: 11,
    spotlight:
      "radial-gradient(circle at 50% 24%, rgba(177,193,233,.12), transparent 24%), radial-gradient(circle at 78% 16%, rgba(213,198,164,.06), transparent 18%)",
  },
  alpha: {
    surface: "alpha",
    chamberTone: "quant",
    focusBias: "left",
    worldOpacity: 0.2,
    veilOpacity: 0.9,
    frameOpacity: 0.32,
    hazeDurationSec: 18,
    gridDurationSec: 22,
    ornamentDurationSec: 18,
    sweepDurationSec: 9,
    spotlight:
      "radial-gradient(circle at 24% 24%, rgba(215,187,121,.12), transparent 22%), radial-gradient(circle at 74% 18%, rgba(217,204,177,.06), transparent 16%)",
  },
  cyber: {
    surface: "cyber",
    chamberTone: "hardened",
    focusBias: "left",
    worldOpacity: 0.22,
    veilOpacity: 0.95,
    frameOpacity: 0.36,
    hazeDurationSec: 21,
    gridDurationSec: 24,
    ornamentDurationSec: 22,
    sweepDurationSec: 10,
    spotlight:
      "radial-gradient(circle at 24% 24%, rgba(170,73,78,.12), transparent 22%), radial-gradient(circle at 78% 18%, rgba(198,169,120,.06), transparent 18%)",
  },
  recon: {
    surface: "recon",
    chamberTone: "stealth",
    focusBias: "left",
    worldOpacity: 0.18,
    veilOpacity: 0.88,
    frameOpacity: 0.28,
    hazeDurationSec: 30,
    gridDurationSec: 34,
    ornamentDurationSec: 18,
    sweepDurationSec: 16,
    spotlight:
      "radial-gradient(circle at 24% 24%, rgba(154,170,214,.1), transparent 22%), radial-gradient(circle at 80% 18%, rgba(205,190,159,.05), transparent 18%)",
  },
  vault: {
    surface: "vault",
    chamberTone: "archival",
    focusBias: "center",
    worldOpacity: 0.22,
    veilOpacity: 0.93,
    frameOpacity: 0.4,
    hazeDurationSec: 34,
    gridDurationSec: 38,
    ornamentDurationSec: 32,
    sweepDurationSec: 17,
    spotlight:
      "radial-gradient(circle at 50% 24%, rgba(207,197,179,.12), transparent 22%), radial-gradient(circle at 76% 18%, rgba(120,139,190,.06), transparent 20%)",
  },
  resources: {
    surface: "resources",
    chamberTone: "codex",
    focusBias: "left",
    worldOpacity: 0.2,
    veilOpacity: 0.9,
    frameOpacity: 0.34,
    hazeDurationSec: 24,
    gridDurationSec: 28,
    ornamentDurationSec: 24,
    sweepDurationSec: 12,
    spotlight:
      "radial-gradient(circle at 24% 24%, rgba(201,166,102,.12), transparent 22%), radial-gradient(circle at 74% 18%, rgba(219,211,189,.06), transparent 18%)",
  },
  vehicle: {
    surface: "vehicle",
    chamberTone: "tactical",
    focusBias: "left",
    worldOpacity: 0.2,
    veilOpacity: 0.92,
    frameOpacity: 0.34,
    hazeDurationSec: 22,
    gridDurationSec: 28,
    ornamentDurationSec: 24,
    sweepDurationSec: 12,
    spotlight:
      "radial-gradient(circle at 24% 24%, rgba(120,146,222,.1), transparent 22%), radial-gradient(circle at 74% 18%, rgba(202,166,96,.06), transparent 18%)",
  },
  iot: {
    surface: "iot",
    chamberTone: "tactical",
    focusBias: "right",
    worldOpacity: 0.2,
    veilOpacity: 0.92,
    frameOpacity: 0.34,
    hazeDurationSec: 22,
    gridDurationSec: 28,
    ornamentDurationSec: 24,
    sweepDurationSec: 12,
    spotlight:
      "radial-gradient(circle at 28% 24%, rgba(104,192,214,.1), transparent 22%), radial-gradient(circle at 74% 18%, rgba(132,204,22,.06), transparent 18%)",
  },
  security: {
    surface: "security",
    chamberTone: "hardened",
    focusBias: "center",
    worldOpacity: 0.2,
    veilOpacity: 0.93,
    frameOpacity: 0.34,
    hazeDurationSec: 24,
    gridDurationSec: 30,
    ornamentDurationSec: 22,
    sweepDurationSec: 12,
    spotlight:
      "radial-gradient(circle at 30% 24%, rgba(190,204,214,.11), transparent 22%), radial-gradient(circle at 72% 18%, rgba(128,146,162,.06), transparent 18%)",
  },
  skills: {
    surface: "skills",
    chamberTone: "codex",
    focusBias: "left",
    worldOpacity: 0.2,
    veilOpacity: 0.91,
    frameOpacity: 0.34,
    hazeDurationSec: 24,
    gridDurationSec: 28,
    ornamentDurationSec: 24,
    sweepDurationSec: 12,
    spotlight:
      "radial-gradient(circle at 26% 24%, rgba(182,194,206,.11), transparent 22%), radial-gradient(circle at 74% 18%, rgba(124,143,164,.06), transparent 18%)",
  },
};

const SEQUENCE_PRESETS: Record<SurfaceMotionSurface, SurfaceSequencePreset> = {
  default: {
    surface: "default",
    ingress: {
      kind: "ceremonial",
      initial: {
        opacity: 0,
        y: 16,
        scale: 0.99,
        filter: "blur(8px)",
      },
      exit: {
        opacity: 0,
        y: -4,
        scale: 1.003,
        filter: "blur(3px)",
      },
      baseDuration: 0.34,
    },
    heroDelayMs: 36,
    primaryDelayMs: 108,
    supportDelayMs: 180,
    continuityDelayMs: 250,
    settleMs: 260,
  },
  hq: {
    surface: "hq",
    ingress: {
      kind: "ceremonial",
      initial: {
        opacity: 0,
        y: 28,
        scale: 0.978,
        filter: "blur(14px)",
      },
      exit: {
        opacity: 0,
        y: -8,
        scale: 1.006,
        filter: "blur(6px)",
      },
      baseDuration: 0.5,
    },
    heroDelayMs: 48,
    primaryDelayMs: 138,
    supportDelayMs: 220,
    continuityDelayMs: 300,
    settleMs: 320,
  },
  command: {
    surface: "command",
    ingress: {
      kind: "tactical",
      initial: {
        opacity: 0,
        y: 12,
        x: 6,
        scale: 0.992,
        filter: "blur(6px)",
      },
      exit: {
        opacity: 0,
        y: -4,
        scale: 1.002,
        filter: "blur(3px)",
      },
      baseDuration: 0.34,
    },
    heroDelayMs: 28,
    primaryDelayMs: 88,
    supportDelayMs: 150,
    continuityDelayMs: 216,
    settleMs: 220,
  },
  intel: {
    surface: "intel",
    ingress: {
      kind: "scan",
      initial: {
        opacity: 0,
        y: 14,
        x: 4,
        scale: 0.99,
        filter: "blur(7px)",
      },
      exit: {
        opacity: 0,
        y: -4,
        scale: 1.004,
        filter: "blur(3px)",
      },
      baseDuration: 0.36,
    },
    heroDelayMs: 32,
    primaryDelayMs: 100,
    supportDelayMs: 170,
    continuityDelayMs: 236,
    settleMs: 240,
  },
  alpha: {
    surface: "alpha",
    ingress: {
      kind: "tactical",
      initial: {
        opacity: 0,
        y: 10,
        x: 8,
        scale: 0.994,
        filter: "blur(5px)",
      },
      exit: {
        opacity: 0,
        y: -4,
        scale: 1.002,
        filter: "blur(2px)",
      },
      baseDuration: 0.3,
    },
    heroDelayMs: 20,
    primaryDelayMs: 72,
    supportDelayMs: 130,
    continuityDelayMs: 188,
    settleMs: 200,
  },
  cyber: {
    surface: "cyber",
    ingress: {
      kind: "sealed",
      initial: {
        opacity: 0,
        y: 14,
        x: 4,
        scale: 0.99,
        filter: "blur(7px)",
      },
      exit: {
        opacity: 0,
        y: -4,
        scale: 1.004,
        filter: "blur(3px)",
      },
      baseDuration: 0.36,
    },
    heroDelayMs: 28,
    primaryDelayMs: 96,
    supportDelayMs: 162,
    continuityDelayMs: 234,
    settleMs: 240,
  },
  recon: {
    surface: "recon",
    ingress: {
      kind: "scan",
      initial: {
        opacity: 0,
        y: 12,
        x: 2,
        scale: 0.992,
        filter: "blur(6px)",
      },
      exit: {
        opacity: 0,
        y: -3,
        scale: 1.003,
        filter: "blur(2px)",
      },
      baseDuration: 0.34,
    },
    heroDelayMs: 26,
    primaryDelayMs: 92,
    supportDelayMs: 156,
    continuityDelayMs: 226,
    settleMs: 230,
  },
  vault: {
    surface: "vault",
    ingress: {
      kind: "sealed",
      initial: {
        opacity: 0,
        y: 10,
        scale: 0.994,
        filter: "blur(4px)",
      },
      exit: {
        opacity: 0,
        y: -2,
        filter: "blur(2px)",
      },
      baseDuration: 0.3,
    },
    heroDelayMs: 36,
    primaryDelayMs: 118,
    supportDelayMs: 194,
    continuityDelayMs: 278,
    settleMs: 280,
  },
  resources: {
    surface: "resources",
    ingress: {
      kind: "manual",
      initial: {
        opacity: 0,
        y: 10,
        scale: 0.994,
        filter: "blur(4px)",
      },
      exit: {
        opacity: 0,
        y: -2,
        filter: "blur(2px)",
      },
      baseDuration: 0.3,
    },
    heroDelayMs: 30,
    primaryDelayMs: 108,
    supportDelayMs: 184,
    continuityDelayMs: 258,
    settleMs: 260,
  },
  vehicle: {
    surface: "vehicle",
    ingress: {
      kind: "tactical",
      initial: {
        opacity: 0,
        y: 12,
        x: 6,
        scale: 0.992,
        filter: "blur(6px)",
      },
      exit: {
        opacity: 0,
        y: -4,
        scale: 1.002,
        filter: "blur(3px)",
      },
      baseDuration: 0.34,
    },
    heroDelayMs: 28,
    primaryDelayMs: 88,
    supportDelayMs: 150,
    continuityDelayMs: 214,
    settleMs: 220,
  },
  iot: {
    surface: "iot",
    ingress: {
      kind: "tactical",
      initial: {
        opacity: 0,
        y: 12,
        x: 6,
        scale: 0.992,
        filter: "blur(6px)",
      },
      exit: {
        opacity: 0,
        y: -4,
        scale: 1.002,
        filter: "blur(3px)",
      },
      baseDuration: 0.34,
    },
    heroDelayMs: 28,
    primaryDelayMs: 92,
    supportDelayMs: 156,
    continuityDelayMs: 220,
    settleMs: 226,
  },
  security: {
    surface: "security",
    ingress: {
      kind: "sealed",
      initial: {
        opacity: 0,
        y: 10,
        scale: 0.994,
        filter: "blur(5px)",
      },
      exit: {
        opacity: 0,
        y: -2,
        filter: "blur(2px)",
      },
      baseDuration: 0.32,
    },
    heroDelayMs: 28,
    primaryDelayMs: 96,
    supportDelayMs: 166,
    continuityDelayMs: 238,
    settleMs: 244,
  },
  skills: {
    surface: "skills",
    ingress: {
      kind: "manual",
      initial: {
        opacity: 0,
        y: 10,
        scale: 0.994,
        filter: "blur(4px)",
      },
      exit: {
        opacity: 0,
        y: -2,
        filter: "blur(2px)",
      },
      baseDuration: 0.3,
    },
    heroDelayMs: 28,
    primaryDelayMs: 102,
    supportDelayMs: 176,
    continuityDelayMs: 248,
    settleMs: 252,
  },
};

const SIGNAL_MOTION_SPECS: Record<SurfaceMotionSurface, SurfaceSignalMotionSpec> = {
  default: {
    surface: "default",
    navBeamMs: 2800,
    alertStampMs: 420,
    ribbonPulseMs: 1100,
    doctrineRelightMs: 620,
    toastMs: 260,
  },
  hq: {
    surface: "hq",
    navBeamMs: 3200,
    alertStampMs: 520,
    ribbonPulseMs: 1300,
    doctrineRelightMs: 780,
    toastMs: 320,
  },
  command: {
    surface: "command",
    navBeamMs: 2400,
    alertStampMs: 380,
    ribbonPulseMs: 1000,
    doctrineRelightMs: 560,
    toastMs: 240,
  },
  intel: {
    surface: "intel",
    navBeamMs: 2600,
    alertStampMs: 440,
    ribbonPulseMs: 1120,
    doctrineRelightMs: 620,
    toastMs: 260,
  },
  alpha: {
    surface: "alpha",
    navBeamMs: 2200,
    alertStampMs: 360,
    ribbonPulseMs: 920,
    doctrineRelightMs: 520,
    toastMs: 220,
  },
  cyber: {
    surface: "cyber",
    navBeamMs: 2300,
    alertStampMs: 460,
    ribbonPulseMs: 1040,
    doctrineRelightMs: 600,
    toastMs: 240,
  },
  recon: {
    surface: "recon",
    navBeamMs: 2500,
    alertStampMs: 400,
    ribbonPulseMs: 980,
    doctrineRelightMs: 560,
    toastMs: 220,
  },
  vault: {
    surface: "vault",
    navBeamMs: 3000,
    alertStampMs: 420,
    ribbonPulseMs: 1200,
    doctrineRelightMs: 640,
    toastMs: 260,
  },
  resources: {
    surface: "resources",
    navBeamMs: 2600,
    alertStampMs: 400,
    ribbonPulseMs: 1080,
    doctrineRelightMs: 600,
    toastMs: 240,
  },
  vehicle: {
    surface: "vehicle",
    navBeamMs: 2400,
    alertStampMs: 380,
    ribbonPulseMs: 1000,
    doctrineRelightMs: 560,
    toastMs: 230,
  },
  iot: {
    surface: "iot",
    navBeamMs: 2420,
    alertStampMs: 380,
    ribbonPulseMs: 1010,
    doctrineRelightMs: 570,
    toastMs: 230,
  },
  security: {
    surface: "security",
    navBeamMs: 2480,
    alertStampMs: 390,
    ribbonPulseMs: 1020,
    doctrineRelightMs: 580,
    toastMs: 230,
  },
  skills: {
    surface: "skills",
    navBeamMs: 2560,
    alertStampMs: 400,
    ribbonPulseMs: 1080,
    doctrineRelightMs: 600,
    toastMs: 240,
  },
};

function buildTransitionPreset(
  initial: SurfaceTransitionState,
  exit: SurfaceTransitionState,
  duration: number,
): SurfaceTransitionPreset {
  return {
    initial,
    animate: SHARED_ANIMATE,
    exit,
    transition: {
      duration,
      ease: [
        ...DESIGN_MD_MOTION.ease.emphasis,
      ] as [number, number, number, number],
      opacity: {
        duration: Math.max(DESIGN_MD_MOTION.durations.fastSec, duration - 0.06),
      },
    },
  };
}

export function resolveSurfaceMotionSurface(
  pathname?: string | null,
): SurfaceMotionSurface {
  if (!pathname || pathname === "/") return "hq";
  const normalizedPath = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  const section =
    normalizedPath.replace(/^\//, "").split("/")[0]?.toLowerCase() ?? "";

  switch (section) {
    case "hq":
    case "home":
      return "hq";
    case "command":
      return "command";
    case "intel":
      return "intel";
    case "alpha":
      return "alpha";
    case "cyber":
      return "cyber";
    case "security":
      return "security";
    case "recon":
      return "recon";
    case "vault":
      return "vault";
    case "resources":
      return "resources";
    case "skills":
      return "skills";
    case "vehicle":
      return "vehicle";
    case "iot":
      return "iot";
    default:
      return "default";
  }
}

export function resolveEffectiveSurfaceMotionProfile(
  profile: SurfaceMotionProfile | null | undefined,
  prefersReducedMotion: boolean,
): SurfaceMotionProfile {
  if (prefersReducedMotion) return "reduced";
  return profile ?? "flagship";
}

export function resolveSurfaceAmbientSpec(
  surface: SurfaceMotionSurface,
): SurfaceAmbientSpec {
  return AMBIENT_SPECS[surface] ?? AMBIENT_SPECS.default;
}

export function resolveSurfaceAtmosphereSpec(
  surface: SurfaceMotionSurface,
): SurfaceAtmosphereSpec {
  return ATMOSPHERE_SPECS[surface] ?? ATMOSPHERE_SPECS.default;
}

export function resolveSurfaceHeroMediaSpec(
  surface: SurfaceMotionSurface,
): SurfaceHeroMediaSpec {
  return HERO_MEDIA_SPECS[surface] ?? HERO_MEDIA_SPECS.default;
}

export function resolveSurfaceSequencePreset(
  surface: SurfaceMotionSurface,
): SurfaceSequencePreset {
  return SEQUENCE_PRESETS[surface] ?? SEQUENCE_PRESETS.default;
}

export function resolveSurfaceSignalMotionSpec(
  surface: SurfaceMotionSurface,
): SurfaceSignalMotionSpec {
  return SIGNAL_MOTION_SPECS[surface] ?? SIGNAL_MOTION_SPECS.default;
}

export function resolveSurfaceTransitionPreset(
  surface: SurfaceMotionSurface,
  profile: SurfaceMotionProfile,
): SurfaceTransitionPreset {
  if (profile === "reduced") {
    return buildTransitionPreset(
      { opacity: 0 },
      { opacity: 0 },
      DESIGN_MD_MOTION.durations.fastSec,
    );
  }

  const sequence = resolveSurfaceSequencePreset(surface);
  const durationScale = profile === "flagship" ? 1 : 0.82;
  const flagshipDelta = profile === "flagship" ? 1 : 0.68;
  const initial = {
    ...sequence.ingress.initial,
    y:
      typeof sequence.ingress.initial.y === "number"
        ? sequence.ingress.initial.y * flagshipDelta
        : undefined,
    x:
      typeof sequence.ingress.initial.x === "number"
        ? sequence.ingress.initial.x * flagshipDelta
        : undefined,
    filter:
      profile === "standard"
        ? String(sequence.ingress.initial.filter ?? "").replace(
            /blur\(([\d.]+)px\)/,
            (_match, value) => `blur(${Math.max(2, Number(value) * 0.72)}px)`,
          )
        : sequence.ingress.initial.filter,
  };
  const exit = {
    ...sequence.ingress.exit,
    y:
      typeof sequence.ingress.exit.y === "number"
        ? sequence.ingress.exit.y * flagshipDelta
        : undefined,
    x:
      typeof sequence.ingress.exit.x === "number"
        ? sequence.ingress.exit.x * flagshipDelta
        : undefined,
  };

  return buildTransitionPreset(
    initial,
    exit,
    Math.max(0.22, sequence.ingress.baseDuration * durationScale),
  );
}

export function resolveChronicleMotionPreset(
  profile: SurfaceMotionProfile,
): ChronicleMotionPreset {
  if (profile === "reduced") {
    return {
      profile,
      shell: "reduced",
      replyDurationMs: 120,
      stepDurationMs: 90,
      handoffDurationMs: 110,
      lessonDurationMs: 110,
      composerGlow: 0.16,
      orderDurationMs: 90,
      continuityDurationMs: 100,
      bandIntervalMs: 45,
      livePulseMs: 0,
    };
  }

  if (profile === "standard") {
    return {
      profile,
      shell: "standard",
      replyDurationMs: 240,
      stepDurationMs: 200,
      handoffDurationMs: 240,
      lessonDurationMs: 210,
      composerGlow: 0.26,
      orderDurationMs: 180,
      continuityDurationMs: 220,
      bandIntervalMs: 72,
      livePulseMs: 900,
    };
  }

  return {
    profile,
    shell: "flagship",
    replyDurationMs: 380,
    stepDurationMs: 290,
    handoffDurationMs: 360,
    lessonDurationMs: 320,
    composerGlow: 0.4,
    orderDurationMs: 260,
    continuityDurationMs: 320,
    bandIntervalMs: 110,
    livePulseMs: 1200,
  };
}

function frontToneAccent(tone: "steady" | "warning" | "critical") {
  if (tone === "critical") return "#ef4444";
  if (tone === "warning") return "#f59e0b";
  return "#10b981";
}

function tempoAccent(tempo: string) {
  if (tempo === "Critical") return "#ef4444";
  if (tempo === "Compressed") return "#f59e0b";
  if (tempo === "Active") return "#00DDFF";
  return "#10b981";
}

export function resolveOfficeSceneCue({
  profile,
  missionState,
  commandTempo,
  frontTone,
  activeAgentColor,
  dispatchActive,
}: {
  profile: SurfaceMotionProfile;
  missionState: "standby" | "routing" | "handoff" | "executing";
  commandTempo: string;
  frontTone: "steady" | "warning" | "critical";
  activeAgentColor?: string | null;
  dispatchActive: boolean;
}): OfficeSceneCue {
  const profileScale =
    profile === "flagship" ? 1 : profile === "standard" ? 0.72 : 0.22;
  const missionLift =
    missionState === "executing"
      ? 1
      : missionState === "handoff"
        ? 0.78
        : missionState === "routing"
          ? 0.56
          : 0.26;
  const tempoLift =
    commandTempo === "Critical"
      ? 1
      : commandTempo === "Compressed"
        ? 0.78
        : commandTempo === "Active"
          ? 0.58
          : 0.28;
  const toneLift =
    frontTone === "critical" ? 0.92 : frontTone === "warning" ? 0.62 : 0.28;
  const accentColor =
    activeAgentColor ?? frontToneAccent(frontTone) ?? tempoAccent(commandTempo);

  return {
    profile,
    missionState,
    roomMood: missionState,
    lightingEmphasis:
      0.18 + (missionLift * 0.42 + tempoLift * 0.18 + toneLift * 0.12) * profileScale,
    beaconStrength: 0.24 + missionLift * 0.56 * profileScale,
    tempoPulse: 0.86 + tempoLift * 0.46 * profileScale,
    dispatchEmphasis: dispatchActive ? 0.34 + 0.56 * profileScale : 0.08 + 0.12 * profileScale,
    emissiveBoost: 0.14 + (missionLift * 0.34 + toneLift * 0.22) * profileScale,
    practicalWarmth: 0.08 + toneLift * 0.34 * profileScale,
    accentColor,
    cameraDrift:
      profile === "reduced"
        ? 0
        : 0.004 + (missionLift * 0.006 + tempoLift * 0.004) * profileScale,
    shadowContrast: 0.12 + (tempoLift * 0.16 + toneLift * 0.14) * profileScale,
    alertWash: 0.04 + toneLift * 0.22 * profileScale,
  };
}

export function resolveEffectiveOfficeVfxQuality(
  profile: SurfaceMotionProfile,
  officeVfxQuality: OfficeVfxQuality,
): OfficeVfxQuality {
  if (profile === "reduced") return "off";
  if (profile === "standard" && officeVfxQuality === "high") return "low";
  return officeVfxQuality;
}

export function resolveEffectiveOfficeMotion(
  profile: SurfaceMotionProfile,
  officeMotion: number,
): number {
  if (profile === "reduced") return 0;
  if (profile === "standard") return Math.min(officeMotion, 0.72);
  return Math.max(0, officeMotion);
}

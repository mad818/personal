"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import Image from "next/image";
import type { PointerEvent } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  HOMEFRONT_SOURCE_ACTIVE_QUEUE,
  HOMEFRONT_SOURCE_GOVERNANCE_STEPS,
  HOMEFRONT_SOURCE_INTELLIGENCE_LANES,
} from "@/lib/homefrontSourceIntelligence";

const START_VIDEO_URL =
  "https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8";
const STATS_VIDEO_URL =
  "https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8";
const CTA_VIDEO_URL =
  "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#doctrine", label: "Doctrine" },
  { href: "#lanes", label: "Lanes" },
  { href: "#posture", label: "Posture" },
  { href: "#access", label: "Access" },
] as const;

type LandingSectionId =
  (typeof NAV_LINKS)[number]["href"] extends `#${infer Id}` ? Id : never;

const LANDING_SECTION_IDS = NAV_LINKS.map((link) =>
  link.href.slice(1),
) as LandingSectionId[];
const GUARDIAN_HERO_IMAGE = "/images/homefront-guardian-hero.webp";
const GUARDIAN_DRONE_IMAGE = "/images/homefront-drone-patrol.webp";
const GUARDIAN_CAPABILITY_VIDEO = "/videos/homefront-capability-reel.webm";
const OPERATING_LANES = ["HQ", "COMMAND", "INTEL", "CYBER", "RECON", "VAULT"];

type DroneSignal = {
  id: number;
  x: number;
  y: number;
};

const GUARDIAN_PROTOCOL_FEEDS = [
  {
    label: "Front porch",
    signal: "Animal / rodent trigger",
    posture: "cleared",
    detail: "Classified as a false alarm. Record-only.",
  },
  {
    label: "Driveway",
    signal: "Unknown approach",
    posture: "review",
    detail: "Held for operator context.",
  },
  {
    label: "Side gate",
    signal: "Latch movement",
    posture: "notify",
    detail: "Escalate with quiet evidence.",
  },
] as const;

const GUARDIAN_PROTOCOL_TIMELINE = [
  ["00:04", "Motion enters the porch zone."],
  ["00:07", "Local model clears the animal or rodent trigger."],
  ["00:13", "Unknown approach is held for review."],
  ["00:21", "Operator approves spotlight and voice prompt only."],
  ["00:28", "Incident clip and decision trail move to memory."],
] as const;

const HOMEFRONT_CAPABILITY_SPINE = [
  {
    id: "perimeter",
    label: "Perimeter",
    title: "Existing cameras become a calm review loop.",
    body: "RTSP and ONVIF feeds can be treated as local evidence: motion comes in, animal or rodent false alarms get cleared, perimeter breach is held, and the operator chooses the next move.",
    watch: ["perimeter alarm", "animal / rodent trigger", "gate breach"],
    reasons: ["false-alarm posture", "zone history", "motion direction"],
    recommends: ["quiet notify", "hold for review", "spotlight prompt"],
    records: ["event clip", "operator choice", "decision trail"],
    readout: "review before response",
  },
  {
    id: "command",
    label: "Command",
    title: "Every action gets a lane before it leaves your hands.",
    body: "The command room keeps intent, risk, proof, and fallback visible so agent work starts with a scoped instruction instead of a loose prompt.",
    watch: ["mission queue", "route focus", "runtime health"],
    reasons: ["operator intent", "risk tier", "available proof"],
    recommends: ["stage task", "ask for scope", "route agent"],
    records: ["run artifact", "handoff state", "completion proof"],
    readout: "dispatch with scope",
  },
  {
    id: "intel",
    label: "Intel",
    title: "Signals are filtered into a usable operating picture.",
    body: "Markets, news, and outside events stay useful when they are bundled into context, freshness, and decision value instead of another noisy feed.",
    watch: ["market pressure", "news changes", "macro context"],
    reasons: ["freshness", "source posture", "decision impact"],
    recommends: ["brief operator", "mark uncertainty", "save source"],
    records: ["source link", "brief note", "follow-up cue"],
    readout: "signal to context",
  },
  {
    id: "cyber",
    label: "Cyber",
    title: "Risk is made visible before a tool becomes powerful.",
    body: "Cyber work stays bounded around posture, CVE pressure, route safety, and explicit approval before anything risky is allowed to follow through.",
    watch: ["CVE pressure", "route exposure", "tool posture"],
    reasons: ["blast radius", "credential risk", "network posture"],
    recommends: ["isolate", "review first", "repair safely"],
    records: ["risk gate", "fix proof", "audit note"],
    readout: "bounded by default",
  },
  {
    id: "recon",
    label: "Recon",
    title: "Outside ideas are studied before they enter the room.",
    body: "Repos, docs, OSINT patterns, and research links can be compared, adapted, or rejected without becoming hidden dependencies.",
    watch: ["public repos", "OSINT sources", "reference docs"],
    reasons: ["fit", "license posture", "maintenance signal"],
    recommends: ["adapt pattern", "reject unsafe", "save source"],
    records: ["source memo", "fit call", "scope note"],
    readout: "passive-first intake",
  },
  {
    id: "vault",
    label: "Vault",
    title: "Proof survives the session.",
    body: "The system is only useful if the next session can recover why a choice happened. Vault keeps handoffs, artifacts, source notes, and operating memory close.",
    watch: ["handoff drift", "saved artifacts", "decision history"],
    reasons: ["continuity", "reopen value", "proof quality"],
    recommends: ["save artifact", "write handoff", "link memory"],
    records: ["compiled page", "state note", "artifact trail"],
    readout: "remembered work",
  },
] as const;

type HomefrontCapability = (typeof HOMEFRONT_CAPABILITY_SPINE)[number];
type HomefrontCapabilityId = HomefrontCapability["id"];

const HOMEFRONT_THINKING_CHAIN = [
  ["01", "Observe", "Bring local feeds and route context into view."],
  ["02", "Filter", "Remove noise before it turns into a command."],
  ["03", "Classify", "Name the event without overclaiming certainty."],
  ["04", "Context", "Compare against lane history and current posture."],
  ["05", "Recommend", "Offer the safest useful next step."],
  ["06", "Approve", "Wait for the operator before action."],
  ["07", "Record", "Save the clip, choice, and proof trail."],
] as const;

const LIVE_COMMAND_ROWS = [
  {
    lane: "Markets",
    status: "watching",
    detail: "price, macro, volatility, and liquidity context",
    pulse: "13 feeds",
  },
  {
    lane: "Cyber",
    status: "triage",
    detail: "CVE pressure, provider health, and route safety",
    pulse: "4 queues",
  },
  {
    lane: "Recon",
    status: "collecting",
    detail: "repo, open-source, and external signal intake",
    pulse: "9 sweeps",
  },
  {
    lane: "Vault",
    status: "remembering",
    detail: "handoffs, artifacts, saved pages, and state mirrors",
    pulse: "local",
  },
  {
    lane: "Resources",
    status: "proving",
    detail: "system state, impact maps, route checks, and readiness notes",
    pulse: "proof",
  },
  {
    lane: "Skills",
    status: "staging",
    detail: "operator playbooks, reusable workflows, and tool patterns",
    pulse: "bench",
  },
];

const COMMAND_ARCHITECTURE = [
  {
    index: "01",
    label: "Threshold",
    title: "Public page, protected room",
    body: "The landing explains the system, then hands authenticated operators straight into HQ without a second landing or sales detour.",
  },
  {
    index: "02",
    label: "Context",
    title: "Live local picture",
    body: "Runtime health, route focus, system state, docs, memory, and outside signals become one readable command posture.",
  },
  {
    index: "03",
    label: "Dispatch",
    title: "Specialized agent lanes",
    body: "Research, engineering, markets, security, and strategy each get a named lane so decisions do not collapse into one generic chat box.",
  },
  {
    index: "04",
    label: "Continuity",
    title: "Recoverable work",
    body: "Specs, handoffs, proof records, saved artifacts, and Vault memory keep the project awake across sessions.",
  },
];

const SURFACE_SHOWCASE = [
  {
    id: "command",
    label: "COMMAND",
    title: "Mission Queue",
    body: "Agent tasking, operator intent, review gates, and verification status stay in one working lane.",
    href: "/command",
    readouts: [
      ["Risk", "review-gated"],
      ["Mode", "operator led"],
      ["Proof", "run trace"],
    ],
    lines: [
      "Queue next action",
      "Route to the right agent",
      "Capture outcome proof",
    ],
  },
  {
    id: "intel",
    label: "INTEL",
    title: "World Picture",
    body: "Signals are organized for judgment: market pressure, global events, and live context without making noise the interface.",
    href: "/intel",
    readouts: [
      ["Sweep", "fresh"],
      ["Context", "filtered"],
      ["Noise", "reduced"],
    ],
    lines: ["Signal sweep", "Context bundle", "Operator brief"],
  },
  {
    id: "cyber",
    label: "CYBER",
    title: "Threat Posture",
    body: "Security work gets treated like a live control surface: posture, CVEs, isolation policy, and review discipline.",
    href: "/cyber",
    readouts: [
      ["Policy", "strict"],
      ["Routes", "guarded"],
      ["Tools", "isolated"],
    ],
    lines: ["Review exposure", "Map vulnerable paths", "Stage safe action"],
  },
  {
    id: "vault",
    label: "VAULT",
    title: "Memory Spine",
    body: "The project remembers what happened: handoffs, decisions, saved artifacts, and compiled memory stay retrievable.",
    href: "/vault",
    readouts: [
      ["State", "recoverable"],
      ["Docs", "mirrored"],
      ["Search", "operator"],
    ],
    lines: ["Write handoff", "Archive artifact", "Recover context"],
  },
  {
    id: "resources",
    label: "RESOURCES",
    title: "Proof Plane",
    body: "Readiness, system state, and project proof live where they can be inspected instead of buried in a release note.",
    href: "/resources",
    readouts: [
      ["Health", "visible"],
      ["Queue", "tracked"],
      ["Build", "verified"],
    ],
    lines: ["Open system state", "Check route health", "Inspect impact"],
  },
  {
    id: "skills",
    label: "SKILLS",
    title: "Operator Playbooks",
    body: "Repeatable patterns, tool lanes, and working rituals become reusable skills instead of knowledge that disappears after one run.",
    href: "/skills",
    readouts: [
      ["Playbooks", "ready"],
      ["Patterns", "codified"],
      ["Use", "repeatable"],
    ],
    lines: [
      "Find the right workflow",
      "Apply a local pattern",
      "Keep the lesson",
    ],
  },
  {
    id: "recon",
    label: "RECON",
    title: "Open-Source Sweep",
    body: "External projects, docs, repos, and ideas can be inspected, adapted, and brought home without losing the operator's context.",
    href: "/recon",
    readouts: [
      ["Scope", "bounded"],
      ["Sources", "checked"],
      ["Signal", "useful"],
    ],
    lines: ["Inspect source", "Extract the pattern", "Bring back the lesson"],
  },
];

const PROOF_WALL = [
  {
    value: "MIT",
    label: "Free posture",
    detail:
      "No in-app charges, no subscription layer, and BYOK when outside keys are useful.",
  },
  {
    value: "Local",
    label: "Primary runtime",
    detail:
      "The useful path starts on this machine and degrades calmly when external services are quiet.",
  },
  {
    value: "Token",
    label: "Protected ingress",
    detail:
      "The public page is a threshold; protected rooms open only after the local token validates.",
  },
  {
    value: "Proof",
    label: "Verification culture",
    detail:
      "Build, route health, handoff sync, and risk-gated actions are part of the product surface.",
  },
];

const BUILD_LEDGER = [
  {
    title: "Live now",
    body: "Public threshold, route-aware protected shell, local auth handoff, command surfaces, and proof-minded state pages.",
  },
  {
    title: "Being shaped",
    body: "More live signals, tighter surface previews, stronger memory recovery, richer operator playbooks, and deeper visual continuity.",
  },
  {
    title: "Kept separate",
    body: "Personal creative lanes stay private until they have their own house. The public story remains Homefront command intelligence.",
  },
];

const HOMEFRONT_CONTRACT = [
  {
    label: "Lead",
    title: "Every surface has one job",
    body: "COMMAND decides what moves next. INTEL frames the outside world. CYBER ranks risk. VAULT keeps memory recoverable.",
  },
  {
    label: "Proof",
    title: "No magic black boxes",
    body: "Route health, source posture, specs, handoffs, and verification stay close enough to inspect before the next move.",
  },
  {
    label: "Control",
    title: "The operator stays in charge",
    body: "Agents can help research, patch, review, and frame decisions, but risky work stays visible and gated.",
  },
  {
    label: "Continuity",
    title: "The room remembers",
    body: "Useful outcomes become artifacts, memories, specs, and state instead of disappearing into chat history.",
  },
];

const ACCESS_SEQUENCE = [
  "Public threshold stays calm",
  "Token validates locally",
  "HQ opens without a second landing",
];

const WHY_US = [
  {
    icon: ZapIcon,
    title: "Local First",
    body: "The useful path starts on this machine. Ollama is the default lane, cloud keys are optional, and the system should keep its shape without a billing dependency.",
  },
  {
    icon: PaletteIcon,
    title: "Command Room",
    body: "HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, and VAULT are meant to feel like one operating picture instead of a folder of unrelated screens.",
  },
  {
    icon: BarChartIcon,
    title: "Memory Spine",
    body: "Saved artifacts, handoffs, compiled pages, and project state are treated as recoverable working memory, not decorative documentation.",
  },
  {
    icon: ShieldIcon,
    title: "Protected Tools",
    body: "Risky actions stay review-gated, protected routes respect token access, and verification proof matters more than promising a finished myth too early.",
  },
];

const AGENT_BENCH = [
  {
    callsign: "ORBIT",
    role: "Engineering lane",
    body: "Turns product intent into code, patches, verification, and clean handoff updates.",
    proof: ["code", "tests", "handoff"],
  },
  {
    callsign: "NOVA",
    role: "Research lane",
    body: "Finds source-grounded context, compares options, and brings the outside world into usable shape.",
    proof: ["sources", "synthesis", "briefs"],
  },
  {
    callsign: "CIPHER",
    role: "Security lane",
    body: "Keeps risky actions conservative, reviews exposure, and pushes safety into the product posture.",
    proof: ["risk", "controls", "review"],
  },
  {
    callsign: "FLUX",
    role: "Markets lane",
    body: "Tracks price, macro, volatility, liquidity, and probability without turning noise into command.",
    proof: ["signals", "macro", "pressure"],
  },
  {
    callsign: "JANSKY",
    role: "Strategy lane",
    body: "Frames missions, breaks vague work into operating lanes, and keeps the room pointed at the next useful move.",
    proof: ["plans", "routing", "judgment"],
  },
];

const OPERATOR_FLOW = [
  {
    step: "Sense",
    title: "Bring the signal in",
    body: "Markets, route health, docs, repos, alerts, and memory enter as context, not clutter.",
  },
  {
    step: "Frame",
    title: "Name the work",
    body: "A vague urge becomes a lane: fix, research, review, ship, archive, or wait.",
  },
  {
    step: "Dispatch",
    title: "Choose the bench",
    body: "The right agent or surface gets the job, with the operator still holding the steering wheel.",
  },
  {
    step: "Review",
    title: "Gate the risky parts",
    body: "Writes, automation, external actions, and security-sensitive steps stay visible before they move.",
  },
  {
    step: "Remember",
    title: "Keep the proof",
    body: "Outcomes become handoffs, specs, saved artifacts, and state that the next session can trust.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Local-first means the room can keep working when the network gets quiet, and every outside key remains an operator choice.",
    name: "Free-first doctrine",
    role: "No in-app billing layer",
  },
  {
    quote:
      "A route should earn its place in the first viewport. The shell is for action, continuity, and proof, not decorative sprawl.",
    name: "Command-room rule",
    role: "One lead chamber, clear support rails",
  },
  {
    quote:
      "Private work can live inside the room without becoming the headline. When it needs its own house, it should be easy to move.",
    name: "Private-lane boundary",
    role: "Personal work stays separate",
  },
];

const AUTH_ERROR_COPY: Record<"invalid" | "server", string> = {
  invalid: "Invalid token. Check your .env.local NEXUS_TOKEN.",
  server: "Token validation is not configured on the server.",
};

export interface LandingPageProps {
  authEnabled: boolean;
  authError?: "invalid" | "server" | null;
  isAuthenticated: boolean;
  nextPath?: string;
}

type HlsConstructor = {
  isSupported: () => boolean;
  new (): HlsInstance;
};

type HlsInstance = {
  loadSource: (source: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  destroy: () => void;
};

type IconProps = {
  className?: string;
};

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.nexusMotionProfile === "reduced"
  );
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);

  return () => query.removeEventListener("change", onStoreChange);
}

function useLandingReducedMotion() {
  const framerReducedMotion = useReducedMotion();
  const mediaReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  return Boolean(framerReducedMotion || mediaReducedMotion);
}

function HlsVideo({
  className,
  desaturated = false,
  src,
}: {
  className?: string;
  desaturated?: boolean;
  src: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shouldLoad = useInView(videoRef, {
    once: true,
    margin: "420px 0px",
  });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion || !shouldLoad) return undefined;

    let cancelled = false;
    let hls: HlsInstance | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return undefined;
    }

    void import("hls.js")
      .then((module) => {
        if (cancelled || !video) return;
        const Hls = module.default as HlsConstructor;
        if (!Hls.isSupported()) {
          video.src = src;
          return;
        }
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      })
      .catch(() => {
        if (!cancelled && video) video.src = src;
      });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [reduceMotion, shouldLoad, src]);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      autoPlay={!reduceMotion}
      className={className}
      loop
      muted
      playsInline
      preload="metadata"
      style={desaturated ? { filter: "saturate(0)" } : undefined}
    />
  );
}

function BlurText({
  className,
  dataTestId,
  delay = 100,
  text,
}: {
  className?: string;
  dataTestId?: string;
  delay?: number;
  text: string;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");

  return (
    <h1 ref={ref} className={className} data-testid={dataTestId}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          animate={
            inView ? { filter: "blur(0px)", opacity: 1, y: 0 } : undefined
          }
          className="inline-block"
          initial={
            reduceMotion
              ? { filter: "blur(0px)", opacity: 1, y: 0 }
              : { filter: "blur(10px)", opacity: 0, y: 50 }
          }
          transition={{
            delay: reduceMotion ? 0 : (delay * index) / 1000,
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
          {index < words.length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </h1>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="liquid-glass inline-flex rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
      {children}
    </span>
  );
}

function ArrowButton({
  children,
  dataTestId,
  href,
}: {
  children: React.ReactNode;
  dataTestId?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white font-body transition duration-300 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
      data-testid={dataTestId}
    >
      {children}
      <ArrowUpRightIcon className="size-4" />
    </a>
  );
}

function LogoMark() {
  return (
    <div
      className="liquid-glass flex size-12 items-center justify-center rounded-full"
      aria-label="Homefront logo"
    >
      <span className="font-heading text-2xl italic leading-none text-white">
        H
      </span>
    </div>
  );
}

function getSectionIdFromHash(hash: string): LandingSectionId | null {
  const candidate = hash.replace("#", "");
  return LANDING_SECTION_IDS.includes(candidate as LandingSectionId)
    ? (candidate as LandingSectionId)
    : null;
}

function useActiveLandingSection() {
  const [activeSection, setActiveSection] = useState<LandingSectionId>("home");

  useEffect(() => {
    let frame = 0;

    const updateActiveSection = () => {
      frame = 0;
      const markerY = window.scrollY + window.innerHeight * 0.36;
      let nextSection: LandingSectionId = "home";

      for (const sectionId of LANDING_SECTION_IDS) {
        const section = document.getElementById(sectionId);
        if (!section) continue;
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        if (sectionTop <= markerY) {
          nextSection = sectionId;
        }
      }

      const nearPageEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;

      setActiveSection(nearPageEnd ? "access" : nextSection);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    const syncHash = () => {
      const sectionFromHash = getSectionIdFromHash(window.location.hash);
      if (sectionFromHash) setActiveSection(sectionFromHash);
      requestUpdate();
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("scroll", requestUpdate, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("scroll", requestUpdate);
    };
  }, []);

  return activeSection;
}

function Navbar({ accessHref }: { accessHref: string }) {
  const activeSection = useActiveLandingSection();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, {
    damping: 28,
    mass: 0.2,
    stiffness: 160,
  });

  return (
    <nav className="fixed inset-x-0 top-4 z-50 px-8 py-3 lg:px-16">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <LogoMark />
        <div
          className="liquid-glass relative hidden items-center gap-1 rounded-full px-1.5 py-1 md:flex"
          data-testid="landing-header"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              aria-current={
                activeSection === link.href.slice(1) ? "page" : undefined
              }
              data-testid={`landing-nav-link-${link.href.slice(1)}`}
              href={link.href}
              className={`relative isolate rounded-full px-3 py-2 text-sm font-medium font-body transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                activeSection === link.href.slice(1)
                  ? "text-black"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              {activeSection === link.href.slice(1) ? (
                <motion.span
                  layoutId="landing-active-nav-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.22)]"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 360, damping: 34 }
                  }
                />
              ) : null}
              <span className="relative z-10">{link.label}</span>
            </a>
          ))}
          <a
            href={accessHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-black font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            data-testid="landing-header-cta"
          >
            Enter HQ
            <ArrowUpRightIcon className="size-3.5" />
          </a>
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 bottom-1 h-px origin-left rounded-full bg-white/50 shadow-[0_0_16px_rgba(255,255,255,0.5)]"
            data-testid="landing-nav-progress"
            style={{ scaleX: progressScale }}
          />
        </div>
      </div>
    </nav>
  );
}

function Hero({ accessHref }: { accessHref: string }) {
  const reduceMotion = useLandingReducedMotion();

  return (
    <section
      id="home"
      className="relative h-svh min-h-[820px] overflow-hidden bg-black"
      data-testid="landing-hero"
    >
      <HomefrontCommandBackdrop reduceMotion={Boolean(reduceMotion)} />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[300px]"
        style={{
          background: "linear-gradient(to bottom, transparent, black)",
        }}
      />

      <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-7xl flex-col items-start px-6 pt-[160px] text-left md:pt-[170px]">
        <div className="liquid-glass mb-8 inline-flex items-center gap-3 rounded-full p-1">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black font-body">
            Guardian layer
          </span>
          <span className="pr-3 text-xs font-light text-white/80 font-body">
            Existing cameras. Future patrols. Operator control.
          </span>
        </div>

        <BlurText
          dataTestId="landing-hero-headline"
          delay={100}
          text="Homefront Guards The Perimeter"
          className="max-w-3xl text-5xl font-heading italic leading-[0.82] text-white md:text-7xl lg:text-[5.35rem]"
        />

        <motion.p
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className="mt-8 max-w-2xl text-sm font-light leading-relaxed text-white/86 font-body md:text-base"
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Existing cameras, future patrol drones, and local AI work together to
          classify perimeter motion, clear animal or rodent false alarms, and
          escalate only when the operator approves the next move. Warning
          scripts can deter an intruder, but Homefront does not place emergency
          calls automatically.
        </motion.p>

        <motion.div
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className="pointer-events-auto mt-8 flex flex-wrap items-center justify-start gap-4"
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <ArrowButton dataTestId="landing-hero-cta" href={accessHref}>
            Enter HQ
          </ArrowButton>
          <a
            href="#doctrine"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white font-body transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
          >
            <PlayIcon className="size-4 fill-white" />
            Read the Protocol
          </a>
        </motion.div>

        <div className="mt-auto hidden w-full pb-8 pt-16">
          <div className="mb-8 flex justify-start">
            <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-light text-white/75 font-body">
              Current operating lanes
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-8 md:gap-12">
            {OPERATING_LANES.map((lane) => (
              <span
                key={lane}
                className="text-2xl font-heading italic text-white md:text-3xl"
              >
                {lane}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomefrontCommandBackdrop({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  const patrolTransition = reduceMotion
    ? { duration: 0 }
    : {
        duration: 22,
        ease: "easeInOut" as const,
        repeat: Infinity,
        repeatType: "mirror" as const,
      };
  const [droneSignal, setDroneSignal] = useState<DroneSignal | null>(null);
  const signalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBackdropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest("a,button")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (signalTimeoutRef.current) {
      clearTimeout(signalTimeoutRef.current);
    }

    setDroneSignal({ id: Date.now(), x, y });
    signalTimeoutRef.current = setTimeout(() => {
      setDroneSignal(null);
      signalTimeoutRef.current = null;
    }, reduceMotion ? 520 : 950);
  };

  useEffect(() => {
    return () => {
      if (signalTimeoutRef.current) {
        clearTimeout(signalTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      aria-label="Interactive Homefront perimeter drone background"
      className="absolute inset-0 z-0 overflow-hidden bg-[#020407]"
      data-testid="landing-command-backdrop"
      onPointerDown={handleBackdropPointerDown}
    >
      <Image
        alt=""
        className="absolute inset-0 size-full object-cover opacity-95"
        data-testid="landing-guardian-hero-image"
        draggable={false}
        fill
        priority
        sizes="100vw"
        src={GUARDIAN_HERO_IMAGE}
      />
      <motion.div
        animate={
          reduceMotion
            ? undefined
            : {
                rotate: [-8, 12, -7],
                x: [-44, 18, 56, -18],
                y: [0, -28, 18, 8],
              }
        }
        className="absolute right-[5%] top-[12%] h-28 w-48 md:right-[10%] md:top-[15%] md:h-44 md:w-72 lg:right-[12%] lg:h-52 lg:w-[340px]"
        transition={patrolTransition}
      >
        <motion.img
          alt=""
          aria-hidden="true"
          animate={
            droneSignal
              ? {
                  filter: reduceMotion
                    ? "brightness(1.18)"
                    : "brightness(1.28) drop-shadow(0 0 22px rgba(190,244,255,0.38))",
                  opacity: 1,
                  scale: reduceMotion ? 1 : 1.055,
                }
              : { filter: "brightness(1)", opacity: 0.9, scale: 1 }
          }
          className="size-full object-contain opacity-90"
          data-testid="landing-guardian-drone"
          data-signal-state={droneSignal ? "acknowledged" : "idle"}
          decoding="async"
          draggable={false}
          src={GUARDIAN_DRONE_IMAGE}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </motion.div>
      {droneSignal ? (
        <motion.div
          key={droneSignal.id}
          aria-hidden="true"
          className="pointer-events-none absolute size-14 rounded-full border border-cyan-100/45 bg-cyan-100/[0.08] shadow-[0_0_28px_rgba(125,231,255,0.18)]"
          data-testid="landing-drone-signal-pulse"
          initial={{ opacity: 0.72, scale: 0.28 }}
          animate={{
            opacity: reduceMotion ? [0.5, 0] : [0.72, 0.26, 0],
            scale: reduceMotion ? [0.75, 1.05] : [0.28, 1.12, 1.62],
          }}
          style={{
            left: `${droneSignal.x}%`,
            marginLeft: "-1.75rem",
            marginTop: "-1.75rem",
            top: `${droneSignal.y}%`,
          }}
          transition={{ duration: reduceMotion ? 0.45 : 0.86, ease: "easeOut" }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_42%,rgba(0,0,0,0.02),rgba(0,0,0,0.52)_78%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-black via-black/70 to-transparent" />
    </div>
  );
}

function GuardianProtocolSection() {
  const reduceMotion = useLandingReducedMotion();

  return (
    <section
      className="relative overflow-hidden bg-black px-6 py-28"
      data-testid="landing-guardian-protocol"
    >
      <motion.img
        alt=""
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: [0.16, 0.24, 0.18],
                scale: [1.04, 1.08, 1.05],
                x: ["-1%", "1.5%", "-0.5%"],
              }
        }
        className="absolute inset-0 size-full object-cover"
        src={GUARDIAN_HERO_IMAGE}
        transition={{
          duration: 24,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(103,232,249,0.16),transparent_28%),linear-gradient(180deg,black_0%,rgba(0,0,0,0.76)_44%,black_100%)]" />
      <motion.div
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.1, 0.44, 0.14], rotate: [9, 15, 8] }
        }
        className="absolute right-[10%] top-[4%] h-[92%] w-[30%] origin-top bg-gradient-to-b from-cyan-100/28 via-cyan-200/10 to-transparent blur-2xl"
        style={{
          clipPath: "polygon(42% 0%, 100% 100%, 0% 100%)",
          mixBlendMode: "screen",
        }}
        transition={{
          duration: 18,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.18fr] lg:items-center">
        <div>
          <SectionBadge>Guardian Protocol</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
            First observe. Then slow the moment down.
          </h2>
          <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-white/64 font-body md:text-base">
            The perimeter layer is not a panic button. It turns cameras and
            future patrol drones into a local review chain: classify motion,
            separate animal or rodent false alarms from unwanted perimeter
            breach, ask the operator before action, and leave the proof behind.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {["local inference", "false-alarm posture", "approval gate"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/58 font-body"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="liquid-glass relative min-h-[620px] overflow-hidden rounded-[2rem] p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_35%,rgba(124,231,255,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
          <div className="relative mb-4 h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-black/40">
            {!reduceMotion ? (
              <video
                aria-hidden="true"
                autoPlay
                className="absolute inset-0 size-full object-cover opacity-90"
                data-testid="landing-capability-reel-video"
                loop
                muted
                playsInline
                poster={GUARDIAN_HERO_IMAGE}
                preload="metadata"
              >
                <source src={GUARDIAN_CAPABILITY_VIDEO} type="video/webm" />
              </video>
            ) : (
              <Image
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover opacity-80"
                fill
                sizes="(min-width: 1024px) 720px, 100vw"
                src={GUARDIAN_HERO_IMAGE}
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.22)_58%,rgba(0,0,0,0.68))]" />
            <div className="relative flex h-full flex-col justify-between p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-cyan-100/18 bg-cyan-100/[0.055] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100/70 font-body">
                  capability reel
                </span>
                <span className="rounded-full border border-white/12 bg-black/36 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56 font-body">
                  local media / no remote stream
                </span>
              </div>
              <div className="max-w-md">
                <h3 className="text-4xl font-heading italic leading-[0.88] text-white md:text-5xl">
                  The background demonstrates the loop.
                </h3>
                <p className="mt-4 text-sm font-light leading-relaxed text-white/64 font-body">
                  Patrol footage, camera intake, false-alarm classification,
                  breach review posture, and incident memory stay visible before
                  the operator takes action.
                </p>
              </div>
            </div>
          </div>
          <div className="relative grid h-full gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex min-h-[560px] flex-col justify-between rounded-3xl border border-white/10 bg-black/34 p-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.26em] text-white/38 font-body">
                    Live perimeter
                  </span>
                  <motion.span
                    animate={
                      reduceMotion
                        ? undefined
                        : { opacity: [0.5, 1, 0.58], scale: [1, 1.15, 1] }
                    }
                    className="size-2 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(125,231,255,0.8)]"
                    transition={{
                      duration: 2.4,
                      ease: "easeInOut",
                      repeat: Infinity,
                    }}
                  />
                </div>
                <div className="mt-8 grid gap-3">
                  {GUARDIAN_PROTOCOL_FEEDS.map((feed, index) => (
                    <motion.article
                      key={feed.label}
                      animate={
                        reduceMotion
                          ? undefined
                          : {
                              borderColor: [
                                "rgba(255,255,255,0.1)",
                                index === 1
                                  ? "rgba(251,191,36,0.36)"
                                  : "rgba(125,231,255,0.26)",
                                "rgba(255,255,255,0.1)",
                              ],
                            }
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                      transition={{
                        delay: index * 0.45,
                        duration: 4.8,
                        ease: "easeInOut",
                        repeat: Infinity,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38 font-body">
                            {feed.label}
                          </div>
                          <h3 className="mt-2 text-2xl font-heading italic leading-none text-white">
                            {feed.signal}
                          </h3>
                        </div>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/58 font-body">
                          {feed.posture}
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-light leading-relaxed text-white/54 font-body">
                        {feed.detail}
                      </p>
                    </motion.article>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-100/15 bg-cyan-100/[0.045] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-100/48 font-body">
                  Model posture
                </div>
                <p className="mt-3 text-sm font-light leading-relaxed text-white/64 font-body">
                  Edge inference may recommend a response, but the operator owns
                  the next step.
                </p>
              </div>
            </div>

            <div className="relative min-h-[560px] overflow-hidden rounded-3xl border border-white/10 bg-black/28 p-5">
              <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
              <motion.div
                aria-hidden="true"
                animate={
                  reduceMotion
                    ? undefined
                    : { y: ["-12%", "105%"], opacity: [0, 0.45, 0] }
                }
                className="absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-transparent via-cyan-100/18 to-transparent"
                transition={{
                  duration: 5.6,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              />
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.26em] text-white/38 font-body">
                  Decision trail
                </div>
                <h3 className="mt-4 text-4xl font-heading italic leading-[0.9] text-white">
                  Review before response.
                </h3>
                <div className="mt-9 space-y-4">
                  {GUARDIAN_PROTOCOL_TIMELINE.map(([time, event], index) => (
                    <div key={event} className="grid grid-cols-[64px_1fr] gap-4">
                      <div className="text-xs text-white/38 font-body">
                        {time}
                      </div>
                      <div className="relative border-l border-white/12 pl-5">
                        <motion.span
                          animate={
                            reduceMotion
                              ? undefined
                              : {
                                  opacity: [0.48, 1, 0.58],
                                  scale: [1, 1.2, 1],
                                }
                          }
                          className="absolute left-[-5px] top-1 size-2 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.55)]"
                          transition={{
                            delay: index * 0.32,
                            duration: 3,
                            ease: "easeInOut",
                            repeat: Infinity,
                          }}
                        />
                        <p className="text-sm font-light leading-relaxed text-white/68 font-body">
                          {event}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 grid grid-cols-3 gap-2">
                  {["observe", "approve", "record"].map((item, index) => (
                    <motion.div
                      key={item}
                      animate={
                        reduceMotion
                          ? undefined
                          : { opacity: [0.58, 1, 0.7] }
                      }
                      className="rounded-full border border-white/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.16em] text-white/58 font-body"
                      transition={{
                        delay: index * 0.4,
                        duration: 3.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilitySpineSection() {
  const reduceMotion = useLandingReducedMotion();
  const [activeCapabilityId, setActiveCapabilityId] =
    useState<HomefrontCapabilityId>("perimeter");
  const activeCapability =
    HOMEFRONT_CAPABILITY_SPINE.find(
      (capability) => capability.id === activeCapabilityId,
    ) ?? HOMEFRONT_CAPABILITY_SPINE[0];
  const activeCapabilityGroups = [
    { label: "Watches", items: activeCapability.watch },
    { label: "Reasons", items: activeCapability.reasons },
    { label: "Recommends", items: activeCapability.recommends },
    { label: "Records", items: activeCapability.records },
  ] as const;

  return (
    <section
      className="relative overflow-hidden bg-black px-6 py-28"
      data-testid="landing-capability-spine"
    >
      <motion.img
        alt=""
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: [0.16, 0.26, 0.18],
                scale: [1.08, 1.13, 1.09],
                x: ["1%", "-1.5%", "0.8%"],
              }
        }
        className="absolute inset-0 size-full object-cover"
        src={GUARDIAN_HERO_IMAGE}
        transition={{
          duration: 26,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,rgba(125,231,255,0.16),transparent_30%),radial-gradient(circle_at_78%_70%,rgba(251,191,36,0.08),transparent_34%),linear-gradient(180deg,black_0%,rgba(0,0,0,0.78)_44%,black_100%)]" />
      <motion.div
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : { x: ["-18%", "18%"], opacity: [0.08, 0.22, 0.1] }
        }
        className="absolute left-1/2 top-1/2 h-[70%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-cyan-100/12"
        transition={{
          duration: 14,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <SectionBadge>Capability Spine</SectionBadge>
          <h2 className="mt-5 max-w-2xl text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
            See the room think before it acts.
          </h2>
          <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-white/64 font-body md:text-base">
            Homefront should not feel like a black box. Each lane shows what it
            watches, why it cares, what it can recommend, and what proof remains
            after the operator decides.
          </p>

          <div
            className="mt-8 flex flex-wrap gap-2 rounded-[2rem] border border-white/10 bg-black/28 p-2 backdrop-blur-xl"
            data-testid="landing-core-function-switcher"
            role="tablist"
            aria-label="Homefront core functions"
          >
            {HOMEFRONT_CAPABILITY_SPINE.map((capability) => {
              const isActive = activeCapability.id === capability.id;

              return (
                <button
                  key={capability.id}
                  aria-controls="landing-capability-panel"
                  aria-selected={isActive}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition duration-300 font-body ${
                    isActive
                      ? "bg-white text-black shadow-[0_14px_48px_rgba(255,255,255,0.12)]"
                      : "text-white/58 hover:bg-white/8 hover:text-white"
                  }`}
                  data-testid={`landing-capability-tab-${capability.id}`}
                  onClick={() => setActiveCapabilityId(capability.id)}
                  role="tab"
                  type="button"
                >
                  {capability.label}
                </button>
              );
            })}
          </div>

          <motion.div
            key={activeCapability.id}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            className="liquid-glass mt-6 rounded-[2rem] p-5 md:p-6"
            data-testid="landing-capability-panel"
            id="landing-capability-panel"
            initial={
              reduceMotion ? false : { filter: "blur(10px)", opacity: 0, y: 18 }
            }
            role="tabpanel"
            transition={{ duration: 0.42, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/48 font-body">
                  {activeCapability.label}
                </div>
                <h3 className="mt-3 text-3xl font-heading italic leading-[0.94] text-white md:text-4xl">
                  {activeCapability.title}
                </h3>
              </div>
              <span className="hidden rounded-full border border-cyan-100/18 bg-cyan-100/[0.055] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-cyan-100/70 font-body sm:inline-flex">
                {activeCapability.readout}
              </span>
            </div>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
              {activeCapability.body}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {activeCapabilityGroups.map(({ items, label }) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34 font-body">
                    {label}
                  </div>
                  <div className="mt-4 space-y-2">
                    {items.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-cyan-100/70 shadow-[0_0_12px_rgba(125,231,255,0.55)]" />
                        <span className="text-sm font-light text-white/62 font-body">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-amber-200/15 bg-amber-200/[0.045] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100/48 font-body">
                Operating boundary
              </div>
              <p className="mt-3 text-sm font-light leading-relaxed text-white/62 font-body">
                No autonomous escalation, no face recognition, no citizen
                scoring. The system narrows the moment; the operator owns it.
              </p>
            </div>
          </motion.div>
        </div>

        <div
          className="liquid-glass relative min-h-[780px] overflow-hidden rounded-[2.25rem] p-4 md:p-6"
          data-testid="landing-capability-media"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_28%,rgba(125,231,255,0.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
          <div className="relative h-[380px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/45 md:h-[460px]">
            {!reduceMotion ? (
              <video
                aria-hidden="true"
                autoPlay
                className="absolute inset-0 size-full object-cover opacity-90"
                data-testid="landing-capability-spine-video"
                loop
                muted
                playsInline
                poster={GUARDIAN_HERO_IMAGE}
                preload="metadata"
              >
                <source src={GUARDIAN_CAPABILITY_VIDEO} type="video/webm" />
              </video>
            ) : (
              <Image
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover opacity-85"
                fill
                sizes="(min-width: 1024px) 720px, 100vw"
                src={GUARDIAN_HERO_IMAGE}
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.78)),radial-gradient(circle_at_70%_34%,transparent_0%,rgba(0,0,0,0.58)_66%)]" />
            <motion.img
              alt=""
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotate: [-5, 4, -2],
                      x: ["0%", "9%", "-4%", "0%"],
                      y: ["0%", "-7%", "5%", "0%"],
                    }
              }
              className="absolute right-[8%] top-[10%] h-14 w-24 object-contain opacity-92 drop-shadow-[0_24px_44px_rgba(0,0,0,0.55)] md:h-20 md:w-36"
              src={GUARDIAN_DRONE_IMAGE}
              transition={{
                duration: 12,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
              }}
            />
            <motion.div
              aria-hidden="true"
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [0.08, 0.3, 0.12], rotate: [-14, -4, -18] }
              }
              className="absolute right-[16%] top-[26%] h-[62%] w-[28%] origin-top bg-gradient-to-b from-cyan-100/32 via-cyan-100/10 to-transparent blur-xl"
              style={{ clipPath: "polygon(45% 0%, 100% 100%, 0% 100%)" }}
              transition={{
                duration: 9,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
              }}
            />
            <div className="absolute left-5 top-5 flex flex-wrap gap-2">
              {["local", activeCapability.label, activeCapability.readout].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 bg-black/42 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/64 backdrop-blur-xl font-body"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
            <div className="absolute bottom-5 left-5 max-w-md">
              <div className="text-xs uppercase tracking-[0.28em] text-white/42 font-body">
                capability state
              </div>
              <h3 className="mt-3 text-4xl font-heading italic leading-[0.88] text-white md:text-5xl">
                {activeCapability.title}
              </h3>
            </div>
          </div>

          <div
            className="relative mt-5 grid gap-3"
            data-testid="landing-thinking-chain"
          >
            <div className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-black/28 px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/42 font-body">
                How Homefront thinks
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60 font-body">
                operator approved
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {HOMEFRONT_THINKING_CHAIN.map(([step, label, detail], index) => (
                <motion.article
                  key={label}
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          borderColor: [
                            "rgba(255,255,255,0.1)",
                            index === 5
                              ? "rgba(251,191,36,0.36)"
                              : "rgba(125,231,255,0.24)",
                            "rgba(255,255,255,0.1)",
                          ],
                          opacity: [0.76, 1, 0.82],
                        }
                  }
                  className="rounded-3xl border border-white/10 bg-white/[0.035] p-4"
                  transition={{
                    delay: index * 0.22,
                    duration: 4.6,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-white/34 font-body">
                      {step}
                    </span>
                    <span className="size-1.5 rounded-full bg-white/70" />
                  </div>
                  <h3 className="mt-4 text-2xl font-heading italic leading-none text-white">
                    {label}
                  </h3>
                  <p className="mt-3 text-sm font-light leading-relaxed text-white/56 font-body">
                    {detail}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoSection({
  children,
  desaturated,
  minHeight = "min-h-[500px]",
  src,
}: {
  children: React.ReactNode;
  desaturated?: boolean;
  minHeight?: string;
  src: string;
}) {
  return (
    <section className={`relative overflow-hidden bg-black ${minHeight}`}>
      <HlsVideo
        src={src}
        desaturated={desaturated}
        className="homefront-video-bg absolute inset-0 size-full object-cover"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[200px]"
        style={{ background: "linear-gradient(to bottom, black, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[200px]"
        style={{ background: "linear-gradient(to top, black, transparent)" }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function LiveCommandPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="liquid-glass mt-14 w-full max-w-5xl rounded-3xl p-5 text-left md:p-6"
      data-testid="landing-live-command-preview"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end">
        <div>
          <div className="text-xs font-medium uppercase text-white/45 font-body">
            Live command preview
          </div>
          <h3 className="mt-3 text-3xl font-heading italic leading-[0.95] text-white md:text-4xl">
            The room is already listening.
          </h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 font-body">
          <span className="size-2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
          Read-only public signal
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {LIVE_COMMAND_ROWS.map((row, index) => (
          <motion.div
            key={row.lane}
            animate={reduceMotion ? undefined : { opacity: [0.72, 1, 0.72] }}
            className="rounded-2xl border border-white/10 bg-black/25 p-4"
            transition={{
              delay: index * 0.18,
              duration: 3.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-heading italic text-white">
                {row.lane}
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] uppercase text-white/65 font-body">
                {row.status}
              </span>
            </div>
            <p className="mt-3 text-sm font-light leading-relaxed text-white/60 font-body">
              {row.detail}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-white/50 via-white/10 to-transparent" />
              <span className="text-xs text-white/45 font-body">
                {row.pulse}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StartSection({ accessHref }: { accessHref: string }) {
  return (
    <VideoSection src={START_VIDEO_URL} minHeight="min-h-[760px]">
      <div
        id="doctrine"
        className="mx-auto flex min-h-[760px] max-w-6xl flex-col items-center justify-center px-6 py-28 text-center"
      >
        <SectionBadge>Doctrine</SectionBadge>
        <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
          One shell. Many operating lanes.
        </h2>
        <p className="mt-5 max-w-2xl text-sm font-light text-white/60 font-body md:text-base">
          Homefront is being shaped as an operating room: live signals, saved
          artifacts, local model lanes, protected commands, and private work
          held behind the same route-stable threshold.
        </p>
        <div className="mt-8">
          <ArrowButton href={accessHref}>Enter HQ</ArrowButton>
        </div>
        <LiveCommandPreview />
      </div>
    </VideoSection>
  );
}

function ArchitectureSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="bg-black px-6 py-28"
      data-testid="landing-system-architecture"
    >
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <SectionBadge>System Architecture</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
            More than a beautiful front door.
          </h2>
          <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            The landing should make the room legible before the token ever
            appears: what it watches, where work goes, how proof survives, and
            why local-first matters.
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase text-white/35 font-body">
              Current promise
            </div>
            <p className="mt-3 text-2xl font-heading italic leading-tight text-white">
              A command room that explains itself without pretending to be
              finished.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {COMMAND_ARCHITECTURE.map((item, index) => (
            <motion.article
              key={item.title}
              animate={reduceMotion ? undefined : { opacity: [0.82, 1, 0.82] }}
              className="liquid-glass rounded-3xl p-5 md:p-6"
              transition={{
                delay: index * 0.16,
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex items-center gap-3 md:w-44">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-xs text-white/55 font-body">
                    {item.index}
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/35 font-body">
                    {item.label}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-3xl font-heading italic leading-none text-white md:text-4xl">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
                    {item.body}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="lg:col-span-2">
          <div
            className="grid gap-4 md:grid-cols-3"
            data-testid="landing-build-ledger"
          >
            {BUILD_LEDGER.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
              >
                <h3 className="text-2xl font-heading italic text-white">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm font-light leading-relaxed text-white/58 font-body">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandContractSection() {
  return (
    <section
      className="bg-black px-6 py-28"
      data-testid="landing-command-contract"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-end">
          <div>
            <SectionBadge>Command Contract</SectionBadge>
            <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
              The same rules carry inside.
            </h2>
          </div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            The public page and protected shell should feel like the same room:
            local-first, route-aware, proof-minded, and calm enough to work in
            for a long session.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {HOMEFRONT_CONTRACT.map((item) => (
            <article
              key={item.label}
              className="liquid-glass min-h-[250px] rounded-3xl p-5"
            >
              <div className="text-xs uppercase tracking-[0.22em] text-white/35 font-body">
                {item.label}
              </div>
              <h3 className="mt-6 text-3xl font-heading italic leading-none text-white">
                {item.title}
              </h3>
              <p className="mt-5 text-sm font-light leading-relaxed text-white/60 font-body">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourceIntelligenceSection() {
  return (
    <section
      className="bg-black px-6 py-28"
      data-testid="landing-source-intelligence"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 grid gap-8 lg:grid-cols-[0.78fr_1fr] lg:items-end">
          <div>
            <SectionBadge>Source Intelligence</SectionBadge>
            <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
              Outside ideas enter through discipline.
            </h2>
          </div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            The web is full of useful patterns and dangerous shortcuts.
            Homefront should be able to study both without losing its posture:
            No vendoring, Passive-first, operator-approved, and proof kept.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.54fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {HOMEFRONT_SOURCE_INTELLIGENCE_LANES.map((lane) => (
              <article
                key={lane.title}
                className="liquid-glass flex min-h-[310px] flex-col rounded-3xl p-5 md:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/35 font-body">
                    {lane.label}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase text-white/55 font-body">
                    {lane.posture}
                  </span>
                </div>
                <h3 className="mt-7 text-3xl font-heading italic leading-none text-white md:text-4xl">
                  {lane.title}
                </h3>
                <p className="mt-5 text-sm font-light leading-relaxed text-white/60 font-body">
                  {lane.body}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-8">
                  {lane.references.map((reference) => (
                    <span
                      key={reference}
                      className="rounded-full bg-white/[0.055] px-2.5 py-1 text-[11px] text-white/45 font-body"
                    >
                      {reference}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="liquid-glass rounded-3xl p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.22em] text-white/35 font-body">
              Intake ritual
            </div>
            <h3 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white">
              Useful does not mean imported.
            </h3>
            <div className="mt-8 grid gap-3">
              {HOMEFRONT_SOURCE_GOVERNANCE_STEPS.map((item, index) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full border border-white/15 text-xs text-white/55 font-body">
                      0{index + 1}
                    </span>
                    <span className="text-xl font-heading italic text-white">
                      {item.step}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-light leading-relaxed text-white/56 font-body">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div
          className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.025] p-4 md:p-5"
          data-testid="landing-source-active-queue"
        >
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-white/35 font-body">
                Active intake queue
              </div>
              <h3 className="mt-3 text-3xl font-heading italic leading-none text-white md:text-4xl">
                What is still being worked now.
              </h3>
            </div>
            <p className="max-w-xl text-sm font-light leading-relaxed text-white/52 font-body">
              The link list becomes a living queue: active where it improves the
              command room, staged where evidence is thin, and guarded where
              private tooling belongs.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {HOMEFRONT_SOURCE_ACTIVE_QUEUE.map((item) => (
              <article
                key={item.lane}
                className="rounded-2xl border border-white/10 bg-black/25 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase text-white/42 font-body">
                    {item.lane}
                  </span>
                  <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] uppercase text-white/52 font-body">
                    {item.status}
                  </span>
                </div>
                <div className="mt-4 text-xl font-heading italic leading-none text-white">
                  {item.source}
                </div>
                <p className="mt-4 text-xs font-light leading-relaxed text-white/55 font-body">
                  {item.next}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesChess({ accessHref }: { accessHref: string }) {
  const reduceMotion = useReducedMotion();
  const [activeSurfaceId, setActiveSurfaceId] = useState(
    SURFACE_SHOWCASE[0].id,
  );
  const activeSurface =
    SURFACE_SHOWCASE.find((surface) => surface.id === activeSurfaceId) ??
    SURFACE_SHOWCASE[0];

  useEffect(() => {
    if (reduceMotion) return undefined;
    const interval = window.setInterval(() => {
      setActiveSurfaceId((current) => {
        const currentIndex = SURFACE_SHOWCASE.findIndex(
          (surface) => surface.id === current,
        );
        return SURFACE_SHOWCASE[(currentIndex + 1) % SURFACE_SHOWCASE.length]
          .id;
      });
    }, 5200);

    return () => window.clearInterval(interval);
  }, [reduceMotion]);

  return (
    <section id="lanes" className="bg-black px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <SectionBadge>Lanes</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
            Walk the real surfaces before you enter.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            This is a public, read-only preview of the rooms that matter:
            command, intelligence, security, memory, and proof. Private lanes
            stay out of the story.
          </p>
        </div>

        <div
          className="grid gap-8 lg:grid-cols-[0.72fr_1fr]"
          data-testid="landing-surface-showcase"
        >
          <div className="flex flex-col gap-3">
            {SURFACE_SHOWCASE.map((surface) => {
              const isActive = activeSurface.id === surface.id;
              return (
                <button
                  key={surface.id}
                  className={`liquid-glass rounded-2xl p-5 text-left transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                  data-testid={`landing-surface-tab-${surface.id}`}
                  onClick={() => setActiveSurfaceId(surface.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`text-sm font-medium font-body ${
                        isActive ? "text-white" : "text-white/55"
                      }`}
                    >
                      {surface.label}
                    </span>
                    <span className="text-xs text-white/35 font-body">
                      {isActive ? "active" : "preview"}
                    </span>
                  </div>
                  <div className="mt-3 text-2xl font-heading italic leading-none text-white">
                    {surface.title}
                  </div>
                </button>
              );
            })}
          </div>

          <motion.div
            key={activeSurface.id}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            className="liquid-glass min-h-[560px] rounded-3xl p-6 md:p-8"
            data-testid="landing-surface-panel"
            initial={
              reduceMotion ? false : { filter: "blur(10px)", opacity: 0, y: 20 }
            }
            transition={{ duration: 0.45 }}
          >
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <div className="text-xs font-medium uppercase text-white/45 font-body">
                  {activeSurface.label}
                </div>
                <h3 className="mt-4 max-w-2xl text-4xl font-heading italic leading-[0.9] text-white md:text-5xl">
                  {activeSurface.title}
                </h3>
                <p className="mt-5 max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
                  {activeSurface.body}
                </p>
              </div>
              <ArrowButton href={activeSurface.href}>Open</ArrowButton>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {activeSurface.readouts.map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 p-4"
                >
                  <div className="text-3xl font-heading italic text-white">
                    {value}
                  </div>
                  <div className="mt-1 text-xs font-light text-white/45 font-body">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="mb-4 flex items-center justify-between text-xs uppercase text-white/38 font-body">
                <span>Room activity</span>
                <span>read-only</span>
              </div>
              <div className="space-y-3">
                {activeSurface.lines.map((line, index) => (
                  <div key={line} className="flex items-center gap-3">
                    <motion.span
                      animate={
                        reduceMotion ? undefined : { scale: [1, 1.28, 1] }
                      }
                      className="size-2 rounded-full bg-white/75"
                      transition={{
                        delay: index * 0.22,
                        duration: 2.2,
                        repeat: Infinity,
                      }}
                    />
                    <span className="text-sm font-light text-white/70 font-body">
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ArrowButton href={accessHref}>Enter HQ</ArrowButton>
              <span className="text-sm font-light text-white/45 font-body">
                Same threshold, deeper room.
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function AgentBenchSection() {
  return (
    <section className="bg-black px-6 py-28" data-testid="landing-agent-bench">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-end">
          <div>
            <SectionBadge>Agent Bench</SectionBadge>
            <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
              The room has named hands.
            </h2>
          </div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            Homefront works best when each kind of thinking has a lane.
            Research, code, security, markets, and strategy stay distinct, then
            meet inside the same operating picture.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {AGENT_BENCH.map((agent) => (
            <article
              key={agent.callsign}
              className="liquid-glass flex min-h-[300px] flex-col rounded-3xl p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.22em] text-white/35 font-body">
                  {agent.role}
                </div>
                <span className="size-2 rounded-full bg-white/65 shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
              </div>
              <h3 className="mt-6 text-4xl font-heading italic leading-none text-white">
                {agent.callsign}
              </h3>
              <p className="mt-5 text-sm font-light leading-relaxed text-white/60 font-body">
                {agent.body}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-8">
                {agent.proof.map((proof) => (
                  <span
                    key={proof}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase text-white/45 font-body"
                  >
                    {proof}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section id="posture" className="bg-black px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <SectionBadge>Operating Posture</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
            Free, local, deliberate.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {WHY_US.map((item) => (
            <div key={item.title} className="liquid-glass rounded-2xl p-6">
              <div className="liquid-glass-strong mb-8 flex size-10 items-center justify-center rounded-full text-white">
                <item.icon className="size-5" />
              </div>
              <h3 className="text-xl font-heading italic text-white">
                {item.title}
              </h3>
              <p className="mt-4 text-sm font-light leading-relaxed text-white/60 font-body">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperatorFlowSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="bg-black px-6 py-28"
      data-testid="landing-operator-flow"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <SectionBadge>Operator Flow</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
            From signal to remembered proof.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            The point is not more panels. The point is a shorter path from
            noticing something, to framing the work, to leaving behind evidence
            the next session can use.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          {OPERATOR_FLOW.map((item, index) => (
            <article
              key={item.step}
              className="liquid-glass relative min-h-[280px] overflow-hidden rounded-3xl p-5"
            >
              <motion.div
                aria-hidden="true"
                animate={
                  reduceMotion
                    ? undefined
                    : { x: ["-30%", "100%"], opacity: [0, 0.4, 0] }
                }
                className="absolute top-0 h-px w-2/3 bg-gradient-to-r from-transparent via-white to-transparent"
                transition={{
                  delay: index * 0.28,
                  duration: 4.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-full border border-white/15 text-xs text-white/60 font-body">
                  0{index + 1}
                </span>
                <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-body">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-8 text-3xl font-heading italic leading-none text-white">
                {item.title}
              </h3>
              <p className="mt-5 text-sm font-light leading-relaxed text-white/58 font-body">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <VideoSection src={STATS_VIDEO_URL} desaturated minHeight="min-h-[620px]">
      <div
        className="mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-6 py-28"
        data-testid="landing-proof-wall"
      >
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-end">
          <div>
            <SectionBadge>Proof Wall</SectionBadge>
            <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
              Measured by readiness, not revenue.
            </h2>
          </div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            The page should show what is true about the project right now: free
            posture, local-first runtime, guarded access, and verification
            proof. No invented customer logos. No sales theater.
          </p>
        </div>

        <div className="liquid-glass w-full rounded-3xl p-6 md:p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PROOF_WALL.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="text-4xl font-heading italic text-white md:text-5xl">
                  {item.value}
                </div>
                <div className="mt-3 text-sm font-medium text-white font-body">
                  {item.label}
                </div>
                <p className="mt-3 text-sm font-light leading-relaxed text-white/55 font-body">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3 border-t border-white/10 pt-6 md:grid-cols-3">
            {["Build proof", "Route health", "Handoff sync"].map(
              (proof, index) => (
                <div key={proof} className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full border border-white/15 text-xs text-white/60 font-body">
                    0{index + 1}
                  </span>
                  <span className="text-sm font-light text-white/60 font-body">
                    {proof}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </VideoSection>
  );
}

function Testimonials() {
  return (
    <section className="bg-black px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <SectionBadge>Field Notes</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] text-white md:text-5xl lg:text-6xl">
            What the room believes.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="liquid-glass rounded-2xl p-8"
            >
              <blockquote className="text-sm font-light italic leading-relaxed text-white/80 font-body">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-8">
                <div className="text-sm font-medium text-white font-body">
                  {testimonial.name}
                </div>
                <div className="mt-1 text-xs font-light text-white/50 font-body">
                  {testimonial.role}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function AccessForm({
  authError,
  failurePath,
  nextPath,
  show,
}: {
  authError?: "invalid" | "server" | null;
  failurePath: string;
  nextPath: string;
  show: boolean;
}) {
  const [hasTokenInput, setHasTokenInput] = useState(false);

  if (!show) return null;
  const status = authError
    ? AUTH_ERROR_COPY[authError]
    : hasTokenInput
      ? "Token staged locally. Submit when you are ready to open HQ."
      : "Local operator access uses your NEXUS_TOKEN and opens the requested room after validation.";

  return (
    <form
      id="agency-access"
      action="/auth/connect"
      className="liquid-glass mx-auto mt-10 flex max-w-3xl flex-col gap-4 rounded-[2rem] p-4 text-left md:p-5"
      data-testid="landing-auth-form"
      method="POST"
    >
      <div
        className="grid gap-3 md:grid-cols-3"
        data-testid="landing-access-ceremony"
      >
        {ACCESS_SEQUENCE.map((step, index) => (
          <div
            key={step}
            className={`rounded-2xl border p-3 ${
              index === 1 && hasTokenInput
                ? "border-white/35 bg-white/10"
                : "border-white/10 bg-black/20"
            }`}
          >
            <div className="text-xs text-white/35 font-body">0{index + 1}</div>
            <div className="mt-2 text-sm font-light leading-tight text-white/70 font-body">
              {step}
            </div>
          </div>
        ))}
      </div>
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="failureNext" value={failurePath} />
      <label
        className="px-2 text-xs font-medium text-white/70 font-body"
        htmlFor="agency-access-token"
      >
        Access token
      </label>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          id="agency-access-token"
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white outline-none font-body placeholder:text-white/35 focus:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          data-testid="landing-auth-token-input"
          name="token"
          onChange={(event) =>
            setHasTokenInput(event.currentTarget.value.length > 0)
          }
          placeholder="Paste NEXUS_TOKEN"
          required
          type="password"
        />
        <button
          className="liquid-glass-strong inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          data-testid="landing-auth-submit"
          type="submit"
        >
          Unlock HQ
          <ArrowUpRightIcon className="size-4" />
        </button>
      </div>
      <p
        className={`px-2 text-xs font-light font-body ${
          authError ? "text-red-200" : "text-white/50"
        }`}
        data-testid="landing-auth-status"
      >
        {status}
      </p>
    </form>
  );
}

function CtaFooter({
  accessHref,
  authEnabled,
  authError,
  isAuthenticated,
  nextPath = "/hq",
}: LandingPageProps & { accessHref: string }) {
  const failurePath = buildLandingFailurePath(nextPath);

  return (
    <VideoSection src={CTA_VIDEO_URL} minHeight="min-h-[760px]">
      <div
        id="access"
        className="mx-auto flex min-h-[760px] max-w-7xl flex-col justify-center px-6 py-28 text-center"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-5xl font-heading italic leading-[0.85] text-white md:text-6xl lg:text-7xl">
            Enter when you have the token.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            This is not a sales funnel. The landing is a threshold for a
            local-first MIT project: password in, HQ opens, authenticated
            operators continue directly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <ArrowButton href={accessHref}>Enter HQ</ArrowButton>
            <a
              href="/resources"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
            >
              Open Resources
            </a>
          </div>
          <AccessForm
            authError={authError}
            failurePath={failurePath}
            nextPath={nextPath}
            show={authEnabled && !isAuthenticated}
          />
        </div>

        <footer className="mt-32 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs font-light text-white/40 font-body">
              (c) 2026 Homefront. MIT local-first project.
            </p>
            <div className="flex items-center gap-6">
              {[
                { href: "/resources?view=impact", label: "System State" },
                { href: "/hq", label: "HQ" },
                { href: "/vault", label: "Vault" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs font-light text-white/40 font-body transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </VideoSection>
  );
}

export default function LandingPage({
  authEnabled,
  authError = null,
  isAuthenticated,
  nextPath = "/hq",
}: LandingPageProps) {
  const needsAccessForm = authEnabled && !isAuthenticated;
  const accessHref = needsAccessForm ? "#agency-access" : nextPath;

  return (
    <main
      id="nexus-main-content"
      tabIndex={-1}
      className="homefront-landing min-h-screen bg-black text-white"
      aria-label="Homefront local-first command intelligence landing"
      data-testid="landing-page"
    >
      <Navbar accessHref={accessHref} />
      <Hero accessHref={accessHref} />
      <div className="relative z-10 bg-black">
        <GuardianProtocolSection />
        <CapabilitySpineSection />
        <StartSection accessHref={accessHref} />
        <ArchitectureSection />
        <CommandContractSection />
        <SourceIntelligenceSection />
        <FeaturesChess accessHref={accessHref} />
        <AgentBenchSection />
        <FeaturesGrid />
        <OperatorFlowSection />
        <StatsSection />
        <Testimonials />
        <CtaFooter
          accessHref={accessHref}
          authEnabled={authEnabled}
          authError={authError}
          isAuthenticated={isAuthenticated}
          nextPath={nextPath}
        />
      </div>
    </main>
  );
}

function buildLandingFailurePath(nextPath: string) {
  if (!nextPath || nextPath === "/hq") return "/#agency-access";
  const params = new URLSearchParams({ next: nextPath });
  return `/?${params.toString()}#agency-access`;
}

function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

function PlayIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ZapIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

function PaletteIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 22a10 10 0 1 1 10-10 4 4 0 0 1-4 4h-1.5a2 2 0 0 0-1.6 3.2l.2.3A1.5 1.5 0 0 1 14 22z" />
    </svg>
  );
}

function BarChartIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 3v18h18" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-3" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z" />
    </svg>
  );
}

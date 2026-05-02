"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4";
const START_VIDEO_URL =
  "https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8";
const STATS_VIDEO_URL =
  "https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8";
const CTA_VIDEO_URL =
  "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";
const FEATURE_ONE_GIF =
  "https://motionsites.ai/assets/hero-finlytic-preview-CV9g0FHP.gif";
const FEATURE_TWO_GIF =
  "https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif";
const POSTER_IMAGE_URL = "/office/la-skyline.jpg";

const NAV_LINKS = ["Home", "Services", "Work", "Process", "Pricing"];
const PARTNERS = ["Stripe", "Vercel", "Linear", "Notion", "Figma"];

const FEATURE_ROWS = [
  {
    title: "Designed to convert. Built to perform.",
    body: "Every pixel is intentional. Our AI studies what works across thousands of top sites, then builds yours to outperform them all.",
    button: "Learn more",
    gif: FEATURE_ONE_GIF,
    reverse: false,
  },
  {
    title: "It gets smarter. Automatically.",
    body: "Your site evolves on its own. AI monitors every click, scroll, and conversion, then optimizes in real time. No manual updates. Ever.",
    button: "See how it works",
    gif: FEATURE_TWO_GIF,
    reverse: true,
  },
];

const WHY_US = [
  {
    icon: ZapIcon,
    title: "Days, Not Months",
    body: "Concept to launch at a pace that redefines fast. Because waiting isn't a strategy.",
  },
  {
    icon: PaletteIcon,
    title: "Obsessively Crafted",
    body: "Every detail considered. Every element refined. Design so precise, it feels inevitable.",
  },
  {
    icon: BarChartIcon,
    title: "Built to Convert",
    body: "Layouts informed by data. Decisions backed by performance. Results you can measure.",
  },
  {
    icon: ShieldIcon,
    title: "Secure by Default",
    body: "Enterprise-grade protection comes standard. SSL, DDoS mitigation, compliance. All included.",
  },
];

const STATS = [
  ["200+", "Sites launched"],
  ["98%", "Client satisfaction"],
  ["3.2x", "More conversions"],
  ["5 days", "Average delivery"],
];

const TESTIMONIALS = [
  {
    quote:
      "A complete rebuild in five days. The result outperformed everything we'd spent months building before.",
    name: "Sarah Chen",
    role: "CEO, Luminary",
  },
  {
    quote:
      "Conversions up 4x. That's not a typo. The design just works differently when it's built on real data.",
    name: "Marcus Webb",
    role: "Head of Growth, Arcline",
  },
  {
    quote:
      "They didn't just design our site. They defined our brand. World-class doesn't begin to cover it.",
    name: "Elena Voss",
    role: "Brand Director, Helix",
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
  delay = 100,
  text,
}: {
  className?: string;
  delay?: number;
  text: string;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");

  return (
    <h1 ref={ref} className={className}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          animate={
            inView
              ? { filter: "blur(0px)", opacity: 1, y: 0 }
              : undefined
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
      <ArrowUpRightIcon className="h-4 w-4" />
    </a>
  );
}

function LogoMark() {
  return (
    <div
      className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full"
      aria-label="Studio logo"
    >
      <span className="font-heading text-2xl italic leading-none text-white">
        S
      </span>
    </div>
  );
}

function LandingVisualSystem() {
  return (
    <style>{`
      @import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap");

      .agency-landing {
        --background: 213 45% 67%;
        --foreground: 0 0% 100%;
        --card: 213 45% 62%;
        --card-foreground: 0 0% 100%;
        --primary: 0 0% 100%;
        --primary-foreground: 213 45% 67%;
        --secondary: 213 45% 72%;
        --secondary-foreground: 0 0% 100%;
        --muted: 213 35% 60%;
        --muted-foreground: 0 0% 100% / 0.7;
        --accent: 213 45% 72%;
        --accent-foreground: 0 0% 100%;
        --destructive: 0 84.2% 60.2%;
        --border: 0 0% 100% / 0.2;
        --input: 0 0% 100% / 0.2;
        --ring: 0 0% 100% / 0.3;
        --radius: 9999px;
        --glass-bg: rgba(255, 255, 255, 0.12);
        --glass-border: rgba(255, 255, 255, 0.25);
        --glass-shadow: 0 4px 30px rgba(0, 0, 0, 0.08);
        --glass-blur: 16px;
      }

      .liquid-glass,
      .liquid-glass-strong {
        background: rgba(255, 255, 255, 0.01);
        background-blend-mode: luminosity;
        border: none;
        position: relative;
        overflow: hidden;
      }

      .liquid-glass {
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
      }

      .liquid-glass-strong {
        backdrop-filter: blur(50px);
        -webkit-backdrop-filter: blur(50px);
        box-shadow:
          4px 4px 4px rgba(0, 0, 0, 0.05),
          inset 0 1px 1px rgba(255, 255, 255, 0.15);
      }

      .liquid-glass::before,
      .liquid-glass-strong::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 1.4px;
        -webkit-mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
      }

      .liquid-glass::before {
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.45) 0%,
          rgba(255, 255, 255, 0.15) 20%,
          rgba(255, 255, 255, 0) 40%,
          rgba(255, 255, 255, 0) 60%,
          rgba(255, 255, 255, 0.15) 80%,
          rgba(255, 255, 255, 0.45) 100%
        );
      }

      .liquid-glass-strong::before {
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.5) 0%,
          rgba(255, 255, 255, 0.2) 20%,
          rgba(255, 255, 255, 0) 40%,
          rgba(255, 255, 255, 0) 60%,
          rgba(255, 255, 255, 0.2) 80%,
          rgba(255, 255, 255, 0.5) 100%
        );
      }
    `}</style>
  );
}

function Navbar({ accessHref }: { accessHref: string }) {
  return (
    <nav className="fixed left-0 right-0 top-4 z-50 px-8 py-3 lg:px-16">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <LogoMark />
        <div
          className="liquid-glass hidden items-center gap-1 rounded-full px-1.5 py-1 md:flex"
          data-testid="landing-header"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href={link === "Home" ? "#home" : `#${link.toLowerCase()}`}
              className="rounded-full px-3 py-2 text-sm font-medium text-white/90 font-body transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              {link}
            </a>
          ))}
          <a
            href={accessHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-black font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            data-testid="landing-header-cta"
          >
            Get Started
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero({ accessHref }: { accessHref: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="home"
      className="relative h-[1000px] overflow-visible bg-black"
      data-testid="landing-hero"
    >
      <video
        aria-hidden="true"
        autoPlay={!reduceMotion}
        className="absolute left-0 z-0 h-auto w-full object-contain"
        loop
        muted
        playsInline
        poster={POSTER_IMAGE_URL}
        preload="metadata"
        style={{ top: "20%" }}
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-0 bg-black/5" />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[300px]"
        style={{
          background: "linear-gradient(to bottom, transparent, black)",
        }}
      />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center px-6 pt-[150px] text-center">
        <div className="liquid-glass mb-8 inline-flex items-center gap-3 rounded-full px-1 py-1">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black font-body">
            New
          </span>
          <span className="pr-3 text-xs font-light text-white/80 font-body">
            Introducing AI-powered web design.
          </span>
        </div>

        <BlurText
          delay={100}
          text="The Website Your Brand Deserves"
          className="max-w-2xl text-6xl font-heading italic leading-[0.8] tracking-[-4px] text-white md:text-7xl lg:text-[5.5rem]"
        />

        <motion.p
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className="mt-8 max-w-xl text-sm font-light leading-tight text-white font-body md:text-base"
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Stunning design. Blazing performance. Built by AI, refined by
          experts. This is web design, wildly reimagined.
        </motion.p>

        <motion.div
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <ArrowButton dataTestId="landing-hero-cta" href={accessHref}>
            Get Started
          </ArrowButton>
          <a
            href="#process"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white font-body transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
          >
            <PlayIcon className="h-4 w-4 fill-white" />
            Watch the Film
          </a>
        </motion.div>

        <div className="mt-auto w-full pb-8 pt-16">
          <div className="mb-8 flex justify-center">
            <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-light text-white/75 font-body">
              Trusted by the teams behind
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
            {PARTNERS.map((partner) => (
              <span
                key={partner}
                className="text-2xl font-heading italic text-white md:text-3xl"
              >
                {partner}
              </span>
            ))}
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
        className="agency-video-bg absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-[200px]"
        style={{ background: "linear-gradient(to bottom, black, transparent)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[200px]"
        style={{ background: "linear-gradient(to top, black, transparent)" }}
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function StartSection({ accessHref }: { accessHref: string }) {
  return (
    <VideoSection src={START_VIDEO_URL}>
      <div
        id="process"
        className="mx-auto flex min-h-[500px] max-w-4xl flex-col items-center justify-center px-6 py-28 text-center"
      >
        <SectionBadge>How It Works</SectionBadge>
        <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] tracking-tight text-white md:text-5xl lg:text-6xl">
          You dream it. We ship it.
        </h2>
        <p className="mt-5 max-w-2xl text-sm font-light text-white/60 font-body md:text-base">
          Share your vision. Our AI handles the rest: wireframes, design, code,
          launch. All in days, not quarters.
        </p>
        <div className="mt-8">
          <ArrowButton href={accessHref}>Get Started</ArrowButton>
        </div>
      </div>
    </VideoSection>
  );
}

function FeaturesChess({ accessHref }: { accessHref: string }) {
  return (
    <section id="services" className="bg-black px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <SectionBadge>Capabilities</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] tracking-tight text-white md:text-5xl lg:text-6xl">
            Pro features. Zero complexity.
          </h2>
        </div>

        <div className="flex flex-col gap-16">
          {FEATURE_ROWS.map((feature) => (
            <div
              key={feature.title}
              className={`flex flex-col items-center gap-10 ${
                feature.reverse ? "lg:flex-row-reverse" : "lg:flex-row"
              }`}
            >
              <div className="flex-1">
                <h3 className="max-w-xl text-4xl font-heading italic leading-[0.95] tracking-tight text-white md:text-5xl">
                  {feature.title}
                </h3>
                <p className="mt-5 max-w-lg text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
                  {feature.body}
                </p>
                <div className="mt-8">
                  <ArrowButton href={accessHref}>{feature.button}</ArrowButton>
                </div>
              </div>
              <div className="liquid-glass flex-1 overflow-hidden rounded-2xl p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="aspect-[16/10] w-full rounded-[1rem] object-cover"
                  decoding="async"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={feature.gif}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section id="work" className="bg-black px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <SectionBadge>Why Us</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] tracking-tight text-white md:text-5xl lg:text-6xl">
            The difference is everything.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {WHY_US.map((item) => (
            <div key={item.title} className="liquid-glass rounded-2xl p-6">
              <div className="liquid-glass-strong mb-8 flex h-10 w-10 items-center justify-center rounded-full text-white">
                <item.icon className="h-5 w-5" />
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

function StatsSection() {
  return (
    <VideoSection src={STATS_VIDEO_URL} desaturated minHeight="min-h-[620px]">
      <div className="mx-auto flex min-h-[620px] max-w-7xl items-center px-6 py-28">
        <div className="liquid-glass w-full rounded-3xl p-12 md:p-16">
          <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-4">
            {STATS.map(([value, label]) => (
              <div key={label}>
                <div className="text-4xl font-heading italic text-white md:text-5xl lg:text-6xl">
                  {value}
                </div>
                <div className="mt-3 text-sm font-light text-white/60 font-body">
                  {label}
                </div>
              </div>
            ))}
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
          <SectionBadge>What They Say</SectionBadge>
          <h2 className="mt-5 text-4xl font-heading italic leading-[0.9] tracking-tight text-white md:text-5xl lg:text-6xl">
            Don&apos;t take our word for it.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <figure key={testimonial.name} className="liquid-glass rounded-2xl p-8">
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
  show,
}: {
  authError?: "invalid" | "server" | null;
  show: boolean;
}) {
  if (!show) return null;
  const status = authError
    ? AUTH_ERROR_COPY[authError]
    : "Local operator access uses your NEXUS_TOKEN and opens HQ after validation.";

  return (
    <form
      id="agency-access"
      action="/auth/connect"
      className="liquid-glass mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-[2rem] p-3 text-left"
      data-testid="landing-auth-form"
      method="POST"
    >
      <input type="hidden" name="next" value="/hq" />
      <input type="hidden" name="failureNext" value="/#agency-access" />
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
          <ArrowUpRightIcon className="h-4 w-4" />
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
}: LandingPageProps & { accessHref: string }) {
  return (
    <VideoSection src={CTA_VIDEO_URL} minHeight="min-h-[760px]">
      <div
        id="pricing"
        className="mx-auto flex min-h-[760px] max-w-7xl flex-col justify-center px-6 py-28 text-center"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-5xl font-heading italic leading-[0.85] tracking-tight text-white md:text-6xl lg:text-7xl">
            Your next website starts here.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm font-light leading-relaxed text-white/60 font-body md:text-base">
            Book a free strategy call. See what AI-powered design can do. No
            commitment, no pressure. Just possibilities.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <ArrowButton href={accessHref}>Book a Call</ArrowButton>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
            >
              View Pricing
            </a>
          </div>
          <AccessForm
            authError={authError}
            show={authEnabled && !isAuthenticated}
          />
        </div>

        <footer className="mt-32 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs font-light text-white/40 font-body">
              (c) 2026 Studio. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {["Privacy", "Terms", "Contact"].map((link) => (
                <a
                  key={link}
                  href="#home"
                  className="text-xs font-light text-white/40 font-body transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
                >
                  {link}
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
}: LandingPageProps) {
  const needsAccessForm = authEnabled && !isAuthenticated;
  const accessHref = needsAccessForm ? "#agency-access" : "/hq";

  return (
    <main
      className="agency-landing min-h-screen bg-black text-white"
      aria-label="AI-powered web design agency landing"
      data-testid="landing-page"
    >
      <LandingVisualSystem />
      <Navbar accessHref={accessHref} />
      <Hero accessHref={accessHref} />
      <div className="relative z-10 bg-black">
        <StartSection accessHref={accessHref} />
        <FeaturesChess accessHref={accessHref} />
        <FeaturesGrid />
        <StatsSection />
        <Testimonials />
        <CtaFooter
          accessHref={accessHref}
          authEnabled={authEnabled}
          authError={authError}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </main>
  );
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

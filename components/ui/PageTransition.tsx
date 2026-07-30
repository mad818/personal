// ── components/ui/PageTransition ───────────────────────────
// Framer Motion page transition animations and layout effects.

"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { useStore } from "@/store/useStore";
import {
  resolveEffectiveSurfaceMotionProfile,
  resolveSurfaceMotionSurface,
  resolveSurfaceSequencePreset,
  resolveSurfaceTransitionPreset,
  type SurfaceMotionProfile,
} from "@/lib/surfaceMotion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function PageTransition({
  children,
  className,
  style,
}: PageTransitionProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const surfaceMotionProfile = useStore(
    (state) =>
      (
        state.settings as typeof state.settings & {
          surfaceMotionProfile?: SurfaceMotionProfile;
        }
      ).surfaceMotionProfile ?? "flagship",
  );
  const surface = resolveSurfaceMotionSurface(pathname);
  const effectiveProfile = resolveEffectiveSurfaceMotionProfile(
    surfaceMotionProfile,
    Boolean(prefersReducedMotion),
  );
  const preset = resolveSurfaceTransitionPreset(surface, effectiveProfile);
  const sequence = resolveSurfaceSequencePreset(surface);
  const reduced = prefersReducedMotion || effectiveProfile === "reduced";
  const motionProps = {
    initial: reduced
      ? false
      : {
          opacity: 0,
          y: 10,
        },
    animate: {
      opacity: 1,
      y: 0,
    },
    transition: reduced
      ? { duration: 0 }
      : {
          duration: Math.min(0.28, preset.transition?.duration ?? 0.22),
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
  } as const;
  const mergedStyle = {
    ...style,
    "--nexus-sequence-hero-delay": `${sequence.heroDelayMs}ms`,
    "--nexus-sequence-primary-delay": `${sequence.primaryDelayMs}ms`,
    "--nexus-sequence-support-delay": `${sequence.supportDelayMs}ms`,
    "--nexus-sequence-continuity-delay": `${sequence.continuityDelayMs}ms`,
  } as CSSProperties;

  return (
    <motion.div
      key={pathname}
      initial={motionProps.initial}
      animate={motionProps.animate}
      transition={motionProps.transition}
      className={className}
      style={mergedStyle}
      data-nexus-ingress={sequence.ingress.kind}
    >
      {children}
    </motion.div>
  );
}

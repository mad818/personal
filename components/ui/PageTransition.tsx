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
  const motionProps = {
    initial: preset.initial,
    animate: preset.animate,
    exit: preset.exit,
    transition: preset.transition,
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
      {...(motionProps as any)}
      initial={false}
      className={className}
      style={mergedStyle}
      data-nexus-ingress={sequence.ingress.kind}
    >
      {children}
    </motion.div>
  );
}

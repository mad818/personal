"use client";

import { usePathname } from "next/navigation";
import { useEffect, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { useStore } from "@/store/useStore";
import {
  resolveEffectiveSurfaceMotionProfile,
  resolveSurfaceAtmosphereSpec,
  resolveSurfaceAmbientSpec,
  resolveSurfaceMotionSurface,
  resolveSurfaceSequencePreset,
} from "@/lib/surfaceMotion";

export default function ParticleBackground() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const surfaceMotionProfile = useStore(
    (state) => state.settings.surfaceMotionProfile ?? "flagship",
  );

  const surface = resolveSurfaceMotionSurface(pathname);
  const effectiveProfile = resolveEffectiveSurfaceMotionProfile(
    surfaceMotionProfile,
    Boolean(prefersReducedMotion),
  );
  const spec = resolveSurfaceAmbientSpec(surface);
  const atmosphere = resolveSurfaceAtmosphereSpec(surface);
  const sequence = resolveSurfaceSequencePreset(surface);

  useEffect(() => {
    document.documentElement.dataset.nexusMotionProfile = effectiveProfile;
    document.documentElement.dataset.nexusSurface = surface;
    document.documentElement.dataset.nexusIngress = sequence.ingress.kind;
    return () => {
      delete document.documentElement.dataset.nexusSurface;
      delete document.documentElement.dataset.nexusIngress;
    };
  }, [effectiveProfile, sequence.ingress.kind, surface]);

  return (
    <div
      aria-hidden="true"
      className="nexus-ambient"
      data-surface={surface}
      data-motion-profile={effectiveProfile}
      style={
        {
          "--nexus-ambient-haze": spec.haze,
          "--nexus-ambient-grid": spec.grid,
          "--nexus-ambient-sweep": spec.sweep,
          "--nexus-ambient-signals": spec.signals,
          "--nexus-ambient-ornament": spec.ornament,
          "--nexus-ambient-mobile-opacity": String(spec.mobileOpacity),
          "--nexus-atmosphere-haze-duration": `${atmosphere.hazeDurationSec}s`,
          "--nexus-atmosphere-grid-duration": `${atmosphere.gridDurationSec}s`,
          "--nexus-atmosphere-ornament-duration": `${atmosphere.ornamentDurationSec}s`,
          "--nexus-atmosphere-sweep-duration": `${atmosphere.sweepDurationSec}s`,
          "--nexus-atmosphere-world-opacity": `${atmosphere.worldOpacity}`,
          "--nexus-atmosphere-focus": atmosphere.spotlight,
        } as CSSProperties
      }
    >
      <div className="nexus-ambient__layer nexus-ambient__layer--world" />
      <div className="nexus-ambient__layer nexus-ambient__layer--focus" />
      <div className="nexus-ambient__layer nexus-ambient__layer--haze" />
      <div className="nexus-ambient__layer nexus-ambient__layer--grid" />
      <div className="nexus-ambient__layer nexus-ambient__layer--ornament" />
      <div className="nexus-ambient__layer nexus-ambient__layer--signals" />
      <div className="nexus-ambient__layer nexus-ambient__layer--sweep" />
    </div>
  );
}

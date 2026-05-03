"use client";

import { useEffect, useRef, useState } from "react";
import type { ArpgVfxSnapshot } from "@/lib/arpgVfx";
import {
  getArpgMotionDuration,
  loadOptionalGsapRuntime,
  loadOptionalPixiRuntime,
  type OptionalPixiContainer,
  type OptionalPixiGraphics,
} from "./arpgOptionalMotion";

interface ArpgPixiStageProps extends ArpgVfxSnapshot {
  motionIntensity: number;
}

type OverlayRenderer = "probing" | "pixi" | "canvas-fallback";

interface PixiLayers {
  ambient: OptionalPixiGraphics;
  burst: OptionalPixiContainer;
  oracle: OptionalPixiContainer;
}

function hexToNumber(color: string) {
  const normalized = color.replace("#", "").slice(0, 6);
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : 0xf4a261;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}

function drawFallbackFrame({
  canvas,
  snapshot,
  reducedMotion,
  elapsed,
  duration,
}: {
  canvas: HTMLCanvasElement;
  snapshot: ArpgPixiStageProps;
  reducedMotion: boolean;
  elapsed: number;
  duration: number;
}) {
  const context = canvas.getContext("2d");
  if (!context) return;
  resizeCanvas(canvas);

  const { width, height } = canvas;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
  const pulse = reducedMotion ? 0.25 : 0.55 + Math.sin(elapsed * 0.006) * 0.22;
  const accent = snapshot.accent;

  context.clearRect(0, 0, width, height);
  context.save();
  context.globalCompositeOperation = "screen";
  context.lineWidth = Math.max(1, width * 0.0016);
  context.strokeStyle = `rgba(255, 209, 102, ${0.08 + pulse * 0.08})`;
  context.beginPath();
  context.ellipse(cx, cy, width * 0.2, height * 0.18, -0.28, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = `${accent}55`;
  context.beginPath();
  context.ellipse(
    cx,
    cy,
    width * (0.12 + progress * 0.11),
    height * (0.1 + progress * 0.08),
    0.32,
    0,
    Math.PI * 2,
  );
  context.stroke();

  const particleCount = reducedMotion ? 5 : Math.round(10 + snapshot.intensity * 10);
  for (let index = 0; index < particleCount; index += 1) {
    const angle = (index / particleCount) * Math.PI * 2 + progress * 0.9;
    const radius = (width * 0.035 + index * 2.8) * (0.4 + progress);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * 0.52;
    const alpha = Math.max(0.08, 0.74 - progress * 0.62);
    context.fillStyle = index % 3 === 0 ? `${accent}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` : `rgba(255, 236, 190, ${alpha})`;
    context.beginPath();
    context.arc(x, y, Math.max(2, width * 0.0035), 0, Math.PI * 2);
    context.fill();
  }

  const oracleCount = snapshot.oracleLabel === "Standby oracle" ? 3 : 5;
  for (let index = 0; index < oracleCount; index += 1) {
    const x = width * (0.12 + index * 0.032);
    const y = height * 0.78 + Math.sin(elapsed * 0.004 + index) * (reducedMotion ? 0 : 5);
    context.fillStyle = index === 0 ? `${accent}cc` : "rgba(167, 243, 208, 0.5)";
    context.beginPath();
    context.arc(x, y, Math.max(2, width * 0.0038), 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function clearPixiLayer(layer: OptionalPixiContainer) {
  const children = layer.removeChildren?.() ?? [];
  for (const child of children) {
    (child as { destroy?: (options?: unknown) => void }).destroy?.();
  }
}

function drawPixiAmbient(
  layers: PixiLayers,
  Graphics: new () => OptionalPixiGraphics,
  width: number,
  height: number,
  accent: string,
) {
  layers.ambient.clear();
  layers.ambient
    .circle(width * 0.5, height * 0.5, Math.min(width, height) * 0.21)
    .stroke({ color: 0xffd166, alpha: 0.12, width: 2 });
  layers.ambient
    .circle(width * 0.5, height * 0.5, Math.min(width, height) * 0.12)
    .stroke({ color: hexToNumber(accent), alpha: 0.22, width: 2 });

  clearPixiLayer(layers.oracle);
  for (let index = 0; index < 5; index += 1) {
    const pip = new Graphics();
    pip
      .circle(0, 0, 4 + index * 0.4)
      .fill({ color: index === 0 ? hexToNumber(accent) : 0xa7f3d0, alpha: 0.58 });
    pip.x = width * (0.12 + index * 0.032);
    pip.y = height * 0.78;
    layers.oracle.addChild(pip);
  }
}

function ArpgPixiStage({
  eventKey,
  kind,
  accent,
  intensity,
  label,
  oracleLabel,
  reducedMotion,
  motionIntensity,
}: ArpgPixiStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixiLayersRef = useRef<PixiLayers | null>(null);
  const pixiGraphicsRef = useRef<(new () => OptionalPixiGraphics) | null>(null);
  const [renderer, setRenderer] = useState<OverlayRenderer>("probing");
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveReducedMotion = reducedMotion || prefersReducedMotion;

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const mountPixi = async () => {
      const host = hostRef.current;
      if (!host) return;
      const pixi = await loadOptionalPixiRuntime();
      if (cancelled || !pixi) {
        setRenderer("canvas-fallback");
        return;
      }

      try {
        const app = new pixi.Application();
        await app.init({
          antialias: true,
          autoDensity: true,
          backgroundAlpha: 0,
          resizeTo: host,
          resolution: Math.min(window.devicePixelRatio || 1, 1.5),
        });
        if (cancelled) {
          app.destroy(true);
          return;
        }

        app.canvas?.setAttribute("data-testid", "arpg-pixi-canvas");
        app.canvas?.setAttribute("aria-hidden", "true");
        if (app.canvas) {
          app.canvas.style.width = "100%";
          app.canvas.style.height = "100%";
          app.canvas.style.pointerEvents = "none";
          host.appendChild(app.canvas);
        }

        const ambient = new pixi.Graphics();
        const burst = new pixi.Container();
        const oracle = new pixi.Container();
        app.stage.addChild(ambient, burst, oracle);
        pixiLayersRef.current = { ambient, burst, oracle };
        pixiGraphicsRef.current = pixi.Graphics;
        setRenderer("pixi");

        cleanup = () => {
          pixiLayersRef.current = null;
          pixiGraphicsRef.current = null;
          app.destroy(true, { children: true });
        };
      } catch {
        setRenderer("canvas-fallback");
      }
    };

    void mountPixi();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const canvas = fallbackCanvasRef.current;
    if (!canvas || renderer === "pixi") return;
    let frame = 0;
    let start = performance.now();
    const duration = effectiveReducedMotion ? 80 : 980;
    const snapshot = {
      eventKey,
      kind,
      accent,
      intensity,
      label,
      oracleLabel,
      reducedMotion,
      motionIntensity,
    };

    const draw = (time: number) => {
      const elapsed = time - start;
      drawFallbackFrame({
        canvas,
        snapshot,
        reducedMotion: effectiveReducedMotion,
        elapsed,
        duration,
      });
      if (!effectiveReducedMotion || elapsed < duration) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    start = performance.now();
    frame = window.requestAnimationFrame(draw);
    const observer = new ResizeObserver(() =>
      drawFallbackFrame({
        canvas,
        snapshot,
        reducedMotion: effectiveReducedMotion,
        elapsed: duration,
        duration,
      }),
    );
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    accent,
    effectiveReducedMotion,
    eventKey,
    intensity,
    kind,
    label,
    motionIntensity,
    oracleLabel,
    reducedMotion,
    renderer,
  ]);

  useEffect(() => {
    const layers = pixiLayersRef.current;
    const Graphics = pixiGraphicsRef.current;
    const host = hostRef.current;
    if (!layers || !Graphics || !host || renderer !== "pixi") return;

    const rect = host.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    drawPixiAmbient(layers, Graphics, width, height, accent);
    clearPixiLayer(layers.burst);

    const duration = getArpgMotionDuration(effectiveReducedMotion, 0.82);
    const count = effectiveReducedMotion ? 4 : Math.round(8 + intensity * 10);
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    void loadOptionalGsapRuntime().then((runtime) => {
      for (let index = 0; index < count; index += 1) {
        const particle = new Graphics();
        particle.circle(0, 0, 3.2 + (index % 3)).fill({
          color: index % 2 ? hexToNumber(accent) : 0xffedbd,
          alpha: 0.76,
        });
        particle.x = centerX;
        particle.y = centerY;
        particle.scale.set(0.8);
        layers.burst.addChild(particle);

        const angle = (index / count) * Math.PI * 2;
        const distance = Math.min(width, height) * (0.1 + intensity * 0.1);
        const targetX = centerX + Math.cos(angle) * distance;
        const targetY = centerY + Math.sin(angle) * distance * 0.54;

        if (runtime?.gsap.to) {
          runtime.gsap.to(particle, {
            x: targetX,
            y: targetY,
            alpha: 0,
            duration,
            ease: "power2.out",
            onComplete: () => particle.destroy?.(),
          });
          runtime.gsap.to(particle.scale, {
            x: 1.9,
            y: 1.9,
            duration,
            ease: "power2.out",
          });
        } else {
          particle.x = targetX;
          particle.y = targetY;
          particle.alpha = effectiveReducedMotion ? 0.25 : 0.64;
        }
      }
    });
  }, [accent, effectiveReducedMotion, eventKey, intensity, renderer]);

  return (
    <div
      ref={hostRef}
      data-testid="arpg-pixi-stage"
      data-vfx-kind={kind}
      data-vfx-event={eventKey}
      data-vfx-label={label}
      data-oracle={oracleLabel}
      data-renderer={renderer}
      data-reduced-motion={effectiveReducedMotion ? "true" : "false"}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 24,
        overflow: "hidden",
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    >
      <canvas
        ref={fallbackCanvasRef}
        data-testid="arpg-pixi-fallback-canvas"
        style={{
          display: renderer === "pixi" ? "none" : "block",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default ArpgPixiStage;

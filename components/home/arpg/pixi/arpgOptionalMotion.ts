"use client";

export interface OptionalGsapRuntime {
  gsap: {
    fromTo?: (
      targets: unknown,
      fromVars: Record<string, unknown>,
      toVars: Record<string, unknown>,
    ) => unknown;
    to?: (targets: unknown, vars: Record<string, unknown>) => unknown;
    set?: (targets: unknown, vars: Record<string, unknown>) => unknown;
    registerPlugin?: (...plugins: unknown[]) => void;
  };
  pixiPluginAvailable: boolean;
}

export interface OptionalPixiContainer {
  x: number;
  y: number;
  alpha: number;
  rotation: number;
  scale: {
    x: number;
    y: number;
    set: (value: number) => void;
  };
  addChild: (...children: unknown[]) => unknown;
  removeChildren?: () => unknown[];
  destroy?: (options?: unknown) => void;
}

export interface OptionalPixiGraphics extends OptionalPixiContainer {
  circle: (x: number, y: number, radius: number) => OptionalPixiGraphics;
  rect: (x: number, y: number, width: number, height: number) => OptionalPixiGraphics;
  fill: (style: { color: number; alpha?: number } | number) => OptionalPixiGraphics;
  stroke: (style: { color: number; alpha?: number; width?: number }) => OptionalPixiGraphics;
  clear: () => OptionalPixiGraphics;
}

export interface OptionalPixiApplication {
  canvas?: HTMLCanvasElement;
  stage: OptionalPixiContainer;
  init: (options: Record<string, unknown>) => Promise<void>;
  destroy: (removeView?: boolean, options?: unknown) => void;
}

export interface OptionalPixiRuntime {
  Application: new () => OptionalPixiApplication;
  Container: new () => OptionalPixiContainer;
  Graphics: new () => OptionalPixiGraphics;
}

let gsapPromise: Promise<OptionalGsapRuntime | null> | null = null;
let pixiPromise: Promise<OptionalPixiRuntime | null> | null = null;

function readGlobal<T>(key: string): T | null {
  const candidate = (globalThis as Record<string, unknown>)[key];
  return candidate ? (candidate as T) : null;
}

export function getArpgMotionDuration(
  reducedMotion: boolean,
  duration: number,
) {
  return reducedMotion ? 0.01 : duration;
}

export function loadOptionalGsapRuntime() {
  if (!gsapPromise) {
    gsapPromise = (async () => {
      const gsap = readGlobal<OptionalGsapRuntime["gsap"]>("gsap");
      if (!gsap) return null;

      let pixiPluginAvailable = false;
      const pixiModule = readGlobal<OptionalPixiRuntime>("PIXI");
      const pixiPlugin = readGlobal<{ registerPIXI?: (pixi: unknown) => void }>(
        "PixiPlugin",
      );
      if (pixiModule && pixiPlugin && gsap.registerPlugin) {
        pixiPlugin.registerPIXI?.(pixiModule);
        gsap.registerPlugin(pixiPlugin);
        pixiPluginAvailable = true;
      }

      return { gsap, pixiPluginAvailable };
    })();
  }

  return gsapPromise;
}

export function loadOptionalPixiRuntime() {
  if (!pixiPromise) {
    pixiPromise = (async () => {
      const pixiModule = readGlobal<Partial<OptionalPixiRuntime>>("PIXI");
      if (
        pixiModule?.Application &&
        pixiModule.Container &&
        pixiModule.Graphics
      ) {
        return pixiModule as OptionalPixiRuntime;
      }
      return null;
    })();
  }

  return pixiPromise;
}

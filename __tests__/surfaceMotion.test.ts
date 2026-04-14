import { describe, expect, it } from "vitest";
import {
  resolveSurfaceAtmosphereSpec,
  resolveChronicleMotionPreset,
  resolveEffectiveOfficeMotion,
  resolveEffectiveOfficeVfxQuality,
  resolveEffectiveSurfaceMotionProfile,
  resolveSurfaceAmbientSpec,
  resolveSurfaceHeroMediaSpec,
  resolveSurfaceMotionSurface,
  resolveOfficeSceneCue,
  resolveSurfaceSequencePreset,
  resolveSurfaceSignalMotionSpec,
  resolveSurfaceTransitionPreset,
} from "@/lib/surfaceMotion";

describe("surface motion", () => {
  it("maps app routes into the correct surface motion sectors", () => {
    expect(resolveSurfaceMotionSurface("/hq")).toBe("hq");
    expect(resolveSurfaceMotionSurface("/command")).toBe("command");
    expect(resolveSurfaceMotionSurface("/intel")).toBe("intel");
    expect(resolveSurfaceMotionSurface("/resources?view=study")).toBe(
      "resources",
    );
    expect(resolveSurfaceMotionSurface("/security")).toBe("cyber");
  });

  it("falls back to reduced motion when the platform asks for it", () => {
    expect(
      resolveEffectiveSurfaceMotionProfile("flagship", true),
    ).toBe("reduced");
    expect(
      resolveEffectiveSurfaceMotionProfile("standard", false),
    ).toBe("standard");
  });

  it("returns ambient, atmosphere, transition, sequence, hero, and signal specs for every GA surface", () => {
    for (const surface of [
      "hq",
      "command",
      "intel",
      "alpha",
      "cyber",
      "recon",
      "vault",
      "resources",
    ] as const) {
      const ambient = resolveSurfaceAmbientSpec(surface);
      const atmosphere = resolveSurfaceAtmosphereSpec(surface);
      const transition = resolveSurfaceTransitionPreset(surface, "flagship");
      const sequence = resolveSurfaceSequencePreset(surface);
      const hero = resolveSurfaceHeroMediaSpec(surface);
      const signal = resolveSurfaceSignalMotionSpec(surface);

      expect(ambient.surface).toBe(surface);
      expect(ambient.haze.length).toBeGreaterThan(0);
      expect(atmosphere.surface).toBe(surface);
      expect(atmosphere.spotlight.length).toBeGreaterThan(0);
      expect(hero.surface).toBe(surface);
      expect(hero.composition.length).toBeGreaterThan(0);
      expect(sequence.surface).toBe(surface);
      expect(sequence.heroDelayMs).toBeLessThan(sequence.primaryDelayMs);
      expect(sequence.primaryDelayMs).toBeLessThan(sequence.supportDelayMs);
      expect(sequence.supportDelayMs).toBeLessThan(sequence.continuityDelayMs);
      expect(signal.surface).toBe(surface);
      expect(signal.navBeamMs).toBeGreaterThan(0);
      expect(transition.initial.opacity).toBeLessThan(1);
      expect(transition.transition.duration).toBeGreaterThan(0);
    }
  });

  it("makes the global motion profile the master gate for HQ effects", () => {
    expect(resolveEffectiveOfficeVfxQuality("reduced", "high")).toBe("off");
    expect(resolveEffectiveOfficeVfxQuality("standard", "high")).toBe("low");
    expect(resolveEffectiveOfficeMotion("reduced", 1)).toBe(0);
    expect(resolveEffectiveOfficeMotion("flagship", 0.8)).toBe(0.8);
  });

  it("returns bounded chronicle presets for each motion profile", () => {
    expect(resolveChronicleMotionPreset("reduced").shell).toBe("reduced");
    expect(resolveChronicleMotionPreset("flagship").replyDurationMs).toBeGreaterThan(
      resolveChronicleMotionPreset("standard").replyDurationMs,
    );
    expect(resolveChronicleMotionPreset("flagship").orderDurationMs).toBeGreaterThan(0);
    expect(resolveChronicleMotionPreset("standard").bandIntervalMs).toBeGreaterThan(0);
  });

  it("maps HQ state into a room cue that respects the motion profile", () => {
    const reducedCue = resolveOfficeSceneCue({
      profile: "reduced",
      missionState: "handoff",
      commandTempo: "Compressed",
      frontTone: "warning",
      dispatchActive: true,
    });
    const flagshipCue = resolveOfficeSceneCue({
      profile: "flagship",
      missionState: "executing",
      commandTempo: "Critical",
      frontTone: "critical",
      dispatchActive: true,
      activeAgentColor: "#67e8f9",
    });

    expect(flagshipCue.lightingEmphasis).toBeGreaterThan(
      reducedCue.lightingEmphasis,
    );
    expect(flagshipCue.dispatchEmphasis).toBeGreaterThan(
      reducedCue.dispatchEmphasis,
    );
    expect(flagshipCue.accentColor).toBe("#67e8f9");
    expect(flagshipCue.cameraDrift).toBeGreaterThan(reducedCue.cameraDrift);
    expect(flagshipCue.shadowContrast).toBeGreaterThanOrEqual(reducedCue.shadowContrast);
    expect(flagshipCue.alertWash).toBeGreaterThanOrEqual(reducedCue.alertWash);
  });
});

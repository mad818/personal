import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  waitForCanonicalUrl,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedShell(page);
});

async function settleShell(
  page: Page,
  testInfo: TestInfo,
  mode: "shell" | "hq" = "shell",
) {
  await waitForAuthenticatedShell(page, testInfo, {
    anchorTestId: mode === "hq" ? "hq-console-shell" : undefined,
  });
}

async function openHqChat(page: Page) {
  await page.getByTestId("hq-focus-chat").click();
  await expect(page.getByTestId("hq-chat-panel")).toBeVisible();
  await expect(page.getByTestId("hq-command-input")).toBeVisible();
}

async function openHqGame(page: Page) {
  await page.getByTestId("hq-focus-game").click();
  await expect(page.getByTestId("arpg-room")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("hq-game-layout-tools")).toBeVisible();
}

async function expectStyledShell(page: Page, mode: "shell" | "hq" = "shell") {
  const posture = await page.evaluate((expectedMode) => {
    const toprail = document.querySelector<HTMLElement>(".nexus-toprail");
    const main = document.querySelector<HTMLElement>("main");
    const hqShell = document.querySelector(".nexus-hq-shell");
    return {
      toprailPosition: toprail ? window.getComputedStyle(toprail).position : "missing",
      mainPaddingTop: main ? window.getComputedStyle(main).paddingTop : "0px",
      mainCinematicIA: main?.getAttribute("data-cinematic-ia") ?? "missing",
      mainCinematicSurface: main?.getAttribute("data-cinematic-surface") ?? "missing",
      mainCinematicHierarchy:
        main?.getAttribute("data-cinematic-hierarchy") ?? "missing",
      hasHQShell: expectedMode === "hq" ? Boolean(hqShell) : true,
    };
  }, mode);

  expect(posture.toprailPosition).toBe("fixed");
  expect(Number.parseFloat(posture.mainPaddingTop)).toBeGreaterThan(60);
  expect(posture.mainCinematicIA).toBe("cinematic-ia-v1");
  expect(posture.mainCinematicSurface).toBe("hq");
  expect(posture.mainCinematicHierarchy).toBe("lead-support-continuity");
  expect(posture.hasHQShell).toBeTruthy();
}

test("hq shell stays interactive without hydration regressions", async ({
  page,
}, testInfo) => {
  const issues: string[] = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      msg.type() === "error" ||
      /hydration|Text content does not match server-rendered HTML/i.test(text)
    ) {
      issues.push(`console:${text}`);
    }
  });
  page.on("pageerror", (error) => {
    issues.push(`pageerror:${error.message}`);
  });

  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");
  await expectStyledShell(page, "hq");

  await expect(page.getByTestId("toprail-brand")).toBeVisible();
  await expect(
    page.locator('.nexus-shell-stage--hq[data-cinematic-ia="cinematic-ia-v1"]'),
  ).toBeVisible();
  await expect(page.getByTestId("homefront-visual-parity")).toBeVisible();
  await expect(page.getByTestId("homefront-visual-parity")).toHaveAttribute(
    "data-surface",
    "hq",
  );
  await expect(page.getByTestId("homefront-visual-parity")).toHaveAttribute(
    "data-interior-polish",
    "true",
  );
  await expect(page.getByTestId("homefront-surface-module")).toBeVisible();
  await expect(page.getByTestId("homefront-workplane-summary")).toHaveCount(0);
  await waitForCanonicalUrl(page, (url) => {
    expect(url.pathname).toBe("/hq");
  });
  await expect(page.getByTestId("toprail-settings")).toBeVisible();
  await expect(page.getByTestId("toprail-notifications")).toBeVisible();

  const hydrationIssues = issues.filter((entry) =>
    /hydration|Text content does not match server-rendered HTML/i.test(entry),
  );

  expect(hydrationIssues).toEqual([]);
});

test("hq arpg room exposes a playable reliquary loop without blocking command input", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");

  await openHqChat(page);
  await expect(page.getByTestId("arpg-room")).toHaveCount(0);
  await openHqGame(page);
  await expect(page.getByTestId("hq-focus-game")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("hq-room-mode-arpg").click();
  await expect(page.getByTestId("arpg-room")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("arpg-room")).toHaveAttribute("data-renderer", "phaser");
  await expect(page.getByTestId("arpg-phaser-game")).toBeVisible();
  await expect(page.getByTestId("arpg-phaser-canvas")).toBeVisible();
  await expect(page.getByTestId("arpg-hud")).toBeVisible();
  await expect(
    page
      .getByTestId("arpg-room")
      .locator('[data-testid="homefront-visual-parity"]'),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId("arpg-room")
      .locator('[data-testid="homefront-workplane-summary"]'),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("arpg-room").locator('[data-interior-polish="true"]'),
  ).toHaveCount(0);
  await expect(page.getByTestId("arpg-hud")).toHaveAttribute("data-density", "compact");
  await expect(page.getByTestId("arpg-stage-size-controls")).toBeVisible();
  await page.getByTestId("arpg-size-compact").click();
  await expect(page.getByTestId("hq-arpg-stage")).toHaveAttribute(
    "data-game-size",
    "compact",
  );
  await expect(page.getByTestId("arpg-playfield-frame")).toHaveAttribute(
    "data-game-size",
    "compact",
  );
  const compactPlayfieldHeight = await page
    .getByTestId("arpg-playfield-frame")
    .evaluate((node) => node.getBoundingClientRect().height);
  await page.getByTestId("arpg-size-large").click();
  await expect(page.getByTestId("hq-arpg-stage")).toHaveAttribute(
    "data-game-size",
    "large",
  );
  await expect(page.getByTestId("arpg-playfield-frame")).toHaveAttribute(
    "data-game-size",
    "large",
  );
  await expect
    .poll(async () =>
      page
        .getByTestId("arpg-playfield-frame")
        .evaluate((node) => node.getBoundingClientRect().height),
    )
    .toBeGreaterThan(compactPlayfieldHeight + 40);
  await page.getByTestId("arpg-size-standard").click();
  await page.getByTestId("hq-reset-layout").click();
  await expect(page.getByTestId("hq-arpg-stage")).toHaveAttribute(
    "data-game-size",
    "focus",
  );
  await expect(page.getByTestId("hq-game-resize-handle")).toBeVisible();
  await expect(page.getByTestId("hq-game-resize-top-handle")).toBeVisible();
  await expect(page.getByTestId("hq-game-size-slider")).toBeVisible();
  const focusStageHeight = await page
    .getByTestId("hq-arpg-stage")
    .evaluate((node) => node.getBoundingClientRect().height);
  await page.getByTestId("hq-game-size-slider").press("ArrowRight");
  await expect
    .poll(async () =>
      page
        .getByTestId("hq-arpg-stage")
        .evaluate((node) => node.getBoundingClientRect().height),
    )
    .toBeGreaterThan(focusStageHeight);
  const sliderStageHeight = await page
    .getByTestId("hq-arpg-stage")
    .evaluate((node) => node.getBoundingClientRect().height);
  await page.getByTestId("hq-game-resize-top-handle").focus();
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(async () =>
      page
        .getByTestId("hq-arpg-stage")
        .evaluate((node) => node.getBoundingClientRect().height),
    )
    .toBeLessThan(sliderStageHeight);
  await expect(page.getByTestId("hq-game-custom-size-chip")).toBeVisible();
  await page.getByTestId("hq-game-resize-handle").press("KeyR");
  await expect(page.getByTestId("hq-game-custom-size-chip")).toHaveCount(0);
  await page.getByTestId("hq-lock-split").click();
  await expect(page.getByTestId("hq-lock-split")).toContainText("UNLOCK SIZE");
  await expect(page.getByTestId("hq-game-resize-handle")).toHaveAttribute(
    "data-locked",
    "true",
  );
  await expect(page.getByTestId("arpg-loadout")).toContainText("Loadout");
  await expect(page.getByTestId("arpg-loadout")).toContainText("off");
  await expect(page.getByTestId("arpg-loadout")).toContainText("cha");
  await expect(page.getByTestId("arpg-ai-indicators")).toContainText("Oracle");
  await expect(page.getByTestId("arpg-context-prompt")).toBeVisible();
  const vfxStage = page.getByTestId("arpg-pixi-stage");
  await expect(vfxStage).toBeVisible();
  await expect(vfxStage).toHaveAttribute("data-renderer", /pixi|canvas-fallback/);
  await expect(vfxStage).toHaveAttribute("data-vfx-kind", /ambient|loot|equip|hit|objective|oracle/);
  await expect
    .poll(async () =>
      vfxStage.evaluate((node) => window.getComputedStyle(node).pointerEvents),
    )
    .toBe("none");
  await expect(page.getByTestId("arpg-drawer")).toHaveCount(0);
  await expect(page.getByTestId("arpg-browser-rpg-panel")).toBeVisible();
  await expect(page.getByTestId("arpg-browser-rpg-panel")).toContainText("Click RPG");
  await expect(page.getByTestId("arpg-runtime-hero-kit-strip")).toBeVisible();
  await expect(page.getByTestId("arpg-loadout-icon-weapon")).toBeVisible();
  await expect(page.getByTestId("arpg-hotbar-icon-1")).toBeVisible();
  await page.getByTestId("arpg-adventure-panel-open").click();
  await expect(page.getByTestId("arpg-adventure-drawer")).toContainText("World map");
  await expect(page.getByTestId("arpg-adventure-location-art")).toBeVisible();
  await expect(page.getByTestId("arpg-adventure-presentation-cue")).toContainText(
    "Presentation cue",
  );
  await expect(page.getByTestId("arpg-adventure-presentation-cue")).toContainText(
    "Low flash",
  );
  await expect(page.getByTestId("arpg-adventure-drawer")).toContainText("Encounter");
  await expect(page.getByTestId("arpg-adventure-enemy-art")).toBeVisible();
  await expect(page.getByTestId("arpg-adventure-loot-art")).toBeVisible();
  await page.getByTestId("arpg-adventure-fight").click();
  await expect(page.getByTestId("arpg-damage-number")).toContainText(/\d+/);
  await page.getByTestId("arpg-adventure-travel").click();
  await expect(page.getByTestId("arpg-adventure-drawer")).toContainText(/World map|Road event/i);
  await page.getByTestId("arpg-adventure-toggle").click();
  await page.getByTestId("arpg-credits-toggle").click();
  await expect(page.getByTestId("arpg-illustrated-asset-bench")).toContainText(
    "Illustrated 2D asset bench",
  );
  await expect(page.getByTestId("arpg-illustrated-asset-bench")).toContainText(
    "98 approved frames",
  );
  await expect(page.getByTestId("arpg-illustrated-preview-grid")).toBeVisible();
  await expect(page.getByTestId("arpg-illustrated-batch-illustrated-character-portrait-seeds")).toContainText(
    "3 character portrait",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-illustrated-enemy-card-seeds")).toContainText(
    "4 enemy card",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-illustrated-location-card-seeds")).toContainText(
    "3 location card",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-illustrated-gear-icon-seeds")).toContainText(
    "8 gear icon",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-illustrated-skill-vfx-icon-seeds")).toContainText(
    "6 skill icon",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-hero-kit-character-portraits")).toContainText(
    "3 character portrait",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-hero-kit-class-outfits")).toContainText(
    "3 outfit card",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-hero-kit-weapons-items")).toContainText(
    "12 gear icon",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-hero-kit-armor-equipment")).toContainText(
    "8 gear icon",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-arsenal-weapon-family-icons")).toContainText(
    "21 gear icon",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-arsenal-quality-overlays")).toContainText(
    "7 gear icon",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-arsenal-named-weapon-cards")).toContainText(
    "8 gear icon",
  );
  await expect(page.getByTestId("arpg-illustrated-batch-arsenal-vfx-drops")).toContainText(
    "12 fx sheet",
  );
  await expect(page.getByTestId("arpg-visual-replacement-queue")).toContainText(
    "Replacement queue",
  );
  await expect(page.getByTestId("arpg-visual-replacement-queue")).toContainText(
    "prologue-hifi-story-pack",
  );
  await expect(page.getByTestId("arpg-visual-replacement-queue")).toContainText(
    "rejected prologue sheets are retired",
  );
  await expect(page.getByTestId("arpg-real-asset-intake")).toContainText(
    "Real asset intake",
  );
  await expect(page.getByTestId("arpg-real-asset-intake")).toContainText(
    "Awaiting imported CC0 assets",
  );
  await expect(page.getByTestId("arpg-real-asset-intake")).toContainText(
    "Quaternius",
  );
  await expect(page.getByTestId("arpg-real-model-preview")).toContainText(
    "Blocked until",
  );
  await expect(page.getByTestId("arpg-generator-policy")).toContainText(
    "GPT Image 2",
  );
  await expect(page.getByTestId("arpg-sprite-tool-candidates")).toContainText(
    "Agent Sprite Forge",
  );
  await expect(page.getByTestId("arpg-sprite-tool-candidates")).toContainText(
    "Pixel Snapper",
  );
  await page.getByTestId("arpg-credits-toggle").click();
  await page.getByTestId("arpg-hero-toggle").click();
  await expect(page.getByTestId("arpg-hero-kit-preview")).toBeVisible();
  await expect(page.getByTestId("arpg-hero-class-art-wardbreaker")).toBeVisible();
  await page.getByTestId("arpg-hero-toggle").click();
  await page.getByTestId("arpg-inventory-toggle").click();
  await expect(page.getByTestId("arpg-hero-kit-inventory-art")).toBeVisible();
  await expect(page.getByTestId("arpg-arsenal-grid")).toContainText("21 families");
  await expect(page.getByTestId("arpg-arsenal-quality-row")).toContainText("Mythic +7");
  await page.getByTestId("arpg-claim-arsenal-weapon").click();
  await expect(page.getByTestId("arpg-equip-veyrhold-banner-spear")).toBeVisible();
  await page.getByTestId("arpg-inventory-toggle").click();
  await page.getByTestId("arpg-armory-toggle").click();
  await expect(page.getByTestId("arpg-hero-kit-armory-art")).toBeVisible();
  await expect(page.getByTestId("arpg-arsenal-named-cards")).toContainText("8 samples");
  await expect(page.getByTestId("arpg-arsenal-vfx-row")).toContainText("Rare loot beam");
  await page.getByTestId("arpg-armory-toggle").click();
  await page.getByTestId("arpg-production-toggle").click();
  await expect(page.getByTestId("arpg-production-drawer")).toContainText("MW6");
  await expect(page.getByTestId("arpg-production-drawer")).toContainText(
    "Parent still open",
  );
  await expect(page.getByTestId("arpg-production-readiness")).toContainText(
    "Licenses 4",
  );
  await expect(page.getByTestId("arpg-production-readiness")).toContainText(
    "Save slots 3",
  );
  await expect(page.getByTestId("arpg-production-readiness")).toContainText(
    "Menus 14",
  );
  await expect(page.getByTestId("arpg-production-readiness")).toContainText(
    "Save checks 4",
  );
  await expect(page.getByTestId("arpg-production-readiness")).toContainText(
    "Balance 8",
  );
  await expect(page.getByTestId("arpg-production-readiness")).toContainText(
    "Release flows 19",
  );
  await expect(page.getByTestId("arpg-production-readiness")).toContainText(
    "Fallback proof 4",
  );
  await expect(page.getByTestId("arpg-fallback-proof-matrix")).toContainText(
    "Fallback proof matrix",
  );
  await expect(page.getByTestId("arpg-fallback-proof-browser-fallback-route-proof")).toContainText(
    "Browser fallback route proof",
  );
  await expect(page.getByTestId("arpg-presentation-readiness")).toContainText(
    "Presentation 6",
  );
  await expect(page.getByTestId("arpg-presentation-readiness")).toContainText(
    "No rejected prologue art",
  );
  await expect(page.getByTestId("arpg-visual-replacement-readiness")).toContainText(
    "Visual replacement lane",
  );
  await expect(page.getByTestId("arpg-visual-replacement-readiness")).toContainText(
    "10 queued",
  );
  await expect(page.getByTestId("arpg-visual-replacement-bellroot-vestibule")).toContainText(
    "Bellroot Vestibule",
  );
  await expect(page.getByTestId("arpg-production-large-chunk")).toContainText(
    "arpg:release:check",
  );
  await expect(page.getByTestId("arpg-balance-playtest")).toContainText(
    "MW6 Aether Reliquary balance",
  );
  await expect(page.getByTestId("arpg-balance-playtest")).toContainText(
    "arpg:balance:check",
  );
  await expect(page.getByTestId("arpg-balance-playtest")).toContainText(
    "Checklist 20",
  );
  await expect(page.getByTestId("arpg-balance-session-prologue")).toContainText(
    "Prologue onboarding",
  );
  await expect(page.getByTestId("arpg-balance-class-wardbreaker")).toContainText(
    "Hearth Vanguard",
  );
  await expect(page.getByTestId("arpg-balance-city-veyrhold")).toContainText(
    "Veyrhold",
  );
  await expect(page.getByTestId("arpg-balance-final-boss")).toContainText(
    "The Hollow Regent",
  );
  await expect(page.getByTestId("arpg-content-tools")).toContainText(
    "MW6 Aether Reliquary content tools",
  );
  await expect(page.getByTestId("arpg-content-tools")).toContainText(
    "arpg:tools:check",
  );
  await expect(page.getByTestId("arpg-content-tool-registry-cities")).toContainText(
    "Major cities",
  );
  await expect(page.getByTestId("arpg-content-tool-helper-zone-scaffold")).toContainText(
    "Zone scaffold",
  );
  await expect(page.getByTestId("arpg-menu-index")).toContainText(
    "Start / Continue",
  );
  await expect(page.getByTestId("arpg-menu-index")).toContainText(
    "Save recovery",
  );
  await expect(page.getByTestId("arpg-menu-launch-start")).toBeVisible();
  await expect(page.getByTestId("arpg-production-menu-panel-start")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-character-sheet")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-inventory-grid")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-armory-comparison")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-skill-tree")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-quest-journal")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-codex")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-world-map")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-city-map")).toBeVisible();
  await expect(page.getByTestId("arpg-production-menu-panel-city-map")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-reputation")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-companions")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-settings-controls")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-credits")).toBeVisible();
  await expect(page.getByTestId("arpg-menu-launch-save-recovery")).toBeVisible();
  const launcherTargets: Array<[string, string]> = [
    ["start", "arpg-room-drawer"],
    ["character-sheet", "arpg-hero-drawer"],
    ["inventory-grid", "arpg-inventory-drawer"],
    ["armory-comparison", "arpg-armory-drawer"],
    ["skill-tree", "arpg-skills-drawer"],
    ["quest-journal", "arpg-journal-drawer"],
    ["codex", "arpg-journal-drawer"],
    ["world-map", "arpg-map-drawer"],
    ["city-map", "arpg-map-drawer"],
    ["reputation", "arpg-people-drawer"],
    ["companions", "arpg-people-drawer"],
    ["settings-controls", "arpg-room-drawer"],
    ["credits", "arpg-asset-credits"],
    ["save-recovery", "arpg-room-drawer"],
  ];
  const openProductionDrawer = async () => {
    if (!(await page.getByTestId("arpg-production-drawer").isVisible().catch(() => false))) {
      await page.getByTestId("arpg-production-toggle").click();
    }
  };
  for (const [launcherId, drawerId] of launcherTargets) {
    await openProductionDrawer();
    await page.getByTestId(`arpg-menu-launch-${launcherId}`).click();
    await expect(page.getByTestId(drawerId)).toBeVisible();
    await expect(page.getByTestId("arpg-active-menu-panel")).toBeVisible();
  }
  await openProductionDrawer();
  await expect(
    page.getByTestId("arpg-production-track-MW6U-ARPG-ASSET-PIPELINE"),
  ).toContainText("current");
  await expect(
    page.getByTestId("arpg-production-track-MW6V-REAL-ASSET-INTAKE"),
  ).toContainText("blocked");
  await page.getByTestId("arpg-production-toggle").click();

  await page.getByTestId("arpg-settings-toggle").click();
  await page.getByTestId("arpg-reset").click();
  await expect(page.getByTestId("arpg-reset-confirm-message")).toContainText(
    "Reset confirmation armed",
  );
  await page.getByTestId("arpg-reset").click();
  await expect(page.getByTestId("arpg-save-import-message")).toContainText(
    "Save reset",
  );
  await expect(page.getByTestId("arpg-save-slot-summary")).toContainText(
    "Start / Continue",
  );
  await expect(page.getByTestId("arpg-save-slot-summary")).toContainText(
    "Manual save",
  );
  await expect(page.getByTestId("arpg-save-slot-summary")).toContainText(
    "Checkpoint",
  );
  await expect(page.getByTestId("arpg-tutorial-panel")).toContainText(
    "WASD/arrows move",
  );
  await expect(page.getByTestId("arpg-save-export")).toContainText(
    "aether-reliquary-save-envelope-v1",
  );
  await expect(page.getByTestId("arpg-save-export")).toContainText('"version": 3');
  await expect(page.getByTestId("arpg-save-export")).toContainText('"kind": "manual"');
  await expect(page.getByTestId("arpg-save-export")).toContainText('"kind": "checkpoint"');
  const manualPosition = await page.getByTestId("arpg-position").textContent();
  await page.getByTestId("arpg-save-manual").click();
  await expect(page.getByTestId("arpg-save-import-message")).toContainText(
    "Manual save recorded",
  );
  await page.keyboard.press("d");
  await expect
    .poll(async () => page.getByTestId("arpg-position").textContent())
    .not.toBe(manualPosition);
  await page.getByTestId("arpg-load-slot-manual").click();
  await expect(page.getByTestId("arpg-save-import-message")).toContainText(
    "Loaded Manual save",
  );
  if (manualPosition) {
    await expect(page.getByTestId("arpg-position")).toHaveText(manualPosition);
  }
  await page.getByTestId("arpg-save-checkpoint").click();
  await expect(page.getByTestId("arpg-save-import-message")).toContainText(
    "Checkpoint save recorded",
  );
  await page.getByTestId("arpg-save-copy-current").click();
  await page.getByTestId("arpg-save-import").click();
  await expect(page.getByTestId("arpg-save-import-message")).toContainText(
    "Imported envelope-v1",
  );
  const envelopeText = await page.getByTestId("arpg-save-export").inputValue();
  const envelope = JSON.parse(envelopeText);
  await page.getByTestId("arpg-save-import-input").fill(JSON.stringify(envelope.slots[0].save));
  await page.getByTestId("arpg-save-import").click();
  await expect(page.getByTestId("arpg-save-import-message")).toContainText(
    "Imported raw-save",
  );
  await page.getByTestId("arpg-save-import-input").fill("{broken");
  await page.getByTestId("arpg-save-import").click();
  await expect(page.getByTestId("arpg-save-import-message")).toContainText(
    "Import blocked",
  );
  await page.getByTestId("arpg-reset").click();
  await page.getByTestId("arpg-reset").click();
  await expect(page.getByTestId("arpg-combat-target")).toBeVisible();
  await expect(page.getByTestId("arpg-combat-target")).toContainText(/Ashling Scout|Glass Gnawer|Hollow Sentry/);
  await page.getByTestId("arpg-basic-attack").click();
  await expect(page.getByTestId("arpg-damage-number")).toContainText(/\d+/);
  await page.getByTestId("arpg-hotbar-1").click();
  await expect(page.getByTestId("arpg-combat-toast")).toContainText(/hit|cooling|closer/i);
  await page.getByTestId("arpg-dodge").click();
  await expect(page.getByTestId("arpg-combat-toast")).toContainText(/Dodged|recovering/i);
  await expect(page.getByTestId("arpg-status-row")).not.toContainText("No active statuses");
  const beforePosition = await page.getByTestId("arpg-position").textContent();
  await page.keyboard.press("d");
  await expect
    .poll(async () => page.getByTestId("arpg-position").textContent())
    .not.toBe(beforePosition);
  const beforePrompt = await page.getByTestId("arpg-context-prompt").textContent();
  for (let i = 0; i < 7; i += 1) {
    await page.keyboard.press("w");
  }
  await expect
    .poll(async () => page.getByTestId("arpg-context-prompt").textContent())
    .not.toBe(beforePrompt);
  await expect(page.getByTestId("arpg-context-prompt")).toContainText(
    /Loom-Shard|Gate Fragment|Gate Monolith|Hollow Sentry/,
  );

  await page.getByTestId("arpg-inventory-toggle").click();
  await expect(page.getByTestId("arpg-item-icon-cinder-glaive")).toBeVisible();
  await page.getByTestId("arpg-claim-loot").click();
  await expect(vfxStage).toHaveAttribute("data-vfx-kind", "loot");
  await page.getByTestId("arpg-equip-loomshard-charm").click();
  await expect(vfxStage).toHaveAttribute("data-vfx-kind", "equip");
  await page.getByTestId("arpg-upgrade-selected").click();
  await expect(page.getByTestId("arpg-loadout")).toContainText("+1");
  await page.getByTestId("arpg-attack").click();
  await expect(vfxStage).toHaveAttribute("data-vfx-kind", "hit");
  await expect(page.getByTestId("arpg-combat-codex")).toHaveCount(0);
  await expect(page.getByTestId("arpg-loadout")).toContainText("Loom-Shard Charm");
  await page.getByTestId("arpg-journal-toggle").click();
  await expect(page.getByTestId("arpg-skills")).toContainText("Cinder Cleave");
  await expect(page.getByTestId("arpg-journal-skill-art-wardbreaker-cleave")).toBeVisible();
  await expect(page.getByTestId("arpg-combat-codex")).toContainText(/Ashling Scout|Hollow Sentry|The Brass Warden/);
  await expect(page.getByTestId("arpg-codex-enemy-art-hollow-sentry")).toBeVisible();
  await page.getByTestId("arpg-skill-ashrunner-dash").click();
  await expect(page.getByTestId("arpg-skills")).toContainText("Ash Step");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Check HQ command channel");
  await expect(page.getByTestId("hq-command-input")).toHaveValue(
    "Check HQ command channel",
  );
});

test("hq arpg character foundation supports hero creation and class skill identity", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");

  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Veyr Human");
  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Wardbreaker");

  await page.getByTestId("arpg-hero-toggle").click();
  await expect(page.getByTestId("arpg-hero-drawer")).toContainText("Hero");
  await expect(page.getByTestId("arpg-hero-drawer")).toContainText("Civic Oath");
  await page.getByTestId("arpg-race-glasskin").click();
  await page.getByTestId("arpg-class-ashrunner").click();
  await page.getByTestId("arpg-subclass-ashrunner-roadflame").click();
  await page.getByTestId("arpg-palette-palette-glasskin-prism").click();

  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Glasskin");
  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Ashrunner");
  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Roadflame");
  await expect(page.getByTestId("arpg-loadout")).toContainText("Ashrunner");

  await page.getByTestId("arpg-skills-toggle").click();
  await expect(page.getByTestId("arpg-skills-drawer")).toContainText("Ash Step");
  await expect(page.getByTestId("arpg-skills-drawer")).toContainText("Soot Footwork");
  await expect(page.getByTestId("arpg-skill-art-ashrunner-dash")).toBeVisible();
  await page.getByTestId("arpg-skill-ashrunner-dash").click();
  await expect(page.getByTestId("arpg-skills-drawer")).toContainText("Equipped");

  const beforePosition = await page.getByTestId("arpg-position").textContent();
  await page.keyboard.press("d");
  await expect
    .poll(async () => page.getByTestId("arpg-position").textContent())
    .not.toBe(beforePosition);

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Character foundation command check");
  await expect(page.getByTestId("hq-command-input")).toHaveValue(
    "Character foundation command check",
  );
});

test("hq arpg systems foundation exposes map, travel, armory, and people loops", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nexus-settings",
      JSON.stringify({
        state: {
          hqRoomMode: "arpg",
          arpgSave: {
            version: 2,
            player: {
              x: 0.2,
              z: -2.2,
              hp: 100,
              maxHp: 100,
              mana: 50,
              maxMana: 50,
              xp: 0,
              level: 3,
              originId: "wardbound",
              classPathId: "wardbreaker",
              gold: 25,
              unlockedSkills: ["wardbreaker-cleave"],
              equippedSkillIds: ["wardbreaker-cleave"],
              activeQuestId: "awaken-the-reliquary",
              respawnMarker: "gate-room",
            },
            inventory: [
              {
                instanceId: "test:gate-key-fragment",
                itemId: "gate-key-fragment",
                quantity: 1,
                quality: "rare",
                level: 1,
                upgradeRank: 0,
                affixes: [],
                source: "test",
                bound: false,
              },
              {
                instanceId: "test:upgrade-shard",
                itemId: "upgrade-shard",
                quantity: 2,
                quality: "common",
                level: 1,
                upgradeRank: 0,
                affixes: [],
                source: "test",
                bound: false,
              },
            ],
            equipped: {},
            collectedItemIds: ["gate-key-fragment"],
            storyFlags: ["loot:gate-key-fragment"],
            enemies: {
              "brass-warden": {
                id: "brass-warden",
                hp: 0,
                defeated: true,
                intent: "defeated",
                phase: 2,
                statuses: [],
              },
            },
            world: {
              zoneId: "first-reliquary",
              discoveredMarkers: [],
              openedChests: [],
              defeatedEnemyIds: ["brass-warden"],
              npcDialogueFlags: [],
              checkpointId: "gate-room",
            },
            selectedItemId: null,
            selectedItemInstanceId: null,
            lastEvent: "MW6I-S seeded travel proof",
            lastSavedAt: 1,
          },
        },
        version: 1,
      }),
    );
  });

  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");
  await expect(page.getByTestId("arpg-phaser-canvas")).toBeVisible();
  await expect(page.getByTestId("arpg-hud")).toBeVisible();

  await page.getByTestId("arpg-map-toggle").click();
  await expect(page.getByTestId("arpg-world-progress")).toContainText("Cities 12");
  await expect(page.getByTestId("arpg-world-progress")).toContainText("Sub-cities 48");
  await expect(page.getByTestId("arpg-map-location-art")).toBeVisible();
  await expect(page.getByTestId("arpg-first-town-release")).toContainText("Route ready");
  await expect(page.getByTestId("arpg-first-town-presentation-cues")).toContainText(
    "Presentation cues",
  );
  await expect(page.getByTestId("arpg-first-town-presentation-cues")).toContainText(
    "Veyrhold hearth arrival",
  );
  await expect(page.getByTestId("arpg-locked-world-preview")).toBeVisible();
  await page.getByTestId("arpg-route-first-reliquary-to-veyrhold").click();
  await expect(page.getByTestId("arpg-travel-event")).toBeVisible();
  await page.getByTestId("arpg-travel-choice-stand-ground").click();
  await expect(page.getByTestId("arpg-world-progress")).toContainText("Found 1/12");
  await expect(page.getByTestId("arpg-first-town-release")).toContainText("Town open");
  await page.getByTestId("arpg-city-veyrhold").click();
  await expect(page.getByTestId("arpg-city-art-veyrhold")).toBeVisible();
  await expect(page.getByTestId("arpg-first-town-districts")).toContainText("Veyrhold districts 4/4");
  await expect(page.getByTestId("arpg-subcity-veyrhold-oathmarket")).toBeVisible();
  await expect(page.getByTestId("arpg-veyrhold-district-hub")).toContainText("Oathmarket");
  await page.getByTestId("arpg-veyrhold-district-node-veyrhold-oathmarket").click();
  await expect(page.getByTestId("arpg-veyrhold-district-node-veyrhold-oathmarket")).toContainText("visited");
  await expect(page.getByTestId("arpg-oathmarket-runtime")).toContainText("Copper Oath Ring");
  await page.getByTestId("arpg-oathmarket-ware-oathmarket-copper-oath-ring").click();
  await expect(page.getByTestId("arpg-inventory-drawer")).toBeVisible();
  await expect(page.getByTestId("arpg-oathmarket-kit-wares")).toContainText("starter accessories");
  await page.getByTestId("arpg-map-toggle").click();
  await page.getByTestId("arpg-oathmarket-choice-oathmarket-ledger-witness").click();
  await expect(page.getByTestId("arpg-journal-drawer")).toBeVisible();
  await page.getByTestId("arpg-map-toggle").click();
  await page.getByTestId("arpg-veyrhold-district-node-veyrhold-wardens-steps").click();
  await expect(page.getByTestId("arpg-veyrhold-district-node-veyrhold-wardens-steps")).toContainText("visited");
  await expect(page.getByTestId("arpg-wardens-steps-runtime")).toContainText("Oath-Bronze Visor Fit");
  await page.getByTestId("arpg-wardens-armor-fit-wardens-helm-visor-fit").click();
  await expect(page.getByTestId("arpg-armory-drawer")).toBeVisible();
  await expect(page.getByTestId("arpg-wardens-steps-armory-fittings")).toContainText("helm");
  await page.getByTestId("arpg-map-toggle").click();
  await page.getByTestId("arpg-wardens-contract-wardens-contract-shield-line").click();
  await expect(page.getByTestId("arpg-journal-drawer")).toBeVisible();
  await page.getByTestId("arpg-map-toggle").click();
  await page.getByTestId("arpg-veyrhold-district-node-veyrhold-bellroot-commons").click();
  await expect(page.getByTestId("arpg-veyrhold-district-node-veyrhold-bellroot-commons")).toContainText("visited");
  await expect(page.getByTestId("arpg-bellroot-commons-runtime")).toContainText("Safe Health Vials");
  await page.getByTestId("arpg-bellroot-brew-bellroot-safe-health-vials").click();
  await expect(page.getByTestId("arpg-inventory-drawer")).toBeVisible();
  await expect(page.getByTestId("arpg-bellroot-kit-brews")).toContainText("recovery");
  await page.getByTestId("arpg-map-toggle").click();
  await page.getByTestId("arpg-bellroot-reading-bellroot-reading-root-under-bell").click();
  await expect(page.getByTestId("arpg-journal-drawer")).toBeVisible();
  await expect(page.getByTestId("arpg-bellroot-lamp-readings")).toContainText("Root Under the Bell");
  await page.getByTestId("arpg-map-toggle").click();
  await page.getByTestId("arpg-veyrhold-district-node-veyrhold-pilgrim-rows").click();
  await expect(page.getByTestId("arpg-veyrhold-district-node-veyrhold-pilgrim-rows")).toContainText("visited");
  await expect(page.getByTestId("arpg-pilgrim-rows-runtime")).toContainText("Lamp Checkpoint");
  await page.getByTestId("arpg-pilgrim-rest-pilgrim-rest-lamp-checkpoint").click();
  await expect(page.getByTestId("arpg-inventory-drawer")).toBeVisible();
  await expect(page.getByTestId("arpg-pilgrim-kit-rest")).toContainText("road prep");
  await page.getByTestId("arpg-map-toggle").click();
  await page.getByTestId("arpg-pilgrim-rumor-pilgrim-rumor-north-gate-blink").click();
  await expect(page.getByTestId("arpg-journal-drawer")).toBeVisible();
  await expect(page.getByTestId("arpg-pilgrim-road-rumors")).toContainText("North Gate Blink");
  await page.getByTestId("arpg-map-toggle").click();
  await expect(page.getByTestId("arpg-veyrhold-town-services")).toContainText("Bellroot Anvil");
  await expect(page.getByTestId("arpg-veyrhold-miniquests")).toContainText("The Ledger That Would Not Close");
  await expect(page.getByTestId("arpg-veyrhold-gear-paths")).toContainText("ring left");
  await page.getByTestId("arpg-town-miniquest-oathmarket-ledger-debt").click();
  await expect(page.getByTestId("arpg-journal-drawer")).toBeVisible();
  await expect(page.getByTestId("arpg-veyrhold-service-outcomes")).toContainText("Starter Wares");

  await page.getByTestId("arpg-armory-toggle").click();
  await expect(page.getByTestId("arpg-armory-progress")).toContainText("Weapons 21");
  await expect(page.getByTestId("arpg-armory-progress")).toContainText("Qualities 7");
  await expect(page.getByTestId("arpg-veyrhold-armory-services")).toContainText("Rings / amulet");
  await expect(page.getByTestId("arpg-arsenal-named-cards")).toContainText("8 samples");
  await expect(page.getByTestId("arpg-arsenal-comparison")).toBeVisible();
  await page.getByTestId("arpg-craft-first-temper").click();
  await expect(page.getByTestId("arpg-armory-comparison")).toBeVisible();
  await page.getByTestId("arpg-salvage-selected").click();
  await expect(page.getByTestId("arpg-armory-comparison")).toBeVisible();

  await page.getByTestId("arpg-people-toggle").click();
  await expect(page.getByTestId("arpg-people-drawer")).toContainText("Companions 8");
  await expect(page.getByTestId("arpg-veyrhold-npcs")).toContainText("Dame Ivara Bellroot");
  await page.getByTestId("arpg-town-npc-dame-ivara-bellroot").click();
  await expect(page.getByTestId("arpg-journal-drawer")).toBeVisible();
  await page.getByTestId("arpg-people-toggle").click();
  await expect(page.getByTestId("arpg-companion-art-caravan-scout")).toBeVisible();
  await page.getByTestId("arpg-companion-caravan-scout").click();
  await expect(page.getByTestId("arpg-companion-caravan-scout")).toContainText("Traveling");
  await expect(page.getByTestId("arpg-faction-reputation")).toContainText("veyrhold");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("MW6 systems command check");
  await expect(page.getByTestId("hq-command-input")).toHaveValue("MW6 systems command check");
});

test("hq arpg endgame foundation exposes dungeons, trials, rematches, arena, and cosmetics", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nexus-settings",
      JSON.stringify({
        state: {
          hqRoomMode: "arpg",
          arpgSave: {
            version: 2,
            player: {
              x: 0.2,
              z: -2.2,
              hp: 100,
              maxHp: 100,
              mana: 50,
              maxMana: 50,
              xp: 0,
              level: 3,
              originId: "wardbound",
              classPathId: "wardbreaker",
              gold: 25,
              unlockedSkills: ["wardbreaker-cleave"],
              equippedSkillIds: ["wardbreaker-cleave"],
              activeQuestId: "awaken-the-reliquary",
              respawnMarker: "gate-room",
            },
            inventory: [
              {
                instanceId: "test:gate-key-fragment",
                itemId: "gate-key-fragment",
                quantity: 1,
                quality: "rare",
                level: 1,
                upgradeRank: 0,
                affixes: [],
                source: "test",
                bound: false,
              },
            ],
            equipped: {},
            collectedItemIds: ["gate-key-fragment"],
            storyFlags: ["loot:gate-key-fragment"],
            enemies: {
              "brass-warden": {
                id: "brass-warden",
                hp: 0,
                defeated: true,
                intent: "defeated",
                phase: 2,
                statuses: [],
              },
            },
            world: {
              zoneId: "first-reliquary",
              discoveredMarkers: [],
              openedChests: [],
              defeatedEnemyIds: ["brass-warden"],
              npcDialogueFlags: [],
              checkpointId: "gate-room",
            },
            selectedItemId: null,
            selectedItemInstanceId: null,
            lastEvent: "MW6T seeded endgame proof",
            lastSavedAt: 1,
          },
        },
        version: 1,
      }),
    );
  });

  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");
  await expect(page.getByTestId("arpg-phaser-canvas")).toBeVisible();
  await expect(page.getByTestId("arpg-hud")).toBeVisible();

  await page.getByTestId("arpg-endgame-toggle").click();
  await expect(page.getByTestId("arpg-endgame-progress")).toContainText("Dungeons 12");
  await expect(page.getByTestId("arpg-endgame-progress")).toContainText("Trials 12");
  await expect(page.getByTestId("arpg-endgame-progress")).toContainText("Treasure 48");
  await expect(page.getByTestId("arpg-endgame-progress")).toContainText("Unlocked");
  await page.getByTestId("arpg-endgame-difficulty-ascendant").click();

  await page.getByTestId("arpg-start-endgame-dungeon").click();
  await page.getByTestId("arpg-complete-endgame-dungeon").click();
  await expect(page.getByTestId("arpg-endgame-dungeon")).toContainText("Completed 1/12");

  await page.getByTestId("arpg-start-relic-trial").click();
  await page.getByTestId("arpg-complete-relic-trial").click();
  await expect(page.getByTestId("arpg-endgame-trial")).toContainText("Completed 1/12");

  await page.getByTestId("arpg-treasure-map-veyrhold-oathmarket-treasure-map").click();
  await expect(page.getByTestId("arpg-endgame-collections")).toContainText("Sub-City Secret Completion");

  await page.getByTestId("arpg-boss-rematch-veyrhold-city-boss-rematch").click();
  await expect(page.getByTestId("arpg-endgame-collections")).toContainText("Boss Memory Cycle");

  await page.getByTestId("arpg-arena-wardbreaker-arena").click();
  await expect(page.getByTestId("arpg-endgame-collections")).toContainText("Arena Build Proving");

  await page.getByTestId("arpg-cosmetic-hearthcloak").click();
  await expect(page.getByTestId("arpg-endgame-cosmetics")).toContainText("Hearthcloak");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("MW6 endgame command check");
  await expect(page.getByTestId("hq-command-input")).toHaveValue("MW6 endgame command check");
});

test("hq arpg migrates older v2 saves into v3 character identity", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nexus-settings",
      JSON.stringify({
        state: {
          hqRoomMode: "arpg",
          arpgSave: {
            version: 2,
            player: {
              x: 1,
              z: -1,
              hp: 52,
              maxHp: 72,
              mana: 18,
              maxMana: 30,
              xp: 12,
              level: 1,
              originId: "wardbound",
              classPathId: "wardbreaker",
              gold: 7,
              unlockedSkills: ["wardbreaker-cleave"],
              equippedSkillIds: ["wardbreaker-cleave"],
              activeQuestId: "awaken-the-reliquary",
            },
            inventory: [],
            equipped: {},
            collectedItemIds: [],
            storyFlags: ["origin:wardbound", "class:wardbreaker"],
            enemies: {},
            world: {
              zoneId: "first-reliquary",
              discoveredMarkers: [],
              openedChests: [],
              defeatedEnemyIds: [],
              npcDialogueFlags: [],
              checkpointId: "first-reliquary-spawn",
            },
            selectedItemId: null,
            selectedItemInstanceId: null,
            lastEvent: "Legacy v2 save",
            lastSavedAt: 1,
          },
        },
        version: 1,
      }),
    );
  });

  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");

  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Veyr Human");
  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Wardbreaker");
  await page.getByTestId("arpg-hero-toggle").click();
  await expect(page.getByTestId("arpg-hero-drawer")).toContainText("Save v3");
  await expect(page.getByTestId("arpg-position")).toContainText("POS 1.0 / -1.0");
  await expect(page.getByTestId("arpg-inventory-toggle")).toBeVisible();
  await page.getByTestId("arpg-settings-toggle").click();
  await expect(page.getByTestId("arpg-save-slot-summary")).toContainText("Autosave");
  await expect(page.getByTestId("arpg-save-slot-summary")).toContainText("Manual save");
  await expect(page.getByTestId("arpg-save-slot-summary")).toContainText("Checkpoint");
});

test("hq arpg normalizes same-version stale persisted saves before HUD render", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nexus-settings",
      JSON.stringify({
        state: {
          hqRoomMode: "arpg",
          arpgSave: {
            version: 2,
            player: {
              x: 1,
              z: -1,
              hp: 52,
              maxHp: 72,
              mana: 18,
              maxMana: 30,
              xp: 12,
              level: 1,
              originId: "wardbound",
              classPathId: "wardbreaker",
              gold: 7,
              unlockedSkills: ["wardbreaker-cleave"],
              activeQuestId: "awaken-the-reliquary",
            },
            inventory: [],
            equipped: {},
            collectedItemIds: [],
            storyFlags: ["origin:wardbound", "class:wardbreaker"],
            enemies: {},
            world: {
              zoneId: "first-reliquary",
              discoveredMarkers: [],
              openedChests: [],
              defeatedEnemyIds: [],
              npcDialogueFlags: [],
              checkpointId: "first-reliquary-spawn",
            },
            selectedItemId: null,
            selectedItemInstanceId: null,
            lastEvent: "Legacy same-version save",
            lastSavedAt: 1,
          },
        },
        version: 1,
      }),
    );
  });

  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await expect(page.getByTestId("arpg-hud")).toBeVisible();
  await expect(page.getByTestId("arpg-identity-chip")).toContainText("Wardbreaker");
  await expect(page.getByTestId("arpg-hotbar-1")).toContainText("Cinder Cleave");
  await page.getByTestId("arpg-settings-toggle").click();
  await expect(page.getByTestId("arpg-save-slot-summary")).toContainText("Autosave");
  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Stale save command check");
  await expect(page.getByTestId("hq-command-input")).toHaveValue("Stale save command check");
});

test("hq arpg vfx layer respects reduced motion and never blocks commands", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");

  const vfxStage = page.getByTestId("arpg-pixi-stage");
  await expect(page.getByTestId("arpg-phaser-game")).toBeVisible();
  await expect(vfxStage).toBeVisible();
  await expect(vfxStage).toHaveAttribute("data-reduced-motion", "true");
  await expect(vfxStage).toHaveAttribute("data-renderer", /pixi|canvas-fallback/);
  await expect(page.getByTestId("arpg-combat-target")).toBeVisible();
  await page.getByTestId("arpg-basic-attack").click();
  await expect(page.getByTestId("arpg-damage-number")).toContainText(/\d+/);
  await expect
    .poll(async () =>
      vfxStage.evaluate((node) => window.getComputedStyle(node).pointerEvents),
    )
    .toBe("none");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Reduced motion command check");
  await expect(page.getByTestId("hq-command-input")).toHaveValue(
    "Reduced motion command check",
  );
});

test("hq arpg room keeps the command-room fallback reachable", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");

  await page.getByTestId("arpg-settings-toggle").click();
  await page.getByTestId("arpg-command-room-toggle").click();
  await expect(page.getByTestId("hq-command-room-fallback")).toBeVisible();
  await page.getByTestId("hq-room-mode-arpg").click();
  await expect(page.getByTestId("arpg-room")).toBeVisible();
});

test("bootstrap recovery appears if shell assets fail to load", async ({ page }, testInfo) => {
  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");

  const browser = page.context().browser();
  if (!browser) {
    test.skip(true, "Browser handle is required for fresh recovery context");
    return;
  }

  const storageState = await page.context().storageState();
  const recoveryContext = await browser.newContext({ storageState });
  await recoveryContext.route(
    /\/_next\/static\/(?:css\/.*\.css|chunks\/.*\.js)(?:\?.*)?$/,
    (route) => route.abort(),
  );

  const recoveryPage = await recoveryContext.newPage();
  await recoveryPage.goto(new URL("/hq", page.url()).toString(), {
    waitUntil: "domcontentloaded",
  });

  const recovery = recoveryPage.getByTestId("shell-bootstrap-recovery");
  await expect(recovery).toBeVisible({ timeout: 12000 });
  await expect(recovery).toContainText("The shell did not fully load.");
  await expect(recovery.getByRole("button", { name: "Reload shell" })).toBeVisible();
  await expect(
    recoveryPage.locator("html[data-nexus-shell-boot='recovery']"),
  ).toHaveCount(1);

  await recoveryContext.close();
});

test("focused HQ sessions open the exact repair surface", async ({ page }, testInfo) => {
  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await expect(page.getByText("Focused session: HQ chronicle")).toBeVisible();
  await openHqChat(page);
  await expect(page.getByTestId("hq-command-input")).toBeVisible();

  await gotoShell(page, "/hq?focus=hq-scheduler-governance");
  await settleShell(page, testInfo, "hq");

  await expect(page.getByText("Focused session: scheduler governance").first()).toBeVisible();
  await expect(page.getByText("CRON SCHEDULER")).toBeVisible();
  await expect(
    page.getByText("You opened the scheduler directly on governance", {
      exact: false,
    }),
  ).toBeVisible();
});

test("hq chronicle keeps the composer visible and hides raw think traces", async ({
  page,
}, testInfo) => {
  test.fixme(true, "Chronicle answer-healing stays deferred to the later assistant/auth replay slice.");
  const stubbedReply =
    '<think>Plan the greeting, review memory, and decide on the safest response.</think>\nHello from the agent runtime.';
  const fulfillReply = async (route: Route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: stubbedReply,
              tool_calls: [],
            },
          },
        ],
      }),
    });
  };

  await page.route("**/v1/chat/completions", fulfillReply);
  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: stubbedReply } }],
      }),
    });
  });

  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Hello");
  await page.getByTestId("hq-command-input").press("Enter");

  const chronicle = page.getByTestId("hq-chronicle-scroll");
  await expect(
    chronicle.getByText("Hello from the agent runtime.", { exact: true }),
  ).toBeVisible();
  await expect(
    chronicle.getByText("Internal reasoning stayed inside the agent runtime.", {
      exact: false,
    }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Plan the greeting, review memory, and decide on the safest response."),
  ).toHaveCount(0);
  await expect(page.locator("text=<think>")).toHaveCount(0);

  const composer = page.getByTestId("hq-composer");
  await expect(composer).toBeVisible();
  const composerBox = await composer.boundingBox();
  const viewport = page.viewportSize();

  expect(composerBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect((composerBox?.y ?? 0) + (composerBox?.height ?? 0)).toBeLessThanOrEqual(
    (viewport?.height ?? 0) - 4,
  );
});

test("hq chronicle self-heals memo-shaped replies for simple chat turns", async ({
  page,
}, testInfo) => {
  test.fixme(true, "Chronicle answer-healing stays deferred to the later assistant/auth replay slice.");
  const memoReply = `**Background**
Global markets show mixed momentum.

**Analysis**
No active tasks are marked pending in docs/SYSTEM_STATE.md.

**Recommendation**
Ready for your input. Priorities:
1. Confirm GitHub sync status
2. Address any codebase updates

How would you like to proceed?`;

  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: memoReply } }],
      }),
    });
  });

  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Hello");
  await page.getByTestId("hq-command-input").press("Enter");

  const chronicle = page.getByTestId("hq-chronicle-scroll");
  await expect(
    chronicle.getByText("Hello. How can I help today?", { exact: true }),
  ).toBeVisible();
  await expect(chronicle.getByText("Background", { exact: true })).toHaveCount(0);
  await expect(chronicle.getByText("SYSTEM_STATE.md", { exact: false })).toHaveCount(0);
  await expect(
    chronicle.getByText("How would you like to proceed?", { exact: true }),
  ).toHaveCount(0);
});

test("hq learning turns show compact tutor guidance and prepare the strongest study workspace", async ({
  page,
}, testInfo) => {
  test.fixme(true, "Learning-turn workspace preparation stays deferred to the later assistant/auth replay slice.");
  await page.route("**/api/memory/mine**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        mined: [
          {
            id: "mined:page:1",
            title: "Learning note · TCP handshake",
            summary: "Source-backed note covering SYN, SYN-ACK, and ACK.",
            compartment: "general",
            sourceRefs: [
              {
                id: "page:1",
                title: "Learning note · TCP handshake",
                sourceLabel: "Guided learning",
                timestamp: Date.now(),
              },
            ],
            facts: ["Source lane: Guided learning", "Domain: engineering"],
            decisions: [],
            entities: ["tcp", "handshake"],
            openLoops: ["Check whether a higher-order study brief already exists."],
            continuityId: "learning:tcp-handshake",
            freshness: 98,
            confidence: 91,
            inferred: false,
          },
        ],
      }),
    });
  });

  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [
          {
            message: {
              content:
                "TCP uses a three-step handshake: SYN, SYN-ACK, then ACK. A quick check is to explain what each side proves before data flows.",
            },
          },
        ],
      }),
    });
  });

  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Teach me the TCP handshake");
  await page.getByTestId("hq-command-input").press("Enter");

  const chronicle = page.getByTestId("hq-chronicle-scroll");
  await expect(
    chronicle.getByText("TCP uses a three-step handshake", { exact: false }),
  ).toBeVisible();
  await expect(chronicle.getByText("Concept tutor ready", { exact: true })).toBeVisible();
  await expect(chronicle.getByText("Workspace prepared", { exact: true })).toBeVisible();
  await expect(
    chronicle.getByRole("button", { name: "Open Concept tutor" }),
  ).toBeVisible();
});

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

type Uxa3Target = {
  anchorTestId?: string;
  anchorText?: string;
  id: string;
  path: string;
  primarySelector: string;
};

const TARGETS: Uxa3Target[] = [
  {
    id: "hq-chronicle",
    path: "/hq?focus=hq-chronicle",
    primarySelector: "[data-testid='hq-chronicle-scroll']",
    anchorTestId: "hq-command-input",
  },
  {
    id: "command",
    path: "/command",
    primarySelector: ".nexus-surface-chamber-shell__lead",
    anchorText: "Operations snapshot",
  },
  {
    id: "security",
    path: "/security",
    primarySelector: ".nexus-surface-chamber-shell__lead",
    anchorText: "Security controls",
  },
  {
    id: "vault",
    path: "/vault",
    primarySelector: ".nexus-surface-chamber-shell__lead",
    anchorText: "Document intake",
  },
  {
    id: "resources",
    path: "/resources",
    primarySelector: ".nexus-surface-chamber-shell__lead",
    anchorText: "How This Helps",
  },
];

const VIEWPORTS = [
  { label: "desktop-1440x900", width: 1440, height: 900 },
  { label: "laptop-1366x768", width: 1366, height: 768 },
];

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedShell(page);
});

async function measureFirstViewport(page: Page, target: Uxa3Target) {
  return page.evaluate((primarySelector) => {
    const viewportHeight = window.innerHeight;
    const rectFor = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const visiblePx = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
      );

      return {
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        startsInViewport: rect.top < viewportHeight && rect.bottom > 0,
        top: Math.round(rect.top),
        visiblePx: Math.round(visiblePx),
        visibleRatio: rect.height
          ? Number((visiblePx / rect.height).toFixed(2))
          : 0,
      };
    };

    const blockers = [
      ".nexus-toprail",
      ".nexus-shell-opsHead",
      ".nexus-surface-route-strip",
      ".nexus-command-mission-strip",
      ".nexus-security-mission-strip",
      ".nexus-vault-mission-strip",
      ".nexus-resources-mission-strip",
      ".nexus-shell-segmented--compactLane",
      ".nexus-surface-chamber-shell__support",
      ".nexus-surface-continuity-strip",
      "[data-testid='hq-composer']",
    ].flatMap((selector) => {
      const rect = rectFor(selector);
      return rect ? [{ selector, ...rect }] : [];
    });

    return {
      authGateVisible: Boolean(document.querySelector("[data-testid='auth-gate']")),
      finalPath: `${window.location.pathname}${window.location.search}`,
      primary: rectFor(primarySelector),
      primarySelector,
      title: document.title,
      viewportHeight,
      viewportWidth: window.innerWidth,
      blockers,
    };
  }, target.primarySelector);
}

test("UXA3 target routes keep their primary workplane in the first viewport", async ({
  page,
}, testInfo: TestInfo) => {
  const results: Array<
    Awaited<ReturnType<typeof measureFirstViewport>> & {
      route: string;
      viewport: string;
    }
  > = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({
      height: viewport.height,
      width: viewport.width,
    });

    for (const target of TARGETS) {
      await gotoShell(page, target.path);
      await waitForAuthenticatedShell(page, testInfo, {
        anchorTestId: target.anchorTestId,
        anchorText: target.anchorText,
      });

      const result = await measureFirstViewport(page, target);
      results.push({
        ...result,
        route: target.id,
        viewport: viewport.label,
      });
    }
  }

  await testInfo.attach("uxa3-first-viewport-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  if (process.env.UXA3_PRINT_FIRST_VIEWPORT === "1") {
    console.log("UXA3 first viewport results", JSON.stringify(results, null, 2));
  }

  const failures = results.filter(
    (result) =>
      result.authGateVisible ||
      !result.primary ||
      !result.primary.startsInViewport ||
      result.primary.visiblePx < 80,
  );
  if (failures.length > 0) {
    console.log("UXA3 first viewport failures", JSON.stringify(failures, null, 2));
  }

  for (const result of results) {
    expect(result.authGateVisible, `${result.route} should be authenticated`).toBe(false);
    expect(result.primary, `${result.route} primary workplane should exist`).not.toBeNull();

    const primary = result.primary!;
    expect(
      primary.startsInViewport,
      `${result.route} primary workplane should start inside ${result.viewport}`,
    ).toBe(true);
    expect(
      primary.visiblePx,
      `${result.route} primary workplane should have meaningful first-viewport presence in ${result.viewport}`,
    ).toBeGreaterThanOrEqual(80);
  }
});

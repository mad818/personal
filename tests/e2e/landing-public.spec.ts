import { expect, test } from "@playwright/test";
import {
  seedAuthenticatedShell,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test("public root stays outside protected shell chrome and hands off to /hq", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByTestId("landing-header")).toBeVisible();
  await expect(page.getByTestId("landing-hero-cta")).toContainText(
    "Launch Nexus",
  );
  await expect(page.getByTestId("auth-gate")).toHaveCount(0);
  await expect(page.getByTestId("toprail-brand")).toHaveCount(0);

  await page.getByTestId("landing-hero-cta").click();

  await expect(page).toHaveURL(/\/hq(?:\?.*)?$/);
  await expect(page.getByTestId("auth-gate")).toBeVisible();
  await expect(page.getByTestId("toprail-brand")).toHaveCount(0);
});

test("authenticated operators keep the public landing and get a direct HQ continuation", async ({
  page,
}, testInfo) => {
  await seedAuthenticatedShell(page);

  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByTestId("landing-hero-cta")).toContainText(
    "Continue to HQ",
  );
  await expect(page.getByTestId("landing-header-cta")).toContainText(
    "Continue to HQ",
  );
  await expect(page.getByTestId("auth-gate")).toHaveCount(0);
  await expect(page.getByTestId("toprail-brand")).toHaveCount(0);

  await page.getByTestId("landing-hero-cta").click();
  await waitForAuthenticatedShell(page, testInfo, {
    anchorTestId: "hq-command-input",
  });
  await expect(page).toHaveURL(/\/hq(?:\?.*)?$/);
});

test("landing honors reduced motion and stays inside common viewport widths", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const width of [375, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });

    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("landing-page")).toBeVisible();

    const posture = await page.evaluate(() => {
      const drift = document.querySelector<HTMLElement>(
        ".nexus-landing-atmosphere__drift",
      );
      const sweep = document.querySelector<HTMLElement>(
        ".nexus-landing-proclamation__scan",
      );
      const root = document.documentElement;
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        motionProfile: root.getAttribute("data-nexus-motion-profile"),
        driftAnimation: drift ? window.getComputedStyle(drift).animationName : null,
        sweepAnimation: sweep ? window.getComputedStyle(sweep).animationName : null,
      };
    });

    expect(posture.scrollWidth - posture.clientWidth).toBeLessThanOrEqual(1);
    expect(posture.motionProfile).toBe("reduced");
    expect(posture.driftAnimation).toBe("none");
    expect(posture.sweepAnimation).toBe("none");
  }
});

import { expect, test } from "@playwright/test";
import {
  seedAuthenticatedShell,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

const authEnabled = Boolean(process.env.NEXUS_TOKEN?.trim());

test("public root stays outside protected shell chrome and hands off to /hq", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByTestId("landing-header")).toBeVisible();
  await expect(page.getByTestId("landing-hero-cta")).toContainText(
    "Get Started",
  );
  await expect(page.getByTestId("auth-gate")).toHaveCount(0);
  await expect(page.getByTestId("toprail-brand")).toHaveCount(0);

  if (authEnabled) {
    await expect(page.getByTestId("landing-auth-form")).toBeVisible();
    await expect(page.getByTestId("landing-auth-token-input")).toBeVisible();
    await page.getByTestId("landing-hero-cta").click();
    await expect(page).toHaveURL(/\/#agency-access$/);
    await expect(page.getByTestId("auth-gate")).toHaveCount(0);
    await expect(page.getByTestId("toprail-brand")).toHaveCount(0);
  } else {
    await page.getByTestId("landing-hero-cta").click();
    await expect(page).toHaveURL(/\/hq(?:\?.*)?$/);
    await expect(page.getByTestId("auth-gate")).toHaveCount(0);
    await expect(page.getByTestId("toprail-brand")).toBeVisible();
  }
});

test("landing token failure returns to the merged ingress form", async ({
  page,
}) => {
  test.skip(!authEnabled, "NEXUS_TOKEN is required for landing auth failure coverage");

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("landing-auth-form")).toBeVisible();
  await page.getByTestId("landing-auth-token-input").fill("definitely-wrong");
  await page.getByTestId("landing-auth-submit").click();

  await expect(page).toHaveURL(/\/\?authError=invalid#agency-access$/);
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByTestId("landing-auth-status")).toContainText(
    "Invalid token",
  );
  await expect(page.getByTestId("auth-gate")).toHaveCount(0);
});

test("authenticated operators keep the public landing and get a direct HQ continuation", async ({
  page,
}, testInfo) => {
  await seedAuthenticatedShell(page);

  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByTestId("landing-hero-cta")).toContainText(
    "Get Started",
  );
  await expect(page.getByTestId("landing-header-cta")).toContainText(
    "Get Started",
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
      const videos = document.querySelectorAll<HTMLVideoElement>(
        ".agency-video-bg, [data-testid='landing-hero'] video",
      );
      const root = document.documentElement;
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        motionProfile: root.getAttribute("data-nexus-motion-profile"),
        videoCount: videos.length,
      };
    });

    expect(posture.scrollWidth - posture.clientWidth).toBeLessThanOrEqual(1);
    expect(posture.motionProfile).toBe("reduced");
    expect(posture.videoCount).toBeGreaterThanOrEqual(4);
  }
});

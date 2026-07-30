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
  await expect(page.getByTestId("landing-command-backdrop")).toBeVisible();
  await expect(page.getByTestId("landing-guardian-hero-image")).toHaveAttribute(
    "src",
    /homefront-guardian-hero\.webp/,
  );
  await expect(page.getByTestId("landing-guardian-drone")).toBeVisible();
  await expect(page.getByTestId("landing-guardian-drone")).toHaveAttribute(
    "src",
    /homefront-drone-patrol\.webp/,
  );
  await expect(
    page.getByTestId("landing-guardian-capability-video"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("landing-command-motion"),
  ).toHaveCount(0);
  await expect(page.getByTestId("landing-hero-headline")).toContainText(
    "Homefront Guards The Perimeter",
  );
  await expect(page.getByTestId("landing-hero")).toContainText(
    "does not place emergency calls automatically",
  );
  await expect(page.getByTestId("landing-scenario-reel")).toHaveCount(0);
  await expect(page.getByTestId("landing-scenario-controls")).toHaveCount(0);
  await expect(
    page.getByTestId("landing-scenario-card-animal-clear"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("landing-scenario-card-perimeter-breach"),
  ).toHaveCount(0);
  await expect(page.getByTestId("landing-hero")).toContainText(
    "clear animal or rodent false alarms",
  );
  await expect(page.getByTestId("landing-guardian-protocol")).toContainText(
    "First observe",
  );
  await expect(page.getByTestId("landing-guardian-protocol")).toContainText(
    "operator owns",
  );
  await expect(page.getByTestId("landing-capability-reel-video")).toBeVisible();
  await expect(page.getByTestId("landing-capability-spine")).toContainText(
    "See the room think before it acts",
  );
  await expect(page.getByTestId("landing-core-function-switcher")).toBeVisible();
  await expect(page.getByTestId("landing-capability-panel")).toContainText(
    "Existing cameras become a calm review loop",
  );
  await expect(page.getByTestId("landing-thinking-chain")).toContainText(
    "Observe",
  );
  await expect(page.getByTestId("landing-thinking-chain")).toContainText(
    "Approve",
  );
  await expect(page.getByTestId("landing-hero-cta")).toContainText("Enter HQ");
  await expect(page.getByTestId("landing-live-command-preview")).toBeVisible();
  await expect(page.getByTestId("landing-system-architecture")).toBeVisible();
  await expect(page.getByTestId("landing-build-ledger")).toContainText(
    "Being shaped",
  );
  await expect(page.getByTestId("landing-command-contract")).toContainText(
    "The same rules carry inside",
  );
  await expect(page.getByTestId("landing-source-intelligence")).toContainText(
    "No vendoring",
  );
  await expect(page.getByTestId("landing-source-intelligence")).toContainText(
    "Passive-first",
  );
  await expect(page.getByTestId("landing-source-active-queue")).toContainText(
    "What is still being worked now",
  );
  await expect(page.getByTestId("landing-surface-showcase")).toBeVisible();
  await expect(page.getByTestId("landing-agent-bench")).toContainText("ORBIT");
  await expect(page.getByTestId("landing-operator-flow")).toContainText(
    "From signal to remembered proof",
  );
  await expect(page.getByTestId("landing-proof-wall")).toBeVisible();
  await expect(page.getByTestId("landing-surface-panel")).toContainText(
    /Mission Queue|World Picture|Threat Posture|Memory Spine|Proof Plane|Operator Playbooks|Open-Source Sweep/,
  );
  await expect(
    page.getByText(/Get Started|Watch the Film|Client satisfaction/),
  ).toHaveCount(0);
  await expect(page.getByTestId("auth-gate")).toHaveCount(0);
  await expect(page.getByTestId("toprail-brand")).toHaveCount(0);

  if (authEnabled) {
    await expect(page.getByTestId("landing-auth-form")).toBeVisible();
    await expect(page.getByTestId("landing-access-ceremony")).toBeVisible();
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

test("landing drone acknowledges a left-click signal", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-command-backdrop")).toBeVisible();
  await expect(page.getByTestId("landing-guardian-drone")).toHaveAttribute(
    "data-signal-state",
    "idle",
  );

  const box = await page.getByTestId("landing-command-backdrop").boundingBox();
  if (!box) {
    throw new Error("Landing command backdrop did not expose a bounding box");
  }

  await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.34);

  await expect(page.getByTestId("landing-guardian-drone")).toHaveAttribute(
    "data-signal-state",
    "acknowledged",
  );
  await expect(page.getByTestId("landing-drone-signal-pulse")).toBeVisible();
  await expect(
    page.getByTestId("landing-guardian-capability-video"),
  ).toHaveCount(0);
  await expect(page.getByTestId("landing-command-motion")).toHaveCount(0);
});

test("landing token failure returns to the merged ingress form", async ({
  page,
}) => {
  test.skip(
    !authEnabled,
    "NEXUS_TOKEN is required for landing auth failure coverage",
  );

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

test("protected routes hand unauthenticated operators to the premium landing", async ({
  page,
}) => {
  test.skip(
    !authEnabled,
    "NEXUS_TOKEN is required for protected-route handoff coverage",
  );

  const response = await page.goto("/hq", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/\?next=%2Fhq#agency-access$/);
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByTestId("landing-auth-form")).toBeVisible();
  await expect(page.getByTestId("auth-gate")).toHaveCount(0);
});

test("authenticated operators keep the public landing and get a direct HQ continuation", async ({
  page,
}, testInfo) => {
  await seedAuthenticatedShell(page);

  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-page")).toBeVisible();
  await expect(page.getByTestId("landing-hero-cta")).toContainText("Enter HQ");
  await expect(page.getByTestId("landing-header-cta")).toContainText(
    "Enter HQ",
  );
  await expect(page.getByTestId("auth-gate")).toHaveCount(0);
  await expect(page.getByTestId("toprail-brand")).toHaveCount(0);

  await page.getByTestId("landing-hero-cta").click();
  await waitForAuthenticatedShell(page, testInfo, {
    anchorTestId: "hq-command-input",
  });
  await expect(page).toHaveURL(/\/hq(?:\?.*)?$/);
});

test("landing navigation highlights the active scroll section", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-header")).toBeVisible();
  await expect(page.getByTestId("landing-nav-progress")).toBeVisible();
  await expect(page.getByTestId("landing-nav-link-home")).toHaveAttribute(
    "aria-current",
    "page",
  );

  for (const section of ["doctrine", "lanes", "posture", "access"]) {
    await page.evaluate((sectionId) => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    }, section);
    await expect(
      page.getByTestId(`landing-nav-link-${section}`),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("landing surface showcase changes preview panels", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-surface-showcase")).toBeVisible();
  await page.getByTestId("landing-surface-tab-cyber").click();
  await expect(page.getByTestId("landing-surface-panel")).toContainText(
    "Threat Posture",
  );
  await page.getByTestId("landing-surface-tab-vault").click();
  await expect(page.getByTestId("landing-surface-panel")).toContainText(
    "Memory Spine",
  );
});

test("landing capability spine switches core function panels", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });

  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("landing-capability-spine")).toBeVisible();
  await page.getByTestId("landing-capability-tab-cyber").click();
  await expect(page.getByTestId("landing-capability-panel")).toContainText(
    "Risk is made visible before a tool becomes powerful",
  );
  await expect(page.getByTestId("landing-capability-panel")).toContainText(
    "No autonomous escalation",
  );
  await page.getByTestId("landing-capability-tab-recon").click();
  await expect(page.getByTestId("landing-capability-panel")).toContainText(
    "Outside ideas are studied before they enter the room",
  );
  await page.getByTestId("landing-capability-tab-vault").click();
  await expect(page.getByTestId("landing-capability-panel")).toContainText(
    "Proof survives the session",
  );
  await expect(page.getByTestId("landing-thinking-chain")).toContainText(
    "Record",
  );
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
      const heroVideos = document.querySelectorAll<HTMLVideoElement>(
        "[data-testid='landing-hero'] video",
      );
      const commandBackdrop = document.querySelector(
        "[data-testid='landing-command-backdrop']",
      );
      const heroImage = document.querySelector(
        "[data-testid='landing-guardian-hero-image']",
      );
      const root = document.documentElement;
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        motionProfile: root.getAttribute("data-nexus-motion-profile"),
        commandBackdropVisible: Boolean(commandBackdrop),
        heroImageVisible: Boolean(heroImage),
        heroVideoCount: heroVideos.length,
      };
    });

    expect(posture.scrollWidth - posture.clientWidth).toBeLessThanOrEqual(1);
    expect(posture.motionProfile).toBe("reduced");
    expect(posture.commandBackdropVisible).toBe(true);
    expect(posture.heroImageVisible).toBe(true);
    expect(posture.heroVideoCount).toBe(0);
  }
});

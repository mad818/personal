import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedShell(page);
});

async function waitForShell(
  page: Page,
  testInfo: TestInfo,
  options: {
    anchorText?: string | RegExp;
    anchorTestId?: string;
  } = {},
) {
  await waitForAuthenticatedShell(page, testInfo, options);
}

async function waitForTextToDisappear(page: Page, fragments: string[]) {
  await expect
    .poll(
      async () => {
        const text = await page.locator("body").innerText();
        return fragments.every((fragment) => !text.includes(fragment));
      },
      { timeout: 25_000 },
    )
    .toBe(true);
}

async function gotoSurface(page: Page, href: string) {
  const expectedPathname = new URL(href, "http://nexus.local").pathname;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await gotoShell(page, href);

    try {
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 8_000 })
        .toBe(expectedPathname);
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }
}

async function expectCinematicIA(page: Page, surface: string) {
  await expect(page.locator("main.nexus-root-main")).toHaveAttribute(
    "data-cinematic-ia",
    "cinematic-ia-v1",
  );
  await expect(page.locator("main.nexus-root-main")).toHaveAttribute(
    "data-cinematic-surface",
    surface,
  );
  await expect(page.locator("main.nexus-root-main")).toHaveAttribute(
    "data-cinematic-hierarchy",
    "lead-support-continuity",
  );
  await expect(
    page.locator(
      `.nexus-shell-stage--${surface}[data-cinematic-ia="cinematic-ia-v1"]`,
    ),
  ).toBeVisible();
  await expect(
    page
      .locator(`[data-cinematic-zone="lead"], [data-cinematic-zone="canvas"]`)
      .first(),
  ).toBeVisible();
  if (surface !== "hq") {
    const threshold = page.getByTestId("homefront-command-threshold");
    await expect(page.getByTestId("homefront-doctrine-strip")).toBeVisible();
    await expect(
      page.getByTestId("homefront-operating-contract"),
    ).toBeVisible();
    await expect(
      page.getByTestId("homefront-operating-contract").getByText("Lead"),
    ).toBeVisible();
    await expect(threshold).toBeVisible();
    await expect(threshold).toHaveAttribute("data-live-state", /.+/);
    await expect(
      threshold.getByText("Session active", { exact: true }),
    ).toBeVisible();
    await expect(threshold.getByText("Focus", { exact: true })).toBeVisible();
    await expect(page.getByTestId("homefront-live-vision-strip")).toBeVisible();
    await expect(
      page.getByTestId("homefront-live-vision-strip").getByText("Image plane"),
    ).toBeVisible();
    await expect(
      page.getByTestId("homefront-live-vision-strip").getByText("RPG separate"),
    ).toBeVisible();
  }
}

test("ga tabs resolve data states without hanging on dead loading copy", async ({
  page,
}, testInfo) => {
  test.setTimeout(110_000);
  await gotoSurface(page, "/command");
  await waitForShell(page, testInfo, { anchorText: "Connectivity posture" });
  await expectCinematicIA(page, "command");
  await expect(
    page.getByText("Connectivity posture", { exact: true }),
  ).toBeVisible();
  await waitForTextToDisappear(page, [
    "Loading market breadth",
    "Loading threat feed",
  ]);

  await gotoSurface(page, "/intel");
  await waitForShell(page, testInfo, { anchorText: "Topic heatmap" });
  await expectCinematicIA(page, "intel");
  await gotoSurface(page, "/intel?focus=intel-world");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: world posture",
  });
  await expectCinematicIA(page, "intel");
  await expect(page.getByText("World risk map", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading conflict intelligence…"]);

  await gotoSurface(page, "/alpha");
  await waitForShell(page, testInfo, { anchorText: "Watchlist manager" });
  await expectCinematicIA(page, "alpha");
  await gotoSurface(page, "/alpha?focus=alpha-scanner");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: momentum scanner",
  });
  await expectCinematicIA(page, "alpha");
  await expect(
    page.getByText("Momentum scanner", { exact: true }),
  ).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await gotoSurface(page, "/alpha?focus=alpha-signals");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: signal engine",
  });
  await expectCinematicIA(page, "alpha");
  await expect(page.getByText("Signal engine", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await gotoSurface(page, "/cyber");
  await waitForShell(page, testInfo, { anchorText: "Priority queue" });
  await expectCinematicIA(page, "cyber");
  await expect(page.getByText("Priority queue", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat feeds…"]);

  await gotoSurface(page, "/cyber?focus=cyber-matrix");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: severity matrix",
  });
  await expectCinematicIA(page, "cyber");
  await expect(
    page.getByText("Severity matrix", { exact: true }),
  ).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat data…"]);

  await gotoSurface(page, "/recon");
  await waitForShell(page, testInfo, { anchorText: "OSINT lookup" });
  await expectCinematicIA(page, "recon");
  await expect(page.getByText("OSINT lookup", { exact: true })).toBeVisible();

  await gotoSurface(page, "/vault");
  await waitForShell(page, testInfo, { anchorText: "Document intake" });
  await expectCinematicIA(page, "vault");
  await expect(
    page.getByText("Compiled memory pages", { exact: true }),
  ).toBeVisible();

  await gotoSurface(page, "/resources?view=study");
  await waitForShell(page, testInfo, { anchorText: "How This Helps" });
  await expectCinematicIA(page, "resources");
  await expect(
    page.getByText("Frame the question", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open System Brain" }),
  ).toBeVisible();

  await gotoSurface(page, "/vault?focus=vault-memory-project");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: project memory",
  });
  await expectCinematicIA(page, "vault");
  await expect(
    page.getByText("Focused session: project memory", { exact: true }),
  ).toBeVisible();
});

test("resources hides external export helpers behind disclosure panels", async ({
  page,
}, testInfo) => {
  await gotoSurface(page, "/resources");
  await waitForShell(page, testInfo, { anchorText: "How This Helps" });
  await expectCinematicIA(page, "resources");

  await gotoSurface(page, "/resources?view=playbooks");
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expectCinematicIA(page, "resources");
  await expect(page.getByText("Run the playbook")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy brief" })).toBeHidden();
  await page.locator("summary", { hasText: "Use outside Nexus" }).click();
  await expect(page.getByRole("button", { name: "Copy brief" })).toBeVisible();

  await gotoSurface(page, "/resources?view=specs");
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expectCinematicIA(page, "resources");
  await expect(page.getByText("Write the spec")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy starter" })).toBeHidden();
  await page.locator("summary", { hasText: "Use outside Nexus" }).click();
  await expect(
    page.getByRole("button", { name: "Copy starter" }),
  ).toBeVisible();
});

test("resources exposes massive win planning as a native command lane", async ({
  page,
}, testInfo) => {
  await gotoSurface(page, "/resources?view=wins");
  await waitForShell(page, testInfo, { anchorText: "Massive wins" });
  await page.getByRole("tab", { name: "Massive wins" }).click();
  await expectCinematicIA(page, "resources");

  await expect(
    page.getByRole("heading", { name: "Massive Win Console" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "MW6 full-game production completion" }),
  ).toBeVisible();
  await expect(
    page.getByText("Production readiness foundation", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".nexus-massive-win-card", {
      has: page.getByRole("heading", {
        name: "MW6 full-game production completion",
      }),
    })
    .locator("summary", { hasText: "Verification gates" })
    .click();
  await expect(page.getByText("npm run arpg:production:check")).toBeVisible();
});

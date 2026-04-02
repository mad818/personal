import { expect, test, type Page } from "@playwright/test";

const validToken = process.env.NEXUS_TOKEN ?? "";

async function submitAuthForm(page: Page) {
  await page.getByTestId("auth-form").evaluate((form) => {
    HTMLFormElement.prototype.requestSubmit.call(form);
  });
}

async function loginIfNeeded(page: Page) {
  const authGate = page.getByTestId("auth-gate");
  if (!(await authGate.isVisible().catch(() => false))) return;
  test.skip(!validToken, "NEXUS_TOKEN is required for hq:e2e");
  await page.getByTestId("auth-token-input").fill(validToken);
  await submitAuthForm(page);
  await expect(authGate).toHaveCount(0);
}

async function settleShell(page: Page, mode: "shell" | "hq" = "shell") {
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("toprail-brand")).toBeVisible();
  if (mode === "hq") {
    await expect(
      page.getByRole("textbox", {
        name: "Talk to MAX — he routes to the right specialist…",
      }),
    ).toBeVisible();
  }
}

test("hq shell stays interactive without hydration regressions", async ({
  page,
}) => {
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

  await page.goto("/hq");
  await loginIfNeeded(page);
  await settleShell(page, "hq");

  await expect(page.getByTestId("toprail-brand")).toBeVisible();
  await expect(page).toHaveURL(/\/hq$/);

  await page.getByTestId("nav-tab-command").click();
  await expect(page).toHaveURL(/\/command$/);
  await settleShell(page);

  await page.getByTestId("nav-tab-intel").click();
  await expect(page).toHaveURL(/\/intel(\?view=news)?$/);
  await settleShell(page);

  await page.getByTestId("nav-tab-hq").click();
  await expect(page).toHaveURL(/\/hq$/);
  await settleShell(page, "hq");
  await expect(page.getByTestId("toprail-settings")).toBeVisible();
  await expect(page.getByTestId("toprail-notifications")).toBeVisible();

  await page.getByTestId("toprail-notifications").click();
  await expect(page.locator('nav[data-overlay-state="notifications"]')).toBeVisible();
  const notificationsDialog = page.getByTestId("notifications-dialog");
  await expect(notificationsDialog).toBeVisible();
  await page.getByTestId("notifications-filter-critical").click();
  await expect(page.getByTestId("toprail-notifications")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(notificationsDialog).toHaveCount(0);

  await page.getByTestId("toprail-settings").click();
  await expect(page.locator('nav[data-overlay-state="settings"]')).toBeVisible();
  const settingsDialog = page.getByTestId("settings-dialog");
  await expect(settingsDialog).toBeVisible();
  await expect(page.getByTestId("toprail-settings")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(settingsDialog).toHaveCount(0);

  await page.getByTestId("nav-tab-command").click();
  await expect(page).toHaveURL(/\/command$/);
  await page.getByTestId("nav-tab-hq").click();
  await expect(page).toHaveURL(/\/hq$/);

  const hydrationIssues = issues.filter((entry) =>
    /hydration|Text content does not match server-rendered HTML/i.test(entry),
  );

  expect(hydrationIssues).toEqual([]);
});

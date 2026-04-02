import { expect, test, type Page } from "@playwright/test";

const validToken = process.env.NEXUS_TOKEN ?? "";

async function submitAuthForm(page: Page) {
  await page.getByTestId("auth-form").evaluate((form) => {
    HTMLFormElement.prototype.requestSubmit.call(form);
  });
}

test.describe("auth gate", () => {
  test("rejects an invalid token and stays on the gate", async ({ page }) => {
    await page.goto("/hq");

    await expect(page.getByTestId("auth-gate")).toBeVisible();
    await page.getByTestId("auth-token-input").fill("definitely-wrong");
    await submitAuthForm(page);

    await expect(page).toHaveURL(/authError=invalid/);
    await expect(page.getByTestId("auth-status")).toContainText("Invalid token");
    await expect(page.getByTestId("auth-gate")).toBeVisible();
  });

  test("accepts a valid token and keeps the session across refresh", async ({
    page,
  }) => {
    test.skip(!validToken, "NEXUS_TOKEN is required for auth:e2e");

    await page.goto("/hq");
    await page.getByTestId("auth-token-input").fill(validToken);
    await submitAuthForm(page);

    await expect(page.getByTestId("auth-gate")).toHaveCount(0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("auth-gate")).toHaveCount(0);

    const statusResponse = await page.goto("/api/status");
    expect(statusResponse?.status()).toBe(200);
  });

  test("clears stale session token state and relocks after reset", async ({
    page,
  }) => {
    await page.goto("/hq");
    await expect(page.getByTestId("auth-gate")).toBeVisible();

    await page.evaluate(() => {
      window.sessionStorage.setItem("nexus_session_token", "definitely-wrong");
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("auth-gate")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.sessionStorage.getItem("nexus_session_token")),
      )
      .toBeNull();

    await page.goto("/internal/reset");
    await expect(page.getByTestId("auth-gate")).toBeVisible();

    const statusResponse = await page.goto("/api/status");
    expect(statusResponse?.status()).toBe(401);
  });
});

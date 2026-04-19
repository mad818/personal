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
  test.skip(!validToken, "NEXUS_TOKEN is required for tabs:e2e");
  await page.getByTestId("auth-token-input").fill(validToken);
  await submitAuthForm(page);
  await expect(authGate).toHaveCount(0);
}

async function waitForShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByTestId("toprail-brand")).toBeVisible();
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

test("ga tabs resolve data states without hanging on dead loading copy", async ({
  page,
}) => {
  await page.goto("/command");
  await loginIfNeeded(page);
  await waitForShell(page);
  await expect(page.getByText("Vector snapshot")).toBeVisible();
  await waitForTextToDisappear(page, [
    "Loading market breadth",
    "Loading threat feed",
  ]);

  await page.goto("/intel");
  await waitForShell(page);
  await page.getByRole("tab", { name: /GEOPOLITICAL/i }).click();
  await expect(page.getByText("World risk map")).toBeVisible();
  await waitForTextToDisappear(page, [
    "Loading conflict intelligence…",
    "No conflict data available.",
  ]);

  await page.goto("/alpha");
  await waitForShell(page);
  await page.getByRole("tab", { name: /SCANNER/i }).click();
  await expect(page.getByText("Momentum scanner")).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await page.getByRole("tab", { name: /SIGNALS/i }).click();
  await expect(page.getByText("Signal engine")).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await page.goto("/cyber");
  await waitForShell(page);
  await page.getByRole("tab", { name: /TRIAGE/i }).click();
  await expect(page.getByText("Triage view")).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat feeds…"]);

  await page.getByRole("tab", { name: /MATRIX/i }).click();
  await expect(page.getByText("Severity matrix")).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat data…"]);

  await page.goto("/recon");
  await waitForShell(page);
  await expect(page.getByText("OSINT lookup")).toBeVisible();

  await page.goto("/vault");
  await waitForShell(page);
  await expect(page.getByText("Saved articles")).toBeVisible();
});

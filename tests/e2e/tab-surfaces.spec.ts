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

test("ga tabs resolve data states without hanging on dead loading copy", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/command");
  await waitForShell(page, testInfo, { anchorText: "Offline readiness" });
  await expect(page.getByText("Offline readiness", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, [
    "Loading market breadth",
    "Loading threat feed",
  ]);

  await gotoShell(page, "/intel");
  await waitForShell(page, testInfo, { anchorText: "Topic heatmap" });
  await gotoShell(page, "/intel?focus=intel-world");
  await waitForShell(page, testInfo, { anchorText: "Focused session: world posture" });
  await expect(page.getByText("World risk map", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading conflict intelligence…"]);

  await gotoShell(page, "/alpha");
  await waitForShell(page, testInfo, { anchorText: "Watchlist manager" });
  await gotoShell(page, "/alpha?focus=alpha-scanner");
  await waitForShell(page, testInfo, { anchorText: "Focused session: momentum scanner" });
  await expect(page.getByText("Momentum scanner", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await gotoShell(page, "/alpha?focus=alpha-signals");
  await waitForShell(page, testInfo, { anchorText: "Focused session: signal engine" });
  await expect(page.getByText("Signal engine", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await gotoShell(page, "/cyber");
  await waitForShell(page, testInfo, { anchorText: "Priority queue" });
  await expect(page.getByText("Priority queue", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat feeds…"]);

  await gotoShell(page, "/cyber?focus=cyber-matrix");
  await waitForShell(page, testInfo, { anchorText: "Focused session: severity matrix" });
  await expect(page.getByText("Severity matrix", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat data…"]);

  await gotoShell(page, "/recon");
  await waitForShell(page, testInfo, { anchorText: "OSINT lookup" });
  await expect(page.getByText("OSINT lookup", { exact: true })).toBeVisible();

  await gotoShell(page, "/vault");
  await waitForShell(page, testInfo, { anchorText: "Document intake" });
  await expect(page.getByText("Compiled memory pages", { exact: true })).toBeVisible();

  await gotoShell(page, "/resources?view=study");
  await waitForShell(page, testInfo, { anchorText: "How This Helps" });
  await expect(page.getByText("Frame the question", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open System Brain" })).toBeVisible();

  await gotoShell(page, "/vault?focus=vault-memory-project");
  await waitForShell(page, testInfo, { anchorText: "Focused session: project memory" });
  await expect(
    page.getByText("Focused session: project memory", { exact: true }),
  ).toBeVisible();
});

test("resources hides external export helpers behind disclosure panels", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/resources");
  await waitForShell(page, testInfo, { anchorText: "How This Helps" });

  await gotoShell(page, "/resources?view=playbooks");
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expect(page.getByText("Run the playbook")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy brief" })).toBeHidden();
  await page.locator("summary", { hasText: "Use outside Nexus" }).click();
  await expect(page.getByRole("button", { name: "Copy brief" })).toBeVisible();

  await gotoShell(page, "/resources?view=specs");
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expect(page.getByText("Write the spec")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy starter" })).toBeHidden();
  await page.locator("summary", { hasText: "Use outside Nexus" }).click();
  await expect(page.getByRole("button", { name: "Copy starter" })).toBeVisible();
});

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
  await gotoShell(page, "/hq");
  await waitForShell(page, testInfo, { anchorTestId: "hq-command-input" });

  await expect(page.getByTestId("hq-command-input")).toBeVisible();
  await waitForTextToDisappear(page, ["NO DATA"]);

  await gotoShell(page, "/command");
  await waitForShell(page, testInfo, { anchorText: "System Posture" });
  await expect(page.getByText("Offline readiness", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, [
    "Loading market breadth",
    "Loading threat feed",
  ]);

  await gotoShell(page, "/intel");
  await waitForShell(page, testInfo, { anchorText: "News Brief" });
  await page.getByRole("tab", { name: /GEOPOLITICAL/i }).click();
  await expect(page.getByText("Theater Posture", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading conflict intelligence…"]);

  await gotoShell(page, "/alpha");
  await waitForShell(page, testInfo, { anchorText: "Market Brief" });
  await page.getByRole("tab", { name: /SCANNER/i }).click();
  await expect(page.getByText("Momentum scanner", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await page.getByRole("tab", { name: /SIGNALS/i }).click();
  await expect(page.getByText("Signal engine", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await gotoShell(page, "/cyber");
  await waitForShell(page, testInfo, { anchorText: "Threat Brief" });
  await page.getByRole("tab", { name: /TRIAGE/i }).click();
  await expect(page.getByText("Threat Brief", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat feeds…"]);

  await page.getByRole("tab", { name: /MATRIX/i }).click();
  await expect(page.getByText("Priority Grid", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat data…"]);

  await gotoShell(page, "/recon");
  await waitForShell(page, testInfo, { anchorText: "Target Brief" });
  await expect(page.getByText("Collection Workbench", { exact: true })).toBeVisible();

  await gotoShell(page, "/vault");
  await waitForShell(page, testInfo, { anchorText: "Memory Brief" });
  await expect(page.getByText("Durable Artifacts", { exact: true })).toBeVisible();

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
  await page.getByText("Use outside Nexus").click();
  await expect(page.getByText("Copy brief")).toBeVisible();

  await gotoShell(page, "/resources?view=specs");
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expect(page.getByText("Write the spec")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy starter" })).toBeHidden();
  await page.getByText("Use outside Nexus").click();
  await expect(page.getByText("Copy starter")).toBeVisible();
});

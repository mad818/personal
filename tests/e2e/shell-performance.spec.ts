import { expect, test } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedShell(page);
});

test("click-activated shell overlays remain fully available", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/command");
  await waitForAuthenticatedShell(page, testInfo);

  await expect(page.getByTestId("settings-dialog")).toHaveCount(0);
  await expect(page.getByTestId("notifications-dialog")).toHaveCount(0);

  await page.getByTestId("toprail-settings").click();
  await expect(page.getByTestId("settings-dialog")).toBeVisible();
  await page.getByTestId("settings-close").click();
  await expect(page.getByTestId("settings-dialog")).toHaveCount(0);

  await page.getByTestId("toprail-notifications").click();
  await expect(page.getByTestId("notifications-dialog")).toBeVisible();
  await page.getByTestId("notifications-close").click();
  await expect(page.getByTestId("notifications-dialog")).toHaveCount(0);
});

test("interaction-gated route chambers remain available through deep links", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/skills?view=library");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Skill library",
  });
  await expect(page.locator("#skills-library")).toBeVisible();

  await gotoShell(page, "/security?view=physical");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Live monitoring",
  });
  await expect(page.locator("#security-physical")).toBeVisible();

  await gotoShell(page, "/resources?view=voice-lab");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Voice Lab",
  });
  await expect(
    page.getByRole("tab", { name: "Voice Lab", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("vehicle and iot deferred operational panels remain available", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/vehicle");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Telemetry · Last 20 min",
    timeoutMs: 30_000,
  });
  await expect(page.getByText("Sensor System Health", { exact: true })).toBeVisible();
  await expect(page.getByText("First hardware day", { exact: true }).last()).toBeVisible();

  await gotoShell(page, "/iot");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "24-Hour Temperature Forecast",
    timeoutMs: 30_000,
  });
  await expect(page.getByText(/Device Registry —/).first()).toBeVisible();
  await expect(page.getByText(/Automation Rules —/).first()).toBeVisible();
});

test("vault chambers and command diagnostics remain available through deep links", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/vault?view=relations");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Relations topology",
    timeoutMs: 30_000,
  });
  await expect(page.getByText("Vault librarian", { exact: true })).toBeVisible();

  await gotoShell(page, "/vault?view=publish");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Durable publishing",
    timeoutMs: 30_000,
  });
  await expect(page.getByText("Export archive bundles", { exact: true })).toBeVisible();

  await gotoShell(page, "/command?focus=provider-health");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Privacy shield preview",
    timeoutMs: 30_000,
  });
  await expect(page.getByText("Provider health", { exact: true }).first()).toBeVisible();
});

test("cyber chambers and intel segments remain available through deep links", async ({
  page,
}, testInfo) => {
  await gotoShell(page, "/cyber?view=cisa");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Known exploited vulnerabilities",
    timeoutMs: 30_000,
  });

  await gotoShell(page, "/cyber?view=vuln-review");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Vulnerability review",
    timeoutMs: 30_000,
  });

  await gotoShell(page, "/intel?view=world");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "World risk map",
    timeoutMs: 30_000,
  });
  await expect(page.getByText("Alpha Earth", { exact: true })).toBeVisible();

  await gotoShell(page, "/intel?view=sweeps");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Sweep engine",
    timeoutMs: 30_000,
  });
});

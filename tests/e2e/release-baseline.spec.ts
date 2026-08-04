import { expect, test } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedShell(page);
});

test("combined release exposes capability truth across its three operator mounts", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  await gotoShell(page, "/command");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Connectivity posture",
  });
  await expect(
    page.getByText("Verified capability posture", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Capability assurance contracts")).toBeVisible();

  await gotoShell(page, "/internal/skills?view=brain");
  await waitForAuthenticatedShell(page, testInfo);
  await expect(
    page.getByText("Learning from verified outcomes", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Capability assurance contracts")).toBeVisible();

  await gotoShell(page, "/resources?view=surfaces");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Cross-tab capability audit",
  });
  await expect(
    page.getByText("Capability truth manual", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Capability assurance contracts")).toBeVisible();
});

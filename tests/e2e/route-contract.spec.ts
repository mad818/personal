import { expect, test, type Page } from "@playwright/test";

const validToken = process.env.NEXUS_TOKEN ?? "";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function submitAuthForm(page: Page) {
  await page.getByTestId("auth-form").evaluate((form) => {
    HTMLFormElement.prototype.requestSubmit.call(form);
  });
}

async function loginIfNeeded(page: Page) {
  const authGate = page.getByTestId("auth-gate");
  if (!(await authGate.isVisible().catch(() => false))) return;
  test.skip(!validToken, "NEXUS_TOKEN is required for route-contract:e2e");
  await page.getByTestId("auth-token-input").fill(validToken);
  await submitAuthForm(page);
  await expect(authGate).toHaveCount(0);
}

test("canonical redirects and GA nav links stay aligned", async ({ page }) => {
  const redirectCases = [
    { from: "/", to: "/hq" },
    { from: "/home", to: "/hq" },
    { from: "/signals", to: "/labs/signals" },
    { from: "/ops", to: "/labs/ops" },
    { from: "/security", to: "/labs/security" },
    { from: "/skills", to: "/internal/skills" },
    { from: "/vehicle", to: "/internal/vehicle" },
    { from: "/iot", to: "/internal/iot" },
  ];

  for (const { from, to } of redirectCases) {
    await page.goto(from);
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(to)}$`));
  }

  await page.goto("/hq");
  await loginIfNeeded(page);

  const expectedNav = [
    { testId: "nav-tab-hq", href: "/hq" },
    { testId: "nav-tab-command", href: "/command" },
    { testId: "nav-tab-intel", href: "/intel" },
    { testId: "nav-tab-alpha", href: "/alpha" },
    { testId: "nav-tab-cyber", href: "/cyber" },
    { testId: "nav-tab-recon", href: "/recon" },
    { testId: "nav-tab-vault", href: "/vault" },
  ];

  for (const { testId, href } of expectedNav) {
    await expect(page.getByTestId(testId)).toHaveAttribute("href", href);
  }

  await expect(page.getByTestId("nav-tab-resources")).toHaveCount(0);
});

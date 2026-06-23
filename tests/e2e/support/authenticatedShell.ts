import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const validToken = process.env.NEXUS_TOKEN?.trim() ?? "";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";

function getCookieUrl() {
  const parsed = new URL(baseUrl);
  return parsed.origin.endsWith("/") ? parsed.origin : `${parsed.origin}/`;
}

export async function seedAuthenticatedShell(page: Page) {
  test.skip(!validToken, "NEXUS_TOKEN is required for authenticated shell Playwright suites");
  const response = await page.request.post(`${getCookieUrl()}api/token`, {
    data: { token: validToken, elevate: true },
  });
  expect(response.ok(), "seedAuthenticatedShell should mint a valid local session").toBe(true);
}

/** HQ e2e that exercises the RPG playfield needs full layout, not compact chat-first. */
export async function seedFullHqLayout(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = window.localStorage.getItem("nexus-settings");
      const parsed = raw ? JSON.parse(raw) : { state: {} };
      const state = parsed.state && typeof parsed.state === "object" ? parsed.state : {};
      state.settings = {
        ...(state.settings && typeof state.settings === "object" ? state.settings : {}),
        hqCompactOperatorLayout: false,
        hqConsoleFocusMode: "game",
      };
      parsed.state = state;
      window.localStorage.setItem("nexus-settings", JSON.stringify(parsed));
    } catch {
      // Silent: tests fall back to compact HQ if storage is blocked.
    }
  });
}

async function buildShellDiagnostics(page: Page) {
  const authGate = page.getByTestId("auth-gate");
  const authStatus = page.getByTestId("auth-status");
  const toprail = page.getByTestId("toprail-brand");
  const shellRecovery = page.getByTestId("shell-bootstrap-recovery");
  const shellHealthRecovery = page.getByTestId("shell-health-recovery");

  return {
    url: page.url(),
    normalizedUrl: normalizePageUrl(page.url()).toString(),
    authGateVisible: await authGate.isVisible().catch(() => false),
    authStatusText: await authStatus.textContent().catch(() => null),
    toprailVisible: await toprail.isVisible().catch(() => false),
    shellBootstrapRecoveryVisible: await shellRecovery.isVisible().catch(() => false),
    shellHealthRecoveryVisible: await shellHealthRecovery.isVisible().catch(() => false),
    htmlState: await page
      .evaluate(() => ({
        boot: document.documentElement.getAttribute("data-nexus-shell-boot"),
        heal: document.documentElement.getAttribute("data-nexus-shell-heal"),
        title: document.title,
      }))
      .catch(() => null),
  };
}

export function normalizePageUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.delete("__shellHeal");
  return url;
}

export async function waitForCanonicalUrl(
  page: Page,
  assertUrl: (url: URL) => void,
  timeoutMs = 12_000,
) {
  await expect
    .poll(
      () => {
        try {
          assertUrl(normalizePageUrl(page.url()));
          return "ok";
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      },
      { timeout: timeoutMs },
    )
    .toBe("ok");
}

export async function gotoShell(page: Page, href: string) {
  try {
    await page.goto(href, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!String(error).includes("net::ERR_ABORTED")) {
      throw error;
    }
  }
}

async function expectVisibleLocator(
  locator: Locator,
  timeout: number,
  label: string,
) {
  await expect(locator, `${label} should be visible`).toBeVisible({ timeout });
}

type WaitForAuthenticatedShellOptions = {
  anchorTestId?: string;
  anchorText?: string | RegExp;
  anchorExact?: boolean;
  timeoutMs?: number;
};

export async function waitForAuthenticatedShell(
  page: Page,
  testInfo: TestInfo,
  options: WaitForAuthenticatedShellOptions = {},
) {
  const timeout = options.timeoutMs ?? 15_000;
  await page.waitForLoadState("domcontentloaded");

  try {
    await expect(page.getByTestId("auth-gate")).toHaveCount(0, { timeout });
    await expectVisibleLocator(page.getByTestId("toprail-brand"), timeout, "toprail-brand");

    if (options.anchorTestId) {
      await expectVisibleLocator(
        page.getByTestId(options.anchorTestId),
        timeout,
        `anchor test id ${options.anchorTestId}`,
      );
    }

    if (options.anchorText) {
      const anchorLocator = page
        .getByText(options.anchorText, {
          exact: typeof options.anchorText === "string" ? options.anchorExact ?? true : undefined,
        })
        .first();
      await expectVisibleLocator(
        anchorLocator,
        timeout,
        `anchor text ${String(options.anchorText)}`,
      );
    }
  } catch (error) {
    const diagnostics = await buildShellDiagnostics(page);
    await testInfo.attach("auth-shell-diagnostics", {
      body: JSON.stringify(diagnostics, null, 2),
      contentType: "application/json",
    });
    throw new Error(
      `Authenticated shell readiness failed: ${JSON.stringify(diagnostics)}\n${String(error)}`,
    );
  }
}

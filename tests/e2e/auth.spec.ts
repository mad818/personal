import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  gotoShell,
  waitForAuthenticatedShell,
  waitForCanonicalUrl,
} from "@/tests/e2e/support/authenticatedShell";

const validToken = process.env.NEXUS_TOKEN ?? "";

async function clickAuthSubmit(page: Page) {
  await page.getByTestId("auth-submit").click();
}

async function expectStyledShell(page: Page) {
  const posture = await page.evaluate(() => {
    const toprail = document.querySelector<HTMLElement>(".nexus-toprail");
    const main = document.querySelector<HTMLElement>("main");
    const hqShell = document.querySelector(".nexus-hq-shell");
    return {
      toprailPosition: toprail ? window.getComputedStyle(toprail).position : "missing",
      mainPaddingTop: main ? window.getComputedStyle(main).paddingTop : "0px",
      hasHQShell: Boolean(hqShell),
    };
  });

  expect(posture.toprailPosition).toBe("fixed");
  expect(Number.parseFloat(posture.mainPaddingTop)).toBeGreaterThan(60);
  expect(posture.hasHQShell).toBeTruthy();
}

test.describe("auth gate", () => {
  test("rejects an invalid token and stays on the gate", async ({ page }) => {
    await gotoShell(page, "/hq");

    await expect(page.getByTestId("auth-gate")).toBeVisible();
    await page.getByTestId("auth-token-input").fill("definitely-wrong");
    await clickAuthSubmit(page);

    await expect(page.getByTestId("auth-status")).toContainText("Invalid token");
    await expect(page.getByTestId("auth-gate")).toBeVisible();
    await expect(page.getByTestId("toprail-brand")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          path: window.location.pathname,
          token: window.sessionStorage.getItem("nexus_session_token"),
        })),
      )
      .toEqual({
        path: "/hq",
        token: null,
      });
  });

  test("accepts a valid token and keeps the session across refresh", async ({
    page,
  }, testInfo: TestInfo) => {
    test.skip(!validToken, "NEXUS_TOKEN is required for auth:e2e");

    await gotoShell(page, "/hq");
    await page.getByTestId("auth-token-input").fill(validToken);
    await clickAuthSubmit(page);

    await waitForAuthenticatedShell(page, testInfo, {
      anchorTestId: "hq-command-input",
    });
    await expectStyledShell(page);
    await waitForCanonicalUrl(page, (url) => {
      expect(url.pathname).toBe("/hq");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForAuthenticatedShell(page, testInfo, {
      anchorTestId: "hq-command-input",
    });
    await expectStyledShell(page);

    const statusResponse = await page.goto("/api/status");
    expect(statusResponse?.status()).toBe(200);
  });

  test("restores the strongest prepared exact session after valid auth", async ({
    page,
  }, testInfo: TestInfo) => {
    test.skip(!validToken, "NEXUS_TOKEN is required for auth:e2e");

    await page.addInitScript(() => {
      window.localStorage.setItem(
        "nexus-settings",
        JSON.stringify({
          state: {
            preparedWorkspace: {
              href: "/vault?focus=vault-stewardship",
              label: "Open VAULT stewardship",
              detail:
                "Prepared the archive-health lane so route continuity, tags, and orphan recovery are ready first.",
              intent: "archive_continuity",
              sourceQuery: "repair the archive",
              preparedAt: Date.now(),
            },
          },
          version: 1,
        }),
      );
    });

    await gotoShell(page, "/vault");
    await expect(page.getByTestId("auth-gate")).toBeVisible();
    await page.getByTestId("auth-token-input").fill(validToken);
    await clickAuthSubmit(page);

    await waitForAuthenticatedShell(page, testInfo, {
      anchorText: "Focused session: vault stewardship",
    });
    await waitForCanonicalUrl(page, (url) => {
      expect(url.pathname).toBe("/vault");
      expect(url.searchParams.get("focus")).toBe("vault-stewardship");
    });
  });

  test("repairs malformed persisted shell state before the authenticated shell mounts", async ({
    page,
  }, testInfo: TestInfo) => {
    test.skip(!validToken, "NEXUS_TOKEN is required for auth:e2e");

    await page.addInitScript(() => {
      window.localStorage.setItem(
        "nexus-settings",
        JSON.stringify({
          state: {
            settings: {
              aiProvider: "definitely-not-real",
              officeSplitHeightPx: 999999,
              officeMotion: 99,
              officeSceneMode: "chaos",
              officeCameraPreset: "bad-camera",
              officeOperationalMode: "bad-mode",
              officeVfxQuality: "ultra",
              allowAdvancedProviders: false,
            },
            activePersona: "???",
          },
          version: 1,
        }),
      );
      window.localStorage.setItem(
        "nexus:vault-graph-filters:v1",
        "{\"source\":\"bad\"",
      );
      window.localStorage.setItem(
        "nexus:scheduler-audit-filters:v1",
        JSON.stringify({ lane: "wrong", status: "broken", window: "forever" }),
      );
      window.localStorage.setItem(
        "nexus:scheduler-audit-views:v1",
        JSON.stringify([{ id: "", name: "", filters: { lane: "wrong" } }]),
      );
      window.localStorage.setItem("nexus_hq_split_drag_locked", "maybe");
    });

    await gotoShell(page, "/hq");
    await page.getByTestId("auth-token-input").fill(validToken);
    await clickAuthSubmit(page);

    await waitForAuthenticatedShell(page, testInfo, {
      anchorTestId: "hq-command-input",
    });
    await expect(page.getByTestId("persisted-shell-state-notice")).toBeVisible();
    await expectStyledShell(page);

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem("nexus-settings");
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw) as {
              state?: {
                settings?: {
                  aiProvider?: string;
                  officeSplitHeightPx?: number;
                  officeMotion?: number;
                  officeSceneMode?: string;
                  officeCameraPreset?: string;
                  officeOperationalMode?: string;
                  officeVfxQuality?: string;
                };
                activePersona?: string;
              };
            };
            return {
              aiProvider: parsed.state?.settings?.aiProvider ?? null,
              officeSplitHeightPx:
                parsed.state?.settings?.officeSplitHeightPx ?? null,
              officeMotion: parsed.state?.settings?.officeMotion ?? null,
              officeSceneMode: parsed.state?.settings?.officeSceneMode ?? null,
              officeCameraPreset:
                parsed.state?.settings?.officeCameraPreset ?? null,
              officeOperationalMode:
                parsed.state?.settings?.officeOperationalMode ?? null,
              officeVfxQuality:
                parsed.state?.settings?.officeVfxQuality ?? null,
              activePersona: parsed.state?.activePersona ?? null,
            };
          } catch {
            return "parse-error";
          }
        }),
      )
      .toEqual({
        aiProvider: "ollama",
        officeSplitHeightPx: 700,
        officeMotion: 1,
        officeSceneMode: "auto",
        officeCameraPreset: "cinematic",
        officeOperationalMode: "normal",
        officeVfxQuality: "low",
        activePersona: "formal",
      });

    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("nexus:vault-graph-filters:v1")),
      )
      .toBeNull();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("nexus:scheduler-audit-filters:v1"),
        ),
      )
      .toBe("{\"lane\":\"all\",\"status\":\"all\",\"window\":\"all\"}");
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("nexus:scheduler-audit-views:v1"),
        ),
      )
      .toBe("[]");
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem("nexus_hq_split_drag_locked")),
      )
      .toBeNull();
  });

  test("clears stale session token state and relocks after reset", async ({
    page,
  }) => {
    await gotoShell(page, "/hq");
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

import { expect, test, type Page, type Route, type TestInfo } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  seedExpandedHqLayout,
  waitForCanonicalUrl,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test.beforeEach(async ({ page }) => {
  await seedExpandedHqLayout(page);
  await seedAuthenticatedShell(page);
});

async function settleShell(
  page: Page,
  testInfo: TestInfo,
  mode: "shell" | "hq" = "shell",
) {
  await waitForAuthenticatedShell(page, testInfo, {
    anchorTestId: mode === "hq" ? "hq-console-shell" : undefined,
  });
}

async function openHqChat(page: Page) {
  await page.getByTestId("hq-focus-chat").click();
  await expect(page.getByTestId("hq-chat-panel")).toBeVisible();
  await expect(page.getByTestId("hq-command-input")).toBeVisible();
}

async function expectStyledShell(page: Page, mode: "shell" | "hq" = "shell") {
  const posture = await page.evaluate((expectedMode) => {
    const toprail = document.querySelector<HTMLElement>(".nexus-toprail");
    const main = document.querySelector<HTMLElement>("main");
    const hqShell = document.querySelector(".nexus-hq-shell");
    return {
      toprailPosition: toprail ? window.getComputedStyle(toprail).position : "missing",
      mainPaddingTop: main ? window.getComputedStyle(main).paddingTop : "0px",
      mainCinematicIA: main?.getAttribute("data-cinematic-ia") ?? "missing",
      mainCinematicSurface: main?.getAttribute("data-cinematic-surface") ?? "missing",
      mainCinematicHierarchy:
        main?.getAttribute("data-cinematic-hierarchy") ?? "missing",
      hasHQShell: expectedMode === "hq" ? Boolean(hqShell) : true,
    };
  }, mode);

  expect(posture.toprailPosition).toBe("fixed");
  expect(Number.parseFloat(posture.mainPaddingTop)).toBeGreaterThan(60);
  expect(posture.mainCinematicIA).toBe("cinematic-ia-v1");
  expect(posture.mainCinematicSurface).toBe("hq");
  expect(posture.mainCinematicHierarchy).toBe("lead-support-continuity");
  expect(posture.hasHQShell).toBeTruthy();
}

test("hq shell stays interactive without hydration regressions", async ({
  page,
}, testInfo) => {
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

  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");
  await expectStyledShell(page, "hq");

  await expect(page.getByTestId("toprail-brand")).toBeVisible();
  await expect(
    page.locator('.nexus-shell-stage--hq[data-cinematic-ia="cinematic-ia-v1"]'),
  ).toBeVisible();
  await expect(page.getByTestId("homefront-visual-parity")).toBeVisible();
  await expect(page.getByTestId("homefront-visual-parity")).toHaveAttribute(
    "data-surface",
    "hq",
  );
  await expect(page.getByTestId("homefront-visual-parity")).toHaveAttribute(
    "data-interior-polish",
    "true",
  );
  await expect(page.getByTestId("homefront-surface-module")).toBeVisible();
  await expect(page.getByTestId("homefront-workplane-summary")).toHaveCount(0);
  await waitForCanonicalUrl(page, (url) => {
    expect(url.pathname).toBe("/hq");
  });
  await expect(page.getByTestId("toprail-settings")).toBeVisible();
  await expect(page.getByTestId("toprail-notifications")).toBeVisible();

  const hydrationIssues = issues.filter((entry) =>
    /hydration|Text content does not match server-rendered HTML/i.test(entry),
  );

  expect(hydrationIssues).toEqual([]);
});

test("bootstrap recovery appears if shell assets fail to load", async ({ page }, testInfo) => {
  await gotoShell(page, "/hq");
  await settleShell(page, testInfo, "hq");

  const browser = page.context().browser();
  if (!browser) {
    test.skip(true, "Browser handle is required for fresh recovery context");
    return;
  }

  const storageState = await page.context().storageState();
  const recoveryContext = await browser.newContext({ storageState });
  await recoveryContext.route(
    /\/_next\/static\/(?:css\/.*\.css|chunks\/.*\.js)(?:\?.*)?$/,
    (route) => route.abort(),
  );

  const recoveryPage = await recoveryContext.newPage();
  await recoveryPage.goto(new URL("/hq", page.url()).toString(), {
    waitUntil: "domcontentloaded",
  });

  const recovery = recoveryPage.getByTestId("shell-bootstrap-recovery");
  await expect(recovery).toBeVisible({ timeout: 12000 });
  await expect(recovery).toContainText("The shell did not fully load.");
  await expect(recovery.getByRole("button", { name: "Reload shell" })).toBeVisible();
  await expect(
    recoveryPage.locator("html[data-nexus-shell-boot='recovery']"),
  ).toHaveCount(1);

  await recoveryContext.close();
});

test("focused HQ sessions open the exact repair surface", async ({ page }, testInfo) => {
  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await expect(page.getByText("Focused session: HQ chronicle")).toBeVisible();
  await openHqChat(page);
  await expect(page.getByTestId("hq-command-input")).toBeVisible();

  await gotoShell(page, "/hq?focus=hq-scheduler-governance");
  await settleShell(page, testInfo, "hq");

  await expect(page.getByText("Focused session: scheduler governance").first()).toBeVisible();
  await expect(page.getByText("CRON SCHEDULER")).toBeVisible();
  await expect(
    page.getByText("You opened the scheduler directly on governance", {
      exact: false,
    }),
  ).toBeVisible();
});

test("hq chronicle keeps the composer visible and hides raw think traces", async ({
  page,
}, testInfo) => {
  test.fixme(true, "Chronicle answer-healing stays deferred to the later assistant/auth replay slice.");
  const stubbedReply =
    '<think>Plan the greeting, review memory, and decide on the safest response.</think>\nHello from the agent runtime.';
  const fulfillReply = async (route: Route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: stubbedReply,
              tool_calls: [],
            },
          },
        ],
      }),
    });
  };

  await page.route("**/v1/chat/completions", fulfillReply);
  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: stubbedReply } }],
      }),
    });
  });

  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Hello");
  await page.getByTestId("hq-command-input").press("Enter");

  const chronicle = page.getByTestId("hq-chronicle-scroll");
  await expect(
    chronicle.getByText("Hello from the agent runtime.", { exact: true }),
  ).toBeVisible();
  await expect(
    chronicle.getByText("Internal reasoning stayed inside the agent runtime.", {
      exact: false,
    }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Plan the greeting, review memory, and decide on the safest response."),
  ).toHaveCount(0);
  await expect(page.locator("text=<think>")).toHaveCount(0);

  const composer = page.getByTestId("hq-composer");
  await expect(composer).toBeVisible();
  const composerBox = await composer.boundingBox();
  const viewport = page.viewportSize();

  expect(composerBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect((composerBox?.y ?? 0) + (composerBox?.height ?? 0)).toBeLessThanOrEqual(
    (viewport?.height ?? 0) - 4,
  );
});

test("hq chronicle self-heals memo-shaped replies for simple chat turns", async ({
  page,
}, testInfo) => {
  test.fixme(true, "Chronicle answer-healing stays deferred to the later assistant/auth replay slice.");
  const memoReply = `**Background**
Global markets show mixed momentum.

**Analysis**
No active tasks are marked pending in docs/SYSTEM_STATE.md.

**Recommendation**
Ready for your input. Priorities:
1. Confirm GitHub sync status
2. Address any codebase updates

How would you like to proceed?`;

  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: memoReply } }],
      }),
    });
  });

  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Hello");
  await page.getByTestId("hq-command-input").press("Enter");

  const chronicle = page.getByTestId("hq-chronicle-scroll");
  await expect(
    chronicle.getByText("Hello. How can I help today?", { exact: true }),
  ).toBeVisible();
  await expect(chronicle.getByText("Background", { exact: true })).toHaveCount(0);
  await expect(chronicle.getByText("SYSTEM_STATE.md", { exact: false })).toHaveCount(0);
  await expect(
    chronicle.getByText("How would you like to proceed?", { exact: true }),
  ).toHaveCount(0);
});

test("hq learning turns show compact tutor guidance and prepare the strongest study workspace", async ({
  page,
}, testInfo) => {
  test.fixme(true, "Learning-turn workspace preparation stays deferred to the later assistant/auth replay slice.");
  await page.route("**/api/memory/mine**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        mined: [
          {
            id: "mined:page:1",
            title: "Learning note · TCP handshake",
            summary: "Source-backed note covering SYN, SYN-ACK, and ACK.",
            compartment: "general",
            sourceRefs: [
              {
                id: "page:1",
                title: "Learning note · TCP handshake",
                sourceLabel: "Guided learning",
                timestamp: Date.now(),
              },
            ],
            facts: ["Source lane: Guided learning", "Domain: engineering"],
            decisions: [],
            entities: ["tcp", "handshake"],
            openLoops: ["Check whether a higher-order study brief already exists."],
            continuityId: "learning:tcp-handshake",
            freshness: 98,
            confidence: 91,
            inferred: false,
          },
        ],
      }),
    });
  });

  await page.route("**/api/ai", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [
          {
            message: {
              content:
                "TCP uses a three-step handshake: SYN, SYN-ACK, then ACK. A quick check is to explain what each side proves before data flows.",
            },
          },
        ],
      }),
    });
  });

  await gotoShell(page, "/hq?focus=hq-chronicle");
  await settleShell(page, testInfo, "hq");

  await openHqChat(page);
  await page.getByTestId("hq-command-input").fill("Teach me the TCP handshake");
  await page.getByTestId("hq-command-input").press("Enter");

  const chronicle = page.getByTestId("hq-chronicle-scroll");
  await expect(
    chronicle.getByText("TCP uses a three-step handshake", { exact: false }),
  ).toBeVisible();
  await expect(chronicle.getByText("Concept tutor ready", { exact: true })).toBeVisible();
  await expect(chronicle.getByText("Workspace prepared", { exact: true })).toBeVisible();
  await expect(
    chronicle.getByRole("button", { name: "Open Concept tutor" }),
  ).toBeVisible();
});

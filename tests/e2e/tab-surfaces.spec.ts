import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedShell(page);
});

const WORKPLANE_SUMMARY_SURFACES = new Set([
  "command",
  "intel",
  "alpha",
  "cyber",
  "recon",
  "vault",
  "resources",
]);

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

async function gotoSurface(page: Page, href: string) {
  const expectedPathname = new URL(href, "http://nexus.local").pathname;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await gotoShell(page, href);

    try {
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 8_000 })
        .toBe(expectedPathname);
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }
}

async function expectCinematicIA(page: Page, surface: string) {
  await expect(page.locator("main.nexus-root-main")).toHaveAttribute(
    "data-cinematic-ia",
    "cinematic-ia-v1",
  );
  await expect(page.locator("main.nexus-root-main")).toHaveAttribute(
    "data-cinematic-surface",
    surface,
  );
  await expect(page.locator("main.nexus-root-main")).toHaveAttribute(
    "data-cinematic-hierarchy",
    "lead-support-continuity",
  );
  await expect(
    page.locator(
      `.nexus-shell-stage--${surface}[data-cinematic-ia="cinematic-ia-v1"]`,
    ),
  ).toBeVisible();
  await expect(
    page
      .locator(`[data-cinematic-zone="lead"], [data-cinematic-zone="canvas"]`)
      .first(),
  ).toBeVisible();
  await expect(page.getByTestId("shell-bootstrap-recovery")).toHaveCount(0);
  if (surface !== "hq") {
    const threshold = page.getByTestId("homefront-command-threshold");
    await expect(page.getByTestId("homefront-doctrine-strip")).toBeVisible();
    await expect(
      page.getByTestId("homefront-operating-contract"),
    ).toBeVisible();
    await expect(
      page.getByTestId("homefront-operating-contract").getByText("Lead"),
    ).toBeVisible();
    await expect(page.getByTestId("homefront-action-control")).toBeVisible();
    await expect(page.getByTestId("homefront-action-control")).toContainText(
      "Purpose + actions",
    );
    await expect(page.getByTestId("homefront-visual-parity")).toBeVisible();
    await expect(page.getByTestId("homefront-visual-parity")).toHaveAttribute(
      "data-interior-polish",
      "true",
    );
    await expect(page.getByTestId("homefront-visual-parity")).toHaveAttribute(
      "data-support-density",
      /compact|balanced|deep/,
    );
    await expect(page.getByTestId("homefront-surface-module")).toBeVisible();
    await expect(page.getByTestId("homefront-surface-module")).toHaveAttribute(
      "data-interior-polish",
      "true",
    );
    await expect(page.getByTestId("homefront-data-rail")).toBeVisible();
    await expect(page.getByTestId("homefront-media-panel")).toBeVisible();
    await expect(page.getByTestId("homefront-media-panel")).toHaveAttribute(
      "data-media-moment",
      /.+/,
    );
    await expect(page.getByTestId("homefront-action-dock")).toBeVisible();
    await expect(page.getByTestId("homefront-action-dock")).toHaveAttribute(
      "data-active-label",
      /.+/,
    );
    await expect(page.getByTestId("homefront-route-tabs")).toBeVisible();
    await expect(page.getByTestId("homefront-route-tabs")).toHaveAttribute(
      "data-active-label",
      /.+/,
    );
    await expect(
      page.locator(
        '[data-testid="homefront-route-tabs"] [data-active="true"]',
      ),
    ).toBeVisible();
    await expect(page.getByTestId("homefront-source-intake")).toBeVisible();
    await expect(page.getByTestId("homefront-source-intake")).toContainText(
      "No vendoring",
    );
    await expect(page.getByTestId("homefront-source-intake")).toContainText(
      "Passive-first",
    );
    await expect(threshold).toBeVisible();
    await expect(threshold).toHaveAttribute("data-live-state", /.+/);
    await expect(
      threshold.getByText("Session active", { exact: true }),
    ).toBeVisible();
    await expect(threshold.getByText("Focus", { exact: true })).toBeVisible();
    await expect(page.getByTestId("homefront-live-vision-strip")).toBeVisible();
    await expect(
      page.getByTestId("homefront-live-vision-strip").getByText("Image plane"),
    ).toBeVisible();
    await expect(
      page.getByTestId("homefront-live-vision-strip").getByText("Local first"),
    ).toBeVisible();
    if (WORKPLANE_SUMMARY_SURFACES.has(surface)) {
      await expect(page.getByTestId("homefront-workplane-summary")).toBeVisible();
      await expect(page.getByTestId("homefront-workplane-summary")).toHaveAttribute(
        "data-interior-polish",
        "true",
      );
      await expect(page.getByTestId("homefront-workplane-summary")).toContainText(
        "Next best action",
      );
      await expect(page.getByTestId("homefront-workplane-summary")).toContainText(
        "Proof",
      );
    } else {
      await expect(page.getByTestId("homefront-workplane-summary")).toHaveCount(0);
    }
  }
}

test("ga tabs resolve data states without hanging on dead loading copy", async ({
  page,
}, testInfo) => {
  test.setTimeout(110_000);
  await gotoSurface(page, "/command");
  await waitForShell(page, testInfo, { anchorText: "Connectivity posture" });
  await expectCinematicIA(page, "command");
  await expect(
    page.getByText("Connectivity posture", { exact: true }),
  ).toBeVisible();
  await waitForTextToDisappear(page, [
    "Loading market breadth",
    "Loading threat feed",
  ]);

  await gotoSurface(page, "/intel");
  await waitForShell(page, testInfo, { anchorText: "Topic heatmap" });
  await expectCinematicIA(page, "intel");
  await gotoSurface(page, "/intel?focus=intel-world");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: world posture",
  });
  await expectCinematicIA(page, "intel");
  await expect(page.getByText("World risk map", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading conflict intelligence…"]);

  await gotoSurface(page, "/alpha");
  await waitForShell(page, testInfo, { anchorText: "Watchlist manager" });
  await expectCinematicIA(page, "alpha");
  await gotoSurface(page, "/alpha?focus=alpha-scanner");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: momentum scanner",
  });
  await expectCinematicIA(page, "alpha");
  await expect(
    page.getByText("Momentum scanner", { exact: true }),
  ).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await gotoSurface(page, "/alpha?focus=alpha-signals");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: signal engine",
  });
  await expectCinematicIA(page, "alpha");
  await expect(page.getByText("Signal engine", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading market data…"]);

  await gotoSurface(page, "/cyber");
  await waitForShell(page, testInfo, { anchorText: "Priority queue" });
  await expectCinematicIA(page, "cyber");
  await expect(page.getByText("Priority queue", { exact: true })).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat feeds…"]);

  await gotoSurface(page, "/cyber?focus=cyber-matrix");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: severity matrix",
  });
  await expectCinematicIA(page, "cyber");
  await expect(
    page.getByText("Severity matrix", { exact: true }),
  ).toBeVisible();
  await waitForTextToDisappear(page, ["Loading threat data…"]);

  await gotoSurface(page, "/recon");
  await waitForShell(page, testInfo, { anchorText: "OSINT lookup" });
  await expectCinematicIA(page, "recon");
  await expect(page.getByText("OSINT lookup", { exact: true })).toBeVisible();

  await gotoSurface(page, "/vault");
  await waitForShell(page, testInfo, { anchorText: "Document intake" });
  await expectCinematicIA(page, "vault");
  await expect(
    page.getByText("Compiled memory pages", { exact: true }),
  ).toBeVisible();

  await gotoSurface(page, "/resources?view=study");
  await waitForShell(page, testInfo, { anchorText: "How This Helps" });
  await expectCinematicIA(page, "resources");
  await expect(
    page.getByText("Frame the question", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open System Brain" }),
  ).toBeVisible();

  await gotoSurface(page, "/vault?focus=vault-memory-project");
  await waitForShell(page, testInfo, {
    anchorText: "Focused session: project memory",
  });
  await expectCinematicIA(page, "vault");
  await expect(
    page.getByText("Focused session: project memory", { exact: true }),
  ).toBeVisible();

  await gotoSurface(page, "/labs/security");
  await waitForShell(page, testInfo, { anchorText: "Security controls" });
  await expectCinematicIA(page, "security");
  await expect(
    page.getByText("Physical ops preserved", { exact: true }),
  ).toBeVisible();

  await gotoSurface(page, "/internal/skills");
  await waitForShell(page, testInfo, { anchorText: "Workflow labs" });
  await expectCinematicIA(page, "skills");
  await expect(
    page.getByText("Workflow Forge", { exact: true }).first(),
  ).toBeVisible();

  await gotoSurface(page, "/internal/vehicle");
  await waitForShell(page, testInfo, { anchorText: "Systems lab" });
  await expectCinematicIA(page, "vehicle");
  await expect(page.getByLabel("Vehicle readiness phases")).toBeVisible();

  await gotoSurface(page, "/internal/iot");
  await waitForShell(page, testInfo, { anchorText: "Sensor Desk" });
  await expectCinematicIA(page, "iot");
  await expect(page.getByText("Device status", { exact: true })).toBeVisible();
});

test("resources hides external export helpers behind disclosure panels", async ({
  page,
}, testInfo) => {
  await gotoSurface(page, "/resources");
  await waitForShell(page, testInfo, { anchorText: "How This Helps" });
  await expectCinematicIA(page, "resources");

  await gotoSurface(page, "/resources?view=playbooks");
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expectCinematicIA(page, "resources");
  await expect(page.getByText("Run the playbook")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy brief" })).toBeHidden();
  await page.locator("summary", { hasText: "Use outside Nexus" }).click();
  await expect(page.getByRole("button", { name: "Copy brief" })).toBeVisible();

  await gotoSurface(
    page,
    "/resources?view=playbooks&playbook=runtime-finalize-loop",
  );
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expect(page.getByText("Runtime Finalize Loop")).toBeVisible();
  await expect(page.getByText("Browser probe")).toBeVisible();

  await gotoSurface(page, "/resources?view=specs");
  await waitForShell(page, testInfo, { anchorText: "Start safely" });
  await expectCinematicIA(page, "resources");
  await expect(page.getByText("Write the spec")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy starter" })).toBeHidden();
  await page.locator("summary", { hasText: "Use outside Nexus" }).click();
  await expect(
    page.getByRole("button", { name: "Copy starter" }),
  ).toBeVisible();
});

test("resources exposes source intelligence as a native intake lane", async ({
  page,
}, testInfo) => {
  await gotoSurface(page, "/resources?view=sources");
  await waitForShell(page, testInfo, { anchorText: "Source intelligence" });
  await expectCinematicIA(page, "resources");

  await expect(page.getByTestId("resources-source-intelligence")).toBeVisible();
  await expect(page.getByTestId("resources-source-intelligence")).toContainText(
    "No vendoring",
  );
  await expect(page.getByTestId("resources-source-intelligence")).toContainText(
    "Passive-first",
  );
  await expect(page.getByTestId("resources-source-intelligence")).toContainText(
    "APTS + AgentShield",
  );
  await expect(page.getByTestId("resources-source-intelligence")).toContainText(
    "Private art tooling",
  );
  await expect(page.getByTestId("resources-source-ledger")).toBeVisible();
  await expect(page.getByTestId("resources-source-ledger")).toContainText(
    "OWASP APTS",
  );
  await expect(page.getByTestId("resources-source-ledger")).toContainText(
    "hackingtool",
  );
  await expect(page.getByTestId("resources-source-ledger")).toContainText(
    "Blocked",
  );
});

test("resources exposes massive win planning as a native command lane", async ({
  page,
}, testInfo) => {
  await gotoSurface(page, "/resources?view=wins");
  await waitForShell(page, testInfo, { anchorText: "Massive wins" });
  await page.getByRole("tab", { name: "Massive wins" }).click();
  await expectCinematicIA(page, "resources");

  await expect(
    page.getByRole("heading", { name: "Massive Win Console" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Post-UXA3 release confidence" }),
  ).toBeVisible();
  await expect(
    page.getByText("Accepted shell density", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".nexus-massive-win-card", {
      has: page.getByRole("heading", {
        name: "Post-UXA3 release confidence",
      }),
    })
    .locator("summary", { hasText: "Verification gates" })
    .click();
  await expect(page.getByText("npm run verify")).toBeVisible();
});

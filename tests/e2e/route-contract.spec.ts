import { expect, test } from "@playwright/test";
import {
  gotoShell,
  seedAuthenticatedShell,
  waitForCanonicalUrl,
  waitForAuthenticatedShell,
} from "@/tests/e2e/support/authenticatedShell";

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedShell(page);
});

test("canonical redirects and GA nav links stay aligned", async ({ page }, testInfo) => {
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
    await gotoShell(page, from);
    await waitForAuthenticatedShell(page, testInfo, {
      anchorTestId: to === "/hq" ? "hq-command-input" : undefined,
    });
    await waitForCanonicalUrl(page, (url) => {
      expect(url.pathname).toBe(to);
    });
  }

  await gotoShell(page, "/hq");
  await waitForAuthenticatedShell(page, testInfo, { anchorTestId: "hq-command-input" });

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

test("stale exact-session links self-heal into canonical working sessions", async ({
  page,
}, testInfo) => {
  const cases = [
    {
      from: "/resources?view=playbook&playbook=safe-refactor",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/resources");
        expect(url.searchParams.get("view")).toBe("playbooks");
        expect(url.searchParams.get("playbook")).toBe("safe-refactor");
      },
    },
    {
      from: "/resources?system=vehicle-readiness",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/resources");
        expect(url.searchParams.get("view")).toBe("system");
        expect(url.searchParams.get("system")).toBe("vehicle-bridge");
      },
    },
    {
      from: "/resources?view=spec&spec=high-risk-change",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/resources");
        expect(url.searchParams.get("view")).toBe("specs");
        expect(url.searchParams.get("spec")).toBe("feature-build");
      },
    },
    {
      from: "/resources?view=surface&surface=home",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/resources");
        expect(url.searchParams.get("view")).toBe("surfaces");
        expect(url.searchParams.get("surface")).toBe("hq");
      },
    },
    {
      from: "/vault?compiledFilter=route-less",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/vault");
        expect(url.searchParams.get("focus")).toBe("vault-compiled-pages");
        expect(url.searchParams.get("compiledFilter")).toBe("route-less");
      },
    },
    {
      from: "/vault?workflowId=osint-casefile",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/vault");
        expect(url.searchParams.get("focus")).toBe("vault-compiled-pages");
        expect(url.searchParams.get("workflowId")).toBe("osint-casefile");
      },
    },
    {
      from: "/alpha?focus=alpha-market-review",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/alpha");
        expect(url.searchParams.get("view")).toBe("watchlist");
        expect(url.searchParams.get("focus")).toBe("alpha-market-review");
      },
    },
    {
      from: "/recon?focus=recon-binary",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/recon");
        expect(url.searchParams.get("view")).toBe("binary");
        expect(url.searchParams.get("focus")).toBe("recon-binary");
      },
    },
    {
      from: "/cyber?view=triage&focus=cyber-drone",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/cyber");
        expect(url.searchParams.get("view")).toBe("drone");
        expect(url.searchParams.get("focus")).toBe("cyber-drone");
      },
    },
  ];

  for (const { from, assert } of cases) {
    await gotoShell(page, from);
    await waitForAuthenticatedShell(page, testInfo);
    await waitForCanonicalUrl(page, assert);
  }
});

test("prepared workspace state quietly upgrades broad route opens into exact sessions", async ({
  page,
}, testInfo) => {
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
            sourceQuery: "help me repair the archive",
            preparedAt: Date.now(),
          },
        },
        version: 1,
      }),
    );
  });

  await gotoShell(page, "/vault");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Focused session: vault stewardship",
  });
  await waitForCanonicalUrl(page, (url) => {
    expect(url.pathname).toBe("/vault");
    expect(url.searchParams.get("focus")).toBe("vault-stewardship");
  });
});

test("unfinished session memory quietly restores the strongest exact session for a broad route", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nexus-settings",
      JSON.stringify({
        state: {
          unfinishedSessions: [
            {
              href: "/recon?view=binary&focus=recon-binary",
              label: "Open binary triage",
              detail:
                "Prepared the local binary triage lane so suspicious-file analysis is ready first.",
              intent: "research",
              sourceQuery: "continue that reverse-engineering thread",
              lastUsedAt: Date.now(),
              confidence: 92,
              capability: "reverse-engineering",
              artifactClass: "reverse_engineering",
              continuationValue: 96,
              completionState: "active",
            },
          ],
        },
        version: 1,
      }),
    );
  });

  await gotoShell(page, "/recon");
  await waitForAuthenticatedShell(page, testInfo, {
    anchorText: "Focused session: binary triage",
  });
  await waitForCanonicalUrl(page, (url) => {
    expect(url.pathname).toBe("/recon");
    expect(url.searchParams.get("view")).toBe("binary");
    expect(url.searchParams.get("focus")).toBe("recon-binary");
  });
});

test("guided-learning and memory-palace exact sessions stay canonical", async ({
  page,
}, testInfo) => {
  const cases = [
    {
      from: "/resources?view=study",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/resources");
        expect(url.searchParams.get("view")).toBe("study");
      },
      anchorText: "Frame the question",
    },
    {
      from: "/vault?focus=vault-memory-project",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/vault");
        expect(url.searchParams.get("focus")).toBe("vault-memory-project");
      },
      anchorText: "Focused session: project memory",
    },
    {
      from: "/vault?focus=vault-memory-conversation",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/vault");
        expect(url.searchParams.get("focus")).toBe("vault-memory-conversation");
      },
      anchorText: "Focused session: conversation memory",
    },
    {
      from: "/vault?focus=vault-memory-general",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/vault");
        expect(url.searchParams.get("focus")).toBe("vault-memory-general");
      },
      anchorText: "Focused session: general memory",
    },
    {
      from: "/vault?focus=vault-memory-research",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/vault");
        expect(url.searchParams.get("focus")).toBe("vault-memory-research");
      },
      anchorText: "Focused session: research memory",
    },
    {
      from: "/vault?focus=vault-memory-study",
      assert: (url: URL) => {
        expect(url.pathname).toBe("/vault");
        expect(url.searchParams.get("focus")).toBe("vault-memory-study");
      },
      anchorText: "Focused session: study memory",
    },
  ];

  for (const { from, assert, anchorText } of cases) {
    await gotoShell(page, from);
    await waitForAuthenticatedShell(page, testInfo, { anchorText });
    await waitForCanonicalUrl(page, assert);
  }
});

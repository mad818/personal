import { describe, expect, it } from "vitest";
import {
  buildCitationSourceRefs,
  buildOsintCasefileEvidenceStrength,
  buildWorkflowSourceRefs,
  extractOsintPivotsFromTags,
  buildMarketReviewMarkdown,
  buildOsintCasefileMarkdown,
  mergeSourceRefs,
  parseMarketReviewMarkdown,
  parseOsintCasefileMarkdown,
  rankMarketReviewPages,
  rankOsintCasefilePages,
  type XR1WorkflowPageLike,
} from "@/lib/xr1Workflows";

describe("XR1 workflows", () => {
  it("renders fixed market-review headings with pending placeholders", () => {
    const markdown = buildMarketReviewMarkdown({
      asset: "BTC/USD",
      thesis: "Weekly reclaim still holds.",
      setup: "Wait for the prior range high to flip.",
      invalidation: "",
      result: "",
      emotionalPosture: "Calm but cautious",
      operatorNotes: "",
    });

    expect(markdown).toBe(
      [
        "## Asset / market",
        "BTC/USD",
        "",
        "## Thesis",
        "Weekly reclaim still holds.",
        "",
        "## Setup",
        "Wait for the prior range high to flip.",
        "",
        "## Invalidation",
        "Pending input.",
        "",
        "## Result",
        "Pending input.",
        "",
        "## Emotional posture",
        "Calm but cautious",
        "",
        "## Operator notes",
        "Pending input.",
      ].join("\n"),
    );
  });

  it("renders fixed OSINT casefile headings with pending placeholders", () => {
    const markdown = buildOsintCasefileMarkdown({
      subject: "Acme Holdings",
      goal: "Confirm the public-facing company footprint.",
      passiveFindings: "The company site, LinkedIn page, and a recent conference bio align.",
      pivotOpportunities: "",
      evidenceGaps: "Still missing archived press citations.",
      nextReviewedMove: "",
      pivots: ["identity", "social"],
    });

    expect(markdown).toBe(
      [
        "## Subject",
        "Acme Holdings",
        "",
        "## Goal",
        "Confirm the public-facing company footprint.",
        "",
        "## Passive findings",
        "The company site, LinkedIn page, and a recent conference bio align.",
        "",
        "## Pivot opportunities",
        "Pending input.",
        "",
        "## Evidence gaps",
        "Still missing archived press citations.",
        "",
        "## Next reviewed move",
        "Pending input.",
      ].join("\n"),
    );
  });

  it("rehydrates market-review drafts from deterministic markdown", () => {
    const parsed = parseMarketReviewMarkdown(
      [
        "## Asset / market",
        "BTC/USD",
        "",
        "## Thesis",
        "Weekly reclaim still holds.",
        "",
        "## Setup",
        "Wait for the prior range high to flip.",
        "",
        "## Invalidation",
        "Pending input.",
        "",
        "## Result",
        "Trimmed into resistance.",
        "",
        "## Emotional posture",
        "Calm",
        "",
        "## Operator notes",
        "Stayed patient.",
      ].join("\n"),
    );

    expect(parsed).toEqual({
      asset: "BTC/USD",
      thesis: "Weekly reclaim still holds.",
      setup: "Wait for the prior range high to flip.",
      invalidation: "",
      result: "Trimmed into resistance.",
      emotionalPosture: "Calm",
      operatorNotes: "Stayed patient.",
    });
  });

  it("rehydrates OSINT casefiles and pivot tags for draft reuse", () => {
    const parsed = parseOsintCasefileMarkdown(
      [
        "## Subject",
        "Acme Holdings",
        "",
        "## Goal",
        "Confirm the public-facing company footprint.",
        "",
        "## Passive findings",
        "Site, LinkedIn page, and conference bio all align.",
        "",
        "## Pivot opportunities",
        "Check archived mentions and passive DNS.",
        "",
        "## Evidence gaps",
        "Still missing older press citations.",
        "",
        "## Next reviewed move",
        "Recheck archive snapshots.",
      ].join("\n"),
    );

    expect(parsed).toEqual({
      subject: "Acme Holdings",
      goal: "Confirm the public-facing company footprint.",
      passiveFindings: "Site, LinkedIn page, and conference bio all align.",
      pivotOpportunities: "Check archived mentions and passive DNS.",
      evidenceGaps: "Still missing older press citations.",
      nextReviewedMove: "Recheck archive snapshots.",
      pivots: [],
    });
    expect(
      extractOsintPivotsFromTags(["osint-casefile", "pivot:social", "pivot:image-metadata"]),
    ).toEqual(["social", "image / metadata"]);
  });

  it("ranks market reviews by asset match, then topic strength, then recency", () => {
    const pages: XR1WorkflowPageLike[] = [
      {
        title: "Macro recap",
        summary: "Rates and liquidity backdrop.",
        workflowId: "market-review",
        tags: ["market-review"],
        updatedAt: 300,
      },
      {
        title: "Momentum desk note",
        summary: "BTC reclaim thesis still needs confirmation.",
        workflowId: "market-review",
        tags: ["market-review"],
        updatedAt: 200,
      },
      {
        title: "Rotation check",
        summary: "Watching whether ETH loses relative strength.",
        workflowId: "market-review",
        tags: ["market-review", "asset:btc"],
        updatedAt: 100,
      },
    ];

    const ranked = rankMarketReviewPages(pages, "BTC momentum");

    expect(ranked.map((page) => page.title)).toEqual([
      "Rotation check",
      "Momentum desk note",
      "Macro recap",
    ]);
  });

  it("ranks OSINT casefiles by continuity, then subject match, then recency", () => {
    const pages: XR1WorkflowPageLike[] = [
      {
        title: "Generic domain note",
        summary: "Passive DNS and headers still pending review.",
        workflowId: "osint-casefile",
        tags: ["osint-casefile"],
        route: "/cyber",
        updatedAt: 400,
      },
      {
        title: "Acme employee profile",
        summary: "Social footprint aligns with the public biography.",
        workflowId: "osint-casefile",
        tags: ["osint-casefile", "pivot:social"],
        route: "/recon",
        updatedAt: 200,
      },
      {
        title: "Archived intake lane",
        summary: "Carry forward the same casefile continuity before widening.",
        workflowId: "osint-casefile",
        tags: ["osint-casefile"],
        route: "/recon",
        updatedAt: 100,
        continuity: {
          continuityId: "case-42",
        },
      },
    ];

    const ranked = rankOsintCasefilePages(pages, "Acme employee", "case-42", "/recon");

    expect(ranked.map((page) => page.title)).toEqual([
      "Archived intake lane",
      "Acme employee profile",
      "Generic domain note",
    ]);
  });

  it("builds reusable Vault source refs and evidence posture for XR2 filings", () => {
    const sourceRefs = mergeSourceRefs(
      buildWorkflowSourceRefs({
        id: "page-1",
        title: "Market review · BTC",
        summary: "Prior thesis note.",
        workflowId: "market-review",
        tags: ["market-review", "asset:btc"],
        updatedAt: 10,
        continuity: {
          evidenceStrength: "contextual",
        },
      }),
      buildCitationSourceRefs([
        "Check https://example.com/report and https://data.example.org/feed before filing.",
      ]),
    );

    expect(sourceRefs.map((sourceRef) => sourceRef.sourceType)).toEqual([
      "vault-artifact",
      "citation",
      "citation",
    ]);
    expect(buildOsintCasefileEvidenceStrength(sourceRefs)).toBe("synthesis-ready");
  });
});

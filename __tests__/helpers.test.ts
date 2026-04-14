import { describe, it, expect } from "vitest";
import {
  fmtPrice,
  fmtVol,
  fmtPct,
  esc,
  timeAgo,
  gradeFromEvalScore,
  evalGradeColor,
  evalIndicatorIcon,
} from "@/lib/helpers";

// ── fmtPrice ──────────────────────────────────────────────────────────────────
describe("fmtPrice", () => {
  it("returns — for null/undefined", () => {
    expect(fmtPrice(null as unknown as number)).toBe("—");
    expect(fmtPrice(undefined as unknown as number)).toBe("—");
  });

  it("handles zero", () => {
    expect(fmtPrice(0)).toBe("$0.00000000");
  });

  it("formats large numbers with commas", () => {
    expect(fmtPrice(84000)).toBe("$84,000.00");
    expect(fmtPrice(1000)).toBe("$1,000.00");
  });

  it("formats mid-range numbers with 2 decimals", () => {
    expect(fmtPrice(3.14)).toBe("$3.14");
    expect(fmtPrice(99.99)).toBe("$99.99");
  });

  it("formats small prices with 4 decimals", () => {
    expect(fmtPrice(0.05)).toBe("$0.0500");
    expect(fmtPrice(0.01)).toBe("$0.0100");
  });

  it("formats very small prices with 8 decimals", () => {
    expect(fmtPrice(0.001)).toBe("$0.00100000");
    expect(fmtPrice(0.00000001)).toBe("$0.00000001");
  });
});

// ── fmtVol ───────────────────────────────────────────────────────────────────
describe("fmtVol", () => {
  it("returns — for falsy values", () => {
    expect(fmtVol(0)).toBe("—");
    expect(fmtVol(null as unknown as number)).toBe("—");
  });

  it("formats billions", () => {
    expect(fmtVol(1_500_000_000)).toBe("$1.50B");
    expect(fmtVol(10_000_000_000)).toBe("$10.00B");
  });

  it("formats millions", () => {
    expect(fmtVol(2_500_000)).toBe("$2.50M");
  });

  it("formats thousands", () => {
    expect(fmtVol(5_000)).toBe("$5.00K");
  });

  it("formats small values", () => {
    expect(fmtVol(500)).toBe("$500.00");
  });
});

// ── fmtPct ───────────────────────────────────────────────────────────────────
describe("fmtPct", () => {
  it("returns — for null/undefined", () => {
    expect(fmtPct(null as unknown as number)).toBe("—");
    expect(fmtPct(undefined as unknown as number)).toBe("—");
  });

  it("returns +0.00% for zero", () => {
    expect(fmtPct(0)).toBe("+0.00%");
  });

  it("adds + for positive values", () => {
    expect(fmtPct(1.5)).toBe("+1.50%");
  });

  it("keeps - for negative values", () => {
    expect(fmtPct(-2.33)).toBe("-2.33%");
  });
});

// ── esc ──────────────────────────────────────────────────────────────────────
describe("esc", () => {
  it("escapes ampersand", () => {
    expect(esc("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(esc("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes quotes", () => {
    expect(esc('"hello"')).toBe("&quot;hello&quot;");
  });

  it("handles empty string", () => {
    expect(esc("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(esc(null as unknown as string)).toBe("");
    expect(esc(undefined as unknown as string)).toBe("");
  });

  it("leaves safe strings unchanged", () => {
    expect(esc("hello world")).toBe("hello world");
  });
});

// ── timeAgo ──────────────────────────────────────────────────────────────────
describe("timeAgo", () => {
  it("returns seconds for recent timestamps", () => {
    const ts = new Date(Date.now() - 30_000).toISOString();
    expect(timeAgo(ts)).toBe("30s ago");
  });

  it("returns minutes for 5-minute-old timestamps", () => {
    const ts = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(ts)).toBe("5m ago");
  });

  it("returns hours for 2-hour-old timestamps", () => {
    const ts = new Date(Date.now() - 2 * 3600_000).toISOString();
    expect(timeAgo(ts)).toBe("2h ago");
  });

  it("returns days for old timestamps", () => {
    const ts = new Date(Date.now() - 3 * 86400_000).toISOString();
    expect(timeAgo(ts)).toBe("3d ago");
  });
});

// ── gradeFromEvalScore ────────────────────────────────────────────────────────
describe("gradeFromEvalScore", () => {
  it("returns unknown for null/undefined/zero", () => {
    expect(gradeFromEvalScore(null)).toBe("unknown");
    expect(gradeFromEvalScore(undefined)).toBe("unknown");
    expect(gradeFromEvalScore(0)).toBe("unknown");
  });

  it("returns C when stale regardless of score", () => {
    expect(gradeFromEvalScore(100, { stale: true })).toBe("C");
    expect(gradeFromEvalScore(95, { stale: true })).toBe("C");
  });

  it("returns A for score >= 95", () => {
    expect(gradeFromEvalScore(95)).toBe("A");
    expect(gradeFromEvalScore(100)).toBe("A");
  });

  it("returns B for score 85–94", () => {
    expect(gradeFromEvalScore(85)).toBe("B");
    expect(gradeFromEvalScore(94)).toBe("B");
  });

  it("returns C for score below 85", () => {
    expect(gradeFromEvalScore(84)).toBe("C");
    expect(gradeFromEvalScore(1)).toBe("C");
  });
});

// ── evalGradeColor ────────────────────────────────────────────────────────────
describe("evalGradeColor", () => {
  it("returns green for A", () => {
    expect(evalGradeColor("A")).toBe("#10b981");
  });

  it("returns amber for B", () => {
    expect(evalGradeColor("B")).toBe("#f59e0b");
  });

  it("returns red for C", () => {
    expect(evalGradeColor("C")).toBe("#ef4444");
  });

  it("returns muted blue for unknown", () => {
    expect(evalGradeColor("unknown")).toBe("#7ba7d4");
  });
});

// ── evalIndicatorIcon ─────────────────────────────────────────────────────────
describe("evalIndicatorIcon", () => {
  it("returns ⚠ when stale", () => {
    expect(evalIndicatorIcon({ stale: true })).toBe("⚠");
  });

  it("returns ● when there are failures", () => {
    expect(evalIndicatorIcon({ failures: 2 })).toBe("●");
  });

  it("returns ✓ when healthy", () => {
    expect(evalIndicatorIcon({})).toBe("✓");
    expect(evalIndicatorIcon({ stale: false, failures: 0 })).toBe("✓");
  });
});

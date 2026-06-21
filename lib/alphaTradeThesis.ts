import { fmtPct, fmtPrice } from "@/lib/helpers";

export interface TradeThesisInput {
  sym: string;
  name?: string;
  price: number;
  chg24h: number;
  score: number;
  label: string;
  trend?: number;
  fearGreedValue?: number;
  fearGreedLabel?: string;
}

export interface TradeThesisResult {
  entry: string;
  stop: string;
  target1: string;
  target2: string;
  rr: string;
  thesis: string;
  risks: string[];
}

export function buildTradeThesisPrompt(
  input: TradeThesisInput,
  extraContext?: string,
): string {
  const fg =
    input.fearGreedValue != null
      ? `Fear & Greed: ${input.fearGreedValue} (${input.fearGreedLabel ?? "—"})`
      : "";
  const trend =
    input.trend != null ? `7d trend: ${fmtPct(input.trend)}` : "";

  return `You are a professional momentum analyst (Dexter-style thesis generator).
Analyze this setup and return ONLY valid JSON — no markdown fences.

Asset: ${input.sym}${input.name ? ` (${input.name})` : ""}
Price: ${fmtPrice(input.price)} · 24h: ${fmtPct(input.chg24h)} · Momentum score: ${input.score}/100 · Signal: ${input.label}
${trend}
${fg}
${extraContext ? `Context: ${extraContext}` : ""}

Be conservative on stops and targets. Output shape:
{
  "entry": "string",
  "stop": "string",
  "target1": "string",
  "target2": "string",
  "rr": "string",
  "thesis": "2-3 sentences",
  "risks": ["risk1", "risk2"]
}`;
}

export function parseTradeThesisResponse(raw: string): TradeThesisResult | null {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;

  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Partial<TradeThesisResult>;
    if (!parsed.thesis?.trim()) return null;
    return {
      entry: parsed.entry?.trim() || "—",
      stop: parsed.stop?.trim() || "—",
      target1: parsed.target1?.trim() || "—",
      target2: parsed.target2?.trim() || "—",
      rr: parsed.rr?.trim() || "—",
      thesis: parsed.thesis.trim(),
      risks: Array.isArray(parsed.risks)
        ? parsed.risks.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        : ["Market conditions can change rapidly.", "Always use a hard stop."],
    };
  } catch {
    return null;
  }
}

export function fallbackTradeThesis(input: TradeThesisInput): TradeThesisResult {
  const direction = input.score >= 60 ? "long" : input.score <= 40 ? "cautious" : "neutral";
  return {
    entry: direction === "long" ? "Pullback toward prior support" : "Wait for confirmation",
    stop: direction === "long" ? "~7% below entry" : "N/A until setup confirms",
    target1: "Prior swing high / resistance",
    target2: "Extended measured move",
    rr: "~2:1 if stop honored",
    thesis: `${input.sym} scores ${input.score}/100 (${input.label}). ${direction === "long" ? "Momentum favors continuation while structure holds." : "Edge is unclear — wait for stronger confirmation."}`,
    risks: [
      "AI thesis unavailable — using deterministic fallback.",
      "Verify live prices before acting.",
    ],
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import EvidencePosturePanel from "@/components/ui/EvidencePosturePanel";
import { callAI } from "@/lib/ai";
import { apiFetch } from "@/lib/apiFetch";
import {
  buildTradeThesisEvidence,
  buildTradeThesisPrompt,
  fallbackTradeThesis,
  parseTradeThesisResponse,
  type TradeThesisEvidence,
  type TradeThesisFilingEvidence,
  type TradeThesisFundamentalEvidence,
  type TradeThesisInput,
  type TradeThesisLens,
  type TradeThesisResult,
} from "@/lib/alphaTradeThesis";
import { fmtPct, fmtPrice } from "@/lib/helpers";
import { useModalDialog } from "@/hooks/useModalDialog";
import { useStore } from "@/store/useStore";

interface TradeThesisPanelProps {
  input: TradeThesisInput;
  onClose: () => void;
}

function cell(label: string, value: string, color?: string) {
  return (
    <div
      style={{
        background: "var(--surf2)",
        borderRadius: "8px",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text3)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "15px",
          fontWeight: 900,
          fontFamily: "monospace",
          marginTop: "3px",
          color: color ?? "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

async function loadFilingEvidence(symbol: string): Promise<{
  filings: TradeThesisFilingEvidence[];
  fundamentals: TradeThesisFundamentalEvidence[];
}> {
  try {
    const response = await apiFetch(
      `/api/sec-filings?query=${encodeURIComponent(symbol)}&ticker=${encodeURIComponent(symbol)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) return { filings: [], fundamentals: [] };
    const payload = (await response.json()) as {
      filings?: Array<{
        company?: unknown;
        form_type?: unknown;
        date_filed?: unknown;
        description?: unknown;
        url?: unknown;
      }>;
      companyFacts?: {
        facts?: Array<{
          label?: unknown;
          value?: unknown;
          previousValue?: unknown;
          changePct?: unknown;
          unit?: unknown;
          form?: unknown;
          filed?: unknown;
          periodEnd?: unknown;
        }>;
      } | null;
    };
    const filings = Array.isArray(payload.filings)
      ? payload.filings
          .filter(
            (filing) =>
              typeof filing.company === "string" &&
              typeof filing.form_type === "string",
          )
          .slice(0, 5)
          .map((filing) => ({
            company: String(filing.company),
            form: String(filing.form_type),
            date:
              typeof filing.date_filed === "string" ? filing.date_filed : "",
            description:
              typeof filing.description === "string" ? filing.description : "",
            url: typeof filing.url === "string" ? filing.url : "",
          }))
      : [];
    const fundamentals = Array.isArray(payload.companyFacts?.facts)
      ? payload.companyFacts.facts
          .filter(
            (fact) =>
              typeof fact.label === "string" &&
              Number.isFinite(Number(fact.value)) &&
              typeof fact.unit === "string",
          )
          .slice(0, 8)
          .map((fact) => ({
            label: String(fact.label),
            value: Number(fact.value),
            previousValue: Number.isFinite(Number(fact.previousValue))
              ? Number(fact.previousValue)
              : null,
            changePct: Number.isFinite(Number(fact.changePct))
              ? Number(fact.changePct)
              : null,
            unit: String(fact.unit),
            form: typeof fact.form === "string" ? fact.form : "",
            filed: typeof fact.filed === "string" ? fact.filed : "",
            periodEnd: typeof fact.periodEnd === "string" ? fact.periodEnd : "",
          }))
      : [];
    return { filings, fundamentals };
  } catch {
    return { filings: [], fundamentals: [] };
  }
}

function lensCard(label: string, lens: TradeThesisLens) {
  const color =
    lens.status === "supported"
      ? "#10b981"
      : lens.status === "limited"
        ? "#f59e0b"
        : "var(--text3)";
  return (
    <div
      key={label}
      style={{
        borderRadius: "9px",
        border: "1px solid var(--border)",
        background: "var(--surf2)",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "5px",
        }}
      >
        <strong
          style={{
            color: "var(--text)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </strong>
        <span style={{ color, fontSize: "9px", textTransform: "uppercase" }}>
          {lens.status}
        </span>
      </div>
      <div style={{ color: "var(--text2)", fontSize: "11px", lineHeight: 1.5 }}>
        {lens.summary}
      </div>
      {lens.evidence.slice(0, 2).map((entry) => (
        <div
          key={entry}
          style={{
            color: "var(--text3)",
            fontSize: "10px",
            lineHeight: 1.45,
            marginTop: "4px",
          }}
        >
          · {entry}
        </div>
      ))}
    </div>
  );
}

export default function TradeThesisPanel({
  input,
  onClose,
}: TradeThesisPanelProps) {
  const [loading, setLoading] = useState(true);
  const [thesis, setThesis] = useState<TradeThesisResult | null>(null);
  const [evidence, setEvidence] = useState<TradeThesisEvidence>({
    news: [],
    filings: [],
    fundamentals: [],
  });
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useModalDialog({ open: true, onClose });
  const articles = useStore((state) => state.articles);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    let currentEvidence = buildTradeThesisEvidence(input, articles, [], []);
    try {
      const filingEvidence = await loadFilingEvidence(input.sym);
      currentEvidence = buildTradeThesisEvidence(
        input,
        articles,
        filingEvidence.filings,
        filingEvidence.fundamentals,
      );
      setEvidence(currentEvidence);
      const prompt = buildTradeThesisPrompt(input, currentEvidence);
      const raw = await callAI(prompt, 600);
      const parsed = parseTradeThesisResponse(raw);
      setThesis(parsed ?? fallbackTradeThesis(input, currentEvidence));
    } catch {
      setEvidence(currentEvidence);
      setThesis(fallbackTradeThesis(input, currentEvidence));
      setError("AI unavailable — showing deterministic fallback thesis.");
    } finally {
      setLoading(false);
    }
  }, [articles, input]);

  useEffect(() => {
    void generate();
  }, [generate]);

  const chgColor = input.chg24h >= 0 ? "#10b981" : "#ef4444";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nexus-trade-thesis-title"
        aria-describedby="nexus-trade-thesis-context"
        aria-busy={loading}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--surf)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "22px 24px",
          position: "relative",
          boxShadow: "0 0 40px rgba(168,85,247,0.2)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          data-dialog-initial-focus
          aria-label="Close trade thesis"
          style={{
            position: "absolute",
            top: "14px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            color: "var(--text3)",
          }}
        >
          ✕
        </button>

        <div
          id="nexus-trade-thesis-title"
          style={{
            fontSize: "22px",
            fontWeight: 900,
            fontFamily: "monospace",
            color: "#a855f7",
          }}
        >
          {input.sym} trade thesis
        </div>
        <div
          id="nexus-trade-thesis-context"
          style={{
            fontSize: "11px",
            color: "var(--text3)",
            margin: "2px 0 14px",
          }}
        >
          {input.name ?? input.sym} · {fmtPrice(input.price)} ·{" "}
          {fmtPct(input.chg24h)} · Score {input.score}/100 · {input.label}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "14px",
          }}
        >
          <span
            style={{
              borderRadius: "999px",
              border: "1px solid var(--border)",
              color: "var(--text3)",
              fontSize: "9px",
              padding: "3px 7px",
            }}
          >
            Decision support only
          </span>
          <span
            style={{
              borderRadius: "999px",
              border: "1px solid var(--border)",
              color: "var(--text3)",
              fontSize: "9px",
              padding: "3px 7px",
            }}
          >
            {evidence.news.length} matched news
          </span>
          <span
            style={{
              borderRadius: "999px",
              border: "1px solid var(--border)",
              color: "var(--text3)",
              fontSize: "9px",
              padding: "3px 7px",
            }}
          >
            {evidence.fundamentals.length} SEC facts
          </span>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "30px",
              color: "var(--text3)",
            }}
          >
            Generating trade thesis…
          </div>
        ) : thesis ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              {cell("Entry", thesis.entry, "#f59e0b")}
              {cell("Stop", thesis.stop, "#ef4444")}
              {cell("Target 1", thesis.target1, "#10b981")}
              {cell("Target 2", thesis.target2, "#10b981")}
            </div>
            <div
              style={{
                background: "var(--surf2)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text3)",
                    fontWeight: 700,
                  }}
                >
                  Risk / reward
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color: chgColor,
                  }}
                >
                  {thesis.rr}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text3)",
                    fontWeight: 700,
                  }}
                >
                  Evidence conviction
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color:
                      thesis.conviction.label === "high"
                        ? "#10b981"
                        : thesis.conviction.label === "moderate"
                          ? "#f59e0b"
                          : "var(--text3)",
                  }}
                >
                  {thesis.conviction.score}/100 · {thesis.conviction.label}
                </div>
                <div
                  style={{
                    color: "var(--text3)",
                    fontSize: "9px",
                    marginTop: "2px",
                  }}
                >
                  Coverage, not return probability
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              {lensCard("Fundamentals", thesis.analystHandoffs.fundamentals)}
              {lensCard("Technical", thesis.analystHandoffs.technical)}
              {lensCard("Sentiment", thesis.analystHandoffs.sentiment)}
              {lensCard("Risk", thesis.analystHandoffs.risk)}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  borderRadius: "9px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  padding: "10px 12px",
                }}
              >
                <strong style={{ color: "#10b981", fontSize: "10px" }}>
                  BULL CASE
                </strong>
                <div
                  style={{
                    color: "var(--text2)",
                    fontSize: "11px",
                    lineHeight: 1.5,
                    marginTop: "5px",
                  }}
                >
                  {thesis.bullCase}
                </div>
              </div>
              <div
                style={{
                  borderRadius: "9px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  padding: "10px 12px",
                }}
              >
                <strong style={{ color: "#ef4444", fontSize: "10px" }}>
                  BEAR CASE
                </strong>
                <div
                  style={{
                    color: "var(--text2)",
                    fontSize: "11px",
                    lineHeight: 1.5,
                    marginTop: "5px",
                  }}
                >
                  {thesis.bearCase}
                </div>
              </div>
            </div>
            <div
              style={{
                borderRadius: "9px",
                border: "1px solid var(--border)",
                background: "var(--surf2)",
                color: "var(--text2)",
                fontSize: "11px",
                lineHeight: 1.5,
                marginBottom: "12px",
                padding: "10px 12px",
              }}
            >
              <strong style={{ color: "var(--text)", fontSize: "10px" }}>
                VALUATION CONTEXT
              </strong>
              <div style={{ marginTop: "4px" }}>{thesis.valuationContext}</div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text3)",
                  marginBottom: "5px",
                }}
              >
                Thesis
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  lineHeight: 1.6,
                  color: "var(--text2)",
                }}
              >
                {thesis.thesis}
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <EvidencePosturePanel
                title="Research evidence posture"
                summary={thesis.conviction.rationale}
                observed={thesis.observed}
                inferred={[
                  `Bull: ${thesis.bullCase}`,
                  `Bear: ${thesis.bearCase}`,
                ]}
                verifyNext={thesis.verifyNext}
                compact
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text3)",
                  marginBottom: "5px",
                }}
              >
                Risks
              </div>
              {thesis.risks.map((risk) => (
                <div
                  key={risk}
                  style={{
                    fontSize: "12px",
                    color: "#f59e0b",
                    lineHeight: 1.5,
                  }}
                >
                  ⚠ {risk}
                </div>
              ))}
            </div>
            {error ? (
              <div
                role="alert"
                style={{
                  marginTop: "12px",
                  fontSize: "11px",
                  color: "var(--text3)",
                }}
              >
                {error}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

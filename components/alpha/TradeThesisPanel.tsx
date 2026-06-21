"use client";

import { useCallback, useEffect, useState } from "react";
import { callAI } from "@/lib/ai";
import {
  buildTradeThesisPrompt,
  fallbackTradeThesis,
  parseTradeThesisResponse,
  type TradeThesisInput,
  type TradeThesisResult,
} from "@/lib/alphaTradeThesis";
import { fmtPct, fmtPrice } from "@/lib/helpers";

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

export default function TradeThesisPanel({ input, onClose }: TradeThesisPanelProps) {
  const [loading, setLoading] = useState(true);
  const [thesis, setThesis] = useState<TradeThesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = buildTradeThesisPrompt(input);
      const raw = await callAI(prompt, 600);
      const parsed = parseTradeThesisResponse(raw);
      setThesis(parsed ?? fallbackTradeThesis(input));
    } catch {
      setThesis(fallbackTradeThesis(input));
      setError("AI unavailable — showing deterministic fallback thesis.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  useEffect(() => {
    void generate();
  }, [generate]);

  const chgColor = input.chg24h >= 0 ? "#10b981" : "#ef4444";

  return (
    <div
      role="dialog"
      aria-modal="true"
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
          style={{
            fontSize: "22px",
            fontWeight: 900,
            fontFamily: "monospace",
            color: "#a855f7",
          }}
        >
          {input.sym}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text3)", margin: "2px 0 14px" }}>
          {input.name ?? input.sym} · {fmtPrice(input.price)} · {fmtPct(input.chg24h)} · Score{" "}
          {input.score}/100 · {input.label}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--text3)" }}>
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
              <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "var(--text2)" }}>
                {thesis.thesis}
              </div>
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
                  style={{ fontSize: "12px", color: "#f59e0b", lineHeight: 1.5 }}
                >
                  ⚠ {risk}
                </div>
              ))}
            </div>
            {error ? (
              <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--text3)" }}>
                {error}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

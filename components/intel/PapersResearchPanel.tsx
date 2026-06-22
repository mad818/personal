"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { designTokens } from "@/lib/designTokens";
import type { PaperResearchHit } from "@/lib/papersResearch";

const INPUT: React.CSSProperties = {
  background: "var(--surf2)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text)",
  fontSize: "11px",
  padding: "6px 8px",
  outline: "none",
  width: "100%",
};

export default function PapersResearchPanel() {
  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState<PaperResearchHit[]>([]);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);

  const runSearch = useCallback(async () => {
    setRunning(true);
    try {
      const suffix = query.trim()
        ? `?q=${encodeURIComponent(query.trim())}`
        : "";
      const response = await apiFetch(`/api/papers${suffix}`, {
        signal: AbortSignal.timeout(12_000),
      });
      const payload = (await response.json()) as {
        papers?: PaperResearchHit[];
        message?: string;
      };
      setPapers(payload.papers ?? []);
      setMessage(payload.message ?? "");
    } catch {
      setPapers([]);
      setMessage("Papers lookup failed.");
    } finally {
      setRunning(false);
    }
  }, [query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ fontSize: "10px", color: "var(--text3)" }}>
        HuggingFace daily papers lane — free, no API key.
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <input
          style={{ ...INPUT, flex: 1, minWidth: "180px" }}
          placeholder="Filter by topic (optional)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void runSearch();
          }}
        />
        <button
          onClick={() => void runSearch()}
          disabled={running}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: "var(--accent)",
            color: designTokens.textOnAccent,
            fontWeight: 700,
            fontSize: "11px",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Loading…" : "Load papers"}
        </button>
      </div>
      {message ? (
        <div style={{ fontSize: "10px", color: "var(--text3)" }}>{message}</div>
      ) : null}
      {papers.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {papers.map((paper) => (
            <div
              key={paper.id}
              style={{
                background: "var(--surf2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
                {paper.title}
              </div>
              {paper.authors.length > 0 ? (
                <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "4px" }}>
                  {paper.authors.join(", ")}
                </div>
              ) : null}
              {paper.summary ? (
                <div style={{ fontSize: "10px", color: "var(--text2)", marginTop: "6px" }}>
                  {paper.summary}
                </div>
              ) : null}
              {paper.url ? (
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: "6px",
                    fontSize: "10px",
                    color: "var(--accent)",
                  }}
                >
                  Open on HuggingFace
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

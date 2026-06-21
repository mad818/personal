"use client";

import { useCallback, useEffect, useState } from "react";
import { ShellBadge, ShellButton } from "@/components/ui/shell";
import { apiFetch } from "@/lib/apiFetch";
import type { IdeaLinkIntakeItem } from "@/lib/ideaLinkIntake";

interface IntakeSummary {
  total: number;
  pending: number;
  triaged: number;
  readyForAssimilation: number;
}

export default function IdeaLinkIntakePanel() {
  const [items, setItems] = useState<IdeaLinkIntakeItem[]>([]);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const response = await apiFetch("/api/ideas/intake", {
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        queue?: { items?: IdeaLinkIntakeItem[] };
        summary?: IntakeSummary;
      };
      setItems(payload.queue?.items ?? []);
      setSummary(payload.summary ?? null);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const registerLinks = async () => {
    const text = draft.trim();
    if (!text) return;
    setStatus("loading");
    setMessage(null);
    try {
      const response = await apiFetch("/api/ideas/intake", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        added?: IdeaLinkIntakeItem[];
        matricesCreated?: number;
        summary?: IntakeSummary;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Register failed.");
      }
      setDraft("");
      setSummary(payload.summary ?? null);
      setMessage(
        payload.added?.length
          ? `Registered ${payload.added.length} link(s); ${payload.matricesCreated ?? 0} stub matrix/matrices created.`
          : "No new links — all URLs were already registered.",
      );
      setStatus("saved");
      await loadQueue();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Register failed.");
    }
  };

  const pendingItems = items.filter((item) => item.status === "pending");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "var(--surf)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
          Idea link intake
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>
          Paste GitHub or X links — each gets a pending queue row and a stub source-parity
          matrix. CLI: <code>npm run ideas:register</code>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={"https://github.com/org/repo\nhttps://x.com/user/status/123..."}
        rows={4}
        style={{
          width: "100%",
          resize: "vertical",
          borderRadius: "10px",
          border: "1px solid rgba(96, 165, 250, 0.18)",
          background: "rgba(9, 14, 28, 0.42)",
          color: "var(--text)",
          padding: "10px",
          fontSize: "12px",
          fontFamily: "inherit",
        }}
      />

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <ShellButton onClick={() => void registerLinks()} disabled={status === "loading"}>
          {status === "loading" ? "Registering…" : "Register links"}
        </ShellButton>
        {summary ? (
          <ShellBadge tone="muted">
            {summary.pending} pending · {summary.total} total
          </ShellBadge>
        ) : null}
      </div>

      {message ? (
        <div style={{ fontSize: "11px", color: status === "error" ? "#f87171" : "#86efac" }}>
          {message}
        </div>
      ) : null}

      {pendingItems.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: "10px", color: "var(--text3)", fontWeight: 600 }}>
            Pending ({pendingItems.length})
          </div>
          {pendingItems.slice(0, 6).map((item) => (
            <div
              key={item.id}
              style={{
                fontSize: "11px",
                color: "var(--text2)",
                borderLeft: "2px solid rgba(96, 165, 250, 0.35)",
                paddingLeft: "8px",
              }}
            >
              <div style={{ fontWeight: 600 }}>{item.kind.toUpperCase()} · {item.id}</div>
              <div style={{ wordBreak: "break-all" }}>{item.source}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: "11px", color: "var(--text3)" }}>
          No pending links yet — paste your batch above when ready.
        </div>
      )}
    </div>
  );
}

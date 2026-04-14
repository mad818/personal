"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";
import { InternalWorkbenchNotice } from "@/components/ui/InternalWorkbenchNotice";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import type { ModelLabRun } from "@/lib/assimilation/types";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";

const MUTATION_FAMILIES = [
  "boundary inversion",
  "authority spoofing",
  "encoded prompts",
  "obfuscated trigger words",
  "prompt compression",
  "nested instructions",
];

const MODELS = ["claude-opus", "local-qwen", "openrouter-stack", "groq-fast"];

async function loadRuns() {
  const response = await apiFetch("/api/model-lab", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load model lab.");
  return (await response.json()) as {
    runs: ModelLabRun[];
    meta?: InternalWorkbenchMeta;
  };
}

export default function BlacksiteLab() {
  const [runs, setRuns] = useState<ModelLabRun[]>([]);
  const [meta, setMeta] = useState<InternalWorkbenchMeta | null>(null);
  const [title, setTitle] = useState("Operator boundary tournament");
  const [promptLabel, setPromptLabel] = useState("Sanctum baseline");
  const [notes, setNotes] = useState(
    "Keep this lab isolated from HQ memory. Score models on hierarchy stability and leakage pressure.",
  );
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([
    "boundary inversion",
    "authority spoofing",
  ]);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "claude-opus",
    "local-qwen",
  ]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deferredFilter = useDeferredValue(filter);

  useEffect(() => {
    let active = true;
    void loadRuns()
      .then((payload) => {
        if (!active) return;
        startTransition(() => {
          setRuns(payload.runs);
          setMeta(payload.meta ?? null);
          setError("");
        });
      })
      .catch(() => {
        if (!active) return;
        setError(
          "Model Lab is temporarily unavailable. Retained tournament runs stay visible until the route recovers.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleRuns = useMemo(() => {
    const term = deferredFilter.trim().toLowerCase();
    if (!term) return runs;
    return runs.filter((run) =>
      [run.title, run.mutationFamilies.join(" "), run.operatorNotes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [deferredFilter, runs]);

  const latestRun = visibleRuns[0] ?? null;

  function toggleItem(
    current: string[],
    nextValue: string,
    setter: (next: string[]) => void,
  ) {
    setter(
      current.includes(nextValue)
        ? current.filter((value) => value !== nextValue)
        : [...current, nextValue],
    );
  }

  async function runCompare() {
    if (!selectedFamilies.length || !selectedModels.length) return;
    setBusy(true);
    try {
      const response = await apiFetch("/api/model-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          mutationFamilies: selectedFamilies,
          models: selectedModels,
          promptLabel,
          operatorNotes: notes,
        }),
      });
      if (!response.ok) throw new Error("Failed to run model lab.");
      const payload = (await response.json()) as {
        run: ModelLabRun;
        meta?: InternalWorkbenchMeta;
      };
      setMeta(payload.meta ?? meta);
      setRuns((current) => [payload.run, ...current]);
      setError("");
    } catch {
      setError(
        "The model lab run did not complete. Existing tournament history was kept locally.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(260px, 0.34fr) minmax(0, 0.66fr)",
        gap: "16px",
        alignItems: "start",
      }}
    >
      <section
        style={{
          border: "1px solid rgba(185, 28, 28, 0.45)",
          borderRadius: "var(--r)",
          padding: "14px",
          background:
            "radial-gradient(circle at top, rgba(127, 29, 29, 0.24), transparent 55%), rgba(8, 8, 14, 0.84)",
        }}
      >
        <SectionLabel detail="Operator-only prompt warfare">
          Blacksite control
        </SectionLabel>
        <InternalWorkbenchNotice meta={meta} compact />
        {error ? (
          <div style={{ marginTop: "10px" }}>
            <SurfaceCallout
              tone="warning"
              compact
              icon="↺"
              title="Model Lab degraded"
              description={error}
            />
          </div>
        ) : null}
        <div style={{ display: "grid", gap: "12px", marginTop: "10px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Exercise title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(185, 28, 28, 0.35)",
                background: "rgba(12, 10, 18, 0.92)",
                color: "var(--text)",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Prompt label
            </span>
            <input
              value={promptLabel}
              onChange={(event) => setPromptLabel(event.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(185, 28, 28, 0.35)",
                background: "rgba(12, 10, 18, 0.92)",
                color: "var(--text)",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Isolation doctrine
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(185, 28, 28, 0.35)",
                background: "rgba(12, 10, 18, 0.92)",
                color: "var(--text)",
                resize: "vertical",
              }}
            />
          </label>
        </div>

        <SectionLabel detail={`${selectedFamilies.length} active`}>
          Mutation families
        </SectionLabel>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
          {MUTATION_FAMILIES.map((family) => (
            <button
              key={family}
              type="button"
              onClick={() =>
                toggleItem(selectedFamilies, family, setSelectedFamilies)
              }
              style={{
                padding: "8px 10px",
                borderRadius: "999px",
                border: selectedFamilies.includes(family)
                  ? "1px solid rgba(248, 113, 113, 0.66)"
                  : "1px solid var(--border)",
                background: selectedFamilies.includes(family)
                  ? "rgba(127, 29, 29, 0.25)"
                  : "rgba(10, 15, 30, 0.58)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              {family}
            </button>
          ))}
        </div>

        <SectionLabel detail={`${selectedModels.length} active`}>
          Compare models
        </SectionLabel>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
          {MODELS.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => toggleItem(selectedModels, model, setSelectedModels)}
              style={{
                padding: "8px 10px",
                borderRadius: "999px",
                border: selectedModels.includes(model)
                  ? "1px solid rgba(96, 165, 250, 0.6)"
                  : "1px solid var(--border)",
                background: selectedModels.includes(model)
                  ? "rgba(30, 64, 175, 0.25)"
                  : "rgba(10, 15, 30, 0.58)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              {model}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
          <ShellButton onClick={() => void runCompare()}>
            {busy ? "Running..." : "Run tournament"}
          </ShellButton>
          <ShellBadge tone="accent">Isolated session</ShellBadge>
          <ShellBadge tone="muted">No carryover into HQ</ShellBadge>
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "14px",
          background: "rgba(7, 10, 18, 0.78)",
        }}
      >
        <SectionLabel detail="Search previous tournaments">Blacksite ledger</SectionLabel>
        <InternalWorkbenchNotice meta={meta} compact />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by family, note, or exercise"
          style={{
            width: "100%",
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--surf2)",
            color: "var(--text)",
          }}
        />

        {latestRun && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid rgba(248, 113, 113, 0.24)",
              background: "rgba(127, 29, 29, 0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900 }}>{latestRun.title}</div>
                <div style={{ fontSize: "12px", color: "var(--text2)", marginTop: "3px" }}>
                  {latestRun.mutationFamilies.join(" · ")}
                </div>
              </div>
              <ShellBadge tone="accent">{latestRun.isolationMode}</ShellBadge>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
              {latestRun.operatorNotes}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginTop: "14px",
              }}
            >
              {latestRun.variants.map((variant) => (
                <div
                  key={variant.id}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "rgba(8, 12, 22, 0.85)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <strong style={{ fontSize: "12px" }}>{variant.model}</strong>
                    <ShellBadge
                      tone={
                        variant.verdict === "stable"
                          ? "success"
                          : variant.verdict === "guarded"
                            ? "accent"
                            : "muted"
                      }
                    >
                      {variant.verdict}
                    </ShellBadge>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "8px",
                      marginTop: "10px",
                      fontSize: "11px",
                    }}
                  >
                    <div>
                      <div style={{ color: "var(--text3)" }}>Refusal</div>
                      <strong>{variant.refusalScore}</strong>
                    </div>
                    <div>
                      <div style={{ color: "var(--text3)" }}>Leakage</div>
                      <strong>{variant.leakageRisk}</strong>
                    </div>
                    <div>
                      <div style={{ color: "var(--text3)" }}>Stability</div>
                      <strong>{variant.stability}</strong>
                    </div>
                    <div>
                      <div style={{ color: "var(--text3)" }}>Usefulness</div>
                      <strong>{variant.usefulness}</strong>
                    </div>
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                    {variant.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
          {visibleRuns.slice(1).map((run) => (
            <div
              key={run.id}
              style={{
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "rgba(10, 15, 30, 0.62)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <strong style={{ fontSize: "12px" }}>{run.title}</strong>
                <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                  {new Date(run.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text2)", lineHeight: 1.55 }}>
                {run.mutationFamilies.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SectionLabel, ShellBadge, ShellButton } from "@/components/ui/shell";
import { InternalWorkbenchNotice } from "@/components/ui/InternalWorkbenchNotice";
import { SurfaceCallout } from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import type { ModelLabRun } from "@/lib/assimilation/types";
import type { InternalWorkbenchMeta } from "@/lib/assimilation/contracts";
import {
  parseRuntimeExperimentPayload,
  summarizeRuntimeExperiment,
  type RuntimeExperimentCategory,
  type RuntimeExperimentPayload,
  type RuntimeExperimentRun,
  type RuntimeExperimentVariantKind,
} from "@/lib/runtimeExperimentContracts";

const MUTATION_FAMILIES = [
  "boundary inversion",
  "authority spoofing",
  "encoded prompts",
  "obfuscated trigger words",
  "prompt compression",
  "nested instructions",
];

const MODELS = ["claude-opus", "local-qwen", "openrouter-stack", "groq-fast"];

const VARIANT_KINDS: Array<{
  id: RuntimeExperimentVariantKind;
  label: string;
  detail: string;
}> = [
  {
    id: "prompt_delta",
    label: "Prompt delta",
    detail: "Tighten or rebalance the operator/system prompt contract.",
  },
  {
    id: "routing_preset_delta",
    label: "Routing preset",
    detail:
      "Try a different route/capability bias before widening the live runtime.",
  },
  {
    id: "memory_context_policy_delta",
    label: "Memory policy",
    detail:
      "Stress-test correction/retrieval compaction and context weighting.",
  },
  {
    id: "tool_selection_policy_delta",
    label: "Tool selection",
    detail:
      "Adjust tool-selection discipline without changing live execution rules.",
  },
];

const EXPERIMENT_CATEGORIES: RuntimeExperimentCategory[] = [
  "safety",
  "reliability",
  "ux",
  "observability",
];

async function loadRuns() {
  const response = await apiFetch("/api/model-lab", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load model lab.");
  return (await response.json()) as {
    runs: ModelLabRun[];
    meta?: InternalWorkbenchMeta;
  };
}

async function loadRuntimeExperiments() {
  const response = await apiFetch("/api/metrics/runtime-experiments?limit=12", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to load runtime experiments.");
  const payload = await response.json();
  return {
    data: parseRuntimeExperimentPayload(payload),
    meta: (payload as { meta?: InternalWorkbenchMeta }).meta ?? null,
  };
}

export default function BlacksiteLab() {
  const [runs, setRuns] = useState<ModelLabRun[]>([]);
  const [meta, setMeta] = useState<InternalWorkbenchMeta | null>(null);
  const [experimentData, setExperimentData] =
    useState<RuntimeExperimentPayload>({
      latest: null,
      history: [],
      definitions: [],
      points: 0,
      summary: null,
    });
  const [experimentMeta, setExperimentMeta] =
    useState<InternalWorkbenchMeta | null>(null);
  const [title, setTitle] = useState("Operator boundary tournament");
  const [promptLabel, setPromptLabel] = useState("Control baseline");
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
  const [experimentTitle, setExperimentTitle] = useState(
    "Correction-memory compaction trial",
  );
  const [variantKind, setVariantKind] = useState<RuntimeExperimentVariantKind>(
    "memory_context_policy_delta",
  );
  const [changeSummary, setChangeSummary] = useState(
    "Tighten context injection so only the sharpest approved corrections and retrieval blocks survive into the live turn.",
  );
  const [hypothesis, setHypothesis] = useState(
    "A smaller deterministic memory package should improve reliability without widening prompt drift.",
  );
  const [targetCategories, setTargetCategories] = useState<
    RuntimeExperimentCategory[]
  >(["reliability", "safety"]);
  const [experimentNotes, setExperimentNotes] = useState(
    "Keep the variant evidence-only until the delta clearly beats baseline.",
  );
  const [experimentBusy, setExperimentBusy] = useState(false);
  const [experimentError, setExperimentError] = useState("");
  const deferredFilter = useDeferredValue(filter);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([loadRuns(), loadRuntimeExperiments()]).then(
      ([labResult, experimentResult]) => {
        if (!active) return;

        if (labResult.status === "fulfilled") {
          startTransition(() => {
            setRuns(labResult.value.runs);
            setMeta(labResult.value.meta ?? null);
            setError("");
          });
        } else {
          setError(
            "Model Lab is temporarily unavailable. Retained tournament runs stay visible until the route recovers.",
          );
        }

        if (experimentResult.status === "fulfilled") {
          startTransition(() => {
            setExperimentData(experimentResult.value.data);
            setExperimentMeta(experimentResult.value.meta ?? null);
            setExperimentError("");
          });
        } else {
          setExperimentError(
            "Runtime variant history is temporarily unavailable. Existing eval posture stays intact.",
          );
        }
      },
    );
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
  const latestExperiment = experimentData.latest ?? null;
  const latestExperimentSummary = summarizeRuntimeExperiment(latestExperiment);
  const experimentHistory = latestExperiment
    ? experimentData.history.filter((run) => run.id !== latestExperiment.id)
    : experimentData.history;

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

  function toggleExperimentCategory(nextCategory: RuntimeExperimentCategory) {
    setTargetCategories((current) =>
      current.includes(nextCategory)
        ? current.filter((value) => value !== nextCategory)
        : [...current, nextCategory],
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

  async function runRuntimeExperiment() {
    setExperimentBusy(true);
    try {
      const response = await apiFetch("/api/metrics/runtime-experiments/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: experimentTitle,
          variantKind,
          changeSummary,
          hypothesis,
          targetCategories,
          operatorNotes: experimentNotes,
        }),
      });
      if (!response.ok) throw new Error("Failed to run runtime experiment.");
      const payload = (await response.json()) as {
        run?: RuntimeExperimentRun;
        meta?: InternalWorkbenchMeta | null;
      };
      if (payload.meta) {
        setExperimentMeta(payload.meta);
      }
      const refreshed = await loadRuntimeExperiments();
      setExperimentData(refreshed.data);
      setExperimentMeta(refreshed.meta ?? payload.meta ?? null);
      setExperimentError("");
    } catch {
      setExperimentError(
        "The runtime experiment did not complete. Baseline runtime posture was left unchanged.",
      );
    } finally {
      setExperimentBusy(false);
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
      <div style={{ display: "grid", gap: "16px" }}>
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
                role="alert"
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
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
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
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
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
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Isolation controls
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
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "10px",
            }}
          >
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
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "10px",
            }}
          >
            {MODELS.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() =>
                  toggleItem(selectedModels, model, setSelectedModels)
                }
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

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "16px",
            }}
          >
            <ShellButton onClick={() => void runCompare()}>
              {busy ? "Running..." : "Run tournament"}
            </ShellButton>
            <ShellBadge tone="accent">Isolated session</ShellBadge>
            <ShellBadge tone="muted">No carryover into HQ</ShellBadge>
          </div>
        </section>

        <section
          style={{
            border: "1px solid rgba(59, 130, 246, 0.28)",
            borderRadius: "var(--r)",
            padding: "14px",
            background:
              "radial-gradient(circle at top, rgba(30, 64, 175, 0.22), transparent 55%), rgba(8, 10, 20, 0.86)",
          }}
        >
          <SectionLabel detail="Derived baseline-vs-variant scoring">
            Runtime variants
          </SectionLabel>
          <InternalWorkbenchNotice meta={experimentMeta} compact />
          {experimentError ? (
            <div style={{ marginTop: "10px" }}>
              <SurfaceCallout
                role="alert"
                tone="warning"
                compact
                icon="↺"
                title="Runtime variants degraded"
                description={experimentError}
              />
            </div>
          ) : null}
          <div style={{ display: "grid", gap: "12px", marginTop: "10px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Experiment title
              </span>
              <input
                value={experimentTitle}
                onChange={(event) => setExperimentTitle(event.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(59, 130, 246, 0.32)",
                  background: "rgba(10, 14, 28, 0.94)",
                  color: "var(--text)",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Variant kind
              </span>
              <select
                value={variantKind}
                onChange={(event) =>
                  setVariantKind(
                    event.target.value as RuntimeExperimentVariantKind,
                  )
                }
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(59, 130, 246, 0.32)",
                  background: "rgba(10, 14, 28, 0.94)",
                  color: "var(--text)",
                }}
              >
                {VARIANT_KINDS.map((kind) => (
                  <option key={kind.id} value={kind.id}>
                    {kind.label}
                  </option>
                ))}
              </select>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text2)",
                  lineHeight: 1.5,
                }}
              >
                {VARIANT_KINDS.find((kind) => kind.id === variantKind)?.detail}
              </span>
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Change summary
              </span>
              <textarea
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value)}
                rows={3}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(59, 130, 246, 0.32)",
                  background: "rgba(10, 14, 28, 0.94)",
                  color: "var(--text)",
                  resize: "vertical",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Hypothesis
              </span>
              <textarea
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                rows={3}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(59, 130, 246, 0.32)",
                  background: "rgba(10, 14, 28, 0.94)",
                  color: "var(--text)",
                  resize: "vertical",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Operator notes
              </span>
              <textarea
                value={experimentNotes}
                onChange={(event) => setExperimentNotes(event.target.value)}
                rows={3}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(59, 130, 246, 0.32)",
                  background: "rgba(10, 14, 28, 0.94)",
                  color: "var(--text)",
                  resize: "vertical",
                }}
              />
            </label>
          </div>

          <SectionLabel detail={`${targetCategories.length} active`}>
            Target categories
          </SectionLabel>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "10px",
            }}
          >
            {EXPERIMENT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleExperimentCategory(category)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "999px",
                  border: targetCategories.includes(category)
                    ? "1px solid rgba(96, 165, 250, 0.66)"
                    : "1px solid var(--border)",
                  background: targetCategories.includes(category)
                    ? "rgba(30, 64, 175, 0.28)"
                    : "rgba(10, 15, 30, 0.58)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: "11px",
                  textTransform: "capitalize",
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "16px",
            }}
          >
            <ShellButton onClick={() => void runRuntimeExperiment()}>
              {experimentBusy ? "Running..." : "Run runtime variant"}
            </ShellButton>
            <ShellBadge tone="accent">Baseline preserved</ShellBadge>
            <ShellBadge tone="muted">Evidence only</ShellBadge>
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        <section
          style={{
            border: "1px solid rgba(59, 130, 246, 0.26)",
            borderRadius: "var(--r)",
            padding: "14px",
            background: "rgba(7, 10, 18, 0.82)",
          }}
        >
          <SectionLabel detail="Latest baseline-vs-variant evidence">
            Runtime experiment ledger
          </SectionLabel>
          <InternalWorkbenchNotice meta={experimentMeta} compact />
          {latestExperiment ? (
            <div
              style={{
                marginTop: "14px",
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid rgba(96, 165, 250, 0.22)",
                background: "rgba(30, 64, 175, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 900 }}>
                    {latestExperiment.definition.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text2)",
                      marginTop: "3px",
                    }}
                  >
                    {latestExperiment.definition.variantKind.replaceAll(
                      "_",
                      " ",
                    )}{" "}
                    ·{" "}
                    {latestExperiment.definition.targetCategories.join(" · ") ||
                      "broad posture"}
                  </div>
                </div>
                <ShellBadge
                  tone={
                    latestExperimentSummary?.recommendation === "candidate_win"
                      ? "success"
                      : latestExperimentSummary?.recommendation === "review"
                        ? "accent"
                        : "muted"
                  }
                >
                  {latestExperimentSummary?.recommendation ?? "review"}
                </ShellBadge>
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "12px",
                  color: "var(--text2)",
                  lineHeight: 1.6,
                }}
              >
                {latestExperiment.comparison.summary}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                  marginTop: "14px",
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "rgba(8, 12, 22, 0.85)",
                  }}
                >
                  <div style={{ color: "var(--text3)", fontSize: "11px" }}>
                    Score delta
                  </div>
                  <strong style={{ fontSize: "18px" }}>
                    {latestExperiment.comparison.scoreDelta >= 0 ? "+" : ""}
                    {latestExperiment.comparison.scoreDelta}
                  </strong>
                </div>
                {Object.entries(latestExperiment.comparison.categoryDeltas).map(
                  ([category, delta]) => (
                    <div
                      key={category}
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        background: "rgba(8, 12, 22, 0.85)",
                      }}
                    >
                      <div
                        style={{
                          color: "var(--text3)",
                          fontSize: "11px",
                          textTransform: "capitalize",
                        }}
                      >
                        {category}
                      </div>
                      <strong style={{ fontSize: "15px" }}>
                        {delta >= 0 ? "+" : ""}
                        {delta}
                      </strong>
                    </div>
                  ),
                )}
              </div>

              {latestExperiment.variant.notes.length ? (
                <div style={{ display: "grid", gap: "6px", marginTop: "14px" }}>
                  {latestExperiment.variant.notes.map((note) => (
                    <div
                      key={note}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "12px",
                        border: "1px solid rgba(96, 165, 250, 0.16)",
                        background: "rgba(9, 16, 34, 0.72)",
                        fontSize: "11px",
                        color: "var(--text2)",
                        lineHeight: 1.55,
                      }}
                    >
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ marginTop: "14px" }}>
              <SurfaceCallout
                tone="default"
                compact
                icon="∿"
                title="No runtime variants recorded yet"
                description="Run the first runtime variant from the Blacksite control lane to compare baseline and candidate posture."
              />
            </div>
          )}

          <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
            {experimentHistory.slice(0, 6).map((run) => (
              <div
                key={run.id}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "rgba(10, 15, 30, 0.62)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <strong style={{ fontSize: "12px" }}>
                    {run.definition.title}
                  </strong>
                  <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                    {new Date(run.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "11px",
                    color: "var(--text2)",
                    lineHeight: 1.55,
                  }}
                >
                  {run.comparison.summary}
                </p>
              </div>
            ))}
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
          <SectionLabel detail="Search previous tournaments">
            Blacksite ledger
          </SectionLabel>
          <InternalWorkbenchNotice meta={meta} compact />
          <input
            aria-label="Search Blacksite ledger"
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 900 }}>
                    {latestRun.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text2)",
                      marginTop: "3px",
                    }}
                  >
                    {latestRun.mutationFamilies.join(" · ")}
                  </div>
                </div>
                <ShellBadge tone="accent">{latestRun.isolationMode}</ShellBadge>
              </div>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "12px",
                  color: "var(--text2)",
                  lineHeight: 1.6,
                }}
              >
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <strong style={{ fontSize: "12px" }}>
                        {variant.model}
                      </strong>
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
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: "11px",
                        color: "var(--text2)",
                        lineHeight: 1.55,
                      }}
                    >
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <strong style={{ fontSize: "12px" }}>{run.title}</strong>
                  <span style={{ fontSize: "10px", color: "var(--text3)" }}>
                    {new Date(run.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "11px",
                    color: "var(--text2)",
                    lineHeight: 1.55,
                  }}
                >
                  {run.mutationFamilies.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

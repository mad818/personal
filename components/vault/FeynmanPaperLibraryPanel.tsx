"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  FeynmanPaperAccelerationPosture,
  FeynmanPaperLibrarySummary,
  FeynmanPaperRetrievalMode,
} from "@/lib/feynmanPaperLibrary";

type LibraryResponse = {
  papers: FeynmanPaperLibrarySummary[];
  retrieval: FeynmanPaperRetrievalMode;
  acceleration: FeynmanPaperAccelerationPosture;
};

type MutationResponse = {
  paper: FeynmanPaperLibrarySummary;
  indexed: boolean;
  refreshed?: boolean;
};

const EMPTY_ACCELERATION: FeynmanPaperAccelerationPosture = {
  enabled: false,
  available: false,
  embeddingMode: "unknown",
};

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(
      payload.error || `Request failed with HTTP ${response.status}.`,
    );
  }
  return payload;
}

async function responseFailure(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return new Error(
      payload.error || `Request failed with HTTP ${response.status}.`,
    );
  } catch {
    return new Error(`Request failed with HTTP ${response.status}.`);
  }
}

function retrievalLabel(
  retrieval: FeynmanPaperRetrievalMode,
  acceleration: FeynmanPaperAccelerationPosture,
) {
  if (retrieval === "local_vector") {
    return `Local vector · ${acceleration.embeddingMode} embeddings`;
  }
  if (retrieval === "keyword_fallback") return "Local keyword fallback";
  return "Recently updated";
}

function formatPaperDate(value: string | null) {
  if (!value) return "Date unavailable";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleDateString()
    : value;
}

export default function FeynmanPaperLibraryPanel() {
  const [papers, setPapers] = useState<FeynmanPaperLibrarySummary[]>([]);
  const [retrieval, setRetrieval] =
    useState<FeynmanPaperRetrievalMode>("recent");
  const [acceleration, setAcceleration] = useState(EMPTY_ACCELERATION);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(
    () => papers.find((paper) => paper.id === selectedId) ?? papers[0] ?? null,
    [papers, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setAnnotation("");
      setTags("");
      return;
    }
    setSelectedId(selected.id);
    setAnnotation(selected.annotation);
    setTags(selected.tags.join(", "));
  }, [selected]);

  const loadPapers = useCallback(async (nextQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const search = nextQuery.trim();
      const response = await fetch(
        `/api/feynman/papers?limit=40${search ? `&query=${encodeURIComponent(search)}` : ""}`,
        { cache: "no-store" },
      );
      const payload = await readResponse<LibraryResponse>(response);
      setPapers(payload.papers);
      setRetrieval(payload.retrieval);
      setAcceleration(payload.acceleration);
      setActiveQuery(search);
      setSelectedId((current) =>
        payload.papers.some((paper) => paper.id === current)
          ? current
          : (payload.papers[0]?.id ?? null),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Paper library unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPapers("");
  }, [loadPapers]);

  async function addPaper(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reference.trim() || mutating) return;
    setMutating(true);
    setError(null);
    setNotice("Inspecting bounded public arXiv evidence…");
    try {
      const response = await fetch("/api/feynman/papers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim() }),
      });
      if (!response.ok) throw await responseFailure(response);
      const payload = await readResponse<MutationResponse>(response);
      setReference("");
      setNotice(
        `${payload.refreshed ? "Refreshed" : "Added"} ${payload.paper.arxivId}. ${
          payload.indexed
            ? "Local vector index updated."
            : "Saved locally; vector runtime is optional and keyword search remains available."
        }`,
      );
      setQuery("");
      await loadPapers("");
      setSelectedId(payload.paper.id);
    } catch (addError) {
      setNotice(null);
      setError(
        addError instanceof Error
          ? addError.message
          : "The paper could not be added.",
      );
    } finally {
      setMutating(false);
    }
  }

  async function searchPapers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    await loadPapers(query);
  }

  async function saveAnnotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || mutating) return;
    setMutating(true);
    setError(null);
    setNotice("Saving annotation locally…");
    try {
      const response = await fetch("/api/feynman/papers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, annotation, tags }),
      });
      if (!response.ok) throw await responseFailure(response);
      const payload = await readResponse<MutationResponse>(response);
      setPapers((current) =>
        current.map((paper) =>
          paper.id === payload.paper.id ? payload.paper : paper,
        ),
      );
      setNotice(
        payload.indexed
          ? "Annotation saved locally and the vector index was refreshed."
          : "Annotation saved locally. The optional vector runtime is unavailable, so keyword fallback remains active.",
      );
    } catch (saveError) {
      setNotice(null);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The annotation could not be saved.",
      );
    } finally {
      setMutating(false);
    }
  }

  return (
    <section className="grid gap-4" aria-label="Feynman local paper library">
      <div className="grid gap-3 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surf2)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text3)]">
              Feynman local library
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--text)]">
              Paper search without a chat call
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text2)]">
              Add public arXiv evidence, search the local index, and keep
              private annotations on this device. Ollama embeddings are used
              only when the loopback acceleration service is enabled.
            </p>
          </div>
          <span className="rounded-full border border-[var(--border2)] bg-[var(--surf3)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text2)]">
            {retrievalLabel(retrieval, acceleration)}
          </span>
        </div>

        <form onSubmit={addPaper} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="feynman-paper-reference">
            Public arXiv ID or URL
          </label>
          <input
            id="feynman-paper-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="arXiv ID or canonical https://arxiv.org/abs/… URL"
            maxLength={240}
            className="min-w-0 flex-1 rounded-[var(--rs)] border border-[var(--border2)] bg-[var(--surf3)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!reference.trim() || mutating}
            className="rounded-[var(--rs)] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutating ? "Working…" : "Add paper"}
          </button>
        </form>

        <form
          onSubmit={searchPapers}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <label className="sr-only" htmlFor="feynman-paper-query">
            Search local papers
          </label>
          <input
            id="feynman-paper-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search methods, findings, authors, tags, or your annotations"
            maxLength={240}
            className="min-w-0 flex-1 rounded-[var(--rs)] border border-[var(--border2)] bg-[var(--surf3)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-[var(--rs)] border border-[var(--border2)] px-4 py-2 text-xs font-semibold text-[var(--text)] disabled:opacity-50"
          >
            Search local
          </button>
          {activeQuery ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                void loadPapers("");
              }}
              className="rounded-[var(--rs)] px-3 py-2 text-xs text-[var(--text2)]"
            >
              Clear
            </button>
          ) : null}
        </form>

        {notice ? (
          <p className="text-xs text-[var(--fhi)]" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-[var(--flo)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="grid content-start gap-2">
          {loading ? (
            <div className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surf2)] p-5 text-sm text-[var(--text2)]">
              Reading the local paper library…
            </div>
          ) : papers.length === 0 ? (
            <div className="rounded-[var(--r)] border border-dashed border-[var(--border2)] bg-[var(--surf2)] p-5">
              <h4 className="text-sm font-semibold text-[var(--text)]">
                {activeQuery ? "No local match" : "No papers indexed yet"}
              </h4>
              <p className="mt-1 text-xs leading-5 text-[var(--text2)]">
                {activeQuery
                  ? "Try a broader query or clear search. No external provider was contacted."
                  : "Add one public arXiv ID above. Nexus will store only bounded inspected evidence in the ignored local workspace."}
              </p>
            </div>
          ) : (
            papers.map((paper) => (
              <button
                key={paper.id}
                type="button"
                onClick={() => setSelectedId(paper.id)}
                className={`rounded-[var(--r)] border p-4 text-left transition-colors ${
                  selected?.id === paper.id
                    ? "border-[var(--accent)] bg-[var(--surf3)]"
                    : "border-[var(--border)] bg-[var(--surf2)] hover:border-[var(--border2)]"
                }`}
              >
                <span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--text3)]">
                  {paper.arxivId} · {formatPaperDate(paper.publishedAt)}
                </span>
                <strong className="mt-1 block text-sm leading-5 text-[var(--text)]">
                  {paper.title}
                </strong>
                <span className="mt-2 block line-clamp-2 text-xs leading-5 text-[var(--text2)]">
                  {paper.abstract ||
                    "Bounded metadata indexed; abstract unavailable."}
                </span>
                <span className="mt-2 block text-[10px] text-[var(--text3)]">
                  {paper.annotation ? "Annotated locally" : "No annotation"}
                  {paper.tags.length > 0 ? ` · ${paper.tags.join(" · ")}` : ""}
                </span>
              </button>
            ))
          )}
        </div>

        {selected ? (
          <form
            onSubmit={saveAnnotation}
            className="grid content-start gap-3 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surf2)] p-4"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text3)]">
                Local annotation · {selected.arxivId}
              </p>
              <h4 className="mt-1 text-sm font-semibold leading-5 text-[var(--text)]">
                {selected.title}
              </h4>
              <p className="mt-1 text-xs text-[var(--text2)]">
                {selected.authors.join(", ") || "Authors unavailable"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px]">
              <a
                href={selected.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--border2)] px-3 py-1 text-[var(--accent)]"
              >
                arXiv source
              </a>
              <a
                href={selected.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[var(--border2)] px-3 py-1 text-[var(--accent)]"
              >
                PDF
              </a>
              {selected.repositoryLinks.map((repository) => (
                <a
                  key={repository}
                  href={repository}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--border2)] px-3 py-1 text-[var(--accent)]"
                >
                  Disclosed code
                </a>
              ))}
            </div>

            <label
              htmlFor="feynman-paper-annotation"
              className="text-[10px] uppercase tracking-[0.12em] text-[var(--text3)]"
            >
              Annotation
            </label>
            <textarea
              id="feynman-paper-annotation"
              value={annotation}
              onChange={(event) => setAnnotation(event.target.value)}
              rows={9}
              maxLength={4000}
              placeholder="Record why this matters, open questions, caveats, or follow-up evidence."
              className="resize-y rounded-[var(--rs)] border border-[var(--border2)] bg-[var(--surf3)] px-3 py-2 text-sm leading-5 text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />

            <label
              htmlFor="feynman-paper-tags"
              className="text-[10px] uppercase tracking-[0.12em] text-[var(--text3)]"
            >
              Tags · comma separated
            </label>
            <input
              id="feynman-paper-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              maxLength={655}
              placeholder="retrieval, agents, evaluation"
              className="rounded-[var(--rs)] border border-[var(--border2)] bg-[var(--surf3)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-[var(--text3)]">
                {annotation.length}/4,000 · stored under ignored `.nexus/`
              </span>
              <button
                type="submit"
                disabled={mutating}
                className="rounded-[var(--rs)] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {mutating ? "Saving…" : "Save locally"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}

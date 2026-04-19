"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RepoComparePanel from "@/components/recon/RepoComparePanel";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { ShellBadge, ShellButton } from "@/components/ui/shell";
import { apiFetch } from "@/lib/apiFetch";
import { queueHQPrompt } from "@/lib/hqPromptQueue";
import {
  buildRepoCompareOrbitPrompt,
  buildRepoReferenceTag,
} from "@/lib/repoCompare";
import {
  buildRepoAssimilationEvidenceStrength,
  buildRepoAssimilationOrbitPrompt,
  buildRepoAssimilationPreparedWorkspace,
  buildRepoAssimilationSourceRefs,
  buildRepoAssimilationSummary,
  buildRepoAssimilationTags,
  buildRepoAssimilationTitle,
  parseRepoAssimilationMarkdown,
} from "@/lib/repoAssimilation";
import {
  buildRepoIntelOrbitPrompt,
  normalizeRepoIntelReference,
  type RepoIntelProfile,
} from "@/lib/repoIntel";
import { buildCompiledPageHref } from "@/lib/xr1Workflows";
import { useStore } from "@/store/useStore";

type RepoIntelStatus = "idle" | "loading" | "ready" | "error";
type AssimilationStatus = "idle" | "loading" | "saved" | "error";

interface RepoAssimilationPage {
  id: string;
  title: string;
  summary: string;
  workflowId?: string;
  tags: string[];
  updatedAt: number;
  content?: string;
  continuity: {
    repoMemoryBinding?: string | null;
  };
}

interface RepoComparePage {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: number;
  content?: string;
}

function inputStyle() {
  return {
    minHeight: "38px",
    borderRadius: "10px",
    border: "1px solid rgba(96, 165, 250, 0.18)",
    background: "rgba(9, 14, 28, 0.42)",
    color: "var(--text)",
    padding: "0 10px",
    width: "100%",
    fontSize: "12px",
  };
}

function truncateInline(text: string, max = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export default function RepoIntelPanel() {
  const router = useRouter();
  const setTab = useStore((state) => state.setTab);
  const [repoInput, setRepoInput] = useState("");
  const [status, setStatus] = useState<RepoIntelStatus>("idle");
  const [profile, setProfile] = useState<RepoIntelProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [assimilationStatus, setAssimilationStatus] =
    useState<AssimilationStatus>("idle");
  const [assimilationError, setAssimilationError] = useState<string | null>(
    null,
  );
  const [assimilationPages, setAssimilationPages] = useState<
    RepoAssimilationPage[]
  >([]);
  const [comparePages, setComparePages] = useState<RepoComparePage[]>([]);

  const normalized = useMemo(
    () => normalizeRepoIntelReference(repoInput),
    [repoInput],
  );

  useEffect(() => {
    let cancelled = false;

    const loadAssimilationPages = async () => {
      try {
        const response = await apiFetch(
          "/api/memory/pages?limit=16&workflowId=repo-assimilation",
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          pages?: RepoAssimilationPage[];
        };
        if (!cancelled && Array.isArray(payload.pages)) {
          setAssimilationPages(payload.pages);
        }
      } catch {
        // silent
      }
    };

    void loadAssimilationPages();
    const handleRefresh = () => {
      void loadAssimilationPages();
    };
    window.addEventListener("nexus-memory-pages-updated", handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("nexus-memory-pages-updated", handleRefresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadComparePages = async () => {
      try {
        const response = await apiFetch(
          "/api/memory/pages?limit=16&workflowId=repo-compare",
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          pages?: RepoComparePage[];
        };
        if (!cancelled && Array.isArray(payload.pages)) {
          setComparePages(payload.pages);
        }
      } catch {
        // silent
      }
    };

    void loadComparePages();
    const handleRefresh = () => {
      void loadComparePages();
    };
    window.addEventListener("nexus-memory-pages-updated", handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("nexus-memory-pages-updated", handleRefresh);
    };
  }, []);

  const latestAssimilation = useMemo(() => {
    if (!profile) return null;
    return (
      [...assimilationPages]
        .filter(
          (page) =>
            page.continuity?.repoMemoryBinding === profile.normalizedRepoId,
        )
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [assimilationPages, profile]);

  const latestComparison = useMemo(() => {
    if (!profile) return null;
    const repoTag = buildRepoReferenceTag(profile.normalizedRepoId);
    return (
      [...comparePages]
        .filter((page) => page.tags.includes(repoTag))
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
    );
  }, [comparePages, profile]);

  const loadRepoIntel = async () => {
    setStatus("loading");
    setError(null);
    setWarnings([]);
    setDegraded(false);
    setAssimilationStatus("idle");
    setAssimilationError(null);

    try {
      const response = await apiFetch("/api/repo-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoInput }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            repo?: RepoIntelProfile;
            error?: string;
            meta?: { status?: string; warnings?: string[] };
          }
        | null;

      if (!response.ok || !payload?.repo) {
        setProfile(null);
        setStatus("error");
        setError(
          payload?.error ??
            `Repo intel failed with HTTP ${response.status}.`,
        );
        setWarnings(payload?.meta?.warnings ?? []);
        setDegraded(payload?.meta?.status === "degraded");
        return;
      }

      setProfile(payload.repo);
      setWarnings(payload.meta?.warnings ?? payload.repo.warnings ?? []);
      setDegraded(payload.meta?.status === "degraded");
      setStatus("ready");
    } catch {
      setProfile(null);
      setStatus("error");
      setError("Repo intel could not reach the local GitHub metadata route.");
    }
  };

  const routeToOrbit = (prompt: string) => {
    queueHQPrompt(`@orbit: ${prompt}`);
    setTab("home");
    router.push("/hq?focus=hq-chronicle");
  };

  const briefOrbit = () => {
    if (!profile) return;
    if (latestComparison?.content) {
      routeToOrbit(buildRepoCompareOrbitPrompt({ brief: latestComparison.content }));
      return;
    }
    if (latestAssimilation?.content) {
      routeToOrbit(
        buildRepoAssimilationOrbitPrompt({
          normalizedRepoId: profile.normalizedRepoId,
          brief: latestAssimilation.content,
        }),
      );
      return;
    }

    routeToOrbit(buildRepoIntelOrbitPrompt(profile));
  };

  const openLatestAssimilation = () => {
    if (!latestAssimilation) return;
    router.push(buildCompiledPageHref(latestAssimilation));
  };

  const assimilateRepo = async () => {
    if (!profile) return;
    setAssimilationStatus("loading");
    setAssimilationError(null);

    try {
      const toolResponse = await apiFetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "assimilate_repo",
          input: { owner_slash_repo: profile.normalizedRepoId },
        }),
      });
      const toolPayload = (await toolResponse.json().catch(() => null)) as
        | { result?: string; error?: string }
        | null;

      const brief = toolPayload?.result?.trim() ?? "";
      if (!toolResponse.ok || !brief || !brief.includes("## Repo snapshot")) {
        throw new Error(
          toolPayload?.error ??
            toolPayload?.result ??
            `Repo assimilation failed with HTTP ${toolResponse.status}.`,
        );
      }

      const saveResponse = await apiFetch("/api/memory/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: buildRepoAssimilationTitle(profile),
          summary: buildRepoAssimilationSummary(profile, brief),
          content: brief,
          source: "manual",
          sourceLabel: "Repo assimilation",
          sourceType: "citation",
          evidenceStrength: buildRepoAssimilationEvidenceStrength(profile),
          sourceRefs: buildRepoAssimilationSourceRefs(profile),
          workflowId: "repo-assimilation",
          workflowLabel: "Repo assimilation",
          route: "/recon",
          layer: "knowledge",
          domain: "engineering",
          memoryCompartment: "research",
          requestedVisibility: "internal",
          workflowPackId: "research-workflow",
          repoMemoryBinding: profile.normalizedRepoId,
          tags: buildRepoAssimilationTags(profile),
          topic: profile.normalizedRepoId,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(`Repo assimilation filing failed with HTTP ${saveResponse.status}.`);
      }

      const savePayload = (await saveResponse.json()) as {
        page?: RepoAssimilationPage;
      };
      if (savePayload.page) {
        setAssimilationPages((current) => [
          savePayload.page!,
          ...current.filter((page) => page.id !== savePayload.page?.id),
        ]);
      }
      setAssimilationStatus("saved");
      window.dispatchEvent(new Event("nexus-memory-pages-updated"));
    } catch (caughtError) {
      setAssimilationStatus("error");
      setAssimilationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Repo assimilation failed.",
      );
    }
  };

  const savedMemoryQuery = useMemo(
    () =>
      profile
        ? [profile.normalizedRepoId, latestAssimilation?.summary]
            .filter(Boolean)
            .join(" · ")
        : "",
    [latestAssimilation?.summary, profile],
  );

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <ShellBadge tone="accent">Repo intel</ShellBadge>
        <ShellBadge tone="muted">GitHub metadata only</ShellBadge>
        <ShellBadge tone="muted">Read-only assessment</ShellBadge>
        {degraded ? <ShellBadge tone="success">Degraded</ShellBadge> : null}
      </div>

      <div className="nexus-shell-copy nexus-shell-copy--compact">
        Assess a public GitHub repo as a dependency, competitor, or reference-library brief without fetching raw source files or widening into a code-ingestion lane. Assimilation and compare stay explicit and file to VAULT only after you ask for them.
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <input
          type="text"
          value={repoInput}
          onChange={(event) => {
            setRepoInput(event.target.value);
            setStatus("idle");
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void loadRepoIntel();
            }
          }}
          placeholder="GitHub URL or owner/repo"
          style={inputStyle()}
        />

        {repoInput.trim().length > 0 ? (
          <div
            style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.45 }}
          >
            {normalized.ok
              ? `Normalized repo: ${normalized.normalizedRepoId}`
              : normalized.error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellButton onClick={() => void loadRepoIntel()}>
            {status === "loading" ? "Assessing repo..." : "Assess repo"}
          </ShellButton>
          {profile ? (
            <ShellButton onClick={() => void assimilateRepo()}>
              {assimilationStatus === "loading"
                ? "Assimilating..."
                : assimilationStatus === "saved"
                  ? "Assimilation filed"
                  : "Assimilate repo"}
            </ShellButton>
          ) : null}
          {latestAssimilation ? (
            <ShellButton onClick={openLatestAssimilation}>
              Open latest assimilation
            </ShellButton>
          ) : null}
          {profile ? <ShellButton onClick={briefOrbit}>Brief ORBIT</ShellButton> : null}
        </div>
      </div>

      {error ? (
        <div style={{ fontSize: "11px", color: "var(--flo)", lineHeight: 1.5 }}>
          {error}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div style={{ fontSize: "10px", color: "#fcd34d", lineHeight: 1.5 }}>
          {warnings.join(" ")}
        </div>
      ) : null}

      {assimilationError ? (
        <div style={{ fontSize: "10px", color: "var(--flo)", lineHeight: 1.45 }}>
          {assimilationError}
        </div>
      ) : null}

      {latestAssimilation ? (
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(125, 211, 252, 0.16)",
            background: "rgba(8, 18, 31, 0.5)",
            padding: "10px 12px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#bfdbfe",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Latest assimilation
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
            {latestAssimilation.title}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
            {latestAssimilation.summary}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={openLatestAssimilation}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Open latest assimilation
            </button>
            <button
              type="button"
              onClick={briefOrbit}
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Brief ORBIT
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(buildRepoAssimilationPreparedWorkspace().href)
              }
              className="nexus-shell-button"
              style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
            >
              Reopen in RECON
            </button>
          </div>
        </div>
      ) : null}

      <div
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(96, 165, 250, 0.16)",
          background: "rgba(8, 18, 31, 0.46)",
          padding: "12px",
          display: "grid",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#93c5fd",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
          }}
        >
          Repo compare
        </div>
        <RepoComparePanel
          currentProfile={profile}
          latestAssimilation={latestAssimilation}
        />
      </div>

      {profile ? (
        <div
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(96, 165, 250, 0.16)",
            background: "rgba(8, 18, 31, 0.46)",
            padding: "12px",
            display: "grid",
            gap: "10px",
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
              {profile.displayName}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
              {profile.description || "No GitHub description was available."}
            </div>
            <div style={{ fontSize: "10px", color: "#93c5fd" }}>
              {profile.stars} stars · {profile.forks} forks · {profile.watchers} watchers ·{" "}
              {profile.license ?? "No license signal"} · default branch{" "}
              {profile.defaultBranch ?? "unknown"}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(profile.inferredStack.length > 0
              ? profile.inferredStack
              : profile.languageHints
            ).map((item) => (
              <ShellBadge key={item} tone="muted">
                {item}
              </ShellBadge>
            ))}
            {profile.topics.slice(0, 6).map((topic) => (
              <ShellBadge key={topic} tone="accent">
                {topic}
              </ShellBadge>
            ))}
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              Top-level tree
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text3)",
                lineHeight: 1.45,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {profile.topLevelTree.length > 0
                ? profile.topLevelTree
                    .slice(0, 14)
                    .map(
                      (entry) =>
                        `${entry.type === "dir" ? "[dir]" : "[file]"} ${entry.name}`,
                    )
                    .join("\n")
                : "Top-level tree unavailable."}
            </div>
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              README excerpt
            </div>
            <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.55 }}>
              {profile.readmeExcerpt || "README excerpt unavailable."}
            </div>
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#93c5fd",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
              }}
            >
              Implementation brief
            </div>
            <div style={{ fontSize: "11px", color: "var(--text)", lineHeight: 1.6 }}>
              {profile.implementationBrief}
            </div>
          </div>

          {latestAssimilation?.content ? (
            <div
              style={{
                display: "grid",
                gap: "6px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(110, 231, 183, 0.16)",
                background: "rgba(8, 26, 22, 0.42)",
              }}
            >
              {(() => {
                const parsed = parseRepoAssimilationMarkdown(
                  latestAssimilation.content ?? "",
                );
                return (
                  <>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#a7f3d0",
                        textTransform: "uppercase",
                        letterSpacing: "0.6px",
                      }}
                    >
                      Assimilation cue
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.45 }}>
                      <strong style={{ color: "var(--text)" }}>Fit map:</strong>{" "}
                      {truncateInline(parsed.nexusFitMap || "No fit map recorded yet.", 180)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.45 }}>
                      <strong style={{ color: "var(--text)" }}>Boundary:</strong>{" "}
                      {truncateInline(
                        parsed.boundariesAndRisks || "No boundary cues recorded yet.",
                        180,
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
      ) : null}

      {assimilationStatus === "saved" && latestAssimilation ? (
        <MissionContinuationActions
          memoryQuery={savedMemoryQuery}
          routeHint="/vault?focus=vault-compiled-pages&workflowId=repo-assimilation"
          extraTargets={[
            {
              href: buildRepoAssimilationPreparedWorkspace().href,
              label: "Return to RECON",
              tab: "recon",
            },
          ]}
          showReturnToHQ
        />
      ) : null}
    </div>
  );
}

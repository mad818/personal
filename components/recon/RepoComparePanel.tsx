"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MissionContinuationActions from "@/components/ui/MissionContinuationActions";
import { ShellButton } from "@/components/ui/shell";
import { apiFetch } from "@/lib/apiFetch";
import { queueHQPrompt } from "@/lib/hqPromptQueue";
import {
  buildRepoCompareEvidenceStrength,
  buildRepoCompareOrbitPrompt,
  buildRepoCompareSourceRefs,
  buildRepoCompareSummary,
  buildRepoCompareTags,
  buildRepoCompareTitle,
  buildRepoReferenceTag,
  parseRepoCompareMarkdown,
  type RepoCompareSections,
} from "@/lib/repoCompare";
import {
  buildRepoAssimilationOrbitPrompt,
} from "@/lib/repoAssimilation";
import {
  buildRepoIntelOrbitPrompt,
  normalizeRepoIntelReference,
  type RepoIntelProfile,
} from "@/lib/repoIntel";
import { buildCompiledPageHref } from "@/lib/xr1Workflows";
import { useStore } from "@/store/useStore";

type CompareStatus = "idle" | "loading" | "saved" | "error";

interface RepoComparePage {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: number;
  content?: string;
}

interface RepoComparePanelProps {
  currentProfile: RepoIntelProfile | null;
  latestAssimilation:
    | {
        content?: string;
      }
    | null;
  correctionConstraintLines: string[];
  correctionMemoryIds: string[];
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

function findMatchingComparisonPage(
  pages: RepoComparePage[],
  compareRefs: string[],
) {
  const sorted = [...pages].sort((left, right) => right.updatedAt - left.updatedAt);
  if (compareRefs.length < 2) return sorted[0] ?? null;
  const requiredTags = compareRefs.map(buildRepoReferenceTag);
  return (
    sorted.find((page) => requiredTags.every((tag) => page.tags.includes(tag))) ??
    sorted[0] ??
    null
  );
}

export default function RepoComparePanel({
  currentProfile,
  latestAssimilation,
  correctionConstraintLines,
  correctionMemoryIds,
}: RepoComparePanelProps) {
  const router = useRouter();
  const setTab = useStore((state) => state.setTab);
  const markCorrectionMemoriesApplied = useStore(
    (state) => state.markCorrectionMemoriesApplied,
  );
  const [compareInput, setCompareInput] = useState("");
  const [compareRefs, setCompareRefs] = useState<string[]>([]);
  const [compareStatus, setCompareStatus] = useState<CompareStatus>("idle");
  const [compareError, setCompareError] = useState<string | null>(null);
  const [comparePages, setComparePages] = useState<RepoComparePage[]>([]);
  const [compareResult, setCompareResult] = useState<RepoCompareSections | null>(
    null,
  );

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

  const latestComparison = useMemo(
    () => findMatchingComparisonPage(comparePages, compareRefs),
    [comparePages, compareRefs],
  );

  const visibleCompareResult = useMemo(() => {
    if (compareResult) return compareResult;
    if (!latestComparison?.content) return null;
    return parseRepoCompareMarkdown(latestComparison.content);
  }, [compareResult, latestComparison]);

  const addCompareRef = (rawRepoRef: string) => {
    const normalized = normalizeRepoIntelReference(rawRepoRef);
    if (!normalized.ok) {
      setCompareError(normalized.error);
      return;
    }
    setCompareError(null);
    setCompareRefs((current) => {
      if (current.includes(normalized.normalizedRepoId)) return current;
      if (current.length >= 3) {
        setCompareError("Repo compare is capped at 3 public repos.");
        return current;
      }
      return [...current, normalized.normalizedRepoId];
    });
  };

  const loadRepoProfile = async (repoRef: string) => {
    const response = await apiFetch("/api/repo-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: repoRef }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { repo?: RepoIntelProfile; error?: string }
      | null;
    if (!response.ok || !payload?.repo) {
      throw new Error(
        payload?.error ??
          `Repo intel failed with HTTP ${response.status} for ${repoRef}.`,
      );
    }
    return payload.repo;
  };

  const compareRepos = async () => {
    if (compareRefs.length < 2 || compareRefs.length > 3) {
      setCompareError("Repo compare requires exactly 2 or 3 repos.");
      return;
    }

    setCompareStatus("loading");
    setCompareError(null);
    setCompareResult(null);

    try {
      const toolResponse = await apiFetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "compare_repos",
          input: { repo_refs: compareRefs },
        }),
      });
      const toolPayload = (await toolResponse.json().catch(() => null)) as
        | { result?: string; error?: string }
        | null;
      const brief = toolPayload?.result?.trim() ?? "";
      if (!toolResponse.ok || !brief || !brief.includes("## Candidates")) {
        throw new Error(
          toolPayload?.error ??
            toolPayload?.result ??
            `Repo compare failed with HTTP ${toolResponse.status}.`,
        );
      }

      const profiles = await Promise.all(
        compareRefs.map(async (repoRef) => {
          if (currentProfile?.normalizedRepoId === repoRef) return currentProfile;
          return loadRepoProfile(repoRef);
        }),
      );

      const saveResponse = await apiFetch("/api/memory/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: buildRepoCompareTitle(profiles),
          summary: buildRepoCompareSummary(profiles, brief),
          content: brief,
          source: "manual",
          sourceLabel: "Repo compare",
          sourceType: "citation",
          evidenceStrength: buildRepoCompareEvidenceStrength(profiles),
          sourceRefs: buildRepoCompareSourceRefs(profiles),
          workflowId: "repo-compare",
          workflowLabel: "Repo compare",
          route: "/recon",
          layer: "knowledge",
          domain: "engineering",
          memoryCompartment: "research",
          requestedVisibility: "internal",
          workflowPackId: "research-workflow",
          tags: buildRepoCompareTags(profiles),
          topic: compareRefs.join(" vs "),
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(
          `Repo compare filing failed with HTTP ${saveResponse.status}.`,
        );
      }

      const savePayload = (await saveResponse.json()) as {
        page?: RepoComparePage;
      };
      if (savePayload.page) {
        setComparePages((current) => [
          savePayload.page!,
          ...current.filter((page) => page.id !== savePayload.page?.id),
        ]);
      }
      setCompareResult(parseRepoCompareMarkdown(brief));
      setCompareStatus("saved");
      window.dispatchEvent(new Event("nexus-memory-pages-updated"));
    } catch (caughtError) {
      setCompareStatus("error");
      setCompareError(
        caughtError instanceof Error
          ? caughtError.message
          : "Repo compare failed.",
      );
    }
  };

  const briefOrbit = () => {
    if (correctionMemoryIds.length > 0) {
      markCorrectionMemoriesApplied(correctionMemoryIds);
    }
    if (latestComparison?.content) {
      queueHQPrompt(
        `@orbit: ${buildRepoCompareOrbitPrompt({
          brief: latestComparison.content,
          correctionConstraints: correctionConstraintLines,
        })}`,
      );
    } else if (currentProfile && latestAssimilation?.content) {
      queueHQPrompt(
        `@orbit: ${buildRepoAssimilationOrbitPrompt({
          normalizedRepoId: currentProfile.normalizedRepoId,
          brief: latestAssimilation.content,
          correctionConstraints: correctionConstraintLines,
        })}`,
      );
    } else if (currentProfile) {
      const basePrompt = buildRepoIntelOrbitPrompt(currentProfile);
      queueHQPrompt(
        `@orbit: ${
          correctionConstraintLines.length > 0
            ? [
                basePrompt,
                "Local correction-memory constraints:",
                ...correctionConstraintLines.map((line) => `- ${line}`),
              ].join("\n")
            : basePrompt
        }`,
      );
    } else {
      return;
    }
    setTab("home");
    router.push("/hq?focus=hq-chronicle");
  };

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.5 }}>
        Compare 2 or 3 public repos from the same metadata-first lane, then file one durable recommendation into VAULT before ORBIT plans any local implementation.
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {compareRefs.map((repoRef) => (
          <button
            key={repoRef}
            type="button"
            onClick={() =>
              setCompareRefs((current) =>
                current.filter((value) => value !== repoRef),
              )
            }
            className="nexus-shell-button"
            style={{ minHeight: "30px", padding: "0 10px", fontSize: "10px" }}
            title="Remove from compare"
          >
            {repoRef}
          </button>
        ))}
        {compareRefs.length === 0 ? (
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>
            No compare set yet.
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input
          aria-label="Repository to add to comparison"
          type="text"
          value={compareInput}
          onChange={(event) => setCompareInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCompareRef(compareInput);
              setCompareInput("");
            }
          }}
          placeholder="Add owner/repo or GitHub URL"
          style={inputStyle()}
        />
        {currentProfile ? (
          <ShellButton onClick={() => addCompareRef(currentProfile.normalizedRepoId)}>
            Add to compare
          </ShellButton>
        ) : null}
        <ShellButton
          onClick={() => {
            addCompareRef(compareInput);
            setCompareInput("");
          }}
        >
          Add repo
        </ShellButton>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <ShellButton onClick={() => void compareRepos()}>
          {compareStatus === "loading"
            ? "Comparing..."
            : compareStatus === "saved"
              ? "Comparison filed"
              : "Compare repos"}
        </ShellButton>
        {latestComparison ? (
          <ShellButton onClick={() => router.push(buildCompiledPageHref(latestComparison))}>
            Open latest comparison
          </ShellButton>
        ) : null}
        {(latestComparison || currentProfile) ? (
          <ShellButton onClick={briefOrbit}>Brief ORBIT</ShellButton>
        ) : null}
      </div>

      {compareError ? (
        <div style={{ fontSize: "10px", color: "var(--flo)", lineHeight: 1.45 }}>
          {compareError}
        </div>
      ) : null}

      {visibleCompareResult ? (
        <div
          style={{
            display: "grid",
            gap: "6px",
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid rgba(191, 219, 254, 0.16)",
            background: "rgba(10, 18, 31, 0.52)",
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
            Latest comparison cue
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.45 }}>
            <strong style={{ color: "var(--text)" }}>Recommended pick:</strong>{" "}
            {truncateInline(
              visibleCompareResult.recommendedPick || "No recommendation recorded yet.",
              184,
            )}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.45 }}>
            <strong style={{ color: "var(--text)" }}>Boundary:</strong>{" "}
            {truncateInline(
              visibleCompareResult.boundariesAndRisks || "No boundary cue recorded yet.",
              184,
            )}
          </div>
          {correctionConstraintLines.length > 0 ? (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text3)",
                lineHeight: 1.45,
                borderTop: "1px solid rgba(191, 219, 254, 0.12)",
                paddingTop: "8px",
              }}
            >
              <strong style={{ color: "var(--text)" }}>Local constraints:</strong>{" "}
              {truncateInline(correctionConstraintLines.join(" · "), 220)}
            </div>
          ) : null}
        </div>
      ) : null}

      {compareStatus === "saved" && latestComparison ? (
        <MissionContinuationActions
          memoryQuery={[compareRefs.join(" vs "), latestComparison.summary]
            .filter(Boolean)
            .join(" · ")}
          routeHint="/vault?focus=vault-compiled-pages&workflowId=repo-compare"
          extraTargets={[
            {
              href: "/recon?view=osint&focus=recon-repo-intel",
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

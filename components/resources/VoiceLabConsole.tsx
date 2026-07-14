"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { SectionLabel, ShellBadge } from "@/components/ui/shell";
import { SurfaceCallout, SurfaceEmpty } from "@/components/ui/surfacePrimitives";
import { apiFetch } from "@/lib/apiFetch";
import {
  buildVoiceProjectFromText,
  normalizeVoiceProfileInput,
  normalizeVoiceProjectInput,
  type VoiceEffectPreset,
  type VoiceLabEngineId,
  type VoiceProfile,
  type VoiceProject,
  type VoiceRuntimeStatus,
} from "@/lib/voiceLab";
import { useStore } from "@/store/useStore";

const EFFECT_PRESETS: VoiceEffectPreset[] = ["briefing", "clean", "warm", "urgent"];

function buttonStyle(active = false) {
  return {
    padding: "8px 10px",
    borderRadius: "999px",
    border: active ? "1px solid rgba(120, 196, 255, 0.55)" : "1px solid var(--border)",
    background: active ? "rgba(56, 122, 255, 0.18)" : "rgba(10, 15, 30, 0.58)",
    color: "var(--text)",
    fontSize: "11px",
    cursor: "pointer",
  } as const;
}

function cardStyle() {
  return {
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(10, 15, 30, 0.62)",
  } as const;
}

function buildDefaultProfiles(): VoiceProfile[] {
  return [
    normalizeVoiceProfileInput({
      id: "browser-briefing",
      name: "Browser briefing",
      engine: "browser",
      source: "browser",
      effectPreset: "briefing",
      sampleText: "Fallback browser speech for Nexus briefings.",
    }),
    normalizeVoiceProfileInput({
      id: "runtime-clone",
      name: "Runtime clone slot",
      engine: "local-runtime",
      source: "clone",
      effectPreset: "warm",
      sampleText: "Local runtime voice clone slot for longer briefings.",
    }),
  ];
}

function findProject(
  projects: VoiceProject[],
  activeVoiceProjectId: string | null,
  explicitProjectId?: string | null,
) {
  const preferredId = explicitProjectId?.trim() || activeVoiceProjectId;
  if (preferredId) {
    const match = projects.find((project) => project.id === preferredId);
    if (match) return match;
  }
  return projects[0] ?? null;
}

export default function VoiceLabConsole({
  projectId,
}: {
  projectId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const voiceProfiles = useStore((s) => s.voiceProfiles);
  const voiceProjects = useStore((s) => s.voiceProjects);
  const activeVoiceProjectId = useStore((s) => s.activeVoiceProjectId);
  const setVoiceProfiles = useStore((s) => s.setVoiceProfiles);
  const upsertVoiceProfile = useStore((s) => s.upsertVoiceProfile);
  const upsertVoiceProject = useStore((s) => s.upsertVoiceProject);
  const deleteVoiceProject = useStore((s) => s.deleteVoiceProject);
  const setActiveVoiceProjectId = useStore((s) => s.setActiveVoiceProjectId);

  const [runtime, setRuntime] = useState<VoiceRuntimeStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draftTitle, setDraftTitle] = useState("Command briefing");
  const [draftText, setDraftText] = useState("");
  const [creating, setCreating] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [projectDraft, setProjectDraft] = useState("");
  const [effectPreset, setEffectPreset] = useState<VoiceEffectPreset>("briefing");
  const [engine, setEngine] = useState<VoiceLabEngineId>("local-runtime");

  const syncVoiceProjectParam = useCallback(
    (nextProjectId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "voice-lab");
      if (nextProjectId) {
        params.set("voiceProject", nextProjectId);
      } else {
        params.delete("voiceProject");
      }
      router.replace(`/resources?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (voiceProfiles.length > 0) return;
    setVoiceProfiles(buildDefaultProfiles());
  }, [setVoiceProfiles, voiceProfiles.length]);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const response = await apiFetch("/api/voice/status", { cache: "no-store" });
        if (!response.ok) throw new Error("Voice status unavailable");
        const payload = (await response.json()) as { runtime?: VoiceRuntimeStatus };
        if (!cancelled) {
          setRuntime(payload.runtime ?? null);
          setLoadError("");
        }
      } catch {
        if (!cancelled) {
          setRuntime(null);
          setLoadError(
            "Voice runtime status is temporarily unavailable. Browser speech fallback remains available.",
          );
        }
      }
    };
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeProject = useMemo(
    () => findProject(voiceProjects, activeVoiceProjectId, projectId),
    [activeVoiceProjectId, projectId, voiceProjects],
  );

  useEffect(() => {
    if (runtime?.runtimeAvailable !== false) return;
    if (activeProject) return;
    setEngine((current) => (current === "local-runtime" ? "browser" : current));
  }, [activeProject, runtime?.runtimeAvailable]);

  useEffect(() => {
    if (!activeProject) return;
    setProjectDraft(activeProject.segments.map((segment) => segment.text).join("\n\n"));
    setEffectPreset(activeProject.effectPreset);
    setEngine(activeProject.engine);
    setActiveVoiceProjectId(activeProject.id);
  }, [activeProject, setActiveVoiceProjectId]);

  useEffect(() => {
    const requestedProjectId = projectId?.trim() || null;
    const activeProjectId = activeProject?.id ?? null;

    if (requestedProjectId && !activeProjectId) {
      setActiveVoiceProjectId(null);
      syncVoiceProjectParam(null);
      return;
    }

    if (activeProjectId && requestedProjectId !== activeProjectId) {
      syncVoiceProjectParam(activeProjectId);
    }
  }, [activeProject, projectId, setActiveVoiceProjectId, syncVoiceProjectParam]);

  const profileOptions = useMemo(
    () =>
      voiceProfiles.map((profile) => ({
        id: profile.id,
        label: `${profile.name} · ${profile.engine === "browser" ? "browser" : "runtime"}`,
      })),
    [voiceProfiles],
  );

  const preferredProfileId = useMemo(
    () =>
      voiceProfiles.find((profile) => profile.engine === engine)?.id ??
      voiceProfiles[0]?.id,
    [engine, voiceProfiles],
  );

  const handleCreateProject = async () => {
    const text = draftText.trim();
    if (!text) return;
    setCreating(true);
    try {
      const baseProject = buildVoiceProjectFromText({
        title: draftTitle,
        text,
        effectPreset,
        engine,
        voiceProfileId: preferredProfileId,
      });
      const response = await apiFetch("/api/voice/projects", {
        method: "POST",
        body: JSON.stringify(baseProject),
      });
      const payload = (await response.json().catch(() => null)) as {
        project?: VoiceProject;
      } | null;
      const normalized = normalizeVoiceProjectInput(payload?.project ?? baseProject);
      upsertVoiceProject(normalized);
      setActiveVoiceProjectId(normalized.id);
      syncVoiceProjectParam(normalized.id);
      setDraftText("");
      setDraftTitle("Command briefing");
      setLoadError("");
    } catch {
      setLoadError("Voice project creation is temporarily unavailable.");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveProject = async () => {
    if (!activeProject) return;
    const resetRenderState = activeProject.engine !== engine;
    const nextProject = normalizeVoiceProjectInput({
      ...activeProject,
      engine,
      effectPreset,
      segments: [
        {
          id: activeProject.segments[0]?.id,
          text: projectDraft,
          voiceProfileId:
            activeProject.segments[0]?.voiceProfileId ?? preferredProfileId,
          effectPreset,
        },
      ],
      lastRenderedAt: resetRenderState ? undefined : activeProject.lastRenderedAt,
      renderStatus: resetRenderState ? "idle" : activeProject.renderStatus,
      updatedAt: Date.now(),
    });
    upsertVoiceProject(nextProject);
    setLoadError("");
  };

  const handleRender = async () => {
    if (!activeProject) return;
    if (activeProject.engine === "browser") {
      setLoadError(
        "Browser fallback can read this project aloud right now. Switch the project to Local runtime when you want a rendered audio export.",
      );
      return;
    }
    if (!runtime?.runtimeAvailable || runtime.features.render === false) {
      const degraded = normalizeVoiceProjectInput({
        ...activeProject,
        renderStatus: "runtime-unavailable",
        updatedAt: Date.now(),
      });
      upsertVoiceProject(degraded);
      setLoadError(
        "Local voice runtime is unavailable for full rendering. Browser readback still works.",
      );
      return;
    }
    setRendering(true);
    try {
      const response = await apiFetch("/api/voice/render", {
        method: "POST",
        body: JSON.stringify({ project: activeProject }),
      });
      if (!response.ok) {
        const degraded = normalizeVoiceProjectInput({
          ...activeProject,
          renderStatus: "runtime-unavailable",
          updatedAt: Date.now(),
        });
        upsertVoiceProject(degraded);
        setLoadError(
          "Local voice runtime is unavailable for full rendering. Browser readback still works.",
        );
        return;
      }
      const rendered = normalizeVoiceProjectInput({
        ...activeProject,
        renderStatus: "rendered",
        lastRenderedAt: Date.now(),
        updatedAt: Date.now(),
      });
      upsertVoiceProject(rendered);
      setLoadError("");
    } catch {
      setLoadError("Voice render is temporarily unavailable.");
    } finally {
      setRendering(false);
    }
  };

  const handleAddProfile = async (source: "browser" | "clone") => {
    const baseProfile = normalizeVoiceProfileInput({
      name: source === "browser" ? "Browser fallback" : "Runtime clone slot",
      engine: source === "browser" ? "browser" : "local-runtime",
      source,
      effectPreset: source === "browser" ? "clean" : "warm",
    });
    try {
      const response = await apiFetch("/api/voice/profiles", {
        method: "POST",
        body: JSON.stringify(baseProfile),
      });
      const payload = (await response.json().catch(() => null)) as {
        profile?: VoiceProfile;
      } | null;
      upsertVoiceProfile(normalizeVoiceProfileInput(payload?.profile ?? baseProfile));
    } catch {
      upsertVoiceProfile(baseProfile);
    }
  };

  const handleSelectProject = (nextProjectId: string) => {
    setActiveVoiceProjectId(nextProjectId);
    syncVoiceProjectParam(nextProjectId);
  };

  const handleDeleteProject = () => {
    if (!activeProject) return;
    const remainingProjects = voiceProjects.filter(
      (project) => project.id !== activeProject.id,
    );
    const nextProjectId = remainingProjects[0]?.id ?? null;
    deleteVoiceProject(activeProject.id);
    setActiveVoiceProjectId(nextProjectId);
    syncVoiceProjectParam(nextProjectId);
  };

  const renderBlocked =
    !activeProject ||
    activeProject.engine === "browser" ||
    !runtime?.runtimeAvailable ||
    runtime.features.render === false;

  const renderButtonLabel = activeProject
    ? activeProject.engine === "browser"
      ? "Browser readback only"
      : !runtime?.runtimeAvailable || runtime.features.render === false
        ? "Runtime unavailable"
        : rendering
          ? "Rendering..."
          : "Render export"
    : "Render export";

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <SurfaceCallout
        tone={runtime?.runtimeAvailable ? "success" : "info"}
        compact
        icon="♫"
        title="Local-first voice stack"
        description={
          runtime?.detail ||
          "Browser speech remains the zero-dependency baseline while the local runtime unlocks cloning and full renders when available."
        }
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <ShellBadge tone={runtime?.runtimeAvailable ? "success" : "muted"}>
            {runtime?.runtimeAvailable ? "Runtime up" : "Runtime unavailable"}
          </ShellBadge>
          <ShellBadge tone="muted">Browser fallback ready</ShellBadge>
          <ShellBadge tone="muted">{voiceProfiles.length} profiles</ShellBadge>
          <ShellBadge tone="muted">{voiceProjects.length} projects</ShellBadge>
        </div>
      </SurfaceCallout>

      {loadError ? (
        <SurfaceCallout
          tone="warning"
          compact
          icon="↺"
          title="Voice lane degraded"
          description={loadError}
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "12px",
        }}
      >
        <div style={{ ...cardStyle(), display: "grid", gap: "10px" }}>
          <SectionLabel detail="Clone, import, or keep a browser fallback">
            Voice profiles
          </SectionLabel>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle()} onClick={() => void handleAddProfile("browser")}>
              Add browser fallback
            </button>
            <button type="button" style={buttonStyle()} onClick={() => void handleAddProfile("clone")}>
              Add clone slot
            </button>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {profileOptions.map((profile) => (
              <div key={profile.id} style={{ ...cardStyle(), padding: "10px" }}>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>{profile.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle(), display: "grid", gap: "10px" }}>
          <SectionLabel detail="Turn any answer into a reusable local project">
            New voice project
          </SectionLabel>
          <input
            aria-label="Voice project title"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Command briefing"
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surf2)",
              color: "var(--text)",
            }}
          />
          <textarea
            aria-label="Voice project script"
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="Paste a mission brief, saved article summary, or operator note..."
            rows={8}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surf2)",
              color: "var(--text)",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              aria-label="Voice engine"
              value={engine}
              onChange={(event) => setEngine(event.target.value as VoiceLabEngineId)}
              style={{
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surf2)",
                color: "var(--text)",
              }}
            >
              <option value="local-runtime">Local runtime</option>
              <option value="browser">Browser fallback</option>
            </select>
            <select
              aria-label="Voice effect preset"
              value={effectPreset}
              onChange={(event) => setEffectPreset(event.target.value as VoiceEffectPreset)}
              style={{
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surf2)",
                color: "var(--text)",
              }}
            >
              {EFFECT_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
            <button type="button" style={buttonStyle(creating)} onClick={() => void handleCreateProject()}>
              {creating ? "Creating..." : "Create project"}
            </button>
            {draftText.trim() ? <SpeakButton text={draftText} size="md" /> : null}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle(), display: "grid", gap: "10px" }}>
        <SectionLabel detail="Persisted locally in browser storage">
          Voice projects
        </SectionLabel>
        {activeProject ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ShellBadge tone={activeProject.engine === "browser" ? "muted" : "accent"}>
              {activeProject.engine === "browser" ? "Browser readback" : "Runtime render"}
            </ShellBadge>
            <ShellBadge
              tone={activeProject.renderStatus === "rendered" ? "success" : "muted"}
            >
              {activeProject.renderStatus === "rendered"
                ? "Rendered"
                : activeProject.engine === "browser"
                  ? "No audio export"
                  : runtime?.runtimeAvailable
                    ? "Ready to render"
                    : "Waiting for runtime"}
            </ShellBadge>
          </div>
        ) : null}
        {voiceProjects.length === 0 ? (
          <SurfaceEmpty
            title="No voice projects yet"
            description="Create a project from a briefing, article summary, or HQ answer to keep local audio continuity inside Resources."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gap: "8px" }}>
              {voiceProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelectProject(project.id)}
                  style={{
                    ...cardStyle(),
                    textAlign: "left",
                    border:
                      activeProject?.id === project.id
                        ? "1px solid rgba(120, 196, 255, 0.55)"
                        : "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "grid", gap: "6px" }}>
                    <strong style={{ color: "var(--text)", fontSize: "12px" }}>
                      {project.title}
                    </strong>
                    <div style={{ color: "var(--text2)", fontSize: "11px" }}>
                      {project.summary}
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <ShellBadge tone="muted">{project.engine}</ShellBadge>
                      <ShellBadge tone="muted">{project.effectPreset}</ShellBadge>
                      {project.renderStatus ? (
                        <ShellBadge
                          tone={project.renderStatus === "rendered" ? "success" : "accent"}
                        >
                          {project.renderStatus}
                        </ShellBadge>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {activeProject ? (
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <strong style={{ color: "var(--text)" }}>{activeProject.title}</strong>
                    <span style={{ color: "var(--text2)", fontSize: "12px" }}>
                      {activeProject.summary}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button type="button" style={buttonStyle()} onClick={handleSaveProject}>
                      Save edits
                    </button>
                    <button
                      type="button"
                      style={buttonStyle(rendering)}
                      onClick={() => void handleRender()}
                      disabled={rendering || renderBlocked}
                      title={
                        activeProject.engine === "browser"
                          ? "Use browser readback for this project, or switch to Local runtime for audio export."
                          : !runtime?.runtimeAvailable || runtime.features.render === false
                            ? "Local voice runtime is required for rendered audio exports."
                            : "Render a local audio export."
                      }
                    >
                      {renderButtonLabel}
                    </button>
                    <button
                      type="button"
                      style={buttonStyle()}
                      onClick={handleDeleteProject}
                    >
                      Delete
                    </button>
                    <SpeakButton text={projectDraft || activeProject.summary} size="md" />
                  </div>
                </div>
                <textarea
                  aria-label="Active voice project script"
                  value={projectDraft}
                  onChange={(event) => setProjectDraft(event.target.value)}
                  rows={12}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--surf2)",
                    color: "var(--text)",
                    resize: "vertical",
                  }}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

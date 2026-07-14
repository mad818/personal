"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { copyTextWithFeedback } from "@/components/ui/clipboardFeedback"
import { requestTextDownload } from "@/components/ui/downloadFeedback"
import { takeSelectedFile } from "@/components/ui/fileInput"
import MissionContinuationActions from "@/components/ui/MissionContinuationActions"
import { apiFetch } from "@/lib/apiFetch"
import { buildMissionHref } from "@/lib/missionHandoff"
import { buildCompiledPageHref } from "@/lib/xr1Workflows"
import {
  buildVehicleFlightSessionBundle,
  buildVehicleRenderBrief,
  buildVehicleRenderBriefVaultDraft,
  buildVehicleSessionVaultDraft,
  normalizeVehicleConnectorProfile,
  parseVehicleFlightSessionBundle,
  VEHICLE_CONNECTOR_TRANSPORT_LABELS,
  VEHICLE_RADAR_PROCESSING_STAGE_LABELS,
  VEHICLE_RENDER_BRIEF_TARGET_LABELS,
  type VehicleFlightSessionBundle,
  type VehicleRadarProcessingStage,
  type VehicleRenderBriefTarget,
} from "@/lib/vehicle/hardwareReadiness"
import { DEFAULT_VEHICLE_REPLAY_SCENARIO } from "@/lib/vehicle/flightReplayScenarios"
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry"
import { useStore } from "@/store/useStore"

type VaultStatus = "idle" | "saving" | "saved" | "error"

interface VehicleVaultPage {
  id: string
  title: string
  summary: string
  topic?: string
  route?: string
  tags: string[]
  updatedAt: number
}

const CONTINUATION_CARD_STYLE = {
  background: "rgba(16,185,129,0.08)",
  border: "1px solid rgba(16,185,129,0.22)",
  borderRadius: "10px",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
}

const RADAR_STAGE_GUIDANCE: Record<VehicleRadarProcessingStage, string> = {
  capture: "Capture keeps the note on raw passive ingest assumptions, bench source labels, and what was actually observed.",
  preprocess:
    "Preprocess documents cleanup, alignment, and filtering before any return is treated as a real candidate.",
  detect:
    "Detect records which contacts or returns look meaningful enough to mark without calling them stable tracks yet.",
  track:
    "Track ties repeated returns together across sweeps so continuity improves before operator conclusions are filed.",
  review:
    "Review is the operator checkpoint where passive radar notes are consolidated into a durable advisory summary.",
}

function downloadTextFile(
  filename: string,
  content: string,
  label: string,
  mimeType = "application/json;charset=utf-8",
) {
  return requestTextDownload({ filename, content, label, mimeType })
}

function summarizeBundle(bundle: VehicleFlightSessionBundle) {
  return `${bundle.manifest.sessionLabel} · ${bundle.history.length} frames · ${VEHICLE_CONNECTOR_TRANSPORT_LABELS[bundle.connectorProfile.transport]}${bundle.radar ? ` · radar ${VEHICLE_RADAR_PROCESSING_STAGE_LABELS[bundle.radar.processingStage].toLowerCase()}` : ""}`
}

function stringifyVehicleFlightSessionBundle(bundle: VehicleFlightSessionBundle) {
  return JSON.stringify(bundle, null, 2)
}

export default function VehicleArtifactManifestCard() {
  const router = useRouter()
  const replayScenario = DEFAULT_VEHICLE_REPLAY_SCENARIO
  const { activeFrame, bridgeStatus, history } = useVehicleTelemetry()
  const benchChecklistState = useStore((state) => state.settings.vehicleBenchChecklist ?? {})
  const firstHardwareDayChecklist = useStore(
    (state) => state.settings.vehicleFirstHardwareChecklist ?? {},
  )
  const connectorProfileRaw = useStore((state) => state.settings.vehicleConnectorProfile)
  const connectorProfile = useMemo(
    () => normalizeVehicleConnectorProfile(connectorProfileRaw),
    [connectorProfileRaw],
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>("idle")
  const [importedBundle, setImportedBundle] = useState<VehicleFlightSessionBundle | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importVaultStatus, setImportVaultStatus] = useState<VaultStatus>("idle")
  const [renderTarget, setRenderTarget] = useState<VehicleRenderBriefTarget>("camera_mount")
  const [renderGoal, setRenderGoal] = useState("")
  const [renderVaultStatus, setRenderVaultStatus] = useState<VaultStatus>("idle")
  const [recentVaultPages, setRecentVaultPages] = useState<VehicleVaultPage[]>([])
  const [radarModeLabel, setRadarModeLabel] = useState("Passive radar prep")
  const [radarProcessingStage, setRadarProcessingStage] =
    useState<VehicleRadarProcessingStage>("capture")
  const [radarSummary, setRadarSummary] = useState("")
  const [radarFusionNote, setRadarFusionNote] = useState("")
  const [radarArtifactLabels, setRadarArtifactLabels] = useState("")
  const radarDraft = useMemo(() => {
    const artifactLabels = radarArtifactLabels
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    if (
      !radarModeLabel.trim() &&
      !radarSummary.trim() &&
      !radarFusionNote.trim() &&
      artifactLabels.length === 0
    ) {
      return undefined
    }

    return {
      modeLabel: radarModeLabel.trim() || "Passive radar prep",
      processingStage: radarProcessingStage,
      summary:
        radarSummary.trim() ||
        "Radar readiness notes were attached without a detailed summary yet.",
      fusionNote:
        radarFusionNote.trim() ||
        "Sensor-fusion note still pending operator review.",
      artifactLabels,
    }
  }, [
    radarArtifactLabels,
    radarFusionNote,
    radarModeLabel,
    radarProcessingStage,
    radarSummary,
  ])
  useEffect(() => {
    let cancelled = false

    const loadRecentVaultPages = async () => {
      try {
        const response = await apiFetch("/api/memory/pages?limit=24")
        if (!response.ok) return
        const payload = (await response.json()) as { pages?: VehicleVaultPage[] }
        if (!cancelled && Array.isArray(payload.pages)) {
          setRecentVaultPages(
            payload.pages.filter((page) => page.route === "/vehicle"),
          )
        }
      } catch {
        // silent
      }
    }

    void loadRecentVaultPages()
    const handleRefresh = () => {
      void loadRecentVaultPages()
    }
    window.addEventListener("nexus-memory-pages-updated", handleRefresh)
    return () => {
      cancelled = true
      window.removeEventListener("nexus-memory-pages-updated", handleRefresh)
    }
  }, [])

  const bundle = useMemo(
    () =>
      buildVehicleFlightSessionBundle({
        activeFrame,
        history,
        bridgeStatus,
        benchChecklistState,
        firstHardwareDayChecklistState: firstHardwareDayChecklist,
        connectorProfile,
        radar: radarDraft,
    }),
    [
      activeFrame,
      benchChecklistState,
      bridgeStatus,
      connectorProfile,
      firstHardwareDayChecklist,
      history,
      radarDraft,
    ],
  )
  const futurePreviewFiles = useMemo(
    () =>
      bundle.manifest.files.filter(
        (file) => file.kind === "preview_3d" || file.kind === "parametric_source",
      ),
    [bundle.manifest.files],
  )
  const coreBundleFiles = useMemo(
    () =>
      bundle.manifest.files.filter(
        (file) => file.kind !== "preview_3d" && file.kind !== "parametric_source",
      ),
    [bundle.manifest.files],
  )
  const renderBrief = useMemo(
    () =>
      buildVehicleRenderBrief({
        bundle,
        target: renderTarget,
        operatorGoal: renderGoal,
      }),
    [bundle, renderGoal, renderTarget],
  )
  const defaultContinuationTargets = useMemo(
    () => [
      {
        href: buildMissionHref("/vault", "archive"),
        label: "Continue in VAULT",
        tab: "vault",
      },
      {
        href: buildMissionHref("/vehicle", "launch"),
        label: "Continue in VEHICLE",
        tab: "vehicle",
      },
    ],
    [],
  )
  const renderBriefMemoryQuery = useMemo(() => {
    const targetLabel = VEHICLE_RENDER_BRIEF_TARGET_LABELS[renderTarget]
    const goal = renderGoal.trim()
    return goal.length > 0
      ? `Future ${targetLabel.toLowerCase()} brief for ${connectorProfile.airframeLabel}: ${goal}`
      : `Future ${targetLabel.toLowerCase()} brief for ${connectorProfile.airframeLabel}`
  }, [connectorProfile.airframeLabel, renderGoal, renderTarget])
  const bundleMemoryQuery = useMemo(
    () => `Vehicle session ${bundle.manifest.sessionLabel} ${bundle.manifest.summary}`.trim(),
    [bundle.manifest.sessionLabel, bundle.manifest.summary],
  )
  const importedBundleMemoryQuery = useMemo(
    () =>
      importedBundle
        ? `Imported vehicle session ${importedBundle.manifest.sessionLabel} ${importedBundle.manifest.summary}`.trim()
        : "",
    [importedBundle],
  )
  const latestVehicleSessionSummary = useMemo(
    () =>
      [...recentVaultPages]
        .filter((page) => page.tags.includes("vehicle-session"))
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null,
    [recentVaultPages],
  )
  const latestRenderBrief = useMemo(
    () =>
      [...recentVaultPages]
        .filter((page) => page.tags.includes("vehicle-render-brief"))
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null,
    [recentVaultPages],
  )
  const latestRadarSessionSummary = useMemo(
    () =>
      [...recentVaultPages]
        .filter(
          (page) =>
            page.tags.includes("vehicle-session") &&
            page.tags.includes("radar-readiness"),
        )
        .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null,
    [recentVaultPages],
  )

  const saveDraftToVault = async (
    draft: {
      title: string
      summary: string
      content: string
      tags: string[]
      topic?: string
    },
    sourceLabel: string,
    setStatus: (status: VaultStatus) => void,
  ) => {
    setStatus("saving")
    try {
      const response = await apiFetch("/api/memory/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          summary: draft.summary,
          content: draft.content,
          source: "manual",
          sourceLabel,
          route: "/vehicle",
          layer: "knowledge",
          topic: draft.topic,
          tags: draft.tags,
          requestedVisibility: "internal",
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setStatus("saved")
      window.dispatchEvent(new Event("nexus-memory-pages-updated"))
    } catch {
      setStatus("error")
    }
  }

  const saveBundleToVault = async (
    targetBundle: VehicleFlightSessionBundle,
    sourceLabel: string,
    setStatus: (status: VaultStatus) => void,
  ) =>
    saveDraftToVault(
      buildVehicleSessionVaultDraft(targetBundle, sourceLabel),
      sourceLabel,
      setStatus,
    )

  const saveRenderBriefToVault = async () =>
    saveDraftToVault(
      buildVehicleRenderBriefVaultDraft({
        bundle,
        target: renderTarget,
        operatorGoal: renderGoal,
        sourceLabel: "Vehicle render brief",
      }),
      "Vehicle render brief",
      setRenderVaultStatus,
    )

  const handleImport = async (file: File) => {
    try {
      const raw = await file.text()
      const parsed = parseVehicleFlightSessionBundle(raw)
      if (!parsed.ok) {
        setImportedBundle(null)
        setImportError(parsed.message)
        return
      }
      setImportedBundle(parsed.bundle)
      setImportError(null)
      setImportVaultStatus("idle")
    } catch {
      setImportedBundle(null)
      setImportError("Could not read that JSON bundle.")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <input
        aria-label="Import vehicle artifact bundle"
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = takeSelectedFile(event.currentTarget)
          if (!file) return
          void handleImport(file)
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Vault session bundle
        </div>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(96,165,250,0.14)",
            color: "#60a5fa",
          }}
        >
          Local import / export
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(16,185,129,0.15)",
            color: "#10b981",
          }}
        >
          nexus-vehicle-session-v1
        </span>
        <button
          type="button"
          onClick={() =>
            void copyTextWithFeedback(
              stringifyVehicleFlightSessionBundle(bundle),
              "Flight session JSON",
            )
          }
          className="nexus-shell-button"
          style={{ marginLeft: "auto" }}
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              `${bundle.manifest.sessionLabel}.bundle.json`,
              stringifyVehicleFlightSessionBundle(bundle),
              "Flight session JSON",
            )
          }
          className="nexus-shell-button"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() =>
            void saveBundleToVault(bundle, "Vehicle session bundle export", setVaultStatus)
          }
          className="nexus-shell-button"
        >
          {vaultStatus === "saving"
            ? "Filing..."
            : vaultStatus === "saved"
              ? "Filed"
              : vaultStatus === "error"
                ? "Retry file"
                : "File summary to Vault"}
        </button>
      </div>
      {vaultStatus === "saved" ? (
        <div style={CONTINUATION_CARD_STYLE}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#a7f3d0" }}>
            Session summary filed locally.
          </div>
          <MissionContinuationActions
            memoryQuery={bundleMemoryQuery}
            routeHint="/vault"
            extraTargets={defaultContinuationTargets}
          />
        </div>
      ) : null}

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text2)" }}>
          {bundle.manifest.sessionLabel}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "4px", lineHeight: 1.55 }}>
          {bundle.manifest.summary}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "6px", lineHeight: 1.55 }}>
          Export stays local to the browser. Import reads a previously exported JSON bundle and lets you
          file a clean session summary into Vault without requiring the aircraft to exist yet.
        </div>
        {bundle.radar ? (
          <div style={{ fontSize: "10px", color: "#bfdbfe", marginTop: "6px", lineHeight: 1.55 }}>
            Radar readiness attached: {bundle.radar.modeLabel} · {VEHICLE_RADAR_PROCESSING_STAGE_LABELS[bundle.radar.processingStage]}.
          </div>
        ) : null}
      </div>

      <div
        data-testid="vehicle-replay-vault-package"
        style={{
          background: "rgba(147,197,253,0.08)",
          border: "1px solid rgba(147,197,253,0.2)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
        }}
      >
        <div style={{ fontSize: "9px", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 800 }}>
          Replay package preview
        </div>
        <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 800, marginTop: "5px" }}>
          {replayScenario.vaultPackage.title}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.55, marginTop: "5px" }}>
          {replayScenario.summary} Incident type: {replayScenario.vaultPackage.incidentType.replace(/_/g, " ")}.
        </div>
        <div className="nexus-shell-inline-list" aria-label="Replay package tags" style={{ marginTop: "8px" }}>
          {replayScenario.vaultPackage.tags.map((tag) => (
            <span key={tag} className="nexus-shell-inline-chip">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "8px",
        }}
      >
        {[
          { label: "Frames", value: String(bundle.history.length) },
          { label: "Mode", value: bundle.manifest.latestMode },
          { label: "Source", value: bundle.manifest.sourceMode },
          {
            label: "Connector",
            value: VEHICLE_CONNECTOR_TRANSPORT_LABELS[bundle.connectorProfile.transport],
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--rs)",
              padding: "8px 10px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--text3)", textTransform: "uppercase" }}>
              {item.label}
            </div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--text)" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#93c5fd",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            3D artifact readiness
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(147,197,253,0.14)",
              color: "#bfdbfe",
            }}
          >
            Optional future lane
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.6 }}>
          Future drone sessions can carry a local preview model and its parametric source beside the
          normal telemetry bundle. That gives mounts, brackets, enclosure ideas, or fit checks a
          clear home when hardware and model files start to exist.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 0.36fr) minmax(0, 1fr)",
            gap: "8px",
          }}
        >
          <select
            aria-label="Vehicle render brief target"
            value={renderTarget}
            onChange={(event) => {
              setRenderTarget(event.target.value as VehicleRenderBriefTarget)
              setRenderVaultStatus("idle")
            }}
            style={{
              minHeight: "38px",
              borderRadius: "10px",
              border: "1px solid rgba(59,130,246,0.2)",
              background: "rgba(9,14,28,0.36)",
              color: "var(--text)",
              padding: "0 10px",
            }}
          >
            {Object.entries(VEHICLE_RENDER_BRIEF_TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="Vehicle render fit goal"
            type="text"
            value={renderGoal}
            onChange={(event) => {
              setRenderGoal(event.target.value)
              setRenderVaultStatus("idle")
            }}
            placeholder="Optional fit goal or constraint for the future part"
            style={{
              minHeight: "38px",
              borderRadius: "10px",
              border: "1px solid rgba(59,130,246,0.2)",
              background: "rgba(9,14,28,0.36)",
              color: "var(--text)",
              padding: "0 10px",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void copyTextWithFeedback(renderBrief, "Render brief")}
            className="nexus-shell-button"
          >
            Copy render brief
          </button>
          <button
            type="button"
            onClick={() =>
            downloadTextFile(
              `${bundle.manifest.sessionLabel}.${renderTarget}.brief.md`,
              renderBrief,
              "Vehicle render brief",
              "text/markdown;charset=utf-8",
            )
          }
            className="nexus-shell-button"
          >
            Download render brief
          </button>
          <button
            type="button"
            onClick={() => void saveRenderBriefToVault()}
            className="nexus-shell-button"
          >
            {renderVaultStatus === "saving"
              ? "Filing brief..."
              : renderVaultStatus === "saved"
                ? "Brief filed"
                : renderVaultStatus === "error"
                  ? "Retry brief"
                  : "File render brief to Vault"}
          </button>
        </div>
        {renderVaultStatus === "saved" ? (
          <div style={CONTINUATION_CARD_STYLE}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#a7f3d0" }}>
              Render brief filed locally.
            </div>
            <MissionContinuationActions
              memoryQuery={renderBriefMemoryQuery}
              routeHint="/vault"
              extraTargets={defaultContinuationTargets}
            />
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {futurePreviewFiles.map((file) => (
            <div
              key={file.filename}
              style={{
                background: "rgba(9,14,28,0.36)",
                border: "1px solid rgba(59,130,246,0.16)",
                borderRadius: "10px",
                padding: "8px 10px",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text2)" }}>
                {file.filename}
              </div>
              <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "2px", lineHeight: 1.5 }}>
                {file.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "rgba(14, 116, 144, 0.08)",
          border: "1px solid rgba(14, 116, 144, 0.18)",
          borderRadius: "var(--rs)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#67e8f9",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Radar readiness
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(103,232,249,0.14)",
              color: "#a5f3fc",
            }}
          >
            Advisory only
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.6 }}>
          Use this optional block to carry passive radar and future sensor-fusion notes inside the same
          session bundle. It describes readiness only and never represents RF control or flight authority.
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(VEHICLE_RADAR_PROCESSING_STAGE_LABELS).map(([value, label]) => (
            <span
              key={value}
              style={{
                fontSize: "9px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                background:
                  value === radarProcessingStage
                    ? "rgba(103,232,249,0.18)"
                    : "rgba(103,232,249,0.08)",
                color: value === radarProcessingStage ? "#cffafe" : "#a5f3fc",
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <div style={{ fontSize: "10px", color: "#a5f3fc", lineHeight: 1.55 }}>
          {RADAR_STAGE_GUIDANCE[radarProcessingStage]}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 0.38fr) minmax(0, 1fr)",
            gap: "8px",
          }}
        >
          <select
            aria-label="Radar processing stage"
            value={radarProcessingStage}
            onChange={(event) => setRadarProcessingStage(event.target.value as VehicleRadarProcessingStage)}
            style={{
              minHeight: "38px",
              borderRadius: "10px",
              border: "1px solid rgba(103,232,249,0.18)",
              background: "rgba(9,14,28,0.36)",
              color: "var(--text)",
              padding: "0 10px",
            }}
          >
            {Object.entries(VEHICLE_RADAR_PROCESSING_STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="Radar mode label"
            type="text"
            value={radarModeLabel}
            onChange={(event) => setRadarModeLabel(event.target.value)}
            placeholder="Radar mode label"
            style={{
              minHeight: "38px",
              borderRadius: "10px",
              border: "1px solid rgba(103,232,249,0.18)",
              background: "rgba(9,14,28,0.36)",
              color: "var(--text)",
              padding: "0 10px",
            }}
          />
        </div>
        <textarea
          aria-label="Passive radar summary"
          value={radarSummary}
          onChange={(event) => setRadarSummary(event.target.value)}
          placeholder="Passive radar summary"
          style={{
            minHeight: "72px",
            borderRadius: "10px",
            border: "1px solid rgba(103,232,249,0.18)",
            background: "rgba(9,14,28,0.36)",
            color: "var(--text)",
            padding: "10px",
            resize: "vertical",
          }}
        />
        <textarea
          aria-label="Radar fusion note"
          value={radarFusionNote}
          onChange={(event) => setRadarFusionNote(event.target.value)}
          placeholder="Fusion note"
          style={{
            minHeight: "72px",
            borderRadius: "10px",
            border: "1px solid rgba(103,232,249,0.18)",
            background: "rgba(9,14,28,0.36)",
            color: "var(--text)",
            padding: "10px",
            resize: "vertical",
          }}
        />
        <input
          aria-label="Radar artifact labels"
          type="text"
          value={radarArtifactLabels}
          onChange={(event) => setRadarArtifactLabels(event.target.value)}
          placeholder="Artifact labels (comma separated)"
          style={{
            minHeight: "38px",
            borderRadius: "10px",
            border: "1px solid rgba(103,232,249,0.18)",
            background: "rgba(9,14,28,0.36)",
            color: "var(--text)",
            padding: "0 10px",
          }}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "6px",
          }}
        >
          Future bundle files
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {coreBundleFiles.map((file) => (
            <div
              key={file.filename}
              style={{
                background: "var(--surf2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--rs)",
                padding: "8px 10px",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text2)" }}>
                {file.filename}
              </div>
              <div style={{ fontSize: "9px", color: "var(--text3)", marginTop: "2px" }}>
                {file.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "rgba(9,14,28,0.45)",
          border: "1px solid var(--border)",
          borderRadius: "var(--rs)",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text2)" }}>
            Import previous session bundle
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="nexus-shell-button"
            style={{ marginLeft: "auto" }}
          >
            Choose JSON
          </button>
        </div>

        {importError ? (
          <div
            style={{
              borderRadius: "10px",
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(127,29,29,0.22)",
              padding: "10px 12px",
              fontSize: "11px",
              color: "#fecaca",
            }}
          >
            {importError}
          </div>
        ) : null}

        {importedBundle ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--rs)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text)" }}>
              {summarizeBundle(importedBundle)}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
              {importedBundle.manifest.summary}
            </div>
            {importedBundle.radar ? (
            <div style={{ fontSize: "10px", color: "#bfdbfe", lineHeight: 1.55 }}>
                Radar readiness: {importedBundle.radar.modeLabel} · {VEHICLE_RADAR_PROCESSING_STAGE_LABELS[importedBundle.radar.processingStage]}.
                {` ${importedBundle.radar.summary}`}
              </div>
            ) : null}
            {importedBundle.radar?.artifactLabels.length ? (
              <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
                Artifact labels: {importedBundle.radar.artifactLabels.join(", ")} · Fusion note: {importedBundle.radar.fusionNote}
              </div>
            ) : importedBundle.radar ? (
              <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
                Fusion note: {importedBundle.radar.fusionNote}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() =>
                  void saveBundleToVault(
                    importedBundle,
                    "Imported vehicle session bundle",
                    setImportVaultStatus,
                  )
                }
                className="nexus-shell-button"
              >
                {importVaultStatus === "saving"
                  ? "Filing..."
                  : importVaultStatus === "saved"
                    ? "Filed"
                    : importVaultStatus === "error"
                      ? "Retry file"
                      : "File imported summary"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void copyTextWithFeedback(
                    stringifyVehicleFlightSessionBundle(importedBundle),
                    "Imported session JSON",
                  )
                }
                className="nexus-shell-button"
              >
                Copy imported JSON
              </button>
            </div>
            {importVaultStatus === "saved" ? (
              <div style={CONTINUATION_CARD_STYLE}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#a7f3d0" }}>
                  Imported session summary filed locally.
                </div>
                <MissionContinuationActions
                  memoryQuery={importedBundleMemoryQuery}
                  routeHint="/vault"
                  extraTargets={defaultContinuationTargets}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: "var(--text3)", lineHeight: 1.6 }}>
            Use this after the first real bench or field session: export the bundle here, keep the JSON
            with your logs, and import it later when you want to summarize or file the session into Vault.
          </div>
        )}
      </div>

      {(latestVehicleSessionSummary || latestRenderBrief || latestRadarSessionSummary) ? (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "var(--rs)",
            padding: "10px 12px",
            display: "grid",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#a7f3d0",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Vault continuity handoff
          </div>
          <div style={{ fontSize: "10px", color: "var(--text3)", lineHeight: 1.55 }}>
            The latest vehicle session, render brief, and radar-attached summary stay one click away in VAULT so later bench work reopens the same continuity instead of starting fresh.
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {latestVehicleSessionSummary ? (
              <button
                type="button"
                onClick={() => router.push(buildCompiledPageHref(latestVehicleSessionSummary))}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestVehicleSessionSummary.title}
              >
                Latest session summary
              </button>
            ) : null}
            {latestRenderBrief ? (
              <button
                type="button"
                onClick={() => router.push(buildCompiledPageHref(latestRenderBrief))}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestRenderBrief.title}
              >
                Latest render brief
              </button>
            ) : null}
            {latestRadarSessionSummary ? (
              <button
                type="button"
                onClick={() => router.push(buildCompiledPageHref(latestRadarSessionSummary))}
                className="nexus-shell-button"
                style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px" }}
                title={latestRadarSessionSummary.title}
              >
                Latest radar summary
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

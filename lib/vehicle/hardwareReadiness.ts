import { buildVehicleArtifactManifest, getVehicleBenchChecklistProgress } from "@/lib/vehicle/readiness"
import type {
  VehicleArtifactManifest,
  VehicleBridgeStatus,
  VehicleTelemetryFrame,
} from "@/lib/vehicle/types"

export type VehicleConnectorTransport =
  | "usb_serial"
  | "telemetry_radio"
  | "companion_link"

export type VehicleFirstHardwareDayCategory =
  | "arrival"
  | "bridge"
  | "compliance"
  | "archive"
export type VehicleRenderBriefTarget =
  | "camera_mount"
  | "companion_enclosure"
  | "telemetry_mast"
  | "battery_bracket"
  | "landing_gear_accessory"
export type VehicleRadarProcessingStage =
  | "capture"
  | "preprocess"
  | "detect"
  | "track"
  | "review"

export interface VehicleConnectorProfile {
  airframeLabel: string
  autopilotStack: "ArduPilot"
  transport: VehicleConnectorTransport
  serialPortHint: string
  baudRate: number
  bridgeLabel: string
  authority: Extract<VehicleBridgeStatus["authority"], "read_only" | "advisory">
  missionProfile: string
}

export interface VehicleReadinessProgress {
  completedCount: number
  totalCount: number
  percent: number
  remainingCount: number
  nextIncompleteLabel: string | null
}

export interface VehicleRadarSessionSummary {
  modeLabel: string
  processingStage: VehicleRadarProcessingStage
  summary: string
  fusionNote: string
  artifactLabels: string[]
}

export interface VehicleFirstHardwareDayItem {
  id: string
  category: VehicleFirstHardwareDayCategory
  label: string
  detail: string
}

export interface VehicleRecoveryFlow {
  id: string
  label: string
  trigger: string
  steps: string[]
}

export interface VehicleFlightSessionBundle {
  schemaVersion: "nexus-vehicle-session-v1"
  exportedAt: number
  connectorProfile: VehicleConnectorProfile
  manifest: VehicleArtifactManifest
  radar?: VehicleRadarSessionSummary
  activeFrame: VehicleTelemetryFrame
  history: VehicleTelemetryFrame[]
  bridgeStatus: Pick<
    VehicleBridgeStatus,
    "available" | "fresh" | "bridgeId" | "bridgeLabel" | "authority" | "ingestedFrames" | "freshnessMs"
  >
  benchChecklist: VehicleReadinessProgress
  firstHardwareDayChecklist: VehicleReadinessProgress
}

export interface VehicleVaultDraft {
  title: string
  summary: string
  content: string
  tags: string[]
  topic: string
}

export const VEHICLE_CONNECTOR_TRANSPORT_LABELS: Record<VehicleConnectorTransport, string> = {
  usb_serial: "USB serial",
  telemetry_radio: "Telemetry radio",
  companion_link: "Jetson / companion link",
}

export const VEHICLE_RENDER_BRIEF_TARGET_LABELS: Record<VehicleRenderBriefTarget, string> = {
  camera_mount: "Camera mount",
  companion_enclosure: "Companion enclosure",
  telemetry_mast: "Telemetry mast",
  battery_bracket: "Battery restraint bracket",
  landing_gear_accessory: "Landing gear accessory",
}
export const VEHICLE_RADAR_PROCESSING_STAGE_LABELS: Record<
  VehicleRadarProcessingStage,
  string
> = {
  capture: "Capture",
  preprocess: "Preprocess",
  detect: "Detect",
  track: "Track",
  review: "Review",
}

export const VEHICLE_BAUD_RATE_OPTIONS = [57_600, 115_200, 230_400, 460_800, 921_600] as const

export const DEFAULT_VEHICLE_CONNECTOR_PROFILE: VehicleConnectorProfile = {
  airframeLabel: "Future F450 rig",
  autopilotStack: "ArduPilot",
  transport: "usb_serial",
  serialPortHint: "COM7 / /dev/ttyACM0",
  baudRate: 57_600,
  bridgeLabel: "Pixhawk passive bridge",
  authority: "read_only",
  missionProfile: "First hardware day",
}

export const VEHICLE_FIRST_HARDWARE_DAY_CATEGORY_LABELS: Record<
  VehicleFirstHardwareDayCategory,
  string
> = {
  arrival: "Arrival + Power",
  bridge: "Bridge + Telemetry",
  compliance: "Compliance + Airspace",
  archive: "Archive + Recovery",
}

export const VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST: VehicleFirstHardwareDayItem[] = [
  {
    id: "props-off-arrival",
    category: "arrival",
    label: "Keep props off for the entire first hardware day",
    detail: "No first-day integration milestone is worth spinning props indoors or during setup.",
  },
  {
    id: "gcs-first-heartbeat",
    category: "arrival",
    label: "Mission Planner / QGroundControl sees heartbeat before Nexus",
    detail: "Validate the autopilot on its native ground station before introducing the bridge observer.",
  },
  {
    id: "port-and-baud",
    category: "bridge",
    label: "Serial port and baud match the saved connector profile",
    detail: "Arrival-day friction usually starts with the wrong cable, COM port, or baud assumption.",
  },
  {
    id: "observer-only-bridge",
    category: "bridge",
    label: "Passive bridge starts in read-only observer mode",
    detail: "Nexus should ingest telemetry only; it should not be able to arm, mode-switch, or steer the aircraft.",
  },
  {
    id: "first-minute-watch",
    category: "bridge",
    label: "Watch the first 60 seconds with no commands issued from Nexus",
    detail: "Use the first minute to compare the bridge view against the ground station and catch mapping drift.",
  },
  {
    id: "compliance-review",
    category: "compliance",
    label: "Run FAA / Remote ID / local-airspace review for the real mission area",
    detail: "Once the airframe exists, compliance should move from theory to the actual city, airport context, and operation type.",
  },
  {
    id: "export-first-session",
    category: "archive",
    label: "Export the first session bundle from Vehicle Lab",
    detail: "The arrival-day session should leave a concrete JSON bundle before any later tuning muddies the baseline.",
  },
  {
    id: "file-vault-summary",
    category: "archive",
    label: "File the session summary into Vault for replay and lessons",
    detail: "Treat the first hardware day like a reusable runbook, not a one-off memory.",
  },
]

export const VEHICLE_FIRST_HARDWARE_DAY_RECOVERY_FLOWS: VehicleRecoveryFlow[] = [
  {
    id: "no-heartbeat",
    label: "No heartbeat in Nexus",
    trigger: "Ground station sees the aircraft but Vehicle Lab stays on simulation.",
    steps: [
      "Check that the saved transport, port hint, and baud in the connector profile match reality.",
      "Confirm the passive bridge is posting to /api/vehicle/telemetry, not directly to a third party.",
      "Keep props off and compare the bridge log against Mission Planner/QGroundControl before retrying.",
    ],
  },
  {
    id: "stale-bridge",
    label: "Bridge goes stale after initial ingest",
    trigger: "Frames arrive once, then freshness ages out and Vehicle Lab drops back to simulation.",
    steps: [
      "Inspect the bridge process first; Nexus should recover automatically if fresh frames resume.",
      "Treat serial/radio transport as suspect before blaming the app, especially on first hardware day.",
      "If needed, restart the passive bridge and preserve the stale session bundle for later debugging.",
    ],
  },
  {
    id: "wrong-orientation",
    label: "Attitude or GPS data looks wrong",
    trigger: "Pitch/roll/yaw, heading, or home data disagrees with the ground station.",
    steps: [
      "Stop the bridge session and return to the native autopilot tool with props still off.",
      "Re-check FC orientation, compass direction, and IMU mapping before taking any telemetry as trustworthy.",
      "Export the bad session bundle anyway so the mismatch can be compared later in Vault.",
    ],
  },
]

function trim(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized.length <= max ? normalized : normalized.slice(0, max).trim()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeBridgeId(label: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return slug || "pixhawk-passive-bridge"
}

function normalizeVehicleRadarSummary(
  value: unknown,
): VehicleRadarSessionSummary | undefined {
  if (!isRecord(value)) return undefined

  const processingStage =
    value.processingStage === "capture" ||
    value.processingStage === "preprocess" ||
    value.processingStage === "detect" ||
    value.processingStage === "track" ||
    value.processingStage === "review"
      ? value.processingStage
      : "capture"
  const artifactLabels = Array.isArray(value.artifactLabels)
    ? value.artifactLabels
        .filter((item): item is string => typeof item === "string")
        .map((item) => trim(item, 48))
        .filter(Boolean)
        .slice(0, 6)
    : []

  const modeLabel = trim(typeof value.modeLabel === "string" ? value.modeLabel : "", 60)
  const summary = trim(typeof value.summary === "string" ? value.summary : "", 200)
  const fusionNote = trim(typeof value.fusionNote === "string" ? value.fusionNote : "", 200)

  if (!modeLabel && !summary && !fusionNote && artifactLabels.length === 0) {
    return undefined
  }

  return {
    modeLabel: modeLabel || "Passive radar prep",
    processingStage,
    summary: summary || "Radar readiness notes were attached without a detailed summary yet.",
    fusionNote: fusionNote || "Sensor-fusion note still pending operator review.",
    artifactLabels,
  }
}

export function normalizeVehicleConnectorProfile(value: unknown): VehicleConnectorProfile {
  const input = isRecord(value) ? value : {}
  const transport =
    input.transport === "usb_serial" ||
    input.transport === "telemetry_radio" ||
    input.transport === "companion_link"
      ? input.transport
      : DEFAULT_VEHICLE_CONNECTOR_PROFILE.transport
  const authority =
    input.authority === "advisory" || input.authority === "read_only"
      ? input.authority
      : DEFAULT_VEHICLE_CONNECTOR_PROFILE.authority
  const baudRate =
    typeof input.baudRate === "number" &&
    Number.isFinite(input.baudRate) &&
    VEHICLE_BAUD_RATE_OPTIONS.includes(input.baudRate as (typeof VEHICLE_BAUD_RATE_OPTIONS)[number])
      ? input.baudRate
      : DEFAULT_VEHICLE_CONNECTOR_PROFILE.baudRate

  return {
    airframeLabel: trim(
      typeof input.airframeLabel === "string"
        ? input.airframeLabel
        : DEFAULT_VEHICLE_CONNECTOR_PROFILE.airframeLabel,
      80,
    ) || DEFAULT_VEHICLE_CONNECTOR_PROFILE.airframeLabel,
    autopilotStack: "ArduPilot",
    transport,
    serialPortHint: trim(
      typeof input.serialPortHint === "string"
        ? input.serialPortHint
        : DEFAULT_VEHICLE_CONNECTOR_PROFILE.serialPortHint,
      80,
    ) || DEFAULT_VEHICLE_CONNECTOR_PROFILE.serialPortHint,
    baudRate,
    bridgeLabel: trim(
      typeof input.bridgeLabel === "string"
        ? input.bridgeLabel
        : DEFAULT_VEHICLE_CONNECTOR_PROFILE.bridgeLabel,
      80,
    ) || DEFAULT_VEHICLE_CONNECTOR_PROFILE.bridgeLabel,
    authority,
    missionProfile: trim(
      typeof input.missionProfile === "string"
        ? input.missionProfile
        : DEFAULT_VEHICLE_CONNECTOR_PROFILE.missionProfile,
      80,
    ) || DEFAULT_VEHICLE_CONNECTOR_PROFILE.missionProfile,
  }
}

export function areVehicleConnectorProfilesEqual(
  left: VehicleConnectorProfile | null | undefined,
  right: VehicleConnectorProfile | null | undefined,
) {
  if (left == null || right == null) return left == null && right == null
  return (
    left.airframeLabel === right.airframeLabel &&
    left.autopilotStack === right.autopilotStack &&
    left.transport === right.transport &&
    left.serialPortHint === right.serialPortHint &&
    left.baudRate === right.baudRate &&
    left.bridgeLabel === right.bridgeLabel &&
    left.authority === right.authority &&
    left.missionProfile === right.missionProfile
  )
}

export function areVehicleChecklistStatesEqual(
  left: Record<string, boolean>,
  right: Record<string, boolean>,
  itemIds: readonly string[],
) {
  return itemIds.every((itemId) => Boolean(left[itemId]) === Boolean(right[itemId]))
}

export function normalizeVehicleChecklistState(
  value: unknown,
  itemIds: readonly string[],
) {
  if (!isRecord(value)) return {} as Record<string, boolean>
  return itemIds.reduce<Record<string, boolean>>((acc, id) => {
    if (typeof value[id] === "boolean") {
      acc[id] = value[id]
    }
    return acc
  }, {})
}

function buildChecklistProgress(
  items: readonly VehicleFirstHardwareDayItem[],
  checklistState: Record<string, boolean>,
): VehicleReadinessProgress {
  const completedCount = items.filter((item) => checklistState[item.id]).length
  const totalCount = items.length
  const remainingCount = totalCount - completedCount
  return {
    completedCount,
    totalCount,
    percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    remainingCount,
    nextIncompleteLabel: items.find((item) => !checklistState[item.id])?.label ?? null,
  }
}

export function getVehicleFirstHardwareDayProgress(
  checklistState: Record<string, boolean>,
) {
  return buildChecklistProgress(VEHICLE_FIRST_HARDWARE_DAY_CHECKLIST, checklistState)
}

export function buildVehicleBridgeStubCommand(profile: VehicleConnectorProfile) {
  const bridgeId = normalizeBridgeId(profile.bridgeLabel)
  return [
    `$env:NEXUS_VEHICLE_BRIDGE_ID='${bridgeId}'`,
    `$env:NEXUS_VEHICLE_BRIDGE_LABEL='${profile.bridgeLabel.replace(/'/g, "''")}'`,
    `$env:NEXUS_VEHICLE_BRIDGE_AUTHORITY='${profile.authority}'`,
    `$env:NEXUS_VEHICLE_TRANSPORT='${profile.transport}'`,
    `$env:NEXUS_VEHICLE_BAUD_RATE='${profile.baudRate}'`,
    `$env:NEXUS_VEHICLE_PORT_HINT='${profile.serialPortHint.replace(/'/g, "''")}'`,
    "node scripts/vehicle-bridge-stub.mjs",
  ].join("\n")
}

export function buildVehicleConnectorProfileJson(profile: VehicleConnectorProfile) {
  return JSON.stringify(
    {
      ...profile,
      bridgeId: normalizeBridgeId(profile.bridgeLabel),
      schemaVersion: "nexus-vehicle-connector-v1",
    },
    null,
    2,
  )
}

export function buildVehicleFlightSessionBundle({
  activeFrame,
  history,
  bridgeStatus,
  benchChecklistState,
  firstHardwareDayChecklistState,
  connectorProfile,
  radar,
}: {
  activeFrame: VehicleTelemetryFrame
  history: VehicleTelemetryFrame[]
  bridgeStatus: Pick<
    VehicleBridgeStatus,
    "available" | "fresh" | "bridgeId" | "bridgeLabel" | "authority" | "ingestedFrames" | "freshnessMs"
  >
  benchChecklistState: Record<string, boolean>
  firstHardwareDayChecklistState: Record<string, boolean>
  connectorProfile: VehicleConnectorProfile
  radar?: VehicleRadarSessionSummary | null
}): VehicleFlightSessionBundle {
  return {
    schemaVersion: "nexus-vehicle-session-v1",
    exportedAt: Date.now(),
    connectorProfile,
    manifest: buildVehicleArtifactManifest(activeFrame, history),
    ...(radar ? { radar } : {}),
    activeFrame,
    history,
    bridgeStatus,
    benchChecklist: getVehicleBenchChecklistProgress(benchChecklistState),
    firstHardwareDayChecklist: getVehicleFirstHardwareDayProgress(firstHardwareDayChecklistState),
  }
}

export function parseVehicleFlightSessionBundle(raw: unknown):
  | { ok: true; bundle: VehicleFlightSessionBundle }
  | { ok: false; message: string } {
  const parsed = typeof raw === "string" ? (() => {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  })() : raw

  if (!isRecord(parsed)) {
    return { ok: false, message: "Bundle must be a JSON object." }
  }
  if (parsed.schemaVersion !== "nexus-vehicle-session-v1") {
    return { ok: false, message: "Unsupported vehicle bundle schema." }
  }
  if (!isRecord(parsed.manifest) || typeof parsed.manifest.sessionLabel !== "string") {
    return { ok: false, message: "Bundle is missing a valid manifest." }
  }
  if (!isRecord(parsed.activeFrame) || typeof parsed.activeFrame.timestamp !== "number") {
    return { ok: false, message: "Bundle is missing a valid active frame." }
  }
  if (!Array.isArray(parsed.history)) {
    return { ok: false, message: "Bundle history must be an array." }
  }

  const bundle = parsed as unknown as VehicleFlightSessionBundle
  return {
    ok: true,
    bundle: {
      ...bundle,
      connectorProfile: normalizeVehicleConnectorProfile(bundle.connectorProfile),
      radar: normalizeVehicleRadarSummary(bundle.radar),
    },
  }
}

export function buildVehicleSessionVaultDraft(
  bundle: VehicleFlightSessionBundle,
  sourceLabel: string,
): VehicleVaultDraft {
  const connector = bundle.connectorProfile
  const transportLabel = VEHICLE_CONNECTOR_TRANSPORT_LABELS[connector.transport]
  const title = `Vehicle session · ${bundle.manifest.sessionLabel}`
  const summary = trim(
    `${bundle.manifest.summary} ${bundle.history.length} frames · ${transportLabel} · ${connector.bridgeLabel}.${bundle.radar ? ` Radar ${VEHICLE_RADAR_PROCESSING_STAGE_LABELS[bundle.radar.processingStage].toLowerCase()} ready.` : ""}`,
    220,
  )
  const radarTags = bundle.radar ? ["radar-readiness"] : []
  const radarArtifactTags = bundle.radar
    ? bundle.radar.artifactLabels
        .map((label) => slugify(label))
        .filter(Boolean)
        .map((label) => `radar-artifact:${label}`)
    : []
  const content = [
    `# ${title}`,
    "",
    `Source label: ${sourceLabel}`,
    `Vehicle ID: ${bundle.manifest.vehicleId}`,
    `Session source: ${bundle.manifest.sourceMode}`,
    `Latest mode: ${bundle.manifest.latestMode}`,
    `Connector: ${connector.airframeLabel} · ${connector.autopilotStack} · ${transportLabel} · ${connector.serialPortHint} @ ${connector.baudRate}`,
    `Bridge posture: ${bundle.bridgeStatus.fresh ? "fresh passive bridge" : bundle.bridgeStatus.available ? "stale passive bridge" : "simulation fallback"} · ${bundle.bridgeStatus.bridgeLabel ?? "no bridge label"} · ${bundle.bridgeStatus.ingestedFrames} ingested frames.`,
    `Bench readiness: ${bundle.benchChecklist.completedCount}/${bundle.benchChecklist.totalCount}.`,
    `First hardware day: ${bundle.firstHardwareDayChecklist.completedCount}/${bundle.firstHardwareDayChecklist.totalCount}.`,
    "",
    "## Summary",
    bundle.manifest.summary,
    ...(bundle.radar
      ? [
          "",
          "## Radar readiness",
          `- Mode label: ${bundle.radar.modeLabel}`,
          `- Processing stage: ${VEHICLE_RADAR_PROCESSING_STAGE_LABELS[bundle.radar.processingStage]}`,
          `- Summary: ${bundle.radar.summary}`,
          `- Fusion note: ${bundle.radar.fusionNote}`,
          ...(bundle.radar.artifactLabels.length > 0
            ? [`- Artifact labels: ${bundle.radar.artifactLabels.join(", ")}`]
            : []),
        ]
      : []),
    "",
    "## Future Vault bundle files",
    ...bundle.manifest.files.map((file) => `- ${file.filename} — ${file.note}`),
  ].join("\n")

  return {
    title,
    summary,
    content,
    tags: Array.from(
      new Set([
        ...bundle.manifest.tags,
        ...radarTags,
        ...radarArtifactTags,
        "vehicle-session",
        "flight-session",
        "f450",
      ]),
    ),
    topic: bundle.radar ? "Vehicle session summary · radar readiness" : "Vehicle session summary",
  }
}

export function buildVehicleRenderBrief({
  bundle,
  target,
  operatorGoal,
}: {
  bundle: VehicleFlightSessionBundle
  target: VehicleRenderBriefTarget
  operatorGoal?: string
}) {
  const connector = bundle.connectorProfile
  const targetLabel = VEHICLE_RENDER_BRIEF_TARGET_LABELS[target]
  const transportLabel = VEHICLE_CONNECTOR_TRANSPORT_LABELS[connector.transport]
  const previewOutputs = bundle.manifest.files
    .filter((file) => file.kind === "preview_3d" || file.kind === "parametric_source")
    .map((file) => `- ${file.filename} — ${file.note}`)

  const targetContext: Record<VehicleRenderBriefTarget, string> = {
    camera_mount:
      "Keep the field of view clear, avoid prop intrusion, and preserve easy service access for the camera payload.",
    companion_enclosure:
      "Prioritize cable strain relief, airflow, and non-flight-critical mounting for the companion computer or bridge hardware.",
    telemetry_mast:
      "Keep antenna or telemetry hardware elevated and clear without interfering with GPS, props, or safe transport.",
    battery_bracket:
      "Stabilize battery placement and restraint without blocking swap access or disturbing center-of-gravity assumptions.",
    landing_gear_accessory:
      "Preserve ground clearance and payload access without creating prop or frame interference during takeoff and landing.",
  }

  const operatorGoalLine = trim(operatorGoal ?? "", 180)

  return [
    `# Render brief — ${connector.airframeLabel} — ${targetLabel}`,
    "",
    "## Context",
    `- Airframe: ${connector.airframeLabel}`,
    `- Autopilot stack: ${connector.autopilotStack}`,
    `- Connector posture: ${transportLabel} via ${connector.bridgeLabel} (${connector.authority})`,
    `- Mission profile: ${connector.missionProfile}`,
    `- Session source: ${bundle.manifest.sourceMode}`,
    `- Bench readiness: ${bundle.benchChecklist.completedCount}/${bundle.benchChecklist.totalCount}`,
    `- First hardware day readiness: ${bundle.firstHardwareDayChecklist.completedCount}/${bundle.firstHardwareDayChecklist.totalCount}`,
    ...(bundle.radar
      ? [
          `- Radar readiness: ${bundle.radar.modeLabel} · ${VEHICLE_RADAR_PROCESSING_STAGE_LABELS[bundle.radar.processingStage]}`,
          `- Sensor-fusion note: ${bundle.radar.fusionNote}`,
        ]
      : []),
    "",
    "## Design intent",
    `- Target artifact: ${targetLabel}`,
    `- Constraint focus: ${targetContext[target]}`,
    operatorGoalLine ? `- Operator goal: ${operatorGoalLine}` : "- Operator goal: not specified yet; keep the first concept conservative and easy to revise.",
    "- Current reality: the aircraft and final dimensions may not exist yet, so the model should stay iteration-friendly and assumption-light.",
    "",
    "## Output expectations",
    "- Keep the artifact local-first and easy to revise.",
    "- Produce one previewable 3D output and one editable parametric/source artifact.",
    ...previewOutputs,
    "",
    "## Guardrails",
    "- Nexus is not flight-critical; this is a planning/design artifact, not an authority surface.",
    "- Prefer simple attachment concepts that are easy to inspect, print, or revise before field use.",
    "- Do not assume final measurements are authoritative until real hardware arrives and is bench-validated.",
  ].join("\n")
}

export function buildVehicleRenderBriefVaultDraft({
  bundle,
  target,
  operatorGoal,
  sourceLabel,
}: {
  bundle: VehicleFlightSessionBundle
  target: VehicleRenderBriefTarget
  operatorGoal?: string
  sourceLabel: string
}): VehicleVaultDraft {
  const connector = bundle.connectorProfile
  const targetLabel = VEHICLE_RENDER_BRIEF_TARGET_LABELS[target]
  const targetTag = target.replace(/_/g, "-")
  const title = `Vehicle render brief · ${targetLabel} · ${bundle.manifest.sessionLabel}`
  const summary = trim(
    `Future ${targetLabel.toLowerCase()} brief for ${connector.airframeLabel}. ${bundle.manifest.sourceMode} session · ${bundle.benchChecklist.completedCount}/${bundle.benchChecklist.totalCount} bench ready.`,
    220,
  )
  const renderBrief = buildVehicleRenderBrief({
    bundle,
    target,
    operatorGoal,
  })
  const content = [
    `# ${title}`,
    "",
    `Source label: ${sourceLabel}`,
    `Session label: ${bundle.manifest.sessionLabel}`,
    `Vehicle ID: ${bundle.manifest.vehicleId}`,
    `Target: ${targetLabel}`,
    `Current posture: future-hardware planning artifact only; no live authority or final dimensions assumed.`,
    "",
    renderBrief.replace(/^# .+\n\n?/, ""),
    "",
    "## Vault continuity",
    "- File this brief before hardware arrives so later CAD/render work starts from the same operator context.",
    "- Revise the brief after the first real fit-check or bench measurement instead of treating this as final geometry.",
    ...(bundle.radar
      ? [
          "- Keep radar notes advisory-only; they describe a future passive sensor lane, not live RF control or flight authority.",
        ]
      : []),
  ].join("\n")

  return {
    title,
    summary,
    content,
    tags: Array.from(
      new Set([
        ...bundle.manifest.tags,
        ...(bundle.radar ? ["radar-aware-render-brief"] : []),
        "vehicle-render-brief",
        "future-hardware",
        "cad-prep",
        targetTag,
      ]),
    ),
    topic: bundle.radar ? "Vehicle render brief · radar-ready" : "Vehicle render brief",
  }
}

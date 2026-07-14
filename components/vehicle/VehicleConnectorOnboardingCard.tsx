"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { copyTextWithFeedback } from "@/components/ui/clipboardFeedback"
import {
  areVehicleConnectorProfilesEqual,
  buildVehicleConnectorProfileJson,
  buildVehicleBridgeStubCommand,
  DEFAULT_VEHICLE_CONNECTOR_PROFILE,
  normalizeVehicleConnectorProfile,
  VEHICLE_BAUD_RATE_OPTIONS,
  VEHICLE_CONNECTOR_TRANSPORT_LABELS,
  type VehicleConnectorProfile,
  type VehicleConnectorTransport,
} from "@/lib/vehicle/hardwareReadiness"
import { useStore } from "@/store/useStore"

type FieldUpdater<K extends keyof VehicleConnectorProfile> = (
  key: K,
  value: VehicleConnectorProfile[K],
) => void

const TRANSPORT_NOTES: Record<VehicleConnectorTransport, string> = {
  usb_serial: "Best first-arrival path for a Pixhawk on the bench. Keep the bridge local and observer-only.",
  telemetry_radio:
    "Useful once the airframe leaves the bench. Keep transport diagnosis outside Nexus first if frames stall.",
  companion_link:
    "Future Jetson / companion path. Keep flight authority with ArduPilot and use Nexus as the operator console.",
}

const CARD_STYLE: CSSProperties = {
  background: "var(--surf2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--rs)",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

const LABEL_STYLE: CSSProperties = {
  fontSize: "9px",
  color: "var(--text3)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
}

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  minHeight: "34px",
  padding: "8px 10px",
  borderRadius: "10px",
  border: "1px solid var(--border2)",
  background: "rgba(9,14,28,0.45)",
  color: "var(--text)",
  fontSize: "12px",
}

function buildConnectorSetupGuide(profile: VehicleConnectorProfile, stubCommand: string) {
  return [
    `# Future connector onboarding — ${profile.airframeLabel}`,
    "",
    `Autopilot stack: ${profile.autopilotStack}`,
    `Transport: ${VEHICLE_CONNECTOR_TRANSPORT_LABELS[profile.transport]}`,
    `Port hint: ${profile.serialPortHint}`,
    `Baud: ${profile.baudRate}`,
    `Bridge label: ${profile.bridgeLabel}`,
    `Authority: ${profile.authority}`,
    "",
    "1. Keep props off and confirm Mission Planner / QGroundControl sees heartbeat first.",
    "2. Match the saved port hint and baud before blaming Nexus for a missing heartbeat.",
    "3. Start the passive bridge in read-only mode and watch the first minute with no commands issued from Nexus.",
    "4. If telemetry looks wrong, stop and compare the bridge view against the native ground station before continuing.",
    "5. Export the first session bundle and file the summary into Vault before later tuning changes the baseline.",
    "",
    "PowerShell stub command:",
    "```powershell",
    stubCommand,
    "```",
    "",
    "Local doc: docs/deployment/vehicle-passive-bridge-stub.md",
  ].join("\n")
}

export default function VehicleConnectorOnboardingCard() {
  const connectorProfile = useStore((state) => state.settings.vehicleConnectorProfile)
  const updateSettings = useStore((state) => state.updateSettings)
  const [healedProfile, setHealedProfile] = useState(false)
  const normalizedProfile = useMemo(
    () => normalizeVehicleConnectorProfile(connectorProfile),
    [connectorProfile],
  )

  useEffect(() => {
    if (areVehicleConnectorProfilesEqual(connectorProfile, normalizedProfile)) return
    updateSettings({ vehicleConnectorProfile: normalizedProfile })
    setHealedProfile(true)
  }, [connectorProfile, normalizedProfile, updateSettings])

  const profile = normalizedProfile
  const stubCommand = useMemo(() => buildVehicleBridgeStubCommand(profile), [profile])
  const connectorJson = useMemo(() => buildVehicleConnectorProfileJson(profile), [profile])
  const setupGuide = useMemo(
    () => buildConnectorSetupGuide(profile, stubCommand),
    [profile, stubCommand],
  )

  const setField: FieldUpdater<keyof VehicleConnectorProfile> = (key, value) => {
    updateSettings({
      vehicleConnectorProfile: normalizeVehicleConnectorProfile({
        ...profile,
        [key]: value,
      }),
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
          Future Pixhawk / ArduPilot profile
        </div>
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
          Local-only
        </span>
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
          Observer first
        </span>
        {healedProfile ? (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
            }}
          >
            Profile repaired
          </span>
        ) : null}
      </div>

      <div style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.65 }}>
        This is the arrival-day connector profile, not a live hardware requirement. Save the expected
        transport and bridge posture now so the first Pixhawk day is mostly matching cables and settings,
        not improvising under pressure.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={LABEL_STYLE}>Airframe label</span>
          <input
            value={profile.airframeLabel}
            onChange={(event) => setField("airframeLabel", event.target.value)}
            style={INPUT_STYLE}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={LABEL_STYLE}>Transport</span>
          <select
            value={profile.transport}
            onChange={(event) =>
              setField("transport", event.target.value as VehicleConnectorTransport)
            }
            style={INPUT_STYLE}
          >
            {Object.entries(VEHICLE_CONNECTOR_TRANSPORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={LABEL_STYLE}>Port hint</span>
          <input
            value={profile.serialPortHint}
            onChange={(event) => setField("serialPortHint", event.target.value)}
            style={INPUT_STYLE}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={LABEL_STYLE}>Baud</span>
          <select
            value={String(profile.baudRate)}
            onChange={(event) => setField("baudRate", Number(event.target.value))}
            style={INPUT_STYLE}
          >
            {VEHICLE_BAUD_RATE_OPTIONS.map((baud) => (
              <option key={baud} value={baud}>
                {baud.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={LABEL_STYLE}>Bridge label</span>
          <input
            value={profile.bridgeLabel}
            onChange={(event) => setField("bridgeLabel", event.target.value)}
            style={INPUT_STYLE}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={LABEL_STYLE}>Authority</span>
          <select
            value={profile.authority}
            onChange={(event) =>
              setField("authority", event.target.value as VehicleConnectorProfile["authority"])
            }
            style={INPUT_STYLE}
          >
            <option value="read_only">Read-only observer</option>
            <option value="advisory">Advisory observer</option>
          </select>
        </label>
      </div>

      <div style={CARD_STYLE}>
        <div style={{ ...LABEL_STYLE, marginBottom: "2px" }}>Current transport note</div>
        <div style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.65 }}>
          {TRANSPORT_NOTES[profile.transport]}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "10px",
        }}
      >
        <div style={CARD_STYLE}>
          <div style={{ ...LABEL_STYLE, marginBottom: "2px" }}>Arrival-day bridge command</div>
          <pre
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: "12px",
              background: "rgba(9,14,28,0.7)",
              color: "#dbeafe",
              fontSize: "11px",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {stubCommand}
          </pre>
        </div>

        <div style={CARD_STYLE}>
          <div style={{ ...LABEL_STYLE, marginBottom: "2px" }}>Ready when hardware arrives</div>
          <div style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.65 }}>
            Script: <code>scripts/vehicle-bridge-stub.mjs</code>
            <br />
            Docs: <code>docs/deployment/vehicle-passive-bridge-stub.md</code>
            <br />
            Local route: <code>/api/vehicle/telemetry</code>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "auto" }}>
            <button
              type="button"
              onClick={() => void copyTextWithFeedback(stubCommand, "Bridge command")}
              className="nexus-shell-button"
            >
              Copy command
            </button>
            <button
              type="button"
              onClick={() => void copyTextWithFeedback(connectorJson, "Connector profile")}
              className="nexus-shell-button"
            >
              Copy profile JSON
            </button>
            <button
              type="button"
              onClick={() => void copyTextWithFeedback(setupGuide, "Setup guide")}
              className="nexus-shell-button"
            >
              Copy setup guide
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ vehicleConnectorProfile: DEFAULT_VEHICLE_CONNECTOR_PROFILE })}
              className="nexus-shell-button"
            >
              Reset defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

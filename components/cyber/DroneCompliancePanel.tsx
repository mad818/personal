"use client"

// DroneCompliancePanel
// 5-agent drone compliance check (FAA / state / local / airspace / operational).
// Calls POST /api/legal-compliance/drone and renders weighted results.

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import type {
  DroneComplianceCheck,
  DroneComplianceResult,
  DroneAgentResult,
} from "@/components/home/office/types"
import { apiFetch } from "@/lib/apiFetch"
import { SurfaceCallout } from "@/components/ui/surfacePrimitives"

const OPERATION_TYPES: DroneComplianceCheck["operationType"][] = [
  "recreational",
  "commercial",
  "mapping",
  "inspection",
  "delivery",
]

const STATUS_COLOR: Record<DroneComplianceResult["status"], string> = {
  compliant: "var(--flo)",
  "review-required": "var(--fmd)",
  "likely-violation": "#ef4444",
}

const STATUS_LABEL: Record<DroneComplianceResult["status"], string> = {
  compliant: "Compliant",
  "review-required": "Review Required",
  "likely-violation": "Likely Violation",
}

const AGENT_ORDER: Array<keyof DroneComplianceResult["agents"]> = [
  "faa",
  "state",
  "local",
  "airspace",
  "operational",
]

function parseBooleanParam(value: string | null) {
  return value === "1" || value === "true" || value === "yes"
}

function parseNumberParam(value: string | null, fallback: string) {
  if (!value) return fallback
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? String(num) : fallback
}

function ScoreBar({ score, weight }: { score: number; weight: number }) {
  const color = score >= 80 ? "var(--flo)" : score >= 55 ? "var(--fmd)" : "#ef4444"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div
        style={{
          flex: 1,
          height: "6px",
          background: "var(--surf3)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "3px" }} />
      </div>
      <span style={{ fontSize: "10px", color, fontWeight: "bold", minWidth: "28px" }}>
        {score}
      </span>
      <span style={{ fontSize: "9px", color: "var(--text2)" }}>
        ({Math.round(weight * 100)}%)
      </span>
    </div>
  )
}

function AgentCard({ agent, label }: { agent: DroneAgentResult; label: string }) {
  const [open, setOpen] = useState(false)
  const color = agent.score >= 80 ? "var(--flo)" : agent.score >= 55 ? "var(--fmd)" : "#ef4444"

  return (
    <div
      style={{
        background: "var(--surf3)",
        borderRadius: "6px",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: "100%",
          padding: "8px 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "var(--text2)",
            fontWeight: "bold",
            flex: 1,
            textAlign: "left",
          }}
        >
          {label.toUpperCase()}
        </span>
        <ScoreBar score={agent.score} weight={agent.weight} />
        <span style={{ fontSize: "10px", color: "var(--text2)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {agent.findings.length > 0 ? (
            <div>
              <div style={{ fontSize: "9px", color: "var(--text2)", fontWeight: "bold", marginBottom: "3px" }}>
                FINDINGS
              </div>
              {agent.findings.map((finding, index) => (
                <div key={`${label}-finding-${index}`} style={{ fontSize: "11px", color: "var(--text)", marginBottom: "2px" }}>
                  &rsaquo; {finding}
                </div>
              ))}
            </div>
          ) : null}
          {agent.violations.length > 0 ? (
            <div>
              <div style={{ fontSize: "9px", color: "#ef4444", fontWeight: "bold", marginBottom: "3px" }}>
                VIOLATIONS
              </div>
              {agent.violations.map((violation, index) => (
                <div key={`${label}-violation-${index}`} style={{ fontSize: "11px", color: "#ef4444", marginBottom: "2px" }}>
                  ! {violation}
                </div>
              ))}
            </div>
          ) : null}
          {agent.citations.length > 0 ? (
            <div>
              <div style={{ fontSize: "9px", color: "var(--text2)", fontWeight: "bold", marginBottom: "3px" }}>
                CITATIONS
              </div>
              {agent.citations.map((citation, index) => (
                <div key={`${label}-citation-${index}`} style={{ fontSize: "10px", color: "var(--text2)", marginBottom: "2px" }}>
                  {citation}
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ fontSize: "9px", color, marginTop: "2px" }}>
            Score: {agent.score}/100 · Weight: {Math.round(agent.weight * 100)}%
          </div>
        </div>
      ) : null}
    </div>
  )
}

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  background: "var(--surf3)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  color: "var(--text)",
  fontSize: "12px",
  boxSizing: "border-box",
}

export function DroneCompliancePanel() {
  const searchParams = useSearchParams()
  const cityParam = searchParams.get("city")
  const stateParam = searchParams.get("state")
  const operationTypeParam = searchParams.get("operationType")
  const weightParam = searchParams.get("droneWeight")
  const altitudeParam = searchParams.get("altitude")
  const nightOpsParam = searchParams.get("nightOps")
  const nearAirportParam = searchParams.get("nearAirport")
  const contextParam = searchParams.get("additionalContext")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [opType, setOpType] = useState<DroneComplianceCheck["operationType"]>("commercial")
  const [weight, setWeight] = useState("2.5")
  const [altitude, setAltitude] = useState("400")
  const [nightOps, setNightOps] = useState(false)
  const [nearApt, setNearApt] = useState(false)
  const [context, setContext] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DroneComplianceResult | null>(null)

  useEffect(() => {
    if (cityParam !== null) setCity(cityParam)
    if (stateParam !== null) setState(stateParam)
    if (operationTypeParam && OPERATION_TYPES.includes(operationTypeParam as DroneComplianceCheck["operationType"])) {
      setOpType(operationTypeParam as DroneComplianceCheck["operationType"])
    }
    setWeight(parseNumberParam(weightParam, "2.5"))
    setAltitude(parseNumberParam(altitudeParam, "400"))
    if (nightOpsParam !== null) setNightOps(parseBooleanParam(nightOpsParam))
    if (nearAirportParam !== null) setNearApt(parseBooleanParam(nearAirportParam))
    if (contextParam !== null) setContext(contextParam)
  }, [
    altitudeParam,
    cityParam,
    contextParam,
    nearAirportParam,
    nightOpsParam,
    operationTypeParam,
    stateParam,
    weightParam,
  ])

  const canRun = city.trim().length > 0 && state.trim().length > 0 && !loading
  const hasRetainedResult = result !== null

  const run = async () => {
    if (!canRun) return

    setLoading(true)
    setError(null)

    try {
      const body: DroneComplianceCheck = {
        location: { city: city.trim(), state: state.trim() },
        operationType: opType,
        droneWeight: parseFloat(weight) || 2.5,
        altitude: parseInt(altitude, 10) || 400,
        nightOps,
        nearAirport: nearApt,
        additionalContext: context.trim() || undefined,
      }

      const response = await apiFetch("/api/legal-compliance/drone", {
        method: "POST",
        cache: "no-store",
        body: JSON.stringify(body),
      })
      const payload = (await response.json().catch(() => null)) as
        | DroneComplianceResult
        | { error?: string }
        | null

      if (!response.ok) {
        throw new Error(payload && "error" in payload && payload.error ? payload.error : `HTTP ${response.status}`)
      }

      setResult(payload as DroneComplianceResult)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Compliance check failed"
      setError(
        hasRetainedResult
          ? `${message}. Keeping the last successful compliance review visible.`
          : message,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <SurfaceCallout
        tone="info"
        compact
        icon="Shield"
        title="Protected local compliance lane"
        description="This check runs through the local protected route, so Vehicle Lab can hand off into compliance without exposing the browser directly to the underlying agent workflow."
      />

      <div
        style={{
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "14px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>CITY</label>
          <input aria-label="Drone operation city" style={INPUT} value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Los Angeles" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>STATE</label>
          <input aria-label="Drone operation state" style={INPUT} value={state} onChange={(event) => setState(event.target.value)} placeholder="e.g. CA" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>OPERATION TYPE</label>
          <select aria-label="Drone operation type" style={INPUT} value={opType} onChange={(event) => setOpType(event.target.value as DroneComplianceCheck["operationType"])}>
            {OPERATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>WEIGHT (lbs)</label>
            <input aria-label="Drone weight in pounds" style={INPUT} type="number" value={weight} onChange={(event) => setWeight(event.target.value)} min="0.1" step="0.1" />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>ALTITUDE (ft)</label>
            <input aria-label="Drone altitude in feet" style={INPUT} type="number" value={altitude} onChange={(event) => setAltitude(event.target.value)} min="0" step="50" />
          </div>
        </div>
        <div style={{ gridColumn: "span 2", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "11px", color: "var(--text)" }}>
            <input type="checkbox" checked={nightOps} onChange={(event) => setNightOps(event.target.checked)} />
            Night operations
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "11px", color: "var(--text)" }}>
            <input type="checkbox" checked={nearApt} onChange={(event) => setNearApt(event.target.checked)} />
            Near airport (&lt;5mi)
          </label>
        </div>
        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>ADDITIONAL CONTEXT (optional)</label>
          <input
            aria-label="Drone operation additional context"
            style={INPUT}
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="e.g. filming a music video over a park"
          />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <button
            type="button"
            onClick={run}
            disabled={!canRun}
            style={{
              width: "100%",
              padding: "8px 0",
              borderRadius: "6px",
              border: "1px solid var(--accent)",
              background: loading ? "var(--surf3)" : "transparent",
              color: canRun ? "var(--accent)" : "var(--text2)",
              cursor: canRun ? "pointer" : "not-allowed",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {loading ? "Running 5 compliance agents..." : "Run compliance check"}
          </button>
        </div>
      </div>

      {error ? (
        <SurfaceCallout
          tone={hasRetainedResult ? "warning" : "critical"}
          compact
          icon={hasRetainedResult ? "↺" : "!"}
          title={hasRetainedResult ? "Latest compliance run failed · showing last good result" : "Compliance check failed"}
          description={error}
        />
      ) : null}

      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              background: "var(--surf2)",
              border: `1px solid ${STATUS_COLOR[result.status]}`,
              borderRadius: "8px",
              padding: "14px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ textAlign: "center", minWidth: "56px" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: STATUS_COLOR[result.status], lineHeight: 1 }}>
                {result.overallScore}
              </div>
              <div style={{ fontSize: "9px", color: "var(--text2)" }}>/ 100</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: STATUS_COLOR[result.status], marginBottom: "2px" }}>
                {STATUS_LABEL[result.status]}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text2)" }}>
                {result.location ? `${result.location.city}, ${result.location.state} • ` : ""}
                Checked {new Date(result.checkedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "10px", color: "var(--text2)", fontWeight: "bold" }}>AGENT BREAKDOWN</div>
            {AGENT_ORDER.map((key) => (
              <AgentCard
                key={key}
                agent={result.agents[key]}
                label={result.agents[key].agentName.replace(" Agent", "")}
              />
            ))}
          </div>

          {result.topIssues.length > 0 ? (
            <div style={{ background: "var(--surf2)", borderRadius: "6px", border: "1px solid var(--border)", padding: "10px" }}>
              <div style={{ fontSize: "10px", color: "#ef4444", fontWeight: "bold", marginBottom: "6px" }}>TOP ISSUES</div>
              {result.topIssues.map((issue, index) => (
                <div key={`issue-${index}`} style={{ fontSize: "11px", color: "var(--text)", marginBottom: "4px" }}>
                  ! {issue}
                </div>
              ))}
            </div>
          ) : null}

          {result.recommendations.length > 0 ? (
            <div style={{ background: "var(--surf2)", borderRadius: "6px", border: "1px solid var(--border)", padding: "10px" }}>
              <div style={{ fontSize: "10px", color: "var(--flo)", fontWeight: "bold", marginBottom: "6px" }}>RECOMMENDATIONS</div>
              {result.recommendations.map((recommendation, index) => (
                <div key={`recommendation-${index}`} style={{ fontSize: "11px", color: "var(--text)", marginBottom: "4px" }}>
                  &rsaquo; {recommendation}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!result && !loading && !error ? (
        <div style={{ fontSize: "11px", color: "var(--text2)", textAlign: "center", padding: "20px 0" }}>
          Enter mission details above to run the protected FAA, state, local, airspace, and operational compliance check.
        </div>
      ) : null}
    </div>
  )
}

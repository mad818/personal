import { NextRequest, NextResponse } from "next/server";
import type {
  VehicleBridgeSnapshot,
  VehicleBridgeStatus,
  VehicleTelemetryFrame,
  VehicleTelemetrySourceMode,
} from "@/lib/vehicle/types";
import { VEHICLE_BRIDGE_FRESHNESS_MS } from "@/lib/vehicle/types";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 180;

let ingestedFrames = 0;
let latestFrame: VehicleTelemetryFrame | null = null;
let history: VehicleTelemetryFrame[] = [];
let bridgeStatus: VehicleBridgeStatus = {
  available: false,
  fresh: false,
  bridgeId: null,
  bridgeLabel: null,
  authority: "read_only",
  lastIngestAt: null,
  ingestedFrames: 0,
  freshnessMs: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback: string, max = 120) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : fallback;
}

function normalizeAuthority(value: unknown): VehicleBridgeStatus["authority"] {
  return value === "advisory" ? "advisory" : "read_only";
}

function normalizeSource(value: unknown): VehicleTelemetrySourceMode {
  return value === "replay" || value === "simulation" ? value : "live_bridge";
}

function readFrameInput(body: unknown) {
  if (!isRecord(body)) return null;
  const directFrame = isRecord(body.frame)
    ? body.frame
    : isRecord(body.latestFrame)
      ? body.latestFrame
      : body;
  return isRecord(directFrame) ? directFrame : null;
}

function normalizeTelemetryFrame(raw: unknown): VehicleTelemetryFrame | null {
  const frame = readFrameInput(raw);
  if (!frame) return null;
  if (
    !isRecord(frame.heartbeat) ||
    !isRecord(frame.position) ||
    !isRecord(frame.battery)
  ) {
    return null;
  }
  if (
    !isRecord(frame.link) ||
    !isRecord(frame.mission) ||
    !isRecord(frame.failsafes)
  ) {
    return null;
  }
  if (!Array.isArray(frame.motors) || !Array.isArray(frame.sensors)) {
    return null;
  }
  if (
    !Array.isArray(frame.cameras) ||
    !isRecord(frame.companion) ||
    !Array.isArray(frame.pipeline)
  ) {
    return null;
  }

  const timestamp =
    typeof frame.timestamp === "number" && Number.isFinite(frame.timestamp)
      ? frame.timestamp
      : Date.now();
  const vehicleId = normalizeString(
    frame.vehicleId,
    "vehicle-passive-bridge",
    80,
  );

  return {
    ...(frame as unknown as VehicleTelemetryFrame),
    timestamp,
    vehicleId,
    source: normalizeSource(frame.source),
  };
}

function buildSnapshot(): VehicleBridgeSnapshot {
  const freshnessMs =
    bridgeStatus.lastIngestAt === null
      ? null
      : Math.max(0, Date.now() - bridgeStatus.lastIngestAt);
  const fresh =
    freshnessMs !== null && freshnessMs <= VEHICLE_BRIDGE_FRESHNESS_MS;
  return {
    latestFrame,
    history,
    bridgeStatus: {
      ...bridgeStatus,
      fresh,
      freshnessMs,
    },
  };
}

export async function GET() {
  return NextResponse.json(buildSnapshot());
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
        message: "Vehicle telemetry ingest expects a JSON payload.",
      },
      { status: 400 },
    );
  }

  const frame = normalizeTelemetryFrame(body);
  if (!frame || !isRecord(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_vehicle_telemetry",
        message:
          "Payload must include a normalized passive telemetry frame. Nexus does not arm, steer, or mode-switch the aircraft.",
      },
      { status: 400 },
    );
  }

  const now = Date.now();
  ingestedFrames += 1;
  latestFrame = {
    ...frame,
    source: "live_bridge",
    timestamp: frame.timestamp || now,
  };
  history = [...history.slice(-(HISTORY_LIMIT - 1)), latestFrame];
  bridgeStatus = {
    available: true,
    fresh: true,
    bridgeId: normalizeString(body.bridgeId, "vehicle-passive-bridge", 80),
    bridgeLabel: normalizeString(
      body.bridgeLabel,
      "Vehicle passive bridge",
      120,
    ),
    authority: normalizeAuthority(body.authority),
    lastIngestAt: now,
    ingestedFrames,
    freshnessMs: 0,
  };

  return NextResponse.json({
    ok: true,
    ...buildSnapshot(),
  });
}

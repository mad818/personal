import { NextRequest } from "next/server";
import {
  buildEspectreControlEnvelope,
  buildEspectreReadiness,
  createSimulatedEspectreTelemetry,
  normalizeEspectreTelemetry,
  type EspectreControlAction,
  type EspectreControlPatch,
  type EspectreControlEnvelope,
  type EspectreTelemetry,
} from "@/lib/espectre";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sensorState = new Map<string, EspectreTelemetry>();
const commandQueue = new Map<string, EspectreControlEnvelope[]>();

function readSensors() {
  if (sensorState.size === 0) {
    const simulated = createSimulatedEspectreTelemetry();
    sensorState.set(simulated.sensorId, simulated);
  }
  return Array.from(sensorState.values()).map((sensor) =>
    sensor.simulated ? createSimulatedEspectreTelemetry() : sensor,
  );
}

export async function GET(req: NextRequest) {
  const sensors = readSensors();
  const commandsFor = new URL(req.url).searchParams.get("commandsFor")?.trim();
  const pendingCommandCount = Array.from(commandQueue.values()).reduce(
    (total, commands) => total + commands.length,
    0,
  );
  return protectedJson({
    sensors: sensors.map((telemetry) => ({
      telemetry,
      readiness: buildEspectreReadiness(telemetry),
    })),
    integration: {
      ingress: "Protected HTTP telemetry or external MQTT/ESPHome bridge",
      control: "Review-required command envelopes",
      runtimeBoundary: "External GPL-3.0 ESPectre runtime",
      rawCsiStored: false,
    },
    pendingCommandCount,
    ...(commandsFor
      ? { pendingCommands: commandQueue.get(commandsFor) ?? [] }
      : {}),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: "ingest" | "acknowledge" | EspectreControlAction;
      telemetry?: Record<string, unknown>;
      sensorId?: string;
      commandId?: string;
      patch?: EspectreControlPatch;
    };

    if (body.action === "ingest" && body.telemetry) {
      const telemetry = normalizeEspectreTelemetry(body.telemetry);
      sensorState.set(telemetry.sensorId, telemetry);
      return protectedJson({
        accepted: true,
        telemetry,
        readiness: buildEspectreReadiness(telemetry),
      });
    }

    if (
      (body.action === "calibrate" || body.action === "configure") &&
      body.sensorId
    ) {
      const envelope = buildEspectreControlEnvelope(
        body.sensorId,
        body.action,
        body.patch,
      );
      const current = commandQueue.get(envelope.sensorId) ?? [];
      commandQueue.set(envelope.sensorId, [...current, envelope].slice(-50));
      return protectedJson({
        accepted: true,
        envelope,
        note: "Command queued for an operator-managed ESPectre bridge. Nexus did not contact or control external hardware.",
      });
    }

    if (body.action === "acknowledge" && body.sensorId && body.commandId) {
      const current = commandQueue.get(body.sensorId) ?? [];
      const next = current.filter(
        (command) => command.commandId !== body.commandId,
      );
      commandQueue.set(body.sensorId, next);
      return protectedJson({
        accepted: next.length < current.length,
        pendingCommandCount: next.length,
      });
    }

    return protectedJson(
      { error: "Use action ingest, calibrate, configure, or acknowledge." },
      { status: 400 },
    );
  } catch {
    return protectedJson(
      { error: "Unable to process ESPectre payload." },
      { status: 400 },
    );
  }
}

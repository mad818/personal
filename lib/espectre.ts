export type EspectreMotionState = "idle" | "motion";
export type EspectreDetector = "mvs" | "mlp";
export type EspectreTrafficMode = "ping" | "dns" | "external";
export type EspectreTransport =
  | "mqtt"
  | "esphome"
  | "ble"
  | "http"
  | "simulated";

export interface EspectreTelemetry {
  sensorId: string;
  name: string;
  zone: string;
  motionState: EspectreMotionState;
  movementScore: number;
  threshold: number;
  detector: EspectreDetector;
  trafficMode: EspectreTrafficMode;
  transport: EspectreTransport;
  motionOnHits: number;
  motionOffHits: number;
  calibrated: boolean;
  consentConfirmed: boolean;
  nbviEnabled: boolean;
  hampelEnabled: boolean;
  lowPassEnabled: boolean;
  gainLocked: boolean;
  fftLocked: boolean;
  simulated: boolean;
  lastSeenAt: string;
}

export interface EspectreReadiness {
  status:
    | "ready"
    | "simulated"
    | "needs-consent"
    | "calibration-required"
    | "stale";
  ready: boolean;
  blockers: string[];
  summary: string;
}

export type EspectreControlAction = "calibrate" | "configure";

export interface EspectreControlPatch {
  threshold?: number;
  detector?: EspectreDetector;
  trafficMode?: EspectreTrafficMode;
  motionOnHits?: number;
  motionOffHits?: number;
  nbviEnabled?: boolean;
  hampelEnabled?: boolean;
  lowPassEnabled?: boolean;
  gainLocked?: boolean;
  fftLocked?: boolean;
  consentConfirmed?: boolean;
}

export interface EspectreControlEnvelope {
  commandId: string;
  sensorId: string;
  action: EspectreControlAction;
  topic: string;
  payload: EspectreControlPatch & {
    action: EspectreControlAction;
    requestedAt: string;
  };
  reviewRequired: true;
  delivered: false;
}

const DETECTORS = new Set<EspectreDetector>(["mvs", "mlp"]);
const TRAFFIC_MODES = new Set<EspectreTrafficMode>(["ping", "dns", "external"]);
const TRANSPORTS = new Set<EspectreTransport>([
  "mqtt",
  "esphome",
  "ble",
  "http",
  "simulated",
]);

function text(value: unknown, fallback: string, maxLength = 80) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function integerInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return Math.round(numberInRange(value, fallback, min, max));
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
) {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  return allowed.has(normalized as T) ? (normalized as T) : fallback;
}

function motionState(value: unknown, score: number, threshold: number) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "motion" || normalized === "detected") return "motion";
    if (normalized === "idle" || normalized === "clear") return "idle";
  }
  if (typeof value === "boolean") return value ? "motion" : "idle";
  return score >= threshold ? "motion" : "idle";
}

export function normalizeEspectreTelemetry(
  input: Record<string, unknown>,
  fallback: Partial<EspectreTelemetry> = {},
): EspectreTelemetry {
  const movementScore = numberInRange(
    input.movementScore ?? input.movement_score ?? input.score,
    fallback.movementScore ?? 0,
    0,
    100,
  );
  const threshold = numberInRange(
    input.threshold,
    fallback.threshold ?? 42,
    1,
    100,
  );
  const transport = enumValue(
    input.transport,
    TRANSPORTS,
    fallback.transport ?? "http",
  );

  return {
    sensorId: text(
      input.sensorId ?? input.sensor_id ?? input.deviceId,
      fallback.sensorId ?? "espectre-unknown",
    ).replace(/[^a-zA-Z0-9._-]/g, "-"),
    name: text(input.name, fallback.name ?? "ESPectre sensor"),
    zone: text(input.zone ?? input.location, fallback.zone ?? "Unassigned zone"),
    motionState: motionState(
      input.motionState ?? input.motion_state ?? input.motion,
      movementScore,
      threshold,
    ),
    movementScore,
    threshold,
    detector: enumValue(
      input.detector,
      DETECTORS,
      fallback.detector ?? "mvs",
    ),
    trafficMode: enumValue(
      input.trafficMode ?? input.traffic_mode,
      TRAFFIC_MODES,
      fallback.trafficMode ?? "ping",
    ),
    transport,
    motionOnHits: integerInRange(
      input.motionOnHits ?? input.motion_on_hits,
      fallback.motionOnHits ?? 3,
      1,
      20,
    ),
    motionOffHits: integerInRange(
      input.motionOffHits ?? input.motion_off_hits,
      fallback.motionOffHits ?? 5,
      1,
      20,
    ),
    calibrated: booleanValue(input.calibrated, fallback.calibrated ?? false),
    consentConfirmed: booleanValue(
      input.consentConfirmed ?? input.consent_confirmed,
      fallback.consentConfirmed ?? false,
    ),
    nbviEnabled: booleanValue(
      input.nbviEnabled ?? input.nbvi_enabled,
      fallback.nbviEnabled ?? true,
    ),
    hampelEnabled: booleanValue(
      input.hampelEnabled ?? input.hampel_enabled,
      fallback.hampelEnabled ?? true,
    ),
    lowPassEnabled: booleanValue(
      input.lowPassEnabled ?? input.low_pass_enabled,
      fallback.lowPassEnabled ?? false,
    ),
    gainLocked: booleanValue(
      input.gainLocked ?? input.gain_locked,
      fallback.gainLocked ?? true,
    ),
    fftLocked: booleanValue(
      input.fftLocked ?? input.fft_locked,
      fallback.fftLocked ?? true,
    ),
    simulated: booleanValue(
      input.simulated,
      fallback.simulated ?? transport === "simulated",
    ),
    lastSeenAt: text(
      input.lastSeenAt ?? input.last_seen_at,
      fallback.lastSeenAt ?? new Date().toISOString(),
    ),
  };
}

export function buildEspectreReadiness(
  telemetry: EspectreTelemetry,
  now = Date.now(),
): EspectreReadiness {
  const blockers: string[] = [];
  const seenAt = Date.parse(telemetry.lastSeenAt);
  const stale = !Number.isFinite(seenAt) || now - seenAt > 120_000;

  if (!telemetry.consentConfirmed) {
    blockers.push("Confirm consent for everyone who can be sensed in this zone.");
  }
  if (!telemetry.calibrated) {
    blockers.push("Calibrate the sensor in its installed position.");
  }
  if (stale) {
    blockers.push("Telemetry is stale; check the external ESPectre bridge.");
  }

  if (!telemetry.consentConfirmed) {
    return {
      status: "needs-consent",
      ready: false,
      blockers,
      summary: "WiFi sensing remains locked until zone consent is confirmed.",
    };
  }
  if (!telemetry.calibrated) {
    return {
      status: "calibration-required",
      ready: false,
      blockers,
      summary: "Consent is recorded; calibration is still required.",
    };
  }
  if (stale) {
    return {
      status: "stale",
      ready: false,
      blockers,
      summary: "The sensor is configured but its latest telemetry is stale.",
    };
  }
  if (telemetry.simulated) {
    return {
      status: "simulated",
      ready: true,
      blockers: [],
      summary: "Simulation is live. Connect external ESPectre hardware for real sensing.",
    };
  }
  return {
    status: "ready",
    ready: true,
    blockers: [],
    summary: "Consent-aware ESPectre telemetry is current and calibrated.",
  };
}

function normalizedControlPatch(patch: EspectreControlPatch) {
  const normalized: EspectreControlPatch = {};
  if (patch.threshold !== undefined) {
    normalized.threshold = numberInRange(patch.threshold, 42, 1, 100);
  }
  if (patch.detector !== undefined) {
    normalized.detector = enumValue(patch.detector, DETECTORS, "mvs");
  }
  if (patch.trafficMode !== undefined) {
    normalized.trafficMode = enumValue(
      patch.trafficMode,
      TRAFFIC_MODES,
      "ping",
    );
  }
  if (patch.motionOnHits !== undefined) {
    normalized.motionOnHits = integerInRange(patch.motionOnHits, 3, 1, 20);
  }
  if (patch.motionOffHits !== undefined) {
    normalized.motionOffHits = integerInRange(patch.motionOffHits, 5, 1, 20);
  }
  for (const key of [
    "nbviEnabled",
    "hampelEnabled",
    "lowPassEnabled",
    "gainLocked",
    "fftLocked",
    "consentConfirmed",
  ] as const) {
    if (patch[key] !== undefined) normalized[key] = Boolean(patch[key]);
  }
  return normalized;
}

export function buildEspectreControlEnvelope(
  sensorId: string,
  action: EspectreControlAction,
  patch: EspectreControlPatch = {},
): EspectreControlEnvelope {
  const safeSensorId = text(sensorId, "espectre-unknown").replace(
    /[^a-zA-Z0-9._-]/g,
    "-",
  );
  return {
    commandId: `${safeSensorId}-${Date.now().toString(36)}`,
    sensorId: safeSensorId,
    action,
    topic: `espectre/${safeSensorId}/command`,
    payload: {
      action,
      ...(action === "configure" ? normalizedControlPatch(patch) : {}),
      requestedAt: new Date().toISOString(),
    },
    reviewRequired: true,
    delivered: false,
  };
}

export function createSimulatedEspectreTelemetry(
  now = Date.now(),
): EspectreTelemetry {
  const movementScore = Number(
    (36 + Math.abs(Math.sin(now / 4_500)) * 32).toFixed(1),
  );
  return normalizeEspectreTelemetry({
    sensorId: "espectre-sim-01",
    name: "ESPectre WiFi Motion",
    zone: "Simulation zone",
    movementScore,
    threshold: 48,
    detector: "mvs",
    trafficMode: "ping",
    transport: "simulated",
    motionOnHits: 3,
    motionOffHits: 5,
    calibrated: true,
    consentConfirmed: true,
    nbviEnabled: true,
    hampelEnabled: true,
    lowPassEnabled: false,
    gainLocked: true,
    fftLocked: true,
    simulated: true,
    lastSeenAt: new Date(now).toISOString(),
  });
}

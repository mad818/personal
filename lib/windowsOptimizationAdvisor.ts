export type WindowsOptimizationRisk = "safe" | "moderate" | "risky";

export interface WindowsOptimizationSnapshot {
  platform: string;
  generatedAt: string;
  processorCount: number;
  uptimeHours: number;
  memory: {
    totalBytes: number;
    freeBytes: number;
    freePercent: number;
  };
  disks: Array<{
    usedPercent: number;
  }>;
  services: {
    total: number;
    running: number;
    automatic: number;
    disabled: number;
  };
  startupEntries: number;
  scheduledTasks: {
    total: number;
    running: number;
    ready: number;
    disabled: number;
  };
  availability: {
    disks: boolean;
    services: boolean;
    startupEntries: boolean;
    scheduledTasks: boolean;
  };
}

export interface WindowsOptimizationRecommendation {
  id: string;
  title: string;
  category: "performance" | "storage" | "startup" | "services" | "maintenance";
  risk: WindowsOptimizationRisk;
  evidence: string;
  recommendation: string;
  execution: "external-review-only";
  measurementRequired: true;
}

export interface WindowsOptimizationAdvisor {
  generatedAt: string;
  supported: boolean;
  readOnly: true;
  requiresElevation: false;
  status: "unsupported" | "healthy" | "review";
  summary: string;
  snapshot: WindowsOptimizationSnapshot;
  recommendations: WindowsOptimizationRecommendation[];
  collectionWarnings: string[];
  prerequisites: string[];
  guardrails: string[];
}

const GIB = 1024 ** 3;

function finiteNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function count(value: unknown) {
  return Math.max(0, Math.round(finiteNumber(value)));
}

function percent(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(finiteNumber(value))));
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeWindowsOptimizationSnapshot(
  value: unknown,
): WindowsOptimizationSnapshot {
  const input = objectValue(value);
  const memory = objectValue(input.memory);
  const services = objectValue(input.services);
  const scheduledTasks = objectValue(input.scheduledTasks);
  const availability = objectValue(input.availability);
  const totalBytes = Math.max(0, finiteNumber(memory.totalBytes));
  const freeBytes = Math.max(0, Math.min(totalBytes, finiteNumber(memory.freeBytes)));
  const freePercent =
    totalBytes > 0 ? percent((freeBytes / totalBytes) * 100) : percent(memory.freePercent);
  const rawDisks = Array.isArray(input.disks) ? input.disks : [];

  return {
    platform:
      typeof input.platform === "string" && input.platform.trim()
        ? input.platform.trim().toLowerCase()
        : "unknown",
    generatedAt:
      typeof input.generatedAt === "string" && input.generatedAt.trim()
        ? input.generatedAt
        : new Date().toISOString(),
    processorCount: count(input.processorCount),
    uptimeHours: Math.max(0, Math.round(finiteNumber(input.uptimeHours) * 10) / 10),
    memory: {
      totalBytes,
      freeBytes,
      freePercent,
    },
    disks: rawDisks.slice(0, 32).map((disk) => ({
      usedPercent: percent(objectValue(disk).usedPercent),
    })),
    services: {
      total: count(services.total),
      running: count(services.running),
      automatic: count(services.automatic),
      disabled: count(services.disabled),
    },
    startupEntries: count(input.startupEntries),
    scheduledTasks: {
      total: count(scheduledTasks.total),
      running: count(scheduledTasks.running),
      ready: count(scheduledTasks.ready),
      disabled: count(scheduledTasks.disabled),
    },
    availability: {
      disks: availability.disks === true,
      services: availability.services === true,
      startupEntries: availability.startupEntries === true,
      scheduledTasks: availability.scheduledTasks === true,
    },
  };
}

function recommendation(
  value: Omit<WindowsOptimizationRecommendation, "execution" | "measurementRequired">,
): WindowsOptimizationRecommendation {
  return {
    ...value,
    execution: "external-review-only",
    measurementRequired: true,
  };
}

export function buildWindowsOptimizationAdvisor(
  snapshot: WindowsOptimizationSnapshot,
): WindowsOptimizationAdvisor {
  const supported = snapshot.platform === "win32";
  const recommendations: WindowsOptimizationRecommendation[] = [];
  const collectionWarnings = supported
    ? Object.entries(snapshot.availability)
        .filter(([, available]) => !available)
        .map(([section]) => `${section} inventory was unavailable and was not treated as zero.`)
    : [];

  if (supported && snapshot.memory.totalBytes > 0 && snapshot.memory.freePercent < 15) {
    recommendations.push(
      recommendation({
        id: "memory-pressure",
        title: "Review memory pressure before changing Windows settings",
        category: "performance",
        risk: "safe",
        evidence: `${snapshot.memory.freePercent}% memory free across ${(snapshot.memory.totalBytes / GIB).toFixed(1)} GiB.`,
        recommendation:
          "Measure the busiest applications and review unnecessary startup entries before considering service or power-plan changes.",
      }),
    );
  }

  const fullestDisk = Math.max(0, ...snapshot.disks.map((disk) => disk.usedPercent));
  if (supported && fullestDisk >= 85) {
    recommendations.push(
      recommendation({
        id: "disk-pressure",
        title: "Review disk cleanup candidates",
        category: "storage",
        risk: fullestDisk >= 95 ? "moderate" : "safe",
        evidence: `The fullest fixed volume is ${fullestDisk}% used.`,
        recommendation:
          "Inspect temporary files and application caches with an external reviewed tool; confirm every deletion target before removal.",
      }),
    );
  }

  if (supported && snapshot.startupEntries >= 20) {
    recommendations.push(
      recommendation({
        id: "startup-pressure",
        title: "Review startup entry pressure",
        category: "startup",
        risk: "safe",
        evidence: `${snapshot.startupEntries} startup entries were counted.`,
        recommendation:
          "Review impact and ownership externally, then disable only entries you recognize and can restore.",
      }),
    );
  }

  if (supported && snapshot.services.automatic >= 150) {
    recommendations.push(
      recommendation({
        id: "automatic-service-pressure",
        title: "Review automatic-service pressure",
        category: "services",
        risk: "moderate",
        evidence: `${snapshot.services.automatic} automatic services were counted.`,
        recommendation:
          "Do not bulk-disable services. Review vendor documentation and measure a single reversible change at a time.",
      }),
    );
  }

  if (supported && snapshot.scheduledTasks.total >= 300) {
    recommendations.push(
      recommendation({
        id: "scheduled-task-pressure",
        title: "Review scheduled-task pressure",
        category: "maintenance",
        risk: "moderate",
        evidence: `${snapshot.scheduledTasks.total} scheduled tasks were counted.`,
        recommendation:
          "Inspect task ownership and purpose externally; never delete or disable unknown maintenance or security tasks.",
      }),
    );
  }

  if (supported && snapshot.uptimeHours >= 168) {
    recommendations.push(
      recommendation({
        id: "long-uptime",
        title: "Plan a measured maintenance restart",
        category: "maintenance",
        risk: "safe",
        evidence: `Windows uptime is ${snapshot.uptimeHours.toFixed(1)} hours.`,
        recommendation:
          "Save active work, record the current baseline, restart during a maintenance window, then compare the same measurements.",
      }),
    );
  }

  return {
    generatedAt: snapshot.generatedAt,
    supported,
    readOnly: true,
    requiresElevation: false,
    status:
      !supported || (recommendations.length === 0 && collectionWarnings.length === 0)
        ? supported
          ? "healthy"
          : "unsupported"
        : "review",
    summary: !supported
      ? "Windows optimization posture is unavailable on this host. No changes were attempted."
      : collectionWarnings.length > 0
        ? `Windows inventory is incomplete in ${collectionWarnings.length} section(s). Available measurements produced ${recommendations.length} review item(s); no changes were attempted.`
      : recommendations.length > 0
        ? `${recommendations.length} measured posture item(s) deserve operator review. No changes were attempted.`
        : "No measured Windows pressure crossed the advisor thresholds. No changes were attempted.",
    snapshot,
    recommendations,
    collectionWarnings,
    prerequisites: [
      "Capture a before-change performance baseline.",
      "Create and verify a Windows restore point.",
      "Document a specific rollback plan for every selected change.",
      "Apply one externally reviewed change at a time.",
      "Capture the same after-change measurements and keep only proven improvements.",
    ],
    guardrails: [
      "Nexus does not request elevation or administrator privileges.",
      "Nexus does not modify Windows settings, registry values, services, tasks, startup entries, apps, power plans, or files.",
      "Nexus exposes aggregate counts and pressure signals only.",
      "All recommendations require external review and explicit operator action.",
    ],
  };
}

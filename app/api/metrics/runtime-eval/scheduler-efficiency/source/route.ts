import { protectedJson } from "@/lib/protectedApi";
import {
  readSchedulerEfficiencySource,
  writeSchedulerEfficiencySource,
} from "@/lib/schedulerEfficiencyArtifacts";
import type {
  SchedulerEfficiencySourcePayload,
  SchedulerEfficiencySourceSnapshot,
} from "@/lib/schedulerEfficiency";

function isSourcePayload(
  value: unknown,
): value is SchedulerEfficiencySourcePayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SchedulerEfficiencySourcePayload>;
  return Boolean(
    candidate.snapshot &&
      typeof candidate.snapshot === "object" &&
      Array.isArray(candidate.jobs) &&
      Array.isArray(candidate.ledger) &&
      Array.isArray(candidate.repairCandidates),
  );
}

export async function GET() {
  const source = readSchedulerEfficiencySource();
  return protectedJson({
    status: "ok",
    source,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isSourcePayload(body)) {
      return protectedJson(
        { ok: false, error: "Invalid scheduler efficiency payload." },
        { status: 400 },
      );
    }

    const source: SchedulerEfficiencySourceSnapshot =
      writeSchedulerEfficiencySource(body);

    return protectedJson({
      ok: true,
      syncedAt: source.syncedAt,
      activeJobs: source.snapshot.activeJobs,
      measuredRuns: source.snapshot.completedEfficiencySnapshots,
      strongestRecommendation: source.strongestRecommendation,
    });
  } catch {
    return protectedJson(
      { ok: false, error: "Could not persist scheduler efficiency posture." },
      { status: 500 },
    );
  }
}

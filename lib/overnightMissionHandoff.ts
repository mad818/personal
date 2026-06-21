import {
  getScheduledMissionReviewSummary,
  type ScheduledMissionReviewComputedStatus,
} from "@/lib/schedulerGovernance";
import type { ScheduledJob } from "@/store/useStore";

export interface OvernightMissionLine {
  jobId: string;
  jobName: string;
  status: ScheduledMissionReviewComputedStatus;
  scope: string | null;
  reentrySummary: string | null;
  targetAgent: string | null;
}

export interface OvernightMissionBrief {
  activeMissions: number;
  pendingReview: number;
  expired: number;
  cleared: number;
  lines: OvernightMissionLine[];
  morningReentry: string;
}

function isMissionJob(job: ScheduledJob): boolean {
  return job.type === "mission" && job.enabled;
}

export function buildOvernightMissionBrief(
  jobs: ScheduledJob[],
  now = Date.now(),
): OvernightMissionBrief {
  const missionJobs = jobs.filter(isMissionJob);
  const lines: OvernightMissionLine[] = missionJobs.map((job) => {
    const review = getScheduledMissionReviewSummary(job, now);
    return {
      jobId: job.id,
      jobName: job.name,
      status: review.status,
      scope: review.scope,
      reentrySummary: review.reentrySummary,
      targetAgent: review.targetAgent,
    };
  });

  const pendingReview = lines.filter(
    (line) => line.status === "pending_review",
  ).length;
  const expired = lines.filter((line) => line.status === "expired").length;
  const cleared = lines.filter((line) => line.status === "cleared").length;

  const headline =
    pendingReview > 0
      ? `${pendingReview} mission${pendingReview === 1 ? "" : "s"} need morning review before widening scope.`
      : expired > 0
        ? `${expired} overnight mission review window${expired === 1 ? " has" : "s have"} expired — re-arm with a fresh contract.`
        : missionJobs.length > 0
          ? "Overnight missions are bounded and awaiting the next scheduled run."
          : "No armed overnight missions — scheduler lane is idle.";

  const firstReentry =
    lines.find((line) => line.reentrySummary)?.reentrySummary ??
    lines.find((line) => line.scope)?.scope ??
    "Arm a mission job with scope, expiry, and a re-entry summary before stepping away.";

  return {
    activeMissions: missionJobs.length,
    pendingReview,
    expired,
    cleared,
    lines,
    morningReentry: `${headline} ${firstReentry}`.trim(),
  };
}

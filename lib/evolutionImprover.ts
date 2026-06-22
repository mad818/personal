import type { RuntimeExperimentRecommendation } from "@/lib/runtimeExperimentContracts";

export const EVOLUTION_IMPROVER_STORAGE_KEY = "nexus-evolution-improver-decisions";

export type EvolutionOperatorDecision = "keep" | "reject" | "defer";

export interface EvolutionOperatorRecord {
  experimentId: string;
  decision: EvolutionOperatorDecision;
  recommendation: RuntimeExperimentRecommendation;
  recordedAt: number;
  note?: string;
}

export interface EvolutionSearchStep {
  id: string;
  label: string;
  recommendation: RuntimeExperimentRecommendation;
  operatorDecision: EvolutionOperatorDecision | null;
  scoreDelta: number;
  summary: string;
}

const RECOMMENDATION_TO_DEFAULT: Record<
  RuntimeExperimentRecommendation,
  EvolutionOperatorDecision | null
> = {
  candidate_win: "keep",
  review: "defer",
  reject: "reject",
};

export function suggestEvolutionOperatorDecision(
  recommendation: RuntimeExperimentRecommendation,
): EvolutionOperatorDecision {
  return RECOMMENDATION_TO_DEFAULT[recommendation] ?? "defer";
}

export function buildEvolutionSearchStep(input: {
  id: string;
  title: string;
  recommendation: RuntimeExperimentRecommendation;
  scoreDelta: number;
  summary: string;
  operatorDecision?: EvolutionOperatorDecision | null;
}): EvolutionSearchStep {
  return {
    id: input.id,
    label: input.title,
    recommendation: input.recommendation,
    operatorDecision: input.operatorDecision ?? null,
    scoreDelta: input.scoreDelta,
    summary: input.summary,
  };
}

export function readEvolutionOperatorRecords(): EvolutionOperatorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EVOLUTION_IMPROVER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EvolutionOperatorRecord[];
    return Array.isArray(parsed) ? parsed.slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function writeEvolutionOperatorRecord(record: EvolutionOperatorRecord): void {
  if (typeof window === "undefined") return;
  try {
    const next = [
      record,
      ...readEvolutionOperatorRecords().filter(
        (entry) => entry.experimentId !== record.experimentId,
      ),
    ].slice(0, 40);
    window.localStorage.setItem(
      EVOLUTION_IMPROVER_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    /* silent failure */
  }
}

export function getEvolutionOperatorDecision(
  experimentId: string,
): EvolutionOperatorDecision | null {
  return (
    readEvolutionOperatorRecords().find(
      (entry) => entry.experimentId === experimentId,
    )?.decision ?? null
  );
}

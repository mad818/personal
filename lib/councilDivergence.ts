// Pure, bounded Council divergence contract. No provider or runtime imports.

export type CouncilIdeationFrameId =
  | "evidence-auditor"
  | "inversion"
  | "zero-budget";

export const COUNCIL_IDEATION_FRAMES: ReadonlyArray<{
  id: CouncilIdeationFrameId;
  label: string;
  prompt: string;
}> = [
  {
    id: "evidence-auditor",
    label: "Evidence auditor",
    prompt:
      "Generate options from verified constraints and evidence. Mark assumptions, missing proof, and the cheapest validation for each promising option.",
  },
  {
    id: "inversion",
    label: "Inversion",
    prompt:
      "Approach the request by inverting defaults and testing the opposite strategy. Keep only options that remain useful after naming their failure mode.",
  },
  {
    id: "zero-budget",
    label: "Zero-budget",
    prompt:
      "Generate options under a zero-new-spend and reuse-first constraint. Prefer reversible steps that use existing Nexus capabilities.",
  },
] as const;

export function isCappedDivergentCouncilRequest(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  return (
    /^\/diverge(?:\s|$)/.test(normalized) ||
    /^diverge\s*:/.test(normalized) ||
    /\b(?:divergent council|brainstorm wide|ideate widely)\b/.test(normalized)
  );
}

export function getCouncilIdeationFrameLabel(
  frame: CouncilIdeationFrameId,
): string {
  return (
    COUNCIL_IDEATION_FRAMES.find((entry) => entry.id === frame)?.label ?? frame
  );
}

export function applyCappedCouncilIdeationFrames<T extends object>(
  members: readonly T[],
  input: string,
): Array<T & { frame?: CouncilIdeationFrameId }> {
  const capped = members.slice(0, 3);
  if (!isCappedDivergentCouncilRequest(input)) return [...capped];
  return capped.map((member, index) => ({
    ...member,
    frame: COUNCIL_IDEATION_FRAMES[index]?.id,
  }));
}

interface CouncilDraftResult {
  agent: string;
  persona: string;
  frame?: CouncilIdeationFrameId;
  answer: string;
}

function renderCouncilDraftResult(result: CouncilDraftResult): string {
  const frame = result.frame
    ? ` · ${getCouncilIdeationFrameLabel(result.frame)}`
    : "";
  return `=== ${result.agent.toUpperCase()} [${result.persona}${frame}] ===\n${result.answer}`;
}

export function buildPinnedCouncilMergeDraft(
  results: readonly CouncilDraftResult[],
): string {
  const divergent = results.some((result) => result.frame);
  const combined = results.map(renderCouncilDraftResult).join("\n\n");
  const instruction = divergent
    ? "Act as the Council critic. Score the options for novelty, viability, evidence quality, and Nexus fit; cluster duplicates; name traps and non-obvious trade-offs; then recommend a short list with one concrete first step. Do not expose hidden reasoning."
    : "Synthesize these council responses into one final operator reply. Reconcile conflicts, preserve evidence and uncertainty, and end with one concrete next step.";
  return `@jansky: ${instruction}\n\n${combined}`;
}

export function buildPinnedCouncilAdoptDraft(
  result: CouncilDraftResult,
): string {
  return `@jansky: Refine this council answer into the final operator reply without losing its core signal. Preserve evidence and uncertainty, and end with one concrete next step:\n\n${renderCouncilDraftResult(result)}`;
}

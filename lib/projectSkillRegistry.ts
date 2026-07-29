export type ProjectSkillAgent = "jansky" | "orbit" | "nova" | "cipher" | "flux";

export interface ProjectSkillDefinition {
  id:
    | "concise-technical-output"
    | "deterministic-media-production"
    | "review-external-agent-skill"
    | "run-status-summary";
  path: `docs/ideas/skills/${string}/SKILL.md`;
  trigger: string;
  agents: readonly ProjectSkillAgent[];
}

export const PROJECT_SKILLS: readonly ProjectSkillDefinition[] = [
  {
    id: "concise-technical-output",
    path: "docs/ideas/skills/concise-technical-output/SKILL.md",
    trigger:
      "Use when the operator asks for lite, full, or ultra concise technical output.",
    agents: ["jansky", "orbit"],
  },
  {
    id: "deterministic-media-production",
    path: "docs/ideas/skills/deterministic-media-production/SKILL.md",
    trigger:
      "Use when a media task needs a reproducible beat sheet, asset ledger, timeline, or render proof.",
    agents: ["jansky", "orbit", "nova"],
  },
  {
    id: "review-external-agent-skill",
    path: "docs/ideas/skills/review-external-agent-skill/SKILL.md",
    trigger:
      "Use before adapting or installing an external agent skill, plugin, hook, or command pack.",
    agents: ["orbit", "cipher"],
  },
  {
    id: "run-status-summary",
    path: "docs/ideas/skills/run-status-summary/SKILL.md",
    trigger:
      "Use when the operator asks for compact Now, Done, Checks, Blocked, and Next status.",
    agents: ["jansky", "orbit"],
  },
] as const;

export function getProjectSkillsForAgent(
  agentId: string,
): readonly ProjectSkillDefinition[] {
  const normalized = agentId.trim().toLowerCase() as ProjectSkillAgent;
  return PROJECT_SKILLS.filter((skill) => skill.agents.includes(normalized));
}

export function buildProjectSkillRoutingBlock(agentId: string): string {
  const skills = getProjectSkillsForAgent(agentId);
  if (skills.length === 0) return "";

  const lines = skills.map(
    (skill) => `- ${skill.id}: ${skill.trigger} Read ${skill.path}.`,
  );
  return `\n[PROJECT SKILL ROUTING]\n${lines.join("\n")}\n[END PROJECT SKILL ROUTING]\n`;
}

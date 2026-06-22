import type { AgentId } from "@/components/home/office/types";

export interface PromptRecipe {
  id: string;
  label: string;
  source: string;
  agents: AgentId[];
  trigger: string;
  template: string;
}

export const PROMPT_RECIPES: readonly PromptRecipe[] = [
  {
    id: "constraint-cage",
    label: "Constraint Cage",
    source: "heyrimsha / external-links #5",
    agents: ["jansky", "orbit"],
    trigger: "Before any multi-step task (3+ steps)",
    template:
      "Constraints: [what I will NOT do] · Scope: [exact files/lines] · Done-when: [verifiable proof]",
  },
  {
    id: "failure-finder",
    label: "Failure Finder",
    source: "heyrimsha / external-links #5",
    agents: ["cipher", "orbit"],
    trigger: "After code or security recommendations",
    template:
      "What would make this wrong? What did I assume? State the top failure mode explicitly.",
  },
  {
    id: "example-anchor",
    label: "Example Anchor",
    source: "heyrimsha / external-links #5",
    agents: ["nova"],
    trigger: "Before DEEP or COMPARE abstract claims",
    template:
      "For instance: [entity] did [action] with result [outcome]. If none: say theoretical only.",
  },
] as const;

export function summarizePromptRecipes(): string {
  return PROMPT_RECIPES.map(
    (recipe) =>
      `${recipe.label} (${recipe.agents.join(", ")}) — ${recipe.trigger}`,
  ).join("; ");
}

export function recipesForAgent(agentId: AgentId): PromptRecipe[] {
  return PROMPT_RECIPES.filter((recipe) => recipe.agents.includes(agentId));
}

export function buildPromptRecipeBlock(agentId: AgentId): string {
  const recipes = recipesForAgent(agentId);
  if (recipes.length === 0) return "";
  const lines = recipes.map(
    (recipe) => `- ${recipe.label}: ${recipe.template}`,
  );
  return `\n[PROMPT RECIPES — ${agentId.toUpperCase()}]\n${lines.join("\n")}\n[END PROMPT RECIPES]\n`;
}

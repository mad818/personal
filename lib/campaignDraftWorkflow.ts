import type { WorkflowDefinition } from "@/lib/assimilation/types";

const CAMPAIGN_DRAFT_UPDATED_AT = "2026-07-26T12:00:00.000Z";

export const CAMPAIGN_DRAFT_WORKFLOW: WorkflowDefinition = {
  id: "wf-campaign-draft",
  name: "Campaign Draft Studio",
  description:
    "Turn an approved brief and cited evidence into a channel-ready draft package, with an explicit human sanction before local export.",
  theater: "watchlist",
  tags: ["campaign", "draft-only", "review"],
  version: 1,
  updatedAt: CAMPAIGN_DRAFT_UPDATED_AT,
  approvalMode: "human_gate",
  nodes: [
    {
      id: "campaign-approved-brief",
      type: "source",
      title: "Approved brief",
      detail:
        "Start from operator-owned goals, constraints, audience assumptions, and source evidence.",
      x: 0,
      y: 0,
    },
    {
      id: "campaign-evidence-audience",
      type: "agent",
      title: "NOVA evidence map",
      detail:
        "Separate verified audience insight, supported claims, open questions, and prohibited assumptions.",
      x: 1,
      y: 0,
    },
    {
      id: "campaign-channel-package",
      type: "transform",
      title: "Channel package",
      detail:
        "Draft the core narrative, channel variants, asset checklist, and measurable review criteria.",
      x: 2,
      y: 0,
    },
    {
      id: "campaign-sanction",
      type: "approval",
      title: "Operator sanction",
      detail:
        "A human reviews evidence, claims, audience fit, rights, tone, and external-action boundaries.",
      x: 3,
      y: 0,
    },
    {
      id: "campaign-draft-package",
      type: "sink",
      title: "Local draft package",
      detail:
        "Create a draft-only review artifact; publication and account actions remain separate.",
      x: 4,
      y: 0,
    },
  ],
  edges: [
    {
      id: "edge-campaign-approved-brief-campaign-evidence-audience",
      from: "campaign-approved-brief",
      to: "campaign-evidence-audience",
      label: "next",
    },
    {
      id: "edge-campaign-evidence-audience-campaign-channel-package",
      from: "campaign-evidence-audience",
      to: "campaign-channel-package",
      label: "next",
    },
    {
      id: "edge-campaign-channel-package-campaign-sanction",
      from: "campaign-channel-package",
      to: "campaign-sanction",
      label: "next",
    },
    {
      id: "edge-campaign-sanction-campaign-draft-package",
      from: "campaign-sanction",
      to: "campaign-draft-package",
      label: "next",
    },
  ],
};

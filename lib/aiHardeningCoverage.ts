export type AIHardeningCoverageStatus = "visible_evidence" | "boundary_only";

export interface AIHardeningCoverageAction {
  label: string;
  href: string;
  detail: string;
}

export interface AIHardeningCoverageItem {
  id: string;
  title: string;
  surface: string;
  status: AIHardeningCoverageStatus;
  summary: string;
  nextStrengtheningMove: string;
  actions: AIHardeningCoverageAction[];
}

export const AI_HARDENING_STAGES = [
  {
    label: "Observe",
    detail:
      "Start from the AI runtime map and identify whether the risky surface already exposes observed / inferred / verify-next posture or only inherits the shared boundary silently.",
  },
  {
    label: "Probe",
    detail:
      "Open Impact on the prompt or route file so local callers, adjacent helpers, and likely drift points are visible before editing.",
  },
  {
    label: "Compare",
    detail:
      "Open the exact surface that renders the answer and compare confidence cues against the real evidence the route actually has.",
  },
  {
    label: "Harden",
    detail:
      "Prefer one shared evidence contract or truth-boundary helper over per-panel prose rules that drift apart over time.",
  },
  {
    label: "Verify",
    detail:
      "Keep repo verification and live route checks visible so a truthful answer surface is also a working one.",
  },
] as const;

export const AI_HARDENING_COVERAGE: AIHardeningCoverageItem[] = [
  {
    id: "command-ai-briefing",
    title: "COMMAND · AI Briefing",
    surface: "/command",
    status: "visible_evidence",
    summary:
      "Market/news narrative output already exposes observed facts, inferred synthesis, and verify-next posture through the shared evidence renderer.",
    nextStrengtheningMove:
      "Keep the panel grounded in retained-data posture and expand comparison discipline before widening the prompt.",
    actions: [
      {
        label: "Open COMMAND",
        href: "/command",
        detail: "Inspect the live AI Briefing surface directly.",
      },
      {
        label: "Open runtime focus",
        href: "/command?focus=runtime-efficiency",
        detail: "Keep runtime and prompt-quality posture visible while hardening AI outputs.",
      },
      {
        label: "Open impact",
        href: "/resources?view=impact&file=components/command/AIBriefing.tsx",
        detail: "Trace adjacent helpers and likely touched callers before editing.",
      },
    ],
  },
  {
    id: "intel-strategy-frameworks",
    title: "INTEL · Strategy Frameworks",
    surface: "/intel",
    status: "visible_evidence",
    summary:
      "Strategy synthesis already separates observed inputs from inferred recommendations, which keeps framework output more honest under uncertain evidence.",
    nextStrengtheningMove:
      "Preserve structured evidence posture if more frameworks or summarizers are added around this lane.",
    actions: [
      {
        label: "Open INTEL",
        href: "/intel",
        detail: "Inspect the live strategy synthesis route.",
      },
      {
        label: "Open impact",
        href: "/resources?view=impact&file=components/intel/StrategyFrameworks.tsx",
        detail: "Inspect the local blast radius around strategy synthesis.",
      },
    ],
  },
  {
    id: "alpha-buybot",
    title: "ALPHA · BuyBot",
    surface: "/alpha",
    status: "visible_evidence",
    summary:
      "Trade rationales now render observed market inputs, inferred interpretation, verify-next checks, and compact actions instead of a flat confidence block.",
    nextStrengtheningMove:
      "Keep trade UI compact and make sure future scan variants stay on the same evidence contract.",
    actions: [
      {
        label: "Open ALPHA",
        href: "/alpha",
        detail: "Inspect live trade rationale rendering and saved-signal history.",
      },
      {
        label: "Open impact",
        href: "/resources?view=impact&file=components/alpha/BuyBot.tsx",
        detail: "Inspect the local blast radius around trade-rationale logic.",
      },
    ],
  },
  {
    id: "hq-meta",
    title: "HQ · /meta proposals",
    surface: "/hq",
    status: "visible_evidence",
    summary:
      "HQ meta proposals now use structured observed / inferred / verify-next posture instead of opaque improvement prose.",
    nextStrengtheningMove:
      "Keep future HQ meta helpers on the same JSON contract instead of branching into panel-specific parsing.",
    actions: [
      {
        label: "Open HQ chronicle",
        href: "/hq?focus=hq-chronicle",
        detail: "Review the live HQ shell where meta output is consumed.",
      },
      {
        label: "Open impact",
        href: "/resources?view=impact&file=components/home/office/officeCommandCenterMeta.ts",
        detail: "Inspect the local blast radius around HQ meta-analysis.",
      },
    ],
  },
  {
    id: "hq-chronicle-replies",
    title: "HQ · Chronicle replies",
    surface: "/hq",
    status: "visible_evidence",
    summary:
      "The main HQ chronicle now supports a compact visible evidence footer, so evidence-sensitive replies can separate observed facts, inferred reasoning, and verify-next checks without bloating casual chat.",
    nextStrengtheningMove:
      "Keep the footer compact and deterministic, and expand the same inline posture only to higher-risk synthesis lanes that still collapse evidence and recommendation together.",
    actions: [
      {
        label: "Open HQ chronicle",
        href: "/hq?focus=hq-chronicle",
        detail: "Inspect the main answer surface with visible evidence posture in place.",
      },
      {
        label: "Open hallucination playbook",
        href: "/resources?view=playbooks&playbook=hallucination-hardening",
        detail: "Run the shared workflow before widening visible evidence posture into HQ replies.",
      },
      {
        label: "Open impact",
        href: "/resources?view=impact&file=components/home/office/HQTerminalSection.tsx",
        detail: "Inspect the local blast radius around HQ chronicle rendering before changing it.",
      },
    ],
  },
];

export function getAIHardeningCoverageStatusLabel(
  status: AIHardeningCoverageStatus,
) {
  return status === "visible_evidence" ? "Visible evidence posture" : "Boundary only";
}

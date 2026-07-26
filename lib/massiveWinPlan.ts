export type MassiveWinPlanStatus = "active" | "planned" | "ready";

export type MassiveWinPhaseStatus = "done" | "current" | "next";

export interface MassiveWinPlanPhase {
  label: string;
  status: MassiveWinPhaseStatus;
  detail: string;
}

export interface MassiveWinPlan {
  id: string;
  title: string;
  status: MassiveWinPlanStatus;
  summary: string;
  routeTargets: string[];
  designPosture: string;
  verification: string[];
  nextAction: {
    label: string;
    href: string;
    note: string;
  };
  phases: MassiveWinPlanPhase[];
}

export const MASSIVE_WIN_PLANS: MassiveWinPlan[] = [
  {
    id: "post-uxa3-release-confidence",
    title: "Post-UXA3 release confidence",
    status: "ready",
    summary:
      "Lock in the compact Homefront shell by keeping authenticated first-viewport proof, route health, and release gates close to the operator.",
    routeTargets: ["/hq", "/command", "/security", "/vault", "/resources"],
    designPosture:
      "Summary-first mission strips, preview rails, and first-workplane visibility stay the default for every route touched next.",
    verification: [
      "npm run auth:e2e",
      "npm run route:e2e",
      "npm run tabs:e2e",
      "npm run verify",
    ],
    nextAction: {
      label: "Review UXA3 measurements",
      href: "/resources?view=impact&file=docs/metrics/uxa3-first-viewport-review.md",
      note: "Use the accepted viewport proof before widening another route.",
    },
    phases: [
      {
        label: "Accepted shell density",
        status: "done",
        detail:
          "COMMAND, SECURITY, HQ, VAULT, and RESOURCES have measured first-viewport coverage.",
      },
      {
        label: "Hold the line",
        status: "current",
        detail:
          "Keep new design work compact unless a measurement proves the route needs more room.",
      },
      {
        label: "Release rehearsal",
        status: "next",
        detail:
          "Move from route proof into deployment, rollback, and desktop trust evidence.",
      },
    ],
  },
  {
    id: "cinematic-ia-standardization",
    title: "Cinematic IA standardization",
    status: "ready",
    summary:
      "The protected shell now carries a typed cinematic IA contract so GA surfaces share root chrome, route stages, lead/support/continuity zones, and standardized state primitives.",
    routeTargets: [
      "/hq",
      "/command",
      "/intel",
      "/alpha",
      "/cyber",
      "/recon",
      "/vault",
      "/resources",
    ],
    designPosture:
      "Keep the Homefront tone: operational warmth, strong typography rhythm, compact controls, and motion that explains state instead of decorating it.",
    verification: [
      "npm run route:e2e",
      "npm run tabs:e2e",
      "npm run type-check",
    ],
    nextAction: {
      label: "Open surface guidance",
      href: "/resources?view=surfaces",
      note: "Use surface ownership before touching another route stack.",
    },
    phases: [
      {
        label: "Inventory route chrome",
        status: "done",
        detail:
          "HQ plus all GA tabs now resolve an explicit cinematic surface, posture, and hierarchy.",
      },
      {
        label: "Standardize primitives",
        status: "done",
        detail:
          "Root chrome, shell stages, lead/support/continuity zones, empty states, and loading states share one contract.",
      },
      {
        label: "Use as guardrail",
        status: "current",
        detail:
          "Future route work should extend the shared contract instead of adding route-local chrome.",
      },
    ],
  },
  {
    id: "desktop-trust-release-chain",
    title: "Desktop trust release chain",
    status: "ready",
    summary:
      "Turn release engineering into visible evidence: diagnostics, isolation proof, checksums, signing status, and rollback posture.",
    routeTargets: ["/security", "/resources", "/settings"],
    designPosture:
      "Trust surfaces should read like calm evidence panels, not alarm dashboards: clear status, bounded risk, and one next safe action.",
    verification: [
      "npm run verify",
      "npm run release:smoke",
      "desktop isolation proof",
      "checksum record",
    ],
    nextAction: {
      label: "Open security posture",
      href: "/security",
      note: "Use the existing trust rail before adding any new release surface.",
    },
    phases: [
      {
        label: "Collect evidence",
        status: "current",
        detail:
          "Gather build, route, runtime, and security diagnostics into one release record.",
      },
      {
        label: "Prove isolation",
        status: "next",
        detail:
          "Confirm desktop lockdown and no-outbound expectations under the secure runtime.",
      },
      {
        label: "Publish gate",
        status: "next",
        detail:
          "Require the same evidence before release or push claims are marked complete.",
      },
    ],
  },
];

export const MASSIVE_WIN_SUMMARY = {
  activePlans: MASSIVE_WIN_PLANS.filter((plan) => plan.status === "active")
    .length,
  plannedPlans: MASSIVE_WIN_PLANS.filter((plan) => plan.status === "planned")
    .length,
  routeTargets: new Set(MASSIVE_WIN_PLANS.flatMap((plan) => plan.routeTargets))
    .size,
  verificationGates: new Set(
    MASSIVE_WIN_PLANS.flatMap((plan) => plan.verification),
  ).size,
};

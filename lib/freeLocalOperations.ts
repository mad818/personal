import type {
  FreeLocalReadinessSnapshot,
  FreeLocalReadinessStatus,
} from "@/lib/freeLocalReadiness";
import type {
  RepoSyncHealthReport,
  RepoSyncRecoveryStep,
} from "./repoSyncRecovery";
export { buildRepoSyncHealthReport } from "./repoSyncRecovery";
export type { RepoSyncHealthReport, RepoSyncRecoveryStep };

export type OperationStepStatus = "done" | "ready" | "manual" | "blocked";

export interface PhoneAcceptanceStep {
  id: string;
  label: string;
  status: OperationStepStatus;
  detail: string;
  href?: string;
  command?: string;
  proof: string;
}

export interface PhoneAcceptanceChecklist {
  title: string;
  summary: string;
  overallStatus: FreeLocalReadinessStatus;
  steps: PhoneAcceptanceStep[];
}

export interface LocalAiProofSnapshot {
  title: string;
  summary: string;
  checks: PhoneAcceptanceStep[];
}

export interface AssistantTurnProof {
  requiredReceiptItems: string[];
  localFastPathPrompt: string;
  localModelPrompt: string;
  expectedProof: string;
}

export interface FreeLocalMajorUpdate {
  id: string;
  label: string;
  status: "active" | "next" | "blocked" | "deferred";
  detail: string;
}

export const FREE_LOCAL_ASSISTANT_TURN_PROOF: AssistantTurnProof = {
  requiredReceiptItems: [
    "Runtime",
    "Model",
    "Network",
    "Paid APIs",
    "Files",
  ],
  localFastPathPrompt: "ping",
  localModelPrompt:
    "Are you using local Ollama, what model, and are paid APIs blocked?",
  expectedProof:
    "The receipt should show Local fast path or Ollama, the resolved model, paid APIs blocked, and No file changes.",
};

export const FREE_LOCAL_MAJOR_UPDATES: FreeLocalMajorUpdate[] = [
  {
    id: "phone-acceptance",
    label: "Phone acceptance command flow",
    status: "active",
    detail: "Prove desktop-on LAN access from phone through HQ and a local AI receipt.",
  },
  {
    id: "local-ai-hardening",
    label: "Local AI operations hardening",
    status: "active",
    detail: "Keep Ollama, model, network, paid-API, and file-change proof visible.",
  },
  {
    id: "repo-sync-recovery",
    label: "Git + repo sync recovery",
    status: "blocked",
    detail: "Manual .git ACL recovery is required before pull, fetch, stage, commit, or push work.",
  },
  {
    id: "mobile-hq-usability",
    label: "Mobile HQ usability",
    status: "next",
    detail: "Keep input, send actions, readiness, and receipts usable on phone widths.",
  },
  {
    id: "assistant-practical-work",
    label: "Assistant practical work mode",
    status: "next",
    detail: "Make every turn explain answer mode, workspace, tool posture, recovery, and file changes.",
  },
  {
    id: "local-knowledge",
    label: "Local knowledge + source intelligence",
    status: "next",
    detail: "File useful source patterns into RESOURCES and VAULT without unsafe automation.",
  },
  {
    id: "workplane-compression",
    label: "Route workplane compression round 2",
    status: "next",
    detail: "Compress core routes around purpose, proof, and next action.",
  },
  {
    id: "free-release-readiness",
    label: "Free release readiness prep",
    status: "deferred",
    detail: "Keep deployment optional until local, phone, and repo-sync operations are stable.",
  },
];

export function buildPhoneAcceptanceBrief(
  snapshot: FreeLocalReadinessSnapshot | null,
) {
  const phoneHome =
    snapshot?.phoneLan.preferredLanUrl ??
    "Run npm run phone:lan:start, then use the printed phone URL.";
  const directHq =
    snapshot?.phoneLan.preferredHqLanUrl ??
    "Run npm run phone:lan:start, then use the printed /hq?focus=hq-chronicle URL.";

  return [
    "Homefront phone acceptance",
    `Phone home: ${phoneHome}`,
    `Direct HQ: ${directHq}`,
    "Keep the desktop runtime and Ollama running.",
    snapshot?.phoneLan.phoneTokenConfigured
      ? "Log in on the phone with NEXUS_PHONE_TOKEN (or NEXUS_TOKEN); never paste token values into chat, docs, or screenshots."
      : "Log in with NEXUS_TOKEN on the phone; never paste token values into chat, docs, or screenshots.",
    `HQ fast-path prompt: ${FREE_LOCAL_ASSISTANT_TURN_PROOF.localFastPathPrompt}`,
    `Local AI prompt: ${FREE_LOCAL_ASSISTANT_TURN_PROOF.localModelPrompt}`,
    `Expected receipt: ${FREE_LOCAL_ASSISTANT_TURN_PROOF.expectedProof}`,
    "Install the PWA from the phone browser home-screen flow.",
    "Record evidence with placeholders only, for example http://<LAN-IP>:3100.",
  ].join("\n");
}

function stepStatusTone(status: OperationStepStatus): FreeLocalReadinessStatus {
  if (status === "done") return "ready";
  if (status === "blocked") return "blocked";
  return "warning";
}

function allCriticalReady(steps: PhoneAcceptanceStep[]) {
  return steps.every((step) => step.status !== "blocked");
}

export function buildPhoneAcceptanceChecklist(
  snapshot: FreeLocalReadinessSnapshot | null,
): PhoneAcceptanceChecklist {
  const phoneReady = Boolean(
    snapshot?.phoneLan.enabled && snapshot.phoneLan.preferredHqLanUrl,
  );
  const sessionReady = Boolean(snapshot?.session.authenticated);
  const localAiReady = Boolean(
    snapshot?.ollama.reachable && snapshot.resolvedModel.resolvedModel,
  );

  const steps: PhoneAcceptanceStep[] = [
    {
      id: "start-lan",
      label: "Start LAN mode",
      status: phoneReady ? "done" : "ready",
      detail: phoneReady
        ? "LAN mode is reporting a reachable phone HQ URL."
        : "Run the explicit LAN launcher from the desktop before using the phone.",
      command: phoneReady ? undefined : "npm run phone:lan:start",
      proof: phoneReady ? "LAN enabled" : "Printed phone URL appears in terminal.",
    },
    {
      id: "open-phone-hq",
      label: "Open HQ on phone",
      status: phoneReady ? "ready" : "blocked",
      detail: phoneReady
        ? "Open the direct HQ URL on the phone while the desktop stays on."
        : "No direct HQ LAN URL is available yet.",
      href: snapshot?.phoneLan.preferredHqLanUrl ?? undefined,
      proof: "Phone loads /hq?focus=hq-chronicle.",
    },
    {
      id: "login-token",
      label: "Log in with token",
      status: sessionReady ? "done" : "manual",
      detail: snapshot?.phoneLan.tokenRequired
        ? snapshot.phoneLan.phoneTokenConfigured
          ? "Enter NEXUS_PHONE_TOKEN on the phone, or NEXUS_TOKEN for full desktop privileges."
          : "Enter NEXUS_TOKEN on the phone before protected routes open."
        : "The current local runtime is not requiring a token.",
      proof: "HQ opens without returning to the access gate.",
    },
    {
      id: "ping",
      label: "Send ping",
      status: "manual",
      detail: "Send `ping` in HQ chat to prove the browser-local fast path.",
      proof: "Receipt shows Local fast path and No file changes.",
    },
    {
      id: "check-local-ai",
      label: "Check local AI",
      status: localAiReady ? "ready" : "blocked",
      detail: localAiReady
        ? "Use the Check local AI chip or send the local model prompt."
        : "Ollama or the resolved local model is not ready yet.",
      proof: FREE_LOCAL_ASSISTANT_TURN_PROOF.expectedProof,
    },
    {
      id: "install-pwa",
      label: "Install PWA",
      status: snapshot?.phoneLan.pwaReady ? "manual" : "blocked",
      detail: snapshot?.phoneLan.pwaReady
        ? "Use the phone browser home-screen install flow after acceptance passes."
        : "PWA manifest is not reporting ready for phone install.",
      proof: "Homefront launches from the phone home screen.",
    },
  ];

  return {
    title: "Phone acceptance",
    summary: phoneReady
      ? "Phone HQ is staged. Finish the manual chat and PWA proof on the device."
      : "Start LAN mode from the desktop, then use this checklist on the phone.",
    overallStatus: allCriticalReady(steps.map((step) => ({
      ...step,
      status: step.id === "install-pwa" ? "manual" : step.status,
    })))
      ? "warning"
      : "blocked",
    steps,
  };
}

export function buildLocalAiProofSnapshot(
  snapshot: FreeLocalReadinessSnapshot | null,
): LocalAiProofSnapshot {
  const checks: PhoneAcceptanceStep[] = [
    {
      id: "ollama",
      label: "Ollama reachable",
      status: snapshot?.ollama.reachable ? "done" : "blocked",
      detail: snapshot?.ollama.detail ?? "Readiness has not loaded yet.",
      proof: "Ollama status reads ready.",
    },
    {
      id: "model",
      label: "Model resolved",
      status: snapshot?.resolvedModel.resolvedModel ? "done" : "blocked",
      detail:
        snapshot?.resolvedModel.value ??
        "The resolver has not reported a local model yet.",
      proof: "Receipt and readiness show the same resolved local model.",
    },
    {
      id: "network",
      label: "Network isolated",
      status: snapshot?.networkMode.mode === "isolated" ? "done" : "manual",
      detail: snapshot?.networkMode.detail ?? "Network mode not loaded.",
      proof: "Readiness shows isolated or another intentional local mode.",
    },
    {
      id: "paid-apis",
      label: "Paid APIs blocked",
      status: snapshot?.paidApisAllowed.allowed === false ? "done" : "blocked",
      detail: snapshot?.paidApisAllowed.detail ?? "Paid API posture not loaded.",
      proof: "Readiness and receipt show paid APIs blocked.",
    },
    {
      id: "files",
      label: "No file changes by chat",
      status: "manual",
      detail:
        "Assistant receipts should say No file changes unless a review-gated tool proves otherwise.",
      proof: "Turn receipt says No file changes.",
    },
  ];

  return {
    title: "Local AI proof",
    summary:
      "Use this as the acceptance target for offline trust: local model, free posture, and review-first file behavior.",
    checks,
  };
}

export function getStepTone(status: OperationStepStatus) {
  return stepStatusTone(status);
}

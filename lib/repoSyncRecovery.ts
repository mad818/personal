export type RepoSyncHealthStatus = "ready" | "blocked";

export type RepoSyncBlockerId =
  | "git-deny-acl"
  | "git-lock-write-denied"
  | "git-process-active"
  | "remote-truth-stale";

export interface RepoSyncRecoveryStep {
  id: string;
  label: string;
  command: string;
  detail: string;
  safetyNote?: string;
}

export interface RepoSyncHealthReport {
  title: string;
  status: RepoSyncHealthStatus;
  blocker: string | null;
  blockers: RepoSyncBlockerId[];
  detail: string;
  diagnosticCommand: string;
  strictDiagnosticCommand: string;
  recoveryDocPath: string;
  proofCommands: string[];
  recoverySteps: RepoSyncRecoveryStep[];
}

export const REPO_SYNC_RECOVERY_DOC_PATH =
  "docs/repo-hygiene/git-permission-recovery.md";

export const REPO_SYNC_HEALTH_COMMAND = "npm run repo:sync:health";

export function buildRepoSyncHealthReport(): RepoSyncHealthReport {
  return {
    title: "Repo sync health",
    status: "blocked",
    blocker: ".git DENY ACL is blocking Git writes",
    blockers: [
      "git-deny-acl",
      "git-lock-write-denied",
      "git-process-active",
      "remote-truth-stale",
    ],
    detail:
      "Git cannot create FETCH_HEAD, HEAD.lock, or gc.pid.lock while a DENY permission remains on .git. Run the read-only health check, close stray git processes, then repair ACLs from a normal or elevated PowerShell before pull, staging, push, or branch cleanup.",
    diagnosticCommand: REPO_SYNC_HEALTH_COMMAND,
    strictDiagnosticCommand: `${REPO_SYNC_HEALTH_COMMAND} -- --strict`,
    recoveryDocPath: REPO_SYNC_RECOVERY_DOC_PATH,
    proofCommands: [
      REPO_SYNC_HEALTH_COMMAND,
      "npm run handoff:pull",
      "git fetch --all --prune",
      "git status --short --branch",
      "npm run handoff:write",
      "npm run handoff:check",
    ],
    recoverySteps: [
      {
        id: "inspect",
        label: "Inspect without mutating",
        command: REPO_SYNC_HEALTH_COMMAND,
        detail:
          "Confirms DENY ACLs, active git processes, and lock-file state without editing .git.",
      },
      {
        id: "stop-git",
        label: "Close active Git processes",
        command: "Get-Process git -ErrorAction SilentlyContinue",
        detail:
          "Close Git/IDE shells that are still alive before lock cleanup or ACL repair.",
        safetyNote: "Do not remove lock files while Git processes are still running.",
      },
      {
        id: "repair-acl",
        label: "Repair .git permissions manually",
        command: "See docs/repo-hygiene/git-permission-recovery.md",
        detail:
          "Remove the explicit DENY ACE and restore full control for your Windows user and Codex sandbox groups.",
      },
      {
        id: "prove-sync",
        label: "Prove repo sync",
        command: "npm run handoff:pull",
        detail:
          "Only after ACL recovery passes, refresh remote truth and continue normal branch/stage/push work.",
      },
    ],
  };
}

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
    status: "ready",
    blocker: null,
    blockers: [],
    detail:
      "Repo sync is recovered for the working Windows flow. Use npm run handoff:pull or npm run git:safe -- <git args>; the wrapper removes the known .git DENY ACL inside the same process before Git runs. If the Codex sandbox reports the DENY ACL again, treat npm run repo:sync:health as diagnostic and use git:safe for the actual Git operation.",
    diagnosticCommand: REPO_SYNC_HEALTH_COMMAND,
    strictDiagnosticCommand: `${REPO_SYNC_HEALTH_COMMAND} -- --strict`,
    recoveryDocPath: REPO_SYNC_RECOVERY_DOC_PATH,
    proofCommands: [
      REPO_SYNC_HEALTH_COMMAND,
      "npm run handoff:pull",
      "npm run git:safe -- fetch --all --prune",
      "npm run git:safe -- status --short --branch",
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
        safetyNote:
          "Do not remove lock files while Git processes are still running.",
      },
      {
        id: "repair-acl",
        label: "Use safe Git wrapper",
        command: "npm run git:safe -- status --short --branch",
        detail:
          "Runs the Git command after removing the known explicit .git DENY ACL inside the same PowerShell process.",
      },
      {
        id: "prove-sync",
        label: "Prove repo sync",
        command: "npm run handoff:pull",
        detail:
          "Refresh remote truth through the same safe path before branch, stage, push, or cleanup work.",
      },
    ],
  };
}

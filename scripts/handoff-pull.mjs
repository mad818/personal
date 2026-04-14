#!/usr/bin/env node
/* eslint-disable no-console */

import { existsSync } from "fs";
import { spawn } from "child_process";

const SCHANNEL_FAILURE_FRAGMENT = "schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS";
const DIVERGED_BRANCH_FRAGMENT = "Not possible to fast-forward, aborting.";

function resolveGitCommand() {
  if (process.platform !== "win32") {
    return "git";
  }

  const preferredGitPath = "E:\\Git\\cmd\\git.exe";
  if (existsSync(preferredGitPath)) {
    return preferredGitPath;
  }

  return "git";
}

function runGit(args, extraArgs = [], { echo = true } = {}) {
  return new Promise((resolve, reject) => {
    const commandArgs = [...extraArgs, ...args];
    const child = spawn(resolveGitCommand(), commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (echo) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (echo) {
        process.stderr.write(text);
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function hadSchannelCredentialFailure(output) {
  return output.includes(SCHANNEL_FAILURE_FRAGMENT);
}

function hadDivergedBranchFailure(output) {
  return output.includes(DIVERGED_BRANCH_FRAGMENT);
}

async function runWithOpenSslRetry(args, options = {}, operationLabel = "git command") {
  const primary = await runGit(args, [], options);
  if (primary.code === 0) {
    return primary;
  }

  const combined = `${primary.stdout}\n${primary.stderr}`;
  const shouldRetryWithOpenSsl =
    process.platform === "win32" && hadSchannelCredentialFailure(combined);

  if (!shouldRetryWithOpenSsl) {
    return primary;
  }

  console.warn(
    `handoff:pull: detected Windows schannel credential failure, retrying ${operationLabel} with OpenSSL backend.`,
  );

  return runGit(args, ["-c", "http.sslbackend=openssl"], options);
}

async function readGitOutput(args) {
  const result = await runGit(args, [], { echo: false });
  if (result.code !== 0) {
    return null;
  }

  return `${result.stdout}\n${result.stderr}`.trim();
}

async function fetchOriginMainForContextSync() {
  return runWithOpenSslRetry(["fetch", "origin", "main"], {}, "git fetch");
}

async function getDivergenceSummary() {
  const raw = await readGitOutput(["rev-list", "--left-right", "--count", "HEAD...origin/main"]);
  if (!raw) {
    return null;
  }

  const [aheadText, behindText] = raw.split(/\s+/);
  const ahead = Number.parseInt(aheadText ?? "", 10);
  const behind = Number.parseInt(behindText ?? "", 10);

  if (Number.isNaN(ahead) || Number.isNaN(behind)) {
    return null;
  }

  return { ahead, behind };
}

async function tryBranchSafeContextSync() {
  const fetch = await fetchOriginMainForContextSync();
  if (fetch.code !== 0) {
    return fetch.code ?? 1;
  }

  const divergence = await getDivergenceSummary();
  const divergenceText = divergence
    ? ` ahead ${divergence.ahead}, behind ${divergence.behind} versus origin/main.`
    : "";

  console.warn(
    "handoff:pull: local history has diverged, so the session sync fell back to a safe origin/main fetch instead of rewriting your branch.",
  );
  console.warn(
    `handoff:pull: remote refs are now refreshed and local context files remain untouched.${divergenceText}`,
  );
  console.warn(
    "handoff:pull: continue from the local context spine and reconcile this working branch intentionally before staging or pushing it.",
  );
  return 0;
}

async function main() {
  const pull = await runWithOpenSslRetry(["pull", "--ff-only"], {}, "git pull");
  if (pull.code === 0) {
    return;
  }

  const combined = `${pull.stdout}\n${pull.stderr}`;
  if (hadDivergedBranchFailure(combined)) {
    process.exit(await tryBranchSafeContextSync());
  }

  process.exit(pull.code ?? 1);
}

main().catch((error) => {
  console.error(
    `handoff:pull: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});

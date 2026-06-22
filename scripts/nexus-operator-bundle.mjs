#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "node:child_process";

const root = process.cwd();
const skipLiveGate = process.argv.includes("--skip-live-gate");
const skipDesktopProof = process.argv.includes("--skip-desktop-proof");

function run(label, command, args = []) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: command === "npm",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`x nexus-operator-bundle: ${label} failed (exit ${result.status ?? "unknown"})`);
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("Nexus operator bundle — automatable closure lane");

  run("Completion status", "npm", ["run", "nexus:completion:status"]);
  run("Dependabot verify", "npm", ["run", "dependabot:github:closure:verify"]);
  run("Desktop signing preflight", "npm", ["run", "desktop:signing:preflight"]);
  run("CP2 web local rehearsal", "npm", ["run", "cp2:web:release:local-rehearsal"]);
  run("CP2 staged rehearsal", "npm", ["run", "cp2:staged:release:rehearsal"]);

  if (!skipLiveGate) {
    run("CP2 operational live gate", "npm", ["run", "cp2:operational:live-gate"]);
  } else {
    console.log("\n⊘ Skipping CP2 operational live gate (--skip-live-gate)");
  }

  if (!skipDesktopProof) {
    run("Phone desktop proof", "npm", ["run", "phone:acceptance:desktop-proof"]);
  } else {
    console.log("\n⊘ Skipping phone desktop proof (--skip-desktop-proof)");
  }

  run("Program completion gate", "npm", ["run", "assimilation:wave14:check"]);

  console.log("\nok nexus-operator-bundle");
}

main();

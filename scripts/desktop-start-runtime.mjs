#!/usr/bin/env node
import { spawn } from "child_process";

const child = spawn(process.execPath, ["scripts/start-runtime.mjs"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

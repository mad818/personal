#!/usr/bin/env node
import { existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";

const root = process.cwd();
const standaloneServer = join(root, ".next", "standalone", "server.js");

if (!existsSync(standaloneServer)) {
  console.error(
    "[desktop-runtime] Missing .next/standalone/server.js. Run `npm run build` first.",
  );
  process.exit(1);
}

const env = {
  ...process.env,
  HOSTNAME: process.env.HOSTNAME ?? "127.0.0.1",
  PORT: process.env.PORT ?? "3000",
};

console.log(
  `[desktop-runtime] starting standalone server on http://${env.HOSTNAME}:${env.PORT}`,
);

const child = spawn("node", [standaloneServer], {
  cwd: join(root, ".next", "standalone"),
  env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));


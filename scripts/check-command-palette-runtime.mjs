#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import {
  NEXUS_COMMANDS,
  searchNexusCommands,
  validateNexusCommandRegistry,
} from "../lib/commandPalette.ts";

assert.equal(NEXUS_COMMANDS.length, 17);
assert.deepEqual(validateNexusCommandRegistry(), []);

const defaults = searchNexusCommands("", 3);
assert.deepEqual(
  defaults.map((result) => result.command.id),
  ["open-hq", "open-command", "open-intel-world"],
);

assert.equal(
  searchNexusCommands("skill library")[0]?.command.id,
  "open-skills-library",
);
assert.equal(
  searchNexusCommands("bastion")[0]?.command.id,
  "open-cyber-triage",
);
assert.equal(
  searchNexusCommands("security doctrine")[0]?.command.id,
  "open-security-doctrine",
);
assert.equal(
  searchNexusCommands("blksite")[0]?.command.id,
  "open-skills-blacksite",
);
assert.equal(
  searchNexusCommands("market signal")[0]?.command.id,
  "open-alpha-signals",
);

const bounded = searchNexusCommands("", 100);
assert.equal(bounded.length, 9);
assert.equal(searchNexusCommands("", 0).length, 9);
assert.equal(searchNexusCommands("zzqqyy").length, 0);

const repeated = searchNexusCommands("open skills");
assert.deepEqual(searchNexusCommands("open skills"), repeated);
assert.deepEqual(
  [...repeated].sort(
    (left, right) =>
      right.score - left.score ||
      left.command.priority - right.command.priority ||
      left.command.label.localeCompare(right.command.label),
  ),
  repeated,
);

const duplicate = {
  ...NEXUS_COMMANDS[0],
  id: NEXUS_COMMANDS[1].id,
  href: NEXUS_COMMANDS[1].href,
};
const unsafe = {
  ...NEXUS_COMMANDS[0],
  id: "unsafe",
  href: "https://example.com",
};
assert.deepEqual(validateNexusCommandRegistry([NEXUS_COMMANDS[1], duplicate]), [
  `duplicate id: ${NEXUS_COMMANDS[1].id}`,
  `duplicate href: ${NEXUS_COMMANDS[1].href}`,
]);
assert.deepEqual(validateNexusCommandRegistry([unsafe]), [
  "unsafe href: unsafe",
]);

for (const command of NEXUS_COMMANDS) {
  assert.match(command.href, /^\//);
  assert.equal(command.href.includes("://"), false);
  assert.equal(command.href.includes("javascript:"), false);
  assert.equal(Object.hasOwn(command, "callback"), false);
  assert.equal(Object.hasOwn(command, "command"), false);
}

console.log(
  "ok command-palette-runtime (17 fixed routes, deterministic fuzzy ranking, bounded results, no dynamic execution)",
);

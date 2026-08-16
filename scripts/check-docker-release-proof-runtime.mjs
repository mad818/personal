#!/usr/bin/env node
/* eslint-disable no-console */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_RELEASE_TAG,
  cleanupCommandPassed,
  classifyImmutableReleaseContract,
  classifyDockerProof,
  isContainedPath,
  isContentAddressedImageId,
  isLocalDockerEndpoint,
  isNonRootUser,
  sanitizeArtifact,
} from "./docker-release-proof.mjs";
import {
  ACTIVE_RELEASE_CANDIDATE_TAG,
  classifyReleaseCandidate,
  resolveLocalReleaseCandidate,
} from "./release-candidate.mjs";

const tagObject = "b".repeat(40);
const peeledCommit = "c".repeat(40);
const changedTagObject = "d".repeat(40);

assert.equal(EXPECTED_RELEASE_TAG, ACTIVE_RELEASE_CANDIDATE_TAG);

const exact = classifyReleaseCandidate({
  candidateTag: ACTIVE_RELEASE_CANDIDATE_TAG,
  tagObject,
  peeledCommit,
  objectType: "tag",
});
assert.equal(exact.state, "exact");
assert.equal(exact.ready, true);
assert.equal(exact.blocker, null);
assert.equal(exact.tagObject, tagObject);
assert.equal(exact.peeledCommit, peeledCommit);
assert.equal(Object.isFrozen(exact), true);

const missing = classifyReleaseCandidate({
  candidateTag: ACTIVE_RELEASE_CANDIDATE_TAG,
});
assert.equal(missing.state, "missing");
assert.equal(missing.ready, false);
assert.match(missing.blocker, /no HEAD, environment, or artifact fallback/i);

const wrongCandidate = classifyReleaseCandidate({
  candidateTag: "v1.0.0-rc.999",
  tagObject,
  peeledCommit,
  objectType: "tag",
});
assert.equal(wrongCandidate.state, "wrong-candidate");
assert.equal(wrongCandidate.ready, false);
assert.match(wrongCandidate.blocker, /only active candidate/i);

const lightweightTag = classifyReleaseCandidate({
  candidateTag: ACTIVE_RELEASE_CANDIDATE_TAG,
  tagObject: peeledCommit,
  peeledCommit,
  objectType: "commit",
});
assert.equal(lightweightTag.state, "not-annotated");
assert.equal(lightweightTag.ready, false);

const validGitCalls = [];
const resolved = resolveLocalReleaseCandidate({
  cwd: "C:\\fixture\\repo",
  runGit(args) {
    validGitCalls.push(args);
    if (
      args[0] === "rev-parse" &&
      args[1] === "--verify" &&
      args[2] === `refs/tags/${ACTIVE_RELEASE_CANDIDATE_TAG}`
    ) {
      return { status: 0, stdout: `${tagObject}\n` };
    }
    if (args[0] === "cat-file" && args[1] === "-t") {
      return { status: 0, stdout: "tag\n" };
    }
    if (
      args[0] === "rev-parse" &&
      args[1] === "--verify" &&
      args[2] === `${tagObject}^{commit}`
    ) {
      return { status: 0, stdout: `${peeledCommit}\n` };
    }
    return { status: 1, stdout: "" };
  },
});
assert.equal(resolved.state, "exact");
assert.equal(resolved.ready, true);
assert.equal(resolved.tagObject, tagObject);
assert.equal(resolved.peeledCommit, peeledCommit);
assert.equal(Object.isFrozen(resolved), true);
assert.deepEqual(validGitCalls, [
  ["rev-parse", "--verify", `refs/tags/${ACTIVE_RELEASE_CANDIDATE_TAG}`],
  ["cat-file", "-t", tagObject],
  ["rev-parse", "--verify", `${tagObject}^{commit}`],
  ["rev-parse", "--verify", `refs/tags/${ACTIVE_RELEASE_CANDIDATE_TAG}`],
]);
assert.equal(validGitCalls.flat().includes("HEAD"), false);

let missingGitCalls = 0;
const unresolved = resolveLocalReleaseCandidate({
  runGit() {
    missingGitCalls += 1;
    return { status: 1, stdout: "" };
  },
});
assert.equal(unresolved.state, "missing");
assert.equal(unresolved.ready, false);
assert.equal(missingGitCalls, 1);

let wrongCandidateGitCalls = 0;
const rejectedCandidate = resolveLocalReleaseCandidate({
  candidateTag: "v1.0.0-rc.999",
  runGit() {
    wrongCandidateGitCalls += 1;
    return { status: 0, stdout: `${tagObject}\n` };
  },
});
assert.equal(rejectedCandidate.state, "wrong-candidate");
assert.equal(rejectedCandidate.ready, false);
assert.equal(wrongCandidateGitCalls, 0);

let tagReadCount = 0;
const changedDuringResolution = resolveLocalReleaseCandidate({
  runGit(args) {
    if (
      args[0] === "rev-parse" &&
      args[1] === "--verify" &&
      args[2] === `refs/tags/${ACTIVE_RELEASE_CANDIDATE_TAG}`
    ) {
      tagReadCount += 1;
      return {
        status: 0,
        stdout: `${tagReadCount === 1 ? tagObject : changedTagObject}\n`,
      };
    }
    if (args[0] === "cat-file" && args[1] === "-t") {
      return { status: 0, stdout: "tag\n" };
    }
    return { status: 0, stdout: `${peeledCommit}\n` };
  },
});
assert.equal(changedDuringResolution.state, "ref-changed");
assert.equal(changedDuringResolution.ready, false);

let disappearingTagReads = 0;
const disappearedDuringResolution = resolveLocalReleaseCandidate({
  runGit(args) {
    if (
      args[0] === "rev-parse" &&
      args[1] === "--verify" &&
      args[2] === `refs/tags/${ACTIVE_RELEASE_CANDIDATE_TAG}`
    ) {
      disappearingTagReads += 1;
      return disappearingTagReads === 1
        ? { status: 0, stdout: `${tagObject}\n` }
        : { status: 1, stdout: "" };
    }
    if (args[0] === "cat-file" && args[1] === "-t") {
      return { status: 0, stdout: "tag\n" };
    }
    return { status: 0, stdout: `${peeledCommit}\n` };
  },
});
assert.equal(disappearedDuringResolution.state, "ref-changed");
assert.equal(disappearedDuringResolution.ready, false);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const retiredCandidateCommit = [
  "5160ac98",
  "63725a10",
  "230a51c4",
  "d45c4cb0",
  "be218540",
].join("");
for (const fileName of ["release-candidate.mjs", "docker-release-proof.mjs"]) {
  const source = readFileSync(path.join(scriptDirectory, fileName), "utf8");
  assert.equal(source.includes(retiredCandidateCommit), false);
  assert.equal(source.includes("EXPECTED_SOURCE_COMMIT"), false);
  assert.equal(source.includes("v1.0.0-rc.1"), false);
}

const compatibleContract = classifyImmutableReleaseContract({
  dockerfile:
    "ARG NEXUS_BUILD_COMMIT_SHA\nLABEL org.opencontainers.image.revision=$NEXUS_BUILD_COMMIT_SHA",
  identityRoute: "return { releaseIdentity };",
});
assert.equal(compatibleContract.ready, true);

const incompatibleCandidateContract = classifyImmutableReleaseContract({
  dockerfile: "FROM node:20-alpine",
  identityRoute: "return { status: 'ok' };",
});
assert.equal(incompatibleCandidateContract.ready, false);
assert.match(
  incompatibleCandidateContract.blocker,
  /another candidate only after separate approval/i,
);

const authFixture = "fixture-auth-material-should-never-survive";
const fixturePath = "C:\\Users\\operator\\private\\docker-proof\\env.list";
const fixtureHostname = "private-stage.example.internal";
const sanitized = sanitizeArtifact(
  {
    token: authFixture,
    tempPath: fixturePath,
    hostname: fixtureHostname,
    nested: {
      authorization: `Bearer ${authFixture}`,
      message: `Failure at https://${fixtureHostname} from ${fixturePath}`,
    },
    safe: {
      tag: EXPECTED_RELEASE_TAG,
      commit: peeledCommit,
      imageId: `sha256:${"b".repeat(64)}`,
    },
  },
  { secrets: [authFixture, fixturePath, fixtureHostname] },
);
const serialized = JSON.stringify(sanitized);
assert.equal(serialized.includes(authFixture), false);
assert.equal(serialized.includes(fixturePath), false);
assert.equal(serialized.includes(fixtureHostname), false);
assert.equal(sanitized.safe.tag, EXPECTED_RELEASE_TAG);
assert.equal(sanitized.safe.commit, peeledCommit);

const containmentRoot = path.resolve("C:/nexus/.nexus");
assert.equal(
  isContainedPath(
    containmentRoot,
    path.join(containmentRoot, "docker-release-proof-fixture", "source.tar"),
  ),
  true,
);
assert.equal(isContainedPath(containmentRoot, containmentRoot), false);
assert.equal(
  isContainedPath(
    containmentRoot,
    path.resolve(containmentRoot, "..", "escape"),
  ),
  false,
);
assert.equal(
  isContainedPath(
    containmentRoot,
    path.resolve(`${containmentRoot}-sibling`, "source.tar"),
  ),
  false,
);

const imageId = `sha256:${"c".repeat(64)}`;
assert.equal(isContentAddressedImageId(imageId), true);
assert.equal(isContentAddressedImageId("nexus-prime:latest"), false);
assert.equal(isNonRootUser("nextjs"), true);
assert.equal(isNonRootUser("1001"), true);
assert.equal(isNonRootUser("root"), false);
assert.equal(isNonRootUser("0"), false);
assert.equal(isNonRootUser(""), false);
assert.equal(cleanupCommandPassed(0, "", "container"), true);
assert.equal(
  cleanupCommandPassed(1, "Error: No such container: fixture", "container"),
  true,
);
assert.equal(
  cleanupCommandPassed(1, "Error: permission denied", "container"),
  false,
);
assert.equal(
  cleanupCommandPassed(1, "Error: No such image: fixture", "image"),
  true,
);
assert.equal(isLocalDockerEndpoint("npipe:////./pipe/docker_engine"), true);
assert.equal(
  isLocalDockerEndpoint("npipe:////remote-builder/pipe/docker_engine"),
  false,
);
assert.equal(isLocalDockerEndpoint("unix:///var/run/docker.sock"), true);
assert.equal(isLocalDockerEndpoint("tcp://127.0.0.1:2375"), true);
assert.equal(isLocalDockerEndpoint("tcp://[::1]:2375"), true);
assert.equal(
  isLocalDockerEndpoint("tcp://remote-builder.example.test:2376"),
  false,
);
assert.equal(isLocalDockerEndpoint("ssh://remote-builder.example.test"), false);

const passingInputs = {
  source: exact,
  docker: {
    cliAvailable: true,
    engineAvailable: true,
    localEndpoint: true,
  },
  archive: {
    created: true,
    contained: true,
    ignored: true,
    dockerfileFromTag: true,
  },
  build: { attempted: true, passed: true },
  runtime: {
    attempted: true,
    started: true,
    loopbackOnly: true,
    healthPassed: true,
    identityMatches: true,
  },
  smoke: { attempted: true, passed: true },
  image: {
    inspected: true,
    imageId,
    contentAddressed: true,
    configuredUser: "nextjs",
    runtimeUid: 1001,
    nonRoot: true,
    containerImageMatches: true,
    labelsMatch: true,
  },
  cleanup: { passed: true },
};

const passing = classifyDockerProof(passingInputs);
assert.equal(passing.proofReady, true);
assert.equal(passing.status, "ready");
assert.deepEqual(passing.blockers, []);

const sourceBlocked = classifyDockerProof({
  ...passingInputs,
  source: wrongCandidate,
});
assert.equal(sourceBlocked.proofReady, false);
assert.equal(sourceBlocked.blockers.includes(wrongCandidate.blocker), true);

const dockerCliBlocked = classifyDockerProof({
  ...passingInputs,
  docker: {
    cliAvailable: false,
    engineAvailable: false,
    localEndpoint: false,
  },
});
assert.deepEqual(dockerCliBlocked.blockers, ["Docker CLI is unavailable."]);

const remoteDockerBlocked = classifyDockerProof({
  ...passingInputs,
  docker: {
    cliAvailable: true,
    engineAvailable: false,
    localEndpoint: false,
  },
});
assert.deepEqual(remoteDockerBlocked.blockers, [
  "Docker endpoint is not proven local.",
]);

const dockerEngineBlocked = classifyDockerProof({
  ...passingInputs,
  docker: {
    cliAvailable: true,
    engineAvailable: false,
    localEndpoint: true,
  },
});
assert.deepEqual(dockerEngineBlocked.blockers, [
  "Docker engine is unavailable.",
]);

const smokeBlocked = classifyDockerProof({
  ...passingInputs,
  smoke: { attempted: true, passed: false },
});
assert.equal(smokeBlocked.proofReady, false);
assert.equal(
  smokeBlocked.blockers.includes(
    "Release smoke did not pass against the owned container.",
  ),
  true,
);

const cleanupBlocked = classifyDockerProof({
  ...passingInputs,
  cleanup: { passed: false },
});
assert.equal(cleanupBlocked.proofReady, false);
assert.equal(
  cleanupBlocked.blockers.includes(
    "Owned Docker or temporary resources were not fully cleaned.",
  ),
  true,
);

console.log(
  "Docker release proof runtime OK (frozen tag/commit, missing/wrong/mutating source, sanitization, containment, image posture, and fail-closed proof classification).",
);

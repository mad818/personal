import { spawnSync } from "node:child_process";

export const ACTIVE_RELEASE_CANDIDATE_TAG = "v1.0.0-rc.2";

const GIT_OBJECT_ID = /^[a-f0-9]{40}$/;

function normalizedObjectId(value) {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  return GIT_OBJECT_ID.test(candidate) ? candidate : null;
}

function frozenCandidate(value) {
  return Object.freeze(value);
}

export function classifyReleaseCandidate({
  candidateTag = ACTIVE_RELEASE_CANDIDATE_TAG,
  tagObject = null,
  peeledCommit = null,
  objectType = null,
} = {}) {
  if (candidateTag !== ACTIVE_RELEASE_CANDIDATE_TAG) {
    return frozenCandidate({
      tag: ACTIVE_RELEASE_CANDIDATE_TAG,
      tagObject: null,
      peeledCommit: null,
      objectType: null,
      state: "wrong-candidate",
      ready: false,
      blocker: `Only active candidate ${ACTIVE_RELEASE_CANDIDATE_TAG} may be resolved.`,
    });
  }

  const normalizedTagObject = normalizedObjectId(tagObject);
  const normalizedPeeledCommit = normalizedObjectId(peeledCommit);
  const normalizedObjectType =
    typeof objectType === "string" ? objectType.trim().toLowerCase() : null;

  if (!normalizedTagObject || !normalizedPeeledCommit) {
    return frozenCandidate({
      tag: ACTIVE_RELEASE_CANDIDATE_TAG,
      tagObject: normalizedTagObject,
      peeledCommit: normalizedPeeledCommit,
      objectType: normalizedObjectType,
      state: "missing",
      ready: false,
      blocker: `Local annotated tag ${ACTIVE_RELEASE_CANDIDATE_TAG} is missing or incomplete; no HEAD, environment, or artifact fallback is allowed.`,
    });
  }

  if (normalizedObjectType !== "tag") {
    return frozenCandidate({
      tag: ACTIVE_RELEASE_CANDIDATE_TAG,
      tagObject: normalizedTagObject,
      peeledCommit: normalizedPeeledCommit,
      objectType: normalizedObjectType,
      state: "not-annotated",
      ready: false,
      blocker: `Local ${ACTIVE_RELEASE_CANDIDATE_TAG} is not an annotated tag object.`,
    });
  }

  return frozenCandidate({
    tag: ACTIVE_RELEASE_CANDIDATE_TAG,
    tagObject: normalizedTagObject,
    peeledCommit: normalizedPeeledCommit,
    objectType: normalizedObjectType,
    state: "exact",
    ready: true,
    blocker: null,
  });
}

function defaultRunGit(args, { cwd } = {}) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
}

function commandValue(result) {
  return result?.status === 0 && typeof result.stdout === "string"
    ? result.stdout.trim()
    : null;
}

export function resolveLocalReleaseCandidate({
  runGit = defaultRunGit,
  candidateTag = ACTIVE_RELEASE_CANDIDATE_TAG,
  cwd = process.cwd(),
} = {}) {
  if (candidateTag !== ACTIVE_RELEASE_CANDIDATE_TAG) {
    return classifyReleaseCandidate({ candidateTag });
  }

  const tagRef = `refs/tags/${ACTIVE_RELEASE_CANDIDATE_TAG}`;
  let tagObjectBefore = null;
  let tagObjectAfter = null;
  let peeledCommit = null;
  let objectType = null;

  try {
    tagObjectBefore = commandValue(
      runGit(["rev-parse", "--verify", tagRef], { cwd }),
    );
    if (!normalizedObjectId(tagObjectBefore)) {
      return classifyReleaseCandidate({ candidateTag });
    }

    objectType = commandValue(
      runGit(["cat-file", "-t", tagObjectBefore], { cwd }),
    );
    peeledCommit = commandValue(
      runGit(["rev-parse", "--verify", `${tagObjectBefore}^{commit}`], {
        cwd,
      }),
    );
    tagObjectAfter = commandValue(
      runGit(["rev-parse", "--verify", tagRef], { cwd }),
    );
  } catch {
    return classifyReleaseCandidate({ candidateTag });
  }

  if (
    !normalizedObjectId(tagObjectAfter) ||
    normalizedObjectId(tagObjectBefore) !== normalizedObjectId(tagObjectAfter)
  ) {
    return frozenCandidate({
      tag: ACTIVE_RELEASE_CANDIDATE_TAG,
      tagObject: normalizedObjectId(tagObjectBefore),
      peeledCommit: normalizedObjectId(peeledCommit),
      objectType:
        typeof objectType === "string" ? objectType.trim().toLowerCase() : null,
      state: "ref-changed",
      ready: false,
      blocker: `Local ${ACTIVE_RELEASE_CANDIDATE_TAG} changed while it was being resolved; retry without using the partial result.`,
    });
  }

  return classifyReleaseCandidate({
    candidateTag,
    tagObject: tagObjectBefore,
    peeledCommit,
    objectType,
  });
}

import { createHash } from "node:crypto";

export const RELEASE_IDENTITY_SCHEMA_VERSION = "nexus-release-identity.v1";
export const RELEASE_ENVIRONMENT_SCHEMA_VERSION = "nexus-runtime-env.v1";

type ReleaseIdentityEnv = Record<string, string | undefined>;

function normalized(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function fullCommit(value?: string) {
  const candidate = normalized(value)?.toLowerCase() ?? null;
  return candidate && /^[a-f0-9]{40}$/.test(candidate) ? candidate : null;
}

function releaseTag(value?: string) {
  const candidate = normalized(value) ?? null;
  return candidate && /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(candidate)
    ? candidate
    : null;
}

function imageDigest(value?: string) {
  const candidate = normalized(value)?.toLowerCase() ?? null;
  return candidate && /^sha256:[a-f0-9]{64}$/.test(candidate)
    ? candidate
    : null;
}

function deploymentId(value?: string) {
  const candidate = normalized(value);
  if (!candidate) return null;
  return `deployment-${createHash("sha256")
    .update(candidate)
    .digest("hex")
    .slice(0, 16)}`;
}

function deploymentProfile(value?: string) {
  const candidate = normalized(value)?.toLowerCase();
  if (candidate === "web-self-hosted" || candidate === "desktop-secure") {
    return candidate;
  }
  return "local-dev";
}

export function buildReleaseIdentity(env: ReleaseIdentityEnv) {
  const sourceCommit =
    fullCommit(env.NEXUS_BUILD_COMMIT_SHA) ?? fullCommit(env.GITHUB_SHA);
  const resolvedReleaseTag = releaseTag(env.NEXUS_RELEASE_TAG);
  const resolvedImageDigest = imageDigest(env.NEXUS_IMAGE_DIGEST);
  const resolvedDeploymentId = deploymentId(env.NEXUS_DEPLOYMENT_ID);
  const missing = [
    !sourceCommit ? "sourceCommit" : null,
    !resolvedReleaseTag ? "releaseTag" : null,
    !resolvedImageDigest ? "imageDigest" : null,
    !resolvedDeploymentId ? "deploymentId" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    schemaVersion: RELEASE_IDENTITY_SCHEMA_VERSION,
    environmentSchemaVersion: RELEASE_ENVIRONMENT_SCHEMA_VERSION,
    sourceCommit,
    releaseTag: resolvedReleaseTag,
    imageDigest: resolvedImageDigest,
    deploymentId: resolvedDeploymentId,
    deploymentProfile: deploymentProfile(env.NEXUS_DEPLOYMENT_PROFILE),
    complete: missing.length === 0,
    missing,
  };
}

export function readReleaseIdentity() {
  return buildReleaseIdentity(process.env);
}

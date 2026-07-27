---
name: shipping-and-launch
description: Establishes truthful reversible Nexus release readiness. Use when preparing a web or desktop release, production deployment, staged rollout, feature launch, or operator handoff that needs gates, rollback, monitoring, and explicit unresolved risk.
---

# Shipping And Launch

## Overview

Ship only artifacts proven by the required gates, with a bounded rollout, observable health, and a rehearsed rollback.

## Authority boundaries

- Preparation does not authorize deployment or publication.
- Do not claim release readiness from static checks when live or packaged evidence is required.
- Preserve the free, local-first, security, signing, and platform guarantees.

## Workflow

1. Define artifact, target, version, owner, change scope, and launch success metrics.
2. Confirm required static, build, security, dependency, migration, and runtime gates.
3. Produce checksums, signing, SBOM, provenance, and configuration evidence where applicable.
4. Rehearse deployment and rollback in the closest authorized environment.
5. Define staged exposure, health checks, alert thresholds, and stop conditions.
6. Obtain explicit approval for external deployment or release.
7. Observe the launch window and record actual outcome separately from plan.

## Stop conditions

- Any required gate is failed, skipped, stale, or simulated.
- Rollback is untested or would lose data.
- Target ownership, credentials, or approval are missing.
- Observability cannot detect the primary failure modes.

## Verification

- [ ] Exact artifact and evidence hashes are known.
- [ ] Required gates match the target platform.
- [ ] Rollback and recovery were proven.
- [ ] Published, prepared, and blocked states are reported distinctly.

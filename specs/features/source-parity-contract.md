# SOURCE-PARITY-CONTRACT

## Objective

Ensure GitHub/X ideas are reverse-engineered from primary sources and assimilated into Nexus as complete useful capability models instead of partial feature samples.

## Contract

- Every assimilated source has a machine-readable matrix under `docs/ideas/source-parity/`.
- Every matrix records the primary source URL, reviewed version/date, license, and primary evidence.
- Every discovered capability has exactly one disposition:
  - `implemented`: behavior exists directly in Nexus.
  - `adapted`: equivalent behavior exists through Nexus-native architecture.
  - `excluded`: behavior conflicts with a documented Nexus invariant.
  - `pending`: useful behavior still needs implementation.
- `implemented` and `adapted` rows require acceptance-proof references.
- `excluded` rows require an allowed conflict class and a specific rationale.
- A source can be marked `complete` only when it has no pending rows and all non-excluded rows carry proof.
- X posts must be traced to a primary project, paper, specification, or reproducible behavior before implementation.

## Allowed Exclusion Classes

- `security`
- `legal`
- `license`
- `free_local`
- `product_purpose`

## Guardrails

- Adapt behavior into Nexus architecture where appropriate; do not blindly vendor an upstream runtime.
- Do not use command names, prompt text, plans, placeholder UI, or documentation alone as proof of implemented behavior.
- Do not silently execute code, install packages, spend money, enable recurring jobs, write externally, or weaken Nexus security boundaries.

## Verification

- `npm run source:parity:check`
- `npm run feynman:check`
- `npm run verify`

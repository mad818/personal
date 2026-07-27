---
name: doubt-driven-development
description: Challenges high-impact Nexus assumptions with independent evidence before they become defects. Use when decisions are security-sensitive, irreversible, unfamiliar, production-critical, or surprisingly confident and verification is cheaper than recovery.
---

# Doubt Driven Development

## Overview

Turn each risky conclusion into a claim, extract its evidence, search for a concrete failure mode, and reconcile before proceeding.

## Authority boundaries

- Perform a fresh local evidence pass without widening the task.
- Do not start subagents or cross-model review unless the user explicitly requested delegation and current policy permits it.
- Do not use uncertainty as a reason to redesign unrelated systems.

## Workflow

1. State the decision as one falsifiable claim.
2. Extract supporting evidence from current code, tests, logs, or primary sources.
3. Identify the strongest plausible counterexample or boundary case.
4. Run the cheapest read-only or local proof that distinguishes the claim from the counterexample.
5. Reconcile by confirming, narrowing, or rejecting the claim.
6. Record residual uncertainty and the exact condition that would change the decision.
7. Stop once additional doubt would not change the implementation.

## Stop conditions

- The proof would require unapproved external state change.
- Evidence remains contradictory after two independent checks.
- The claim cannot be made falsifiable.

## Verification

- [ ] Claim, evidence, counterexample, and reconciliation are recorded.
- [ ] The check was independent of the original assertion.
- [ ] Residual uncertainty is honest.
- [ ] No unauthorized delegation or external action occurred.

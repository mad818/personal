# OBLITERATUS Assimilation Batch 2 — HQ Chronicle Evidence Visibility

Date: 2026-04-09
Owner: Codex

## Why this batch

The first OBLITERATUS-inspired batch made AI hardening observable in `SECURITY > AI Surface`, but it also exposed the biggest remaining gap: the main HQ chronicle still inherits the truth boundary silently. The most valuable safe continuation is to make evidence posture visible there without turning HQ into a structured-data dump.

## Goals

1. Add a compact evidence-footer contract for HQ agent replies that only appears when the answer is evidence-sensitive.
2. Parse and render `Observed / Inferred / Verify next` posture inside the HQ chronicle without duplicating the raw footer text.
3. Update the Security AI hardening coverage map so it reflects the new visible chronicle posture.
4. Re-verify repo checks plus the live HQ and Security AI surfaces.

## Guardrails

- No unsafe refusal-removal behavior, jailbreak flows, or model-liberation mechanics.
- Keep the change local-first and free-first.
- Do not bloat casual HQ replies; render evidence posture only when present.
- Reuse shared evidence UI/contracts where possible instead of inventing another one-off display path.

## Planned changes

1. Add a small HQ-specific prompt contract so evidence-sensitive chronicle answers can end with a compact `Observed / Inferred / Verify next` footer.
2. Extend the shared structured-evidence helper with a markdown/plain-text footer parser for chronicle replies.
3. Update HQ chronicle rendering to strip the footer from the main bubble and show the posture through the shared evidence panel in compact form.
4. Refresh the AI hardening coverage map to mark HQ chronicle as visibly hardened and point to the strongest next strengthening move.
5. Re-run `type-check`, `verify`, `handoff:write`, and live route checks on `/hq`, `/security?view=ai&focus=security-ai-surface`, and the hallucination-hardening playbook lane.

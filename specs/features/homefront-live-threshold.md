# Homefront Live Threshold

## Intent

Make the authenticated Homefront threshold a live operating readout instead of a static visual strip, while keeping `/hq` and the RPG World lane separate.

## Scope

- Shared protected shell only: `components/ui/shell.tsx` and matching shell CSS.
- Non-HQ surfaces only: command, intel, alpha, cyber, recon, vault, resources, security, skills, and vehicle if rendered through `ShellPage`.
- Live signals should be useful at a glance: runtime health, current route focus, session/access posture, network mode, and runtime-eval readiness when available.

## Guardrails

- Do not add public sales copy.
- Do not expose secrets or tokens in the browser.
- Do not make `/hq` inherit the Homefront product threshold.
- All client fetches must be wrapped in `try/catch` and silently degrade.
- Keep the UI compact enough to fit the existing authenticated shell header.

## Visual Thesis

The protected shell should feel like a calm command-room threshold: dark glass, live route proof, and small operating signals that update without becoming a dashboard.

## Interaction Thesis

- Refresh runtime/readiness signals quietly after mount.
- Preserve the existing slow scan motion as the live-state cue.
- Keep route/focus updates tied to URL changes so tabs feel aware of where the operator is.

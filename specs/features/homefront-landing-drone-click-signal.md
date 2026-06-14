# Homefront Landing Drone Click Signal

## Intent

Add a small left-click interaction to the public Homefront hero so the drone feels responsive without replacing the approved photoreal home or drone assets.

## Scope

- Left-clicking the hero backdrop triggers a short visual acknowledgement.
- The drone briefly brightens/tilts as if it received a signal.
- A small pulse appears at the click point and fades out.
- CTA buttons, headline, copy, assets, and RPG boundaries remain unchanged.
- The hero should not use a floating scenario card or scenario control box; the scene belongs in the home/drone background itself.

## Guardrails

- No new media assets.
- No heavy HUD overlay, scan grid, video layer, beam, marker system, or text labels.
- No autonomous-harm, face-recognition, citizen-scoring, police/military, or automatic emergency-call implication.
- Reduced-motion users should still get a quiet, non-looping acknowledgement.

## Verification

- TypeScript and lint must pass.
- Focused landing coverage should assert the click signal appears and fades/updates without restoring removed effect layers.

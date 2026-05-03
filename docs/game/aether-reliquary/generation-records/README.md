# Aether Reliquary Generation Records

Store one Markdown record per generator-assisted game asset or asset batch.

## Required Record Fields

- Asset ID or batch ID.
- Tool and model name.
- Date generated.
- Operator approval note.
- Terms and rights review date.
- Cost posture: `free-tier-or-existing-access` or `optional-paid-operator-choice`; never forced paid.
- Prompt and negative prompt.
- Source seed frame or source sketch path when used.
- Raw output storage note.
- Hand-splice, repaint, cleanup, or normalization steps.
- Final runtime path and manifest entry ID.
- In-engine review notes.

## Template

```md
# <asset-id> Generation Record

- Tool:
- Model:
- Generated at:
- Operator approval:
- Terms reviewed at:
- Rights posture:
- Cost posture:
- Intended runtime path:
- Source seed:

## Prompt

## Negative Constraints

## Transformations

## Review Notes
```

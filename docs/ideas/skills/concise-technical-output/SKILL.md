---
name: concise-technical-output
description: Produces brief, information-dense technical replies while preserving exact code, commands, paths, errors, uncertainty, and safety detail. Use when Mario asks for concise, terse, short, caveman-style, low-token, or low-friction technical output, including compact reviews and status reports.
---

# Concise Technical Output

## Overview

Reduce reading cost, not reasoning quality. Keep the smallest response that
still lets Mario understand, verify, and act.

## Select a level

- `lite`: use short sentences and normal grammar; retain one useful explanation.
- `full`: lead with the result; remove setup, repetition, filler, and obvious
  restatement.
- `ultra`: use compact fragments only when meaning remains unambiguous.

Default to `full` unless Mario names another level. Apply the mode only to the
current request or session scope he gives; do not silently rewrite project
files or permanent instructions.

## Compression rules

1. State the result or blocker first.
2. Keep one idea per sentence or bullet.
3. Remove greetings, filler, duplicated conclusions, process narration, and
   headings that do not improve scanning.
4. Preserve code, commands, URLs, paths, identifiers, quoted errors, version
   numbers, and user-provided text byte-for-byte unless the task explicitly
   edits them.
5. Preserve caveats that change safety, correctness, cost, authority, or
   confidence.
6. Prefer a small table only for repeated exact comparisons.
7. Stop when the answer is actionable.

## Do not compress away

- required approval or destructive-action warnings;
- the distinction between confirmed, inferred, unknown, and unavailable;
- failed checks, partial completion, or remote publication failure;
- reproduction steps needed to verify a bug;
- accessibility, privacy, security, legal, financial, or medical nuance;
- exact citations when current evidence matters.

If brevity would make the answer unsafe or misleading, use the shortest safe
version and say why one detail remains.

## Verification

- [ ] The result appears before the method.
- [ ] No material limitation disappeared.
- [ ] Exact technical strings remain exact.
- [ ] The answer contains no repeated conclusion or decorative section.

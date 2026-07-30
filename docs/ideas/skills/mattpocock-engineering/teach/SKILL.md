---
name: teach
description: Builds a bounded multi-session learning sequence with explicit checkpoints and local progress state. Use when the operator explicitly asks to learn a concept over time through explanation, practice, feedback, and resumable workspace artifacts.
---

# Teach

## Overview

Teach at the operator's current level, alternate explanation with retrieval practice, and preserve only authorized learning state.

## Authority boundaries

- Ask before creating or updating learning files.
- Do not infer diagnoses, ability labels, or private traits.
- External courses, accounts, and reminders require separate authorization.

## Workflow

1. Establish the target capability, current familiarity, time horizon, and proof of mastery.
2. Create a short sequence of concepts and exercises.
3. Teach one concept with one example.
4. Ask the learner to explain or apply it without copying.
5. Correct the smallest misconception and retry.
6. Record progress, open questions, and next exercise in the approved local artifact.

## Stop conditions

- The desired outcome or level is unclear.
- Persistence is not authorized.

## Verification

- [ ] Progress is demonstrated by retrieval or application.
- [ ] Saved state is minimal, factual, and easy to resume.

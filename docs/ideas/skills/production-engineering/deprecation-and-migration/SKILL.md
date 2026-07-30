---
name: deprecation-and-migration
description: Retires Nexus behavior while preserving required data and replacement paths. Use when removing legacy code, changing a public contract, consolidating systems, migrating stored state, or proving that an obsolete subsystem is no longer reachable.
---

# Deprecation And Migration

## Overview

Inventory consumers, establish the replacement, migrate evidence safely, remove reachability, and prove the old path stays gone.

## Authority boundaries

- Do not delete user data, private vault material, branches, or external resources without explicit approval.
- Archive tracked historical material when policy requires preservation.
- Keep compatibility only when a real consumer and removal date justify it.

## Workflow

1. Inventory code, routes, data, docs, tests, scripts, and consumers tied to the old behavior.
2. Define preserved invariants, replacement path, migration boundary, and rollback.
3. Add compatibility only where a verified consumer needs transition time.
4. Migrate or archive in bounded reversible steps.
5. Remove imports, navigation, commands, runtime registration, and stale documentation.
6. Add a negative reachability or retirement check.
7. Run canonical verification and inspect for zombie references.

## Stop conditions

- Required user data has no tested migration or backup.
- A live consumer cannot move in the approved window.
- Removal crosses into unrelated historical or private content.

## Verification

- [ ] Replacement behavior is reachable and complete.
- [ ] Required data and invariants are preserved.
- [ ] Old runtime paths are unreachable.
- [ ] Negative proof prevents accidental restoration.

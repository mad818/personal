# Scoped analysis guidance

This directory documents `mco-org/squad` as an external architectural reference for Nexus Prime.

- Do not vendor the upstream Rust CLI or SQLite state here.
- Keep implementation changes in native Nexus TypeScript surfaces.
- Preserve MAX as the only operator-facing orchestrator and the existing five-agent taxonomy.
- Treat specialist code as a proposal until the existing review gate proves and applies a change.
- Update `docs/ideas/source-parity/mco-squad.json` whenever a mapped capability changes disposition.

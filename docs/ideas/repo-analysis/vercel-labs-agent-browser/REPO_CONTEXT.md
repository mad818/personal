# REPO_CONTEXT.md

## Repository Thesis

`vercel-labs/agent-browser` is an Apache-2.0 native Rust browser-automation CLI
with semantic snapshots, interaction refs, screenshots, console/error/network
inspection, traces, React introspection, Web Vitals, and accessibility audits.
Nexus benefits from its evidence model without needing a second browser runtime.

## Repository Shape

- The current `main` repository combines a Rust-native CLI/daemon, Node package,
  workspace packages, Docker support, skills, schema, benchmarks, evals, and
  tests.
- Global/project installation downloads or locates a Chrome-for-Testing
  browser; source builds require Node 24+, pnpm 11+, and Rust.
- The command surface includes navigation, semantic locators, snapshots,
  screenshots/PDF, state, network, traces, console/errors, React rendering,
  Web Vitals, accessibility, and MCP serving.

## Execution Model

An agent opens or connects to a browser, takes an accessibility-tree snapshot,
acts through stable refs or semantic locators, and collects structured evidence.
Optional features can persist authentication state, execute arbitrary
JavaScript, route network traffic, download a browser, or expose an MCP server.

## Nexus Adaptation

`browser-testing-with-devtools` now requires semantic inspection before action,
console/uncaught/network review, measured accessibility/performance evidence,
bounded traces, repeatable viewports, and cleanup. Existing Browser/Playwright
capabilities remain the runtime; no CLI, browser, state, or MCP installation was
added.

## Quality Signals and Risks

The repo has a clear schema, tests/evals, an explicit license, and fail-early
interaction behavior. Browser state, arbitrary evaluation, file upload,
downloads, and network routing cross important trust boundaries, so they remain
separately authorized. Reviewed 2026-07-27.

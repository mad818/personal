# REPO_CONTEXT.md

## Repository Thesis

`JuliusBrussee/caveman` is an MIT-licensed cross-host output-style skill. It
compresses agent replies while claiming to preserve technical content, code,
commands, and errors. The useful Nexus pattern is an explicit optional brevity
mode; the persona, global installer, middleware, status line, and token-savings
claims are not required.

## Repository Shape

- The current `main` README documents `lite`, `full`, `ultra`, and `wenyan`
  levels, compact commit/review/stats commands, a memory compressor, MCP
  middleware, and compressed subagents.
- JavaScript/Node powers the installer and supporting tooling; the source
  advertises multiple agent hosts including Codex.
- Install examples include remote shell and PowerShell pipelines plus a general
  skill-registry path. Nexus did not run any installer.

## Execution Model

The base behavior is prompt-level response shaping. Additional commands read
usage, rewrite memory files, wrap MCP servers, alter a host status line, or
install subagents. The README explicitly notes that measured output-token
savings do not equal whole-session savings and can become negative on already
terse work.

## Nexus Adaptation

`docs/ideas/skills/concise-technical-output/SKILL.md` implements a user-invoked
ChatGPT/Codex mode that removes filler while preserving exact technical strings,
limitations, uncertainty, verification, and safety. It does not permanently
rewrite memory or instructions and makes no savings estimate.

## Quality Signals and Risks

The project publishes benchmarks and an honest-number caveat, but a style
constraint can still erase nuance or make high-stakes guidance unsafe. Nexus
therefore allows brevity to yield to correctness and excludes installer,
middleware, status-line, memory-rewrite, and subagent behavior. Reviewed
2026-07-27.

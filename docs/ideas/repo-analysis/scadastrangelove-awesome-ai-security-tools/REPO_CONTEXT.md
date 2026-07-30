# REPO_CONTEXT.md

## Repository Thesis

`scadastrangelove/awesome-ai-security-tools` is a CC0-1.0 structured catalog of
AI-security and AI-assisted cybersecurity tools, research, models, benchmarks,
and commercial/open components. It is a discovery source, not authorization to
install scanners or conduct security testing.

## Repository Shape

- The current repository generates its README from structured section data and
  a schema, with scripts for metrics refresh and consistency checks.
- Categories cover finding triage, coding-agent security, model supply chain,
  SAST, fuzzing, threat intelligence, SOC/SIEM, reverse engineering,
  red-teaming/guardrails, honeypots, CTF/benchmarks, cloud/IaC/DFIR/OSINT, and
  related lists.
- Entries carry type, license, access, maturity, and caution flags; linked
  projects retain their own licenses.

## Execution Model

The source is a curated index with dated metadata, not a unified executable
platform. Each linked tool has independent dependencies, trust boundaries,
licenses, credentials, model artifacts, and authorization requirements.

## Nexus Adaptation

- Use the catalog as review-first CYBER research evidence.
- `review-external-agent-skill` applies its license/caveat discipline before any
  agent-skill or plugin adoption.
- `security-and-hardening` now inspects installers, hooks, hidden channels,
  permissions, dependencies, network, credentials, and self-modification.
- Keep every scan local and defensive unless Mario separately authorizes a
  named target and tool.

## Quality Signals and Risks

The source has structured data, schema checks, explicit caveat flags, dated
metrics, and a CC0 license for the list. Catalog inclusion is not endorsement;
some entries are restrictive, commercial, offensive, unlicensed, heavy, gated,
or designed for authorized testing only. Nexus installs none of them in this
tranche. Reviewed 2026-07-27.

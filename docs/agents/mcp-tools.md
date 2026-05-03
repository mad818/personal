# External MCP Tool Bridge

P2A ships the External MCP Tool Bridge as a contract-and-status boundary, not a generic MCP execution surface.

## Runtime Boundary

- Nexus does not expose `/api/mcp`, `/api/external-tools`, or any public generic tool-calling route.
- External tool posture is reported through existing protected diagnostics: `/api/status`, `/api/auth-diagnostics`, and `/api/tools` response metadata.
- `local_mcp_gateway` is descriptor-only in v1. It records the intended OAuth-aware contract, scopes, and safe readiness state, but it cannot execute tool calls.
- `n8n_run_workflow` remains the only live external exec adapter, and it stays behind the existing high-risk, step-up, connector, and isolation policy chain.

## Descriptor Rules

- Every external tool must have a typed descriptor with id, label, capability, execution mode, auth metadata, adapter posture, and policy flags.
- Descriptors must serialize only booleans, labels, status strings, and redacted policy posture.
- Descriptors must never include OAuth tokens, API keys, bearer values, workflow payloads, local secret paths, or configured endpoint URLs.
- Future MCP adapters must be allowlisted one by one; generic arbitrary tool names are not accepted.

## Result Envelope Rules

- External tool responses may include an `externalTool` envelope alongside the existing `result` string.
- The `result` string remains backward compatible for current agents and UI traces.
- Envelopes may include sanitized status, adapter id, capability, execution mode, and auth posture.
- Envelopes must not include request payloads, secrets, raw connector credentials, or provider-specific private response metadata.

## Future Adapter Requirements

- Add the adapter descriptor first, then diagnostics visibility, then an allowlisted execution path.
- Route all execution through existing protected-action policy and tool-isolation checks.
- Prefer contract-only posture until OAuth/session handling, sandboxing, and result redaction are proven.
- Add eval coverage before enabling any live adapter.

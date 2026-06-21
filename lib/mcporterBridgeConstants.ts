/** Client-safe mcporter bridge constants — no server/fs imports. */

export const MCPORTER_OPERATOR_GUIDANCE = [
  "Keep MCP servers optional and operator-configured; Nexus does not ship a generic /api/mcp route.",
  "Use JSONC server descriptors with explicit OAuth scopes before enabling any live adapter.",
  "Prefer mcporter CLI operator-side until OAuth, sandboxing, and result redaction are proven in Nexus.",
  "Route live external execution only through allowlisted adapters (n8n today; MCP gateway future).",
] as const;

use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct RuntimePolicy {
    pub network_mode: String,
    pub allow_paid_apis: bool,
    pub enable_high_risk_tools: bool,
    pub enable_sidecar: bool,
}

pub fn read_runtime_policy() -> RuntimePolicy {
    let network_mode = std::env::var("NEXUS_NETWORK_MODE").unwrap_or_else(|_| "isolated".into());
    let normalized_mode = match network_mode.as_str() {
        "internal" | "connected" => network_mode,
        _ => "isolated".into(),
    };

    RuntimePolicy {
        network_mode: normalized_mode,
        allow_paid_apis: env_bool("NEXUS_ALLOW_PAID_APIS", false),
        enable_high_risk_tools: env_bool("NEXUS_ENABLE_HIGH_RISK_TOOLS", false),
        enable_sidecar: env_bool("NEXUS_TAURI_ENABLE_SIDECAR", false),
    }
}

fn env_bool(key: &str, default: bool) -> bool {
    std::env::var(key)
        .map(|v| matches!(v.trim().to_lowercase().as_str(), "1" | "true" | "yes"))
        .unwrap_or(default)
}

pub fn is_sidecar_tool_allowed(tool: &str) -> bool {
    // deny-by-default: explicit allowlist only
    matches!(tool, "python-osint" | "python-vision")
}

pub fn resolve_sidecar_path(tool: &str) -> Option<String> {
    match tool {
        "python-osint" => std::env::var("NEXUS_SIDECAR_PYTHON_OSINT").ok(),
        "python-vision" => std::env::var("NEXUS_SIDECAR_PYTHON_VISION").ok(),
        _ => None,
    }
}

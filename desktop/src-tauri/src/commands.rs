use std::process::Command;

use tauri::command;

use crate::security::{
    is_sidecar_tool_allowed, read_runtime_policy, resolve_sidecar_path, RuntimePolicy,
};

#[command]
pub fn get_runtime_policy() -> RuntimePolicy {
    read_runtime_policy()
}

#[command]
pub fn run_sidecar_tool(tool: String, args: Vec<String>) -> Result<String, String> {
    let policy = read_runtime_policy();
    if !policy.enable_sidecar {
        return Err("Sidecar execution is disabled by policy (NEXUS_TAURI_ENABLE_SIDECAR=false).".into());
    }

    if !is_sidecar_tool_allowed(&tool) {
        return Err(format!("Tool '{tool}' is not in the sidecar allowlist."));
    }

    let binary = resolve_sidecar_path(&tool)
        .ok_or_else(|| format!("No binary configured for sidecar tool '{tool}'."))?;

    if args.len() > 12 {
        return Err("Too many sidecar arguments (max 12).".into());
    }

    let mut safe_args: Vec<String> = Vec::with_capacity(args.len());
    for a in args {
        if a.len() > 256 {
            return Err("Sidecar argument too long (max 256 chars).".into());
        }
        if a.contains('\n') || a.contains('\r') {
            return Err("Invalid sidecar argument content.".into());
        }
        safe_args.push(a);
    }

    let output = Command::new(binary)
        .args(safe_args)
        .output()
        .map_err(|e| format!("Failed to execute sidecar: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Sidecar exited non-zero: {}", err.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.chars().take(4000).collect())
}

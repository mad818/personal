#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod security;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::get_runtime_policy,
      commands::run_sidecar_tool
    ])
    .run(tauri::generate_context!())
    .expect("error while running Nexus desktop shell");
}

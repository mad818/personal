# Tauri Security Implementation Checklist (Nexus)

This tracks the two requested hardening tracks for desktop migration:
1) **Isolation Pattern / strict capabilities**
2) **Binary signing + trusted distribution**

---

## A) Isolation pattern + secure IPC boundary

- [x] Bootstrap shell with `create-tauri-app`-compatible scaffold in `desktop/src-tauri`.
- [ ] Keep UI sandboxed; no direct filesystem/hardware access from webview.
- [x] Expose only explicit Rust commands required by Nexus (`get_runtime_policy`, `run_sidecar_tool`).
- [x] Start with minimal capability set (`core:default`, event/window only).
- [x] Add sidecar process boundary for external tools and broker calls through vetted commands (allowlist + env-pinned binary paths + argument guards).
- [x] Deny by default: no shell/process/fs permissions in default capability (enforced by `npm run security:tauri`).

Reference templates added in-repo:
- `desktop/tauri-template/tauri.conf.secure.example.json`
- `desktop/tauri-template/capabilities/default.json`

---

## B) Binary signing + release trust chain

- [ ] macOS signing identity + notarization flow.
- [ ] Windows code-signing certificate + timestamping.
- [ ] Linux package signing strategy per target.
- [ ] CI release pipeline signs artifacts and generates checksums/SBOM (verify workflow, checksum script, and `npm run desktop:trust-chain` status record shipped; signing/SBOM artifacts still pending).
- [ ] Publish verification steps in operator runbook.

---

## C) Nexus-specific security gates

- [ ] Keep `NEXUS_NETWORK_MODE=isolated` as default in desktop builds.
- [ ] Keep `NEXUS_ALLOW_PAID_APIS=false` by default.
- [ ] Keep `NEXUS_ENABLE_HIGH_RISK_TOOLS=false` by default.
- [ ] Include `/api/diagnostics` snapshot in release verification.
- [ ] Audit any `dangerouslySetInnerHTML` usage before desktop GA.

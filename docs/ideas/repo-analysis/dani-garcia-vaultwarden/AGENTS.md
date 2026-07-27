# Vaultwarden analysis guidance

- Treat `REPO_CONTEXT.md` as a strategic source review, not proof that the full
  Vaultwarden server was cloned, audited, installed, or executed.
- Use release `1.36.0`, branch `main`, AGPL-3.0, and official Bitwarden
  cryptography documentation as current reviewed source truth.
- Keep the adaptation inside the existing Nexus VAULT route as browser-local
  sealed notes.
- State responsibility precisely: Vaultwarden is the server; official clients
  perform the cryptography.
- Do not copy upstream code, assets, schemas, protocols, UI, text, or runtime
  architecture.
- Never infer password-manager, credential, account, recovery, sync, sharing,
  server, remote-access, or compatibility authority.

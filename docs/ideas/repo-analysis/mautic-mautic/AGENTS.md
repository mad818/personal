# Mautic analysis guidance

- Treat `REPO_CONTEXT.md` as a strategic source review, not proof that the full
  Mautic application was cloned, audited, installed, or executed.
- Use the current `7.x` branch, GPL-3.0 license, and official Campaign Builder
  documentation as source truth.
- Adapt only the visual workflow-editing pattern through the existing Nexus
  Workflow Forge.
- Keep campaign workflows local, draft-only, and human-gated.
- Do not copy upstream GPL code, assets, schemas, styles, text templates, or
  runtime architecture.
- Never infer contact data, segmentation, tracking, email, webhook, provider,
  scheduler, account, publication, or activation authority.

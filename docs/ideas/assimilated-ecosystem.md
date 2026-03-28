# Assimilated ecosystem — external repos mapped to Nexus Prime

See also: [`external-links-mapping.md`](./external-links-mapping.md) for the broader link inventory.

We **do not** vendor these codebases. This document **formats ideas** from each project into **what already exists in Nexus**, **what to add later**, and **what stays external tooling**.

| Repository | Core idea | Nexus mapping | Assimilate as |
|------------|-----------|---------------|---------------|
| [Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills) | Pedagogic PM skills + command workflows for agents | INTEL strategy panels, agent prompts, `tasks/todo.md` structure | **Reference only** — CC BY-NC-SA; use for *inspiration* when writing specs, not copied text |
| [Coolify](https://github.com/coollabsio/coolify) | Self-hosted PaaS (deploy apps/DBs on your VPS) | Hosting the Next.js app + env secrets off your laptop | **Ops pattern** — [`docs/deployment/coolify.md`](../deployment/coolify.md); no Coolify code in repo |
| [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) | Multi-phase site clone via Chrome MCP + worktrees | Not core to an intel dashboard | **Defer** — only relevant if we add a “marketing site clone” experiment |
| [atlas-gic](https://github.com/chrisworsey55/atlas-gic) | Autoresearch loop: keep/revert prompts vs **measurable fitness** (e.g. Sharpe) | `npm run eval:agent-runtime:ci`, `tasks/lessons.md`, handoff discipline | **Pattern** — tie agent changes to **measurable checks** before merge |
| [deep-eye](https://github.com/zakirkun/deep-eye) | AI-assisted vuln scanning / pentest modules | CYBER tab, `/api/*`, CSP, tool risk tiers in `lib/agent.ts` | **Boundary** — we stay **read-only / advisory**; no automated exploitation against arbitrary URLs from Nexus |
| [UncommonRoute](https://github.com/CommonstackAI/UncommonRoute) | Local router: cheap vs strong models by difficulty | Ollama + Claude in `lib/ai.ts`, cost-conscious routing | **Optional local setup** — document pointing Cursor `OPENAI_BASE_URL` at a router when user runs one |
| [awesome-autoresearch](https://github.com/alvinunreal/awesome-autoresearch) | Curated autoresearch & agent-improvement links | Same *spirit* as eval + lessons loop | **Reading list** — link hub; no code |
| [onyx](https://github.com/onyx-dot-app/onyx) | Self-hosted RAG + connectors + chat UI | Overlaps “knowledge + chat”; Nexus is lighter, tab-specific | **Complementary product** — cite if users ask for enterprise RAG; not merged |
| [sentrux](https://github.com/sentrux/sentrux) | Architectural sensor, MCP, quality gates | `npm run verify`, path collisions, CI, Sentrux-style “don’t rot architecture” | **Optional tool** — users may run Sentrux MCP alongside Cursor; we keep **our** gates in npm/CI |
| [factory-cursor-bridge](https://github.com/0xSero/factory-cursor-bridge) | BYOK multi-provider proxy for Cursor (`fx-` models) | Multi-key workflows in `.env.local` | **User-side** — document in Cursor settings; no server change required |
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch) | Tight loop: edit one file → measure → keep/revert | `eval:agent-runtime`, `tasks/lessons.md`, small surgical diffs | **Culture** — one metric, one rollback story; we use **TypeScript/agent eval**, not GPU `train.py` |
| [prompt-master](https://github.com/nidhinjs/prompt-master) | Sharper prompts per tool (memory block, scope) | `lib/liveContext.ts`, `buildSystemPrompt`, CLAUDE.md rules | **Prompt hygiene** — borrow *patterns* (scope, done-when); don’t duplicate the skill |
| [claude-better](https://github.com/krzyzanowskim/claude-better) | Faster Claude CLI (compatibility harness) | Developer ergonomics only | **External** — if published broadly, optional install; **not** a Nexus dependency |

---

## Principles (how this repo uses the list)

1. **Nexus stays one app** — intelligence dashboard + local agent; we don’t bundle a second chat server (Onyx) or a full pentest suite (Deep Eye) inside the same deployable.
2. **Measure before merge** — autoresearch / ATLAS / Sentrux all say: **feedback loop + revert**. Aligns with: `verify`, `handoff:check`, agent runtime eval.
3. **Respect licenses** — PM Skills is **non-commercial share-alike**; we **link**, we don’t paste skill bodies.
4. **Self-hosting story** — Coolify is documented under [`docs/deployment/`](../deployment/README.md); Onyx remains a **complementary** product (link in table above).

---

## Concrete Nexus surfaces (already aligned)

| External concept | Where it lives in Nexus |
|------------------|-------------------------|
| RSS + fallback + GDELT | `app/api/news/route.ts`, `hooks/useArticles.ts` |
| Tool risk / approvals | `lib/agent.ts`, `app/api/tools/*` |
| Agent quality gate | `npm run eval:agent-runtime:ci`, `.github/workflows/quality-gates.yml` |
| Handoff + continuity | `docs/CLAUDE_HANDOFF.md`, `npm run handoff:sync`, `tasks/todo.md` |
| PWA / install | `public/manifest.json`, `public/icon.svg`, `app/layout.tsx` |

---

## Security boundary (CYBER)

Nexus **read-only / advisory** tooling only. Do **not** wire automated exploitation or unauthenticated scanning of third-party hosts into the app. For authorized testing methodology, see OWASP and your org’s rules — not in-repo Deep Eye–style scanners.

---

## Quick links

- [Product-Manager-Skills](https://github.com/deanpeters/Product-Manager-Skills) · [Coolify](https://github.com/coollabsio/coolify) · [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) · [atlas-gic](https://github.com/chrisworsey55/atlas-gic) · [deep-eye](https://github.com/zakirkun/deep-eye) · [UncommonRoute](https://github.com/CommonstackAI/UncommonRoute) · [awesome-autoresearch](https://github.com/alvinunreal/awesome-autoresearch) · [onyx](https://github.com/onyx-dot-app/onyx) · [sentrux](https://github.com/sentrux/sentrux) · [factory-cursor-bridge](https://github.com/0xSero/factory-cursor-bridge) · [karpathy/autoresearch](https://github.com/karpathy/autoresearch) · [prompt-master](https://github.com/nidhinjs/prompt-master) · [claude-better](https://github.com/krzyzanowskim/claude-better)

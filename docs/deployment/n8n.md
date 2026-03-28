# n8n Automation Backbone — Self-Hosted Setup

[n8n](https://github.com/n8n-io/n8n) is a self-hosted workflow automation platform —
think Zapier/Make, but running on **your** server, **your** data, no subscription.

Nexus Prime treats n8n the same way it treats Coolify: a **companion service** that
runs alongside the dashboard. It is never bundled into Nexus and never required to
run the dashboard. When n8n is running, Nexus can trigger webhooks and workflows via
the `n8n_run_workflow` tool available to agents in the AgentOffice.

---

## What you can automate

- **Alert workflows** — pipe Nexus signals (CVEs, price moves, world-risk spikes) into
  Slack, Telegram, or email via n8n triggers.
- **Data pipelines** — schedule n8n to call external APIs and POST results back to a
  Nexus webhook endpoint.
- **Agent handoffs** — an agent can trigger an n8n workflow, which then calls a second
  system (e.g. create a GitHub issue, send a report).

---

## Prerequisites

- Docker (recommended) or Node.js 18+
- A server or local machine
- An accessible n8n instance URL (default: `http://localhost:5678`)

---

## Install with Docker (recommended)

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Access the editor at `http://localhost:5678`.

For a persistent production setup with a reverse proxy, see the
[n8n Docker install guide](https://docs.n8n.io/hosting/installation/docker/).

---

## Connect to Nexus

Add the following to your `.env.local`:

```
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here
```

Generate an API key in n8n: **Settings → n8n API → Create API Key**.

Nexus agents can then call the `n8n_run_workflow` tool:

```
Agent: trigger workflow abc123 with { "alert": "BTC dropped 10%" }
```

The tool calls `POST /api/tools` with `{ tool: "n8n_run_workflow", input: { workflowId, payload } }`,
which proxies to the n8n REST API.

---

## Nexus integration points

| What | Where |
|------|-------|
| Agent tool | `n8n_run_workflow` in `app/api/tools/route.ts` |
| n8n API proxy | `/api/tools` route, `N8N_BASE_URL` + `N8N_API_KEY` env vars |
| Trigger format | `POST /webhook/<id>` (webhook node) or `POST /api/v1/workflows/<id>/execute` (API) |

---

## Creating a workflow

1. Open n8n at `http://localhost:5678`.
2. Create a new workflow.
3. Add a **Webhook** trigger node (for instant triggers) or a **Schedule** node.
4. Add your action nodes (HTTP Request, Slack, Email, etc.).
5. Activate the workflow.
6. Copy the workflow ID from the URL (`/workflow/abc123`) and pass it to the agent tool.

---

## Notes

- n8n workflows are stored in `~/.n8n` (Docker volume) — back this up.
- API keys are stored server-side in `.env.local` — never committed to git.
- n8n is optional. Nexus runs fully without it; the tool simply returns an error if n8n is unreachable.
- For public deployments, put n8n behind a reverse proxy with HTTPS (Coolify handles this automatically).

---

## Reference

- [n8n GitHub](https://github.com/n8n-io/n8n)
- [n8n docs](https://docs.n8n.io)
- [n8n community workflows](https://n8n.io/workflows)

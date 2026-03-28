# Agent Reach — Setup Guide

Agent Reach is a local Python service that gives Nexus agents access to free
public data connectors: Reddit, GitHub Trending, RSS feeds, and DuckDuckGo.
No API keys required. No costs.

## Architecture

```
Browser → Next.js (/api/agent-reach) → Agent Reach (localhost:5051)
                                           ├── Reddit public JSON
                                           ├── GitHub Trending API
                                           ├── feedparser (RSS/Atom)
                                           └── DuckDuckGo Instant Answers
```

## Prerequisites

- Python 3.10+
- pip

## Install

```bash
pip install fastapi uvicorn feedparser
```

## Start

```bash
# From the project root
python scripts/agent-reach-service.py
```

The service runs at `http://localhost:5051`. Nexus proxies through `/api/agent-reach`.

## Endpoints

| Endpoint | Params | Description |
|----------|--------|-------------|
| `GET /reddit` | `q`, `subreddit?`, `limit?`, `sort?` | Reddit search (public JSON, no key) |
| `GET /github-trending` | `language?`, `since?`, `limit?` | GitHub trending repos |
| `GET /rss` | `url`, `limit?` | Parse any RSS or Atom feed |
| `GET /search` | `q` | DuckDuckGo Instant Answer |
| `GET /health` | — | Service status check |

## Using from Nexus agents

Agents call the proxy via the `agent_reach` tool (see `app/api/tools/route.ts`):

```
tool: agent_reach
input:
  endpoint: /reddit
  q: "AI security vulnerabilities"
  subreddit: "netsec"
  limit: "10"
```

## Running as a background service (optional)

**Windows (PowerShell):**
```powershell
Start-Process -NoNewWindow python -ArgumentList "scripts/agent-reach-service.py"
```

**macOS / Linux (background):**
```bash
nohup python scripts/agent-reach-service.py &
```

## Custom service URL

If you run the service on a different port or host, set in `.env.local`:

```
AGENT_REACH_URL=http://127.0.0.1:5051
```

## Graceful degradation

If the service is not running, Nexus returns a 503 with a helpful message.
No other part of Nexus is affected. The service is completely optional.

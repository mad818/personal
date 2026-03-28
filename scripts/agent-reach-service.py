#!/usr/bin/env python3
"""
agent-reach-service.py — Nexus Prime Agent Reach connector
Lightweight FastAPI service that gives agents access to:
  - Reddit public JSON (no OAuth — uses old.reddit.com/.json)
  - GitHub Trending (public scrape via github.com/trending API)
  - RSS / Atom feeds (feedparser)
  - DuckDuckGo Instant Answer API (no key)

Run: python scripts/agent-reach-service.py
     (or: uvicorn scripts.agent-reach-service:app --port 5051)

All sources are free and require no API keys.
See docs/deployment/agent-reach.md for setup guide.
"""

import json
import sys
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from urllib.error import URLError

# ── Optional imports (graceful degradation) ───────────────────────────────────
try:
    import feedparser  # pip install feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

try:
    from fastapi import FastAPI, Query
    from fastapi.responses import JSONResponse
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    print("FastAPI not installed. Run: pip install fastapi uvicorn feedparser", file=sys.stderr)
    sys.exit(1)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Agent Reach Service",
    description="Free-tier connector: Reddit, GitHub Trending, RSS, DuckDuckGo",
    version="1.0.0",
)

UA = "Mozilla/5.0 (compatible; NexusPrime/1.0; +https://github.com/mad818/personal)"
TIMEOUT = 8


def _get(url: str) -> dict:
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (URLError, json.JSONDecodeError) as exc:
        return {"error": str(exc)}


def _get_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=TIMEOUT) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except URLError as exc:
        return f"error: {exc}"


# ── Reddit ─────────────────────────────────────────────────────────────────────
@app.get("/reddit")
def reddit_search(
    q: str = Query(..., description="Search query"),
    subreddit: Optional[str] = Query(None, description="Limit to subreddit (e.g. 'cybersecurity')"),
    limit: int = Query(10, le=25),
    sort: str = Query("relevance", enum=["relevance", "new", "hot", "top"]),
):
    """Search Reddit using the public JSON API — no OAuth required."""
    base = f"https://www.reddit.com/r/{subreddit}/search.json" if subreddit else "https://www.reddit.com/search.json"
    url  = f"{base}?q={quote_plus(q)}&sort={sort}&limit={limit}&restrict_sr={'true' if subreddit else 'false'}&t=month"
    data = _get(url)
    if "error" in data:
        return JSONResponse({"error": data["error"]}, status_code=502)

    posts = []
    for child in (data.get("data", {}).get("children") or []):
        p = child.get("data", {})
        posts.append({
            "title":      p.get("title", ""),
            "url":        f"https://reddit.com{p.get('permalink', '')}",
            "subreddit":  p.get("subreddit", ""),
            "score":      p.get("score", 0),
            "comments":   p.get("num_comments", 0),
            "created":    datetime.fromtimestamp(p.get("created_utc", 0), tz=timezone.utc).isoformat(),
            "selftext":   (p.get("selftext") or "")[:300],
        })
    return {"query": q, "count": len(posts), "results": posts}


# ── GitHub Trending ────────────────────────────────────────────────────────────
@app.get("/github-trending")
def github_trending(
    language: Optional[str] = Query(None, description="Filter by language, e.g. 'python'"),
    since: str = Query("daily", enum=["daily", "weekly", "monthly"]),
    limit: int = Query(10, le=25),
):
    """Fetch GitHub trending repos via the unofficial trending API (no key needed)."""
    base_url = "https://api.gitterapp.com/repositories"
    params   = f"?since={since}"
    if language:
        params += f"&language={quote_plus(language)}"
    data = _get(base_url + params)

    if isinstance(data, dict) and "error" in data:
        # Fallback: gh-trending-api (community mirror)
        fallback = f"https://gh-trending-api.com/repositories{params}"
        data = _get(fallback)

    if isinstance(data, dict) and "error" in data:
        return JSONResponse({"error": "Both trending APIs unreachable."}, status_code=502)

    repos = []
    for r in (data if isinstance(data, list) else [])[:limit]:
        repos.append({
            "name":        r.get("name") or r.get("fullName", ""),
            "description": (r.get("description") or "")[:200],
            "url":         r.get("url") or f"https://github.com/{r.get('fullName', '')}",
            "language":    r.get("language", ""),
            "stars":       r.get("stars", 0),
            "forks":       r.get("forks", 0),
            "stars_today": r.get("starsToday") or r.get("currentPeriodStars", 0),
        })
    return {"since": since, "language": language, "count": len(repos), "results": repos}


# ── RSS / Atom feeds ───────────────────────────────────────────────────────────
@app.get("/rss")
def rss_fetch(
    url: str = Query(..., description="RSS or Atom feed URL"),
    limit: int = Query(10, le=30),
):
    """Parse any public RSS or Atom feed."""
    if not HAS_FEEDPARSER:
        return JSONResponse({"error": "feedparser not installed. Run: pip install feedparser"}, status_code=503)
    try:
        feed = feedparser.parse(url, agent=UA, request_headers={"Accept": "application/rss+xml, application/atom+xml, */*"})
        if feed.bozo and not feed.entries:
            return JSONResponse({"error": f"Feed parse error: {feed.bozo_exception}"}, status_code=502)
        items = []
        for e in feed.entries[:limit]:
            items.append({
                "title":     e.get("title", ""),
                "url":       e.get("link", ""),
                "published": e.get("published", ""),
                "summary":   (e.get("summary") or "")[:300],
                "author":    e.get("author", ""),
            })
        return {
            "feed_title": feed.feed.get("title", url),
            "feed_url":   url,
            "count":      len(items),
            "results":    items,
        }
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)}, status_code=500)


# ── DuckDuckGo Instant Answer ─────────────────────────────────────────────────
@app.get("/search")
def ddg_search(
    q: str = Query(..., description="Search query"),
):
    """DuckDuckGo Instant Answer API — no key, best for factual lookups."""
    url  = f"https://api.duckduckgo.com/?q={quote_plus(q)}&format=json&no_redirect=1&no_html=1&skip_disambig=1"
    data = _get(url)
    if "error" in data:
        return JSONResponse({"error": data["error"]}, status_code=502)
    return {
        "query":          q,
        "abstract":       data.get("Abstract", ""),
        "abstract_url":   data.get("AbstractURL", ""),
        "abstract_source":data.get("AbstractSource", ""),
        "answer":         data.get("Answer", ""),
        "answer_type":    data.get("AnswerType", ""),
        "definition":     data.get("Definition", ""),
        "definition_url": data.get("DefinitionURL", ""),
        "related":        [
            {"text": r.get("Text", ""), "url": r.get("FirstURL", "")}
            for r in (data.get("RelatedTopics") or [])[:5]
            if r.get("Text")
        ],
    }


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "feedparser": HAS_FEEDPARSER}


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("Agent Reach Service starting on http://localhost:5051")
    uvicorn.run(app, host="127.0.0.1", port=5051, log_level="warning")

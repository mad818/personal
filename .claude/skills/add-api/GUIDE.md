# Add API — Deep Guide

## Full settings panel HTML template

```html
<!-- Find near cfg-firms-key or cfg-otx-key and add below -->
<div class="sp-row">
  <label class="sp-lbl">
    MyService API Key
    <a class="sp-link" href="https://myservice.com/docs/api" target="_blank">Get free key →</a>
  </label>
  <input class="sp-inp mono" id="cfg-myservice-key" type="password" placeholder="ms-…" autocomplete="off"/>
  <div class="sp-note">
    Enables [feature description]. Free tier: [rate limit]. No credit card required.
  </div>
</div>
```

Key points:
- Always use `type="password"` for API keys — prevents shoulder surfing
- Add `autocomplete="off"` — prevents browser from autofilling the wrong key
- Link to the specific API docs or signup page, not the homepage

## loadSettings() and saveSettings() wiring

```javascript
// In loadSettings() — find the cfg-firms-key block and add below it
if ($('cfg-myservice-key')) $('cfg-myservice-key').value = S.settings.myServiceKey || '';

// In saveSettings() — find the cfg-firms-key block and add below it
if ($('cfg-myservice-key')) S.settings.myServiceKey = $('cfg-myservice-key').value.trim();
```

## Auth patterns

### API key in query string (most common)
```javascript
const r = await fetch(`https://api.example.com/data?apikey=${key}&limit=50`);
```

### API key in header
```javascript
const r = await fetch('https://api.example.com/data', {
  headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
});
```

### OAuth / token exchange (rare — avoid if possible)
If the API requires OAuth, prefer finding a simpler free alternative. OAuth in a single-file browser app exposes the flow. If you must: use PKCE, never store the client secret, document the risk clearly.

## CORS troubleshooting

If the fetch fails with "blocked by CORS policy":

1. Check if the API has a CORS-friendly endpoint (often `api.` vs `www.` differs)
2. Check if there's a `?callback=` JSONP option (old APIs)
3. Use the existing server-side proxy pattern in `app/api/` for the React app
4. For the HTML app only: find a free CORS proxy (never use untrusted third-party proxies for authenticated requests)

```javascript
// Safe CORS bypass for public unauthenticated APIs only
const CORS_PROXY = 'https://corsproxy.io/?';
const r = await fetch(CORS_PROXY + encodeURIComponent('https://api.public-data.com/endpoint'));
```

Never route authenticated requests through a CORS proxy.

## Rate limit handling

```javascript
async function loadMyService() {
  const key = (S.settings.myServiceKey || '').trim();
  if (!key) return;

  // Rate limit guard — don't fetch more often than the API allows
  const now = Date.now();
  if (_myServiceLastFetch && now - _myServiceLastFetch < 60_000) return;  // 1 min cooldown
  _myServiceLastFetch = now;

  try {
    const r = await fetch(`https://api.example.com/data?key=${key}`);

    // Handle rate limit response
    if (r.status === 429) {
      showToast('API rate limit reached — try again in a minute', 'warning');
      return;
    }
    if (!r.ok) return;

    const data = await r.json();
    _myServiceData = data;
    renderMyService(data);
  } catch(e) {}
}

let _myServiceData    = null;
let _myServiceLastFetch = 0;
```

## Free API sources worth knowing

| Service | Free tier | Best for |
|---------|-----------|---------|
| CoinGecko | 10k calls/month | Crypto prices, market data |
| Alternative.me | Unlimited | Fear & Greed, Crypto Fear |
| USGS | Unlimited | Earthquakes, geohazards |
| OpenSky | 10k calls/day | Live flight positions |
| CelesTrak | Unlimited | Satellite TLEs |
| NOAA SWPC | Unlimited | Space weather, solar flares |
| FRED (St. Louis Fed) | Unlimited with key | Macro economic data |
| GDELT | Unlimited | Global news event data |
| Alpha Vantage | 25 calls/day free | Stock quotes, FX |
| Polygon.io | 5 calls/min free | US equities, options |
| Glassnode | Limited free | On-chain Bitcoin metrics |
| Dune Analytics | Public queries free | On-chain SQL queries |

## Security checklist

- [ ] Key never appears in `console.log` or error messages
- [ ] Key always read from `S.settings` at call time — never cached in a module variable
- [ ] Key field is `type="password"` in settings HTML
- [ ] No key in URL parameters if the URL might be logged (use headers instead)
- [ ] If the API key has scopes, request minimum necessary permissions

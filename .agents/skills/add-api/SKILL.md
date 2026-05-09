---
name: add-api
description: Wire any new external data source or API key into nexus-final.html. Use when adding a new third-party service, key-protected endpoint, or free data source. Read this before touching any code.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
context: fork
---

# Add API — Quick Reference

## Existing API keys (auto-loaded)
!`grep -oP "(?<=  )[a-zA-Z]+Key(?=:)" nexus-final.html 2>/dev/null | sort -u || echo "Run from project root"`

## 5-file touch points (in order)
1. `DEFAULT_CFG` — add the key with a comment (~line 3414)
2. Settings panel HTML — add the input field
3. `loadSettings()` — wire the read
4. `saveSettings()` — wire the write
5. Fetch function — write the data loader with `try/catch`

## Key naming convention
```javascript
// camelCase, end with Key for user-supplied keys
myServiceKey: '',  // MyService — myservice.com
```

## Finding anchor points
```bash
# Find DEFAULT_CFG location
grep -n "DEFAULT_CFG\|otxKey\|firmsKey" nexus-final.html | head -10

# Find settings panel (add your input near related keys)
grep -n "cfg-firms-key\|cfg-otx-key" nexus-final.html | head -10

# Find load/saveSettings
grep -n "function loadSettings\|function saveSettings" nexus-final.html
```

## Fetch function template
```javascript
async function loadMyService() {
  const key = (S.settings.myServiceKey || '').trim();
  if (!key) return;
  try {
    const r    = await fetch(`https://api.myservice.com/endpoint?key=${key}`);
    const data = await r.json();
    S.signals.myService = data;
    renderMyService(data);
  } catch(e) {}
}
```

## Checklist
- [ ] Added to `DEFAULT_CFG`
- [ ] Settings HTML input added (type="password" for keys)
- [ ] Wired in `loadSettings()`
- [ ] Wired in `saveSettings()`
- [ ] Fetch function written with `try/catch`
- [ ] Called from appropriate tab init
- [ ] COMMAND tab updated if the data is dashboard-level
- [ ] Key never logged to console

## Deep guide
For full HTML templates, auth patterns, and CORS troubleshooting:
@.Codex/skills/add-api/GUIDE.md

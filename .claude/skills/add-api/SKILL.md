# Skill: Add a New API to Nexus

Use this skill when wiring any new external data source into nexus-final.html.

## Steps

1. **Read CLAUDE.md first** — confirm the key naming convention and DEFAULT_CFG pattern.

2. **Add the key to DEFAULT_CFG** (around line 3414):
```javascript
myServiceKey: '',  // MyService — myservice.com
```

3. **Add the settings panel input** — find the relevant section in the settings panel HTML (search for `cfg-firms-key` to find the API keys section):
```html
<div class="sp-row">
  <label class="sp-lbl">MyService API Key <a class="sp-link" href="https://myservice.com" target="_blank">Get free →</a></label>
  <input class="sp-inp mono" id="cfg-myservice-key" type="password" placeholder="key…"/>
  <div class="sp-note">Brief description of what this enables.</div>
</div>
```

4. **Wire loadSettings()** — search for `cfg-firms-key` in loadSettings and add below it:
```javascript
if($('cfg-myservice-key')) $('cfg-myservice-key').value = S.settings.myServiceKey||'';
```

5. **Wire saveSettings()** — search for `cfg-firms-key` in saveSettings and add below it:
```javascript
if($('cfg-myservice-key')) S.settings.myServiceKey = $('cfg-myservice-key').value.trim();
```

6. **Write the fetch function** — place near related functions, always wrapped in try/catch:
```javascript
async function loadMyService() {
  const key = (S.settings.myServiceKey||'').trim();
  if(!key) return;
  try {
    const r = await fetch(`https://api.myservice.com/endpoint?key=${key}`);
    const data = await r.json();
    // store in S.signals or render directly
  } catch(e) {}
}
```

7. **Call on tab init** if it belongs to a specific tab — add to the relevant init function.

8. **Re-render COMMAND KPIs** if the data should appear there — add `if(S.tab==='superset') renderSSKPIs();` after storing data.

## Checklist
- [ ] Added to DEFAULT_CFG
- [ ] Added settings HTML input
- [ ] Wired in loadSettings()
- [ ] Wired in saveSettings()
- [ ] Fetch function written with try/catch
- [ ] Called on appropriate tab init
- [ ] COMMAND tab updates if relevant

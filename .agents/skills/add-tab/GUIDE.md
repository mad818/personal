# Add Tab — Deep Guide

## Full HTML/JS templates

### Nav button
```html
<button class="np" data-tab="mytab" data-tip="MYTAB — One-line description of what this tab does." data-tip-pos="below">🔧 MYTAB</button>
```
Tips: keep the emoji distinct from existing tabs, keep the label ≤6 chars.

### HTML panel
```html
<!-- ── MYTAB ───────────────────────────────────────────────────────────── -->
<div id="tab-mytab" style="display:none">
  <div style="max-width:1100px;margin:0 auto;padding:18px 16px 40px">

    <!-- Header row -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
      <div>
        <div style="font-size:20px;font-weight:800;color:var(--text)">TAB TITLE</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">Brief subtitle describing the data source</div>
      </div>
      <button class="ms-scan-btn" onclick="loadMyTab()">
        <span class="live-dot"></span> Refresh
      </button>
    </div>

    <!-- Main content container -->
    <div id="mt-content">
      <div style="color:var(--text3);text-align:center;padding:64px 0">Loading…</div>
    </div>

  </div>
</div>
```

### switchTab() registration
```javascript
// Find the tabs array (search for "articles','security")
['articles','security','saved','buys','world','superset','strategy','mytab'].forEach(t=>{
  // existing code
});

// Find the init dispatch block and add:
if(tab==='mytab') initMyTab();
```

### Init function + data loader
```javascript
// ═══════════════════════════════════════════════════════════════════════════
// ── MYTAB ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let _myTabData = null;

function initMyTab() {
  if (!_myTabData) loadMyTab();
}

async function loadMyTab() {
  const el = $('mt-content');
  if (!el) return;
  try {
    const r    = await fetch('https://api.example.com/endpoint');
    const data = await r.json();
    _myTabData = data;
    renderMyTab(data);
  } catch(e) {
    if (el) el.innerHTML = '<div style="color:var(--text3);text-align:center;padding:64px 0">Data unavailable</div>';
  }
}

function renderMyTab(data) {
  const el = $('mt-content');
  if (!el || !data) return;
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
      ${data.items.map(item => `
        <div class="mt-card">
          <div class="mt-label">${esc(item.title)}</div>
          <div class="mt-value">${fmtPrice(item.value)}</div>
        </div>
      `).join('')}
    </div>
  `;
}
```

### CSS block
```css
/* ══ MYTAB ══════════════════════════════════════════════════════════════════ */
.mt-card  { background:var(--surf2); border:1px solid var(--border); border-radius:var(--r); padding:16px; transition:var(--t); }
.mt-card:hover { border-color:var(--border2); }
.mt-label { font-size:10px; text-transform:uppercase; letter-spacing:.4px; color:var(--text3); margin-bottom:6px; }
.mt-value { font-size:22px; font-weight:800; color:var(--text); }
.mt-sub   { font-size:12px; color:var(--text2); margin-top:4px; }
```

---

## If the tab needs an API key

Follow the `add-api` skill for the full wiring:
@.claude/skills/add-api/SKILL.md

Quick check — look for a similar key near line 3414 in `DEFAULT_CFG`:
```bash
grep -n "DEFAULT_CFG\|apiKey\|Key:" nexus-final.html | head -30
```

---

## COMMAND tab integration

If the tab's data should surface as a KPI card on the COMMAND (superset) tab:
1. Add the metric to `renderSSKPIs()` — search for that function name
2. Call `if(S.tab==='superset') renderSSKPIs();` after data loads

---

## Things to check before calling done

```bash
# No duplicate function names
grep -c "function initMyTab" nexus-final.html    # should be 1
grep -c "function loadMyTab" nexus-final.html    # should be 1
grep -c "function renderMyTab" nexus-final.html  # should be 1

# CSS prefix is unique
grep -c "\.mt-" nexus-final.html  # these should all be YOUR new styles
```

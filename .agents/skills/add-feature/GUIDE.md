# Add Feature — Deep Guide

## Planning (do this first — every time)

1. Write a spec to `specs/features/[feature-name].md`:
   - What it does in one sentence
   - Which tab and surface it belongs to
   - What data it needs and where it comes from
   - New state it introduces (if any)
   - Edge cases: empty state, API down, rate limited, no API key

2. Add tasks to `tasks/todo.md` with the exact steps

3. Search for similar existing patterns before building:
```bash
grep -n "functionName\|class-prefix\|api-url" nexus-final.html | head -20
```

---

## HTML app — full pattern

### CSS block
```css
/* ══ FEATURE NAME ═══════════════════════════════════════════════════════════ */
.fx-panel   { background:var(--surf2); border:1px solid var(--border); border-radius:var(--r); padding:16px; }
.fx-header  { font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:var(--text3); margin-bottom:12px; }
.fx-card    { background:var(--surf3); border:1px solid var(--border2); border-radius:var(--rs); padding:12px; }
.fx-label   { font-size:10px; text-transform:uppercase; letter-spacing:.4px; color:var(--text3); }
.fx-value   { font-size:20px; font-weight:800; color:var(--text); }
.fx-sub     { font-size:12px; color:var(--text2); }
.fx-pos     { color:var(--fhi); }
.fx-neg     { color:var(--flo); }
```

### HTML block
```html
<!-- ══ FEATURE NAME ══════════════════════════════════════════════════════ -->
<div class="fx-panel" id="fx-panel">
  <div class="fx-header">
    <span class="live-dot"></span> FEATURE NAME
    <button class="ms-scan-btn" onclick="loadFeature()">Refresh</button>
  </div>
  <div id="fx-content">
    <div style="color:var(--text3);text-align:center;padding:32px 0">Loading…</div>
  </div>
</div>
```

### JS block
```javascript
// ═══════════════════════════════════════════════════════════════════════════
// ── FEATURE NAME ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let _featureData = null;  // cached data — prevents redundant fetches

async function loadFeature() {
  const el = $('fx-content');
  if (!el) return;
  try {
    const r    = await fetch('https://api.example.com/endpoint');
    const data = await r.json();
    _featureData = data;
    renderFeature(data);
    if (S.tab === 'superset') renderSSKPIs();  // update COMMAND tab if needed
  } catch(e) {
    if (el) el.innerHTML = '<div style="color:var(--text3);text-align:center;padding:32px 0">Data unavailable</div>';
  }
}

function renderFeature(data) {
  const el = $('fx-content');
  if (!el || !data) return;
  el.innerHTML = `
    <div class="fx-card">
      <div class="fx-label">METRIC</div>
      <div class="fx-value">${fmtPrice(data.value)}</div>
    </div>
  `;
}
```

### Init hook
```javascript
function initXTab() {
  // existing init code...
  if (!_featureData) loadFeature();
}
```

---

## React app — full pattern

### 1. Add types (if needed)
In `store/useStore.ts` or `components/home/office/types.ts`:
```typescript
export interface FeatureData {
  value:   number
  label:   string
  updatedAt: string
}
```

### 2. Add store slice (if state is needed)
In `store/useStore.ts`, add to the state interface and initial state:
```typescript
featureData:       FeatureData | null
setFeatureData:    (data: FeatureData) => void
```

### 3. Build the component
```typescript
'use client'
import { useStore } from '@/store/useStore'
import { fmtPrice }  from '@/lib/helpers'

export function FeatureName() {
  const data = useStore(s => s.featureData)

  if (!data) return (
    <div className="text-[var(--text3)] text-center py-8">Loading…</div>
  )

  return (
    <div className="bg-[var(--surf2)] border border-[var(--border)] rounded-[var(--r)] p-4">
      <div className="text-[10px] uppercase tracking-[.4px] text-[var(--text3)] mb-3">
        FEATURE NAME
      </div>
      <div className="text-xl font-bold text-[var(--text)]">
        {fmtPrice(data.value)}
      </div>
    </div>
  )
}
```

---

## Common mistakes to avoid

**Don't hardcode colours:**
```javascript
// ✗ Wrong
color: '#10b981'
// ✓ Right
color: var(--fhi)
```

**Don't read Fear & Greed as a number:**
```javascript
// ✗ Wrong — fg is an object
if (S.signals.fg > 50) { ... }
// ✓ Right
if (S.signals.fg.value > 50) { ... }
```

**Don't skip the re-render guard:**
```javascript
// ✗ Fetches every tab switch
function initXTab() { loadFeature(); }
// ✓ Fetches once, uses cache
function initXTab() { if (!_featureData) loadFeature(); }
```

**Don't make direct AI calls:**
```javascript
// ✗ Wrong
fetch('https://api.anthropic.com/...', { headers: { 'x-api-key': S.settings.apiKey } })
// ✓ Right
const result = await stratAICall(prompt)
```

---

## Gotchas (highest-signal failure points)

These are the exact mistakes this codebase has produced. Read before starting.

**1. Skipping the init cache guard causes duplicate fetches on every tab switch.**
Always wrap the fetch call with a cache check in the init function:
```javascript
function initXTab() { if (!_featureData) loadFeature(); }
```
Without this, every tab switch hits the API again and thrashes the UI.

**2. CSS prefix collision breaks existing styles silently.**
Check used prefixes before picking yours: `grep -oE "\.[a-z]{2,4}-" nexus-final.html | sort -u`.
Never reuse `ms-`, `pm-`, `sb-`, `ss-`, `fx-`.

**3. Adding a new function with a name that already exists silently overrides the original.**
After adding any new function to the HTML app: `grep -c "function myFunctionName" nexus-final.html`.
Result must be 1. If it's 2, you have a collision.

**4. Fear & Greed is always an object — never pass it as a number to a condition.**
```javascript
// ✗ This is always truthy — fg is an object
if (S.signals.fg) { ... }
// ✓ Correct
if (S.signals.fg?.value > 50) { ... }
```

**5. Direct Anthropic/OpenAI API calls will expose the user's key in network traffic.**
Always use `stratAICall()` or `callAI()`. Never construct `fetch('https://api.anthropic.com/...')` directly, even in a new feature.

**6. React components must use reactive Zustand selectors or they won't update.**
```typescript
// ✗ Snapshot at mount — component goes stale
const { prices } = useStore()
// ✓ Reactive — re-renders when prices change
const prices = useStore(s => s.prices)
```

---

## UI token reference
```
Backgrounds:  var(--surf)    #0f1117  — card
              var(--surf2)   #151820  — secondary card
              var(--surf3)   #1b1e2b  — tertiary / nested

Borders:      var(--border)  #1e2233
              var(--border2) #2a2f48  — emphasis border

Text:         var(--text)    #dde1f0  — primary
              var(--text2)   #6875a0  — secondary / muted
              var(--text3)   #353c5e  — tertiary / label

Accent:       var(--accent)  #4f6ef7  — primary blue
              var(--accent2) #7c3aed  — purple

Status:       var(--fhi)     #10b981  — green / bullish / positive
              var(--fmd)     #f59e0b  — yellow / neutral / warning
              var(--flo)     #ef4444  — red / bearish / error

Radius:       var(--r)  10px — standard card
              var(--rs)  6px — small element

Transition:   var(--t)  .18s cubic-bezier(.4,0,.2,1)
```

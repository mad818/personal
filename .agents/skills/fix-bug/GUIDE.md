# Fix Bug — Deep Guide

## Data flow trace (HTML app)

When a value displays wrong or missing, trace this exact path:

```
1. Find the API fetch:
   grep -n "fetch\|api.coingecko\|api.alternative" nexus-final.html | grep -i "featureName"

2. Find where data is stored:
   grep -n "S\.signals\.\|S\.prices\." nexus-final.html | grep -i "featureName"

3. Find the render function:
   grep -n "textContent\|innerHTML\|fmtPrice" nexus-final.html | grep -i "elementId"

4. Read all three locations (20+ lines each) before touching anything
```

## Common bug patterns and fixes

### [object Object] in display
**Cause:** Reading an object as a string in `.textContent`
**Pattern:** `Fear & Greed` — stored as `{ value, label }`, never a plain number
```javascript
// ✗ Bug
el.textContent = S.signals.fg;          // prints [object Object]
el.textContent = S.signals.fg.value;    // prints the number but loses context
// ✓ Fix
el.textContent = `${S.signals.fg.value} ${S.signals.fg.label}`;
```

### Data not showing on tab open
**Cause:** Async data loads after tab init, render runs on empty state
```javascript
// ✓ Fix — render in the data callback too
async function loadFeature() {
  const data = await fetch(...).then(r => r.json());
  S.signals.feature = data;
  if (S.tab === 'targetTab') renderFeature();  // ← add this
}
```

### API returns nothing / 401
```javascript
// Check: is the key present?
console.log('key:', S.settings.keyName);
// Check: CORS — look for "blocked by CORS policy" in the browser console
// Fix: use a CORS-friendly endpoint or server-side proxy
```

### CSS not applying
```
1. Check specificity — the modernization layer at bottom of <style> uses high specificity
2. Use !important in the modernization layer if you need to override base styles
3. Confirm exact class name: grep -n "className" nexus-final.html | head -10
```

### Feature works on first load, breaks on tab switch
**Cause:** Init function called before DOM is ready, or null ref
```javascript
// ✓ Always null-check before accessing elements
function renderFeature(data) {
  const el = $('feature-id');
  if (!el) return;  // ← add this guard
  el.innerHTML = '...';
}
```

### Duplicate function name (after adding a new function)
```bash
# Always check after adding functions
grep -c "function functionName" nexus-final.html
# Should return 1 — if 2+, the later one silently overrides the earlier one
```

---

## React/Next.js specific bugs

### Zustand selector not reactive
```typescript
// ✗ Not reactive — the component won't re-render when prices change
const { prices } = useStore()
// ✓ Reactive — subscribes to the specific slice
const prices = useStore(s => s.prices)
```

### TypeScript: 'unknown' type in reduce/map
```typescript
// ✗ TypeScript infers unknown
const total = Object.values(agentStats).reduce((s, a) => s + a.totalTasks, 0)
// ✓ Explicit generic fixes it
const total = Object.values(agentStats).reduce<number>((s, a) => s + a.totalTasks, 0)
```

### Module not found (after file rename)
When renaming `.ts` to `.tsx` (or vice versa):
1. Check `import` statements — they don't need the extension, resolve automatically
2. The issue is usually webpack's in-memory cache — restart the dev server
3. If still failing: delete `.next/` and restart

### JSX in a `.ts` file
```
Error: This expression is not callable. (JSX syntax in non-TSX file)
Fix: rename the file from .ts to .tsx
Note: TypeScript resolves ./palette to .tsx automatically — no import changes needed
```

---

## Lessons learned (project-specific)

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Fear & Greed shows [object Object] | Read fg as plain object | Always use `.value` and `.label` |
| palette.ts JSX errors | JSX in non-TSX file | Rename to `.tsx` |
| palette.ts webpack 500 | Dev server cached old filename | Delete `.next/`, restart server |
| Sub-agent broke JSDoc | Replaced `/**` with `// ──` header | Python slice-replace to restore openers |
| AgentStats reduce type error | `unknown` inferred in reduce | Add `<number>` generic |
| AppState not exported | Type alias was not exported | Define local interface with only needed fields |

Add new rows here after every bug fix.

---

## Gotchas (highest-signal failure points)

These are the exact mistakes this codebase has produced. Read before starting.

**1. Fear & Greed is an object, not a number.**
`S.signals.fg` is `{ value: number, label: string }`. Reading it directly in a template or condition produces `[object Object]` or always-truthy. Always destructure: `S.signals.fg.value`, `S.signals.fg.label`.

**2. Fixing a TypeScript error by casting to `any` makes it worse.**
The correct fix is almost always a local interface or a typed generic. Example: `reduce<number>(...)` not `(s as any) + a.totalTasks`.

**3. Renaming `.ts` to `.tsx` doesn't cause import errors — stale webpack cache does.**
If you see a 500 or "module not found" after a file rename, the import isn't wrong. Delete `.next/` and restart the dev server. Don't waste time hunting the import.

**4. `S.prices[coinId]` can be `undefined`.**
The prices object is populated async. Always null-check: `S.prices[id]?.price ?? 0`.

**5. Editing a function that exists twice silently fails.**
Always check: `grep -c "function functionName" nexus-final.html`. If it returns 2, you likely edited the wrong instance and the later one overrides it.

**6. A fix that passes tsc can still break the HTML app.**
TypeScript doesn't cover the 12,265-line HTML app. After any HTML edit, open the tab in the browser and confirm the feature works manually — don't rely on tsc alone.

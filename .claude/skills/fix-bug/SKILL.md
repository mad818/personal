# Skill: Fix a Bug in Nexus

Use this skill when debugging any issue in nexus-final.html.

## Diagnosis steps

1. **Identify the symptom** — what exactly is wrong? Visual artifact, wrong value, broken interaction, API error?

2. **Find the element** — use grep to locate the relevant HTML/CSS/JS:
```bash
grep -n "element-id\|function-name\|className" nexus-final.html | head -20
```

3. **Read surrounding context** — always read 20-30 lines around the match before editing. Never edit blind.

4. **Check data flow** — for display bugs, trace the data from source to render:
   - Where is data fetched? (search for the API URL)
   - Where is it stored? (usually `S.signals.X` or `S.prices.X`)
   - Where is it rendered? (search for the element id)

## Common bug patterns

### [object Object] display
Cause: reading an object as a string in `.textContent`.
Fix: access the specific field, e.g. `S.signals.fg` → use `.value` and `.label`.

### Data not showing on tab open
Cause: async data loads after tab init runs.
Fix: add `if(S.tab==='tabname') renderFunction();` in the data load callback.

### API returns nothing
Check: is the key set in settings? Log `S.settings.keyName` to verify.
Check: CORS — browser may block the request. Use a CORS proxy or find a CORS-friendly endpoint.

### CSS not applying
Check: specificity — the modernization layer at bottom of `<style>` may need `!important`.
Check: class name — use grep to confirm the exact class used in HTML vs CSS.

### Feature works on first load but breaks on tab switch
Cause: init function called before DOM is ready, or element id collision.
Fix: add a null check `if(!el) return;` before accessing elements.

## Before any edit
- Confirm exact line number with grep
- Read 20+ lines of context
- Make the smallest possible change
- Verify no duplicate function names after adding new functions:
```bash
grep -c "function functionName" nexus-final.html
```

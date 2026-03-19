# Skill: Add a Feature to Nexus

Use this skill when building any new self-contained feature into nexus-final.html.

## Planning

Before writing a single line:
1. Identify which tab the feature belongs to
2. Check if similar features already exist — read relevant tab HTML and JS
3. Identify any API keys needed
4. Decide on CSS prefix (unique 2-3 char prefix for all new classes)

## Structure of a well-built Nexus feature

### 1. CSS block
Add near top of `<style>`, grouped with tab section. Comment clearly:
```css
/* ══ FEATURE NAME ══════════════════════════════════════════════════════════ */
.fx-panel { ... }
.fx-header { ... }
.fx-card { ... }
```

### 2. HTML block
Add inside the relevant `<div id="tab-X">`:
```html
<!-- ══ FEATURE NAME ════════════════════════════════════════════════════ -->
<div class="fx-panel" id="fx-panel">
  <div class="fx-header">...</div>
  <div id="fx-content">Loading…</div>
</div>
```

### 3. JS block
Add near bottom of `<script>`, before `</script>`, grouped and commented:
```javascript
// ═══════════════════════════════════════════════════════════════════════════
// ── FEATURE NAME ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

async function loadFeature() {
  // fetch data
}

function renderFeature(data) {
  // render to DOM
}
```

### 4. Init hook
Add to the tab's init function:
```javascript
function initXTab() {
  // existing code...
  if(!_featureLoaded) loadFeature();
}
```

## Design principles
- No loading spinners that stay forever — show a fallback message on error
- All fetches in try/catch with silent failure
- Data stored in module-level `let _featureData = null` variable
- Re-render guard: check if already loaded before re-fetching
- If it updates the COMMAND tab, call `renderSSKPIs()` after data loads

## UI consistency
- Use existing CSS variables — never hardcode colors
- Cards: `background: var(--surf2); border: 1px solid var(--border); border-radius: var(--r)`
- Labels: `font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: var(--text3)`
- Values: `font-size: 16-24px; font-weight: 700-900; color: var(--text)`
- Primary buttons: add class `ms-scan-btn` or use gradient pattern from modernization layer
- Live data: add `<span class="live-dot"></span>` before the label

## Checklist
- [ ] CSS added with unique prefix
- [ ] HTML added to correct tab
- [ ] JS functions written with try/catch
- [ ] Init hook added
- [ ] API key added if needed (see add-api skill)
- [ ] Error state shown if fetch fails
- [ ] COMMAND tab updated if relevant

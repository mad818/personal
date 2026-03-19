# Skill: Add a New Tab to Nexus

Use this skill when adding a new top-level tab to nexus-final.html.

## Steps

1. **Add the nav button** — find the `.nav-pills` section in the header HTML and insert:
```html
<button class="np" data-tab="mytab" data-tip="MYTAB — description." data-tip-pos="below">🔧 MYTAB</button>
```

2. **Add the tab panel HTML** — find the last `<div id="tab-...">` block and add after it:
```html
<!-- ── MYTAB ──────────────────────────────────────────────────────── -->
<div id="tab-mytab" style="display:none">
  <div style="max-width:1100px;margin:0 auto;padding:18px 16px 40px">
    <!-- content here -->
  </div>
</div>
```

3. **Register in switchTab()** — find `function switchTab(tab)` and add `'mytab'` to the tabs array:
```javascript
['articles','security','saved','buys','world','superset','strategy','mytab'].forEach(t=>{
```

4. **Add tab init call** in switchTab():
```javascript
if(tab==='mytab') initMyTab();
```

5. **Write the init function**:
```javascript
function initMyTab() {
  // render content, fetch data, etc.
}
```

6. **Add CSS** near the top of `<style>`, grouped with related styles. Use a consistent prefix (e.g. `mt-` for my tab).

7. **Update CLAUDE.md** tab structure table.

## Naming conventions
- Tab id: `tab-mytab`
- CSS prefix: `mt-` (2-3 chars, unique)
- Init function: `initMyTab()`
- Data-tab value: `mytab`

## Checklist
- [ ] Nav button added
- [ ] HTML panel added with display:none
- [ ] Registered in switchTab() array
- [ ] Init call added in switchTab()
- [ ] Init function written
- [ ] CSS added with consistent prefix
- [ ] CLAUDE.md updated

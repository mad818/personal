---
name: add-tab
description: Add a new top-level tab to nexus-final.html. Use when creating a new major section of the dashboard. Read this before touching any code.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
context: fork
---

# Add Tab — Quick Reference

## CSS prefix collision check
!`grep -oP "(?<=\.)(ms|pm|sb|ss|mt|[a-z]{2,3})(?=-)" nexus-final.html 2>/dev/null | sort -u | head -20 || echo "Run from project root"`

## 7-step process (in order)
1. Nav button — add to `.nav-pills` in header HTML
2. HTML panel — add `<div id="tab-mytab" style="display:none">` after last tab panel
3. Register — add `'mytab'` to the tabs array in `switchTab()`
4. Init call — add `if(tab==='mytab') initMyTab();` in `switchTab()`
5. Init function — write `function initMyTab() { ... }`
6. CSS — add near top of `<style>`, unique prefix (e.g. `mt-`)
7. Update CLAUDE.md tab map

## Naming conventions
```
Tab id:        tab-mytab
CSS prefix:    mt-     (unique 2-3 chars across all tabs)
Init fn:       initMyTab()
data-tab:      mytab
```

## Existing prefixes (do not reuse)
`ms-` momentum scanner, `pm-` polymarket, `sb-` shadowbroker, `ss-` superset/command

## Checklist
- [ ] Nav button added with data-tip
- [ ] HTML panel added with `display:none`
- [ ] Registered in switchTab() array
- [ ] Init call added in switchTab()
- [ ] Init function written
- [ ] CSS added with unique prefix
- [ ] CLAUDE.md tab map updated
- [ ] tsc passes if React surface was touched

## Deep guide
For full HTML/JS templates, advanced patterns, and nav styling:
@.claude/skills/add-tab/GUIDE.md

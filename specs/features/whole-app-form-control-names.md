# Whole-App Form Control Names

## One-sentence outcome

Give every active, non-hidden form control outside the private RPG lane a reliable programmatic name and enforce that contract across the React app.

## Surface

This is a whole-app React accessibility contract covering active `app/` and `components/` TSX across HQ, COMMAND, INTEL, ALPHA, CYBER, RECON, VAULT, SKILLS, RESOURCES, IOT, and VEHICLE. The private `components/home/arpg/` lane remains untouched.

## Visual, content, and interaction thesis

- **Visual thesis:** zero visible redesign. Existing layouts, tokens, spacing, focus rings, placeholders, and workplane hierarchy remain unchanged.
- **Content plan:** reuse the concise operator term already visible beside each control; use task-specific `aria-label` text only when an existing visible label is not programmatically associated.
- **Interaction thesis:** pointer, keyboard, focus order, validation, submission, persistence, and provider behavior remain identical; assistive technology gains a stable name as focus reaches every control.

## Data and state

No API, provider, fetch, route, Zustand state, persistence, or data-source change is introduced. The tranche changes JSX semantics and adds a repository validator.

## Accessibility contract

A visible, non-hidden `<input>`, `<textarea>`, or `<select>` passes when at least one of these is true:

1. It is wrapped by a native `<label>`.
2. Its literal `id` is targeted by a native label's literal `htmlFor` in the same file.
3. It has a non-empty `aria-label`.
4. It has a non-empty `aria-labelledby`.

Placeholder and `title` text do not count as the sole programmatic name. Dynamic mapped fields may use an existing field-label expression such as `aria-label={field.label}`.

## Implementation boundaries

- Preserve placeholder text as format guidance rather than treating it as a label.
- Prefer native label association when it can be added without restructuring interaction; otherwise add a concise task-specific `aria-label`.
- Include file inputs, ranges, checkboxes, read-only outputs, search fields, and selects.
- Exclude `input[type="hidden"]` and the private RPG directory.
- Add a TypeScript-AST validator that reports the file, line, and control tag for every violation.
- Wire the validator into the existing shell accessibility command so the full repository gate inherits it.

## Edge cases

- Conditional controls and mapped form rows must retain names in source regardless of runtime branch.
- A spread prop is not assumed to contain a name; the control must expose its naming contract locally.
- A nearby `<div>` or placeholder is visual context only and does not satisfy the programmatic-name contract.
- Read-only output controls still need names because they remain focusable or selectable.

## Acceptance criteria

1. The current audit of 112 unnamed controls across 37 active components reaches zero violations.
2. The validator scans active `app/` and `components/` TSX recursively, excludes the private RPG lane and hidden inputs, and emits actionable file/line evidence.
3. Removing a native or ARIA name from any covered control makes `npm run shell:accessibility:check` fail.
4. No CSS, layout, route, provider, store, or persistence behavior changes.
5. Focused validation, `npx tsc --noEmit`, lint, `npm run verify`, `npm run build`, and `git diff --check` pass.

## Benefits

- Screen readers announce the purpose of every form field instead of reading ambiguous placeholders or values.
- Voice-control and automated accessibility tools can target stable control names throughout the product.
- The full source gate prevents new unnamed controls from silently entering any active Nexus workspace.

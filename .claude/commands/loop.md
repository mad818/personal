---
description: Monitor a condition in the background and report when it changes. Pass the check interval and condition as the argument.
argument-hint: [interval] [what to monitor]
---

## Monitor request
$ARGUMENTS

## Current dashboard state
!`cat tasks/todo.md 2>/dev/null | head -20`

## TypeScript status
!`npx tsc --noEmit 2>&1 | head -10`

Based on the monitor request above, set up a background check to:
1. Identify what condition or state to watch (build status, tsc errors, task completion, etc.)
2. Run the appropriate check command on the given interval
3. Report only when the state changes — not on every tick
4. Stop automatically when the condition is met or Mario says stop

If monitoring a build or type check, the pattern is:
  - Run the check command
  - Compare output to the previous run
  - Report only if different: "✅ tsc clean" or "⚠️ 2 new errors"

If monitoring an external resource (API health, price threshold, etc.):
  - Use WebFetch to check the endpoint
  - Compare the key metric to the threshold
  - Report when crossed: "BTC crossed $90K — currently $90,240"

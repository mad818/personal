/* eslint-disable no-console */
/**
 * Regenerate docs/CLAUDE_HANDOFF.md until it matches HEAD.
 * Used by .husky/pre-push and npm run handoff:sync.
 * (Handoff text intentionally omits embedded commit SHA so the file can reach a fixed point.)
 */
const { execSync } = require('node:child_process')

function sh(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true })
}

function isQuiet(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore', shell: true })
    return true
  } catch {
    return false
  }
}

const MAX = 5
for (let i = 0; i < MAX; i++) {
  sh('node scripts/generate-handoff.js --write')
  sh('git add docs/CLAUDE_HANDOFF.md')
  if (isQuiet('git diff --quiet HEAD -- docs/CLAUDE_HANDOFF.md')) {
    process.exit(0)
  }
  sh('git commit -m "chore: sync docs/CLAUDE_HANDOFF.md" --no-verify')
}

console.error(`handoff: sync did not converge after ${MAX} iterations`)
process.exit(1)

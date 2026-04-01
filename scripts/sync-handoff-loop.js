/* eslint-disable no-console */
/**
 * Regenerate the universal handoff outputs until they match HEAD.
 * Used by .husky/pre-push and npm run handoff:sync.
 * (Handoff text intentionally omits embedded commit SHA so the files can reach a fixed point.)
 */
const { execSync } = require('node:child_process')

const HANDOFF_FILES = [
  'docs/AGENT_HANDOFF.md',
  'docs/CLAUDE_HANDOFF.md',
  'docs/CODEX_HANDOFF.md',
  'docs/CURSOR_HANDOFF.md',
]

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
  sh(`git add ${HANDOFF_FILES.join(' ')}`)
  if (isQuiet(`git diff --quiet HEAD -- ${HANDOFF_FILES.join(' ')}`)) {
    process.exit(0)
  }
  sh('git commit -m "chore: sync universal handoff docs" --no-verify')
}

console.error(`handoff: sync did not converge after ${MAX} iterations`)
process.exit(1)

#!/usr/bin/env node
// scripts/orbit.js — npm run orbit:next
// Reads tasks/todo.md and prints the next unfinished task for ORBIT (EL) to pick up.
// Usage: npm run orbit:next

const fs   = require('fs')
const path = require('path')

const TODO_FILE = path.join(process.cwd(), 'tasks', 'todo.md')

function extractPending(lines) {
  const pending = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match lines that look like open checkboxes: - [ ] or * [ ]
    if (/^[-*]\s+\[\s\]/.test(trimmed)) {
      const task = trimmed.replace(/^[-*]\s+\[\s\]\s*/, '').trim()
      if (task) pending.push(task)
    }
    // Also match numbered items without checkboxes that start a section
    if (/^\d+\.\s+(?!\[)/.test(trimmed) && !trimmed.includes('[x]') && !trimmed.includes('[X]')) {
      const task = trimmed.replace(/^\d+\.\s+/, '').trim()
      if (task.length > 5 && !task.startsWith('#')) pending.push(task)
    }
  }

  return pending
}

function getSectionLines(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === heading)
  if (start < 0) return null

  const section = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    if (trimmed.startsWith('## ')) break
    section.push(lines[index])
  }

  return section
}

function main() {
  let content
  try {
    content = fs.readFileSync(TODO_FILE, 'utf-8')
  } catch {
    console.error('ERROR: tasks/todo.md not found. Run from the project root.')
    process.exit(1)
  }

  const lines = content.split('\n')
  const nextUpLines = getSectionLines(lines, '## Next Up')
  const nextUpPending = nextUpLines ? extractPending(nextUpLines) : []
  const pending = nextUpPending.length ? nextUpPending : extractPending(lines)
  const sourceLabel = nextUpPending.length ? 'Next Up ' : ''

  if (!pending.length) {
    console.log('✅ No pending tasks found in tasks/todo.md — backlog is clear.')
    process.exit(0)
  }

  const next = pending[0]
  console.log('─────────────────────────────────────────')
  console.log('ORBIT NEXT TASK')
  console.log('─────────────────────────────────────────')
  console.log(next)
  console.log('')
  console.log(`(${pending.length} ${sourceLabel}task${pending.length > 1 ? 's' : ''} pending)`)
  console.log('─────────────────────────────────────────')
}

main()

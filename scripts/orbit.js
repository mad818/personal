#!/usr/bin/env node
// scripts/orbit.js — npm run orbit:next
// Reads tasks/todo.md and prints the next unfinished task for ORBIT (EL) to pick up.
// Usage: npm run orbit:next

const fs   = require('fs')
const path = require('path')

const TODO_FILE = path.join(process.cwd(), 'tasks', 'todo.md')

function main() {
  let content
  try {
    content = fs.readFileSync(TODO_FILE, 'utf-8')
  } catch {
    console.error('ERROR: tasks/todo.md not found. Run from the project root.')
    process.exit(1)
  }

  const lines = content.split('\n')
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
  console.log(`(${pending.length} task${pending.length > 1 ? 's' : ''} pending total)`)
  console.log('─────────────────────────────────────────')
}

main()

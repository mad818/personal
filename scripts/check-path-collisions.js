#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'coverage',
  '.turbo',
])

function walk(dir, out) {
  let items = []
  try {
    items = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const item of items) {
    if (item.name.startsWith('.') && item.name !== '.claude') continue
    if (item.isDirectory() && SKIP_DIRS.has(item.name)) continue
    const abs = path.join(dir, item.name)
    if (item.isDirectory()) {
      walk(abs, out)
      continue
    }
    if (!item.isFile()) continue
    out.push(path.relative(ROOT, abs).replace(/\\/g, '/'))
  }
}

function main() {
  const allPaths = []
  walk(ROOT, allPaths)

  const buckets = new Map()
  for (const rel of allPaths) {
    const key = rel.toLowerCase()
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(rel)
  }

  const collisions = []
  for (const [, variants] of buckets.entries()) {
    const uniq = [...new Set(variants)]
    if (uniq.length > 1) collisions.push(uniq)
  }

  if (collisions.length === 0) {
    console.log(`Path safety OK: scanned ${allPaths.length} files, 0 collisions.`)
    return
  }

  console.error(`Path collision(s) detected: ${collisions.length}`)
  for (const group of collisions) {
    console.error('---')
    for (const p of group) console.error(p)
  }
  process.exit(1)
}

main()

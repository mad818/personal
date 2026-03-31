#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const capPath = path.join(root, 'desktop', 'src-tauri', 'capabilities', 'default.json');
const confPath = path.join(root, 'desktop', 'src-tauri', 'tauri.conf.json');

function fail(msg) {
  console.error(`❌ tauri-security: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(capPath)) fail('missing capabilities/default.json');
if (!fs.existsSync(confPath)) fail('missing tauri.conf.json');

const capabilities = JSON.parse(fs.readFileSync(capPath, 'utf8'));
const permissions = Array.isArray(capabilities.permissions) ? capabilities.permissions : [];
const disallowed = permissions.filter((p) =>
  typeof p === 'string' && (p.includes('shell:') || p.includes('fs:') || p.includes('process:')),
);
if (disallowed.length) {
  fail(`disallowed permissions present: ${disallowed.join(', ')}`);
}

const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
const csp = conf?.app?.security?.csp;
if (typeof csp !== 'string' || !csp.includes("default-src 'self'")) {
  fail('CSP missing strict default-src self');
}

console.log('✅ tauri-security: capability + CSP checks passed');

#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const capPath = path.join(root, 'desktop', 'src-tauri', 'capabilities', 'default.json');
const confPath = path.join(root, 'desktop', 'src-tauri', 'tauri.conf.json');
const secureTemplatePath = path.join(
  root,
  'desktop',
  'tauri-template',
  'tauri.conf.secure.example.json',
);

function fail(msg) {
  console.error(`❌ tauri-security: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(capPath)) fail('missing capabilities/default.json');
if (!fs.existsSync(confPath)) fail('missing tauri.conf.json');
if (!fs.existsSync(secureTemplatePath)) fail('missing secure Tauri config template');

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

const requiredTargets = ['app', 'dmg', 'msi'];
function validateBundleTargets(label, config) {
  const bundleTargets = Array.isArray(config?.bundle?.targets) ? config.bundle.targets : [];
  const unsupportedTargets = bundleTargets.filter((target) => !requiredTargets.includes(target));
  if (unsupportedTargets.length) {
    fail(`${label} has unsupported bundle targets: ${unsupportedTargets.join(', ')}`);
  }

  const missingTargets = requiredTargets.filter((target) => !bundleTargets.includes(target));
  if (missingTargets.length) {
    fail(`${label} is missing required Windows/macOS bundle targets: ${missingTargets.join(', ')}`);
  }
}

validateBundleTargets('tauri.conf.json', conf);
validateBundleTargets(
  'tauri.conf.secure.example.json',
  JSON.parse(fs.readFileSync(secureTemplatePath, 'utf8')),
);

console.log('✅ tauri-security: capability + CSP + Windows/macOS release-scope checks passed');

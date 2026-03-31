#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('desktop/dist');
const outFile = path.join(targetDir, 'SHA256SUMS.txt');

if (!fs.existsSync(targetDir)) {
  console.error(`❌ checksums: target directory not found: ${targetDir}`);
  process.exit(1);
}

const entries = fs.readdirSync(targetDir).filter((f) => {
  const p = path.join(targetDir, f);
  return fs.statSync(p).isFile() && f !== 'SHA256SUMS.txt';
});

if (entries.length === 0) {
  console.error(`❌ checksums: no files to hash in ${targetDir}`);
  process.exit(1);
}

const lines = [];
for (const f of entries.sort()) {
  const p = path.join(targetDir, f);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  lines.push(`${hash}  ${f}`);
}

fs.writeFileSync(outFile, `${lines.join('\n')}\n`, 'utf8');
console.log(`✅ checksums: wrote ${outFile} (${entries.length} file(s))`);

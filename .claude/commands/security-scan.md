---
description: Run a security scan across the codebase — exposed secrets, unsafe patterns, dependency audit
---

## Package audit
!`npm audit --json 2>/dev/null | head -60`

## Check for exposed secrets or API keys in source
!`grep -rn "sk-\|api_key\|apikey\|secret\|password\|token" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules | grep -v ".env" | grep -v "// " | head -30`

## Check for eval or innerHTML usage
!`grep -rn "eval(\|innerHTML\|dangerouslySetInnerHTML" --include="*.ts" --include="*.tsx" . | grep -v node_modules | head -20`

## Check for process.env in client components
!`grep -rn "process\.env" --include="*.tsx" app/components | grep -v node_modules | head -20`

## TypeScript strict check
!`npx tsc --noEmit 2>&1 | head -20`

Analyse the above output and report:
1. Any critical findings (exposed secrets, unsafe eval, client-side env leakage)
2. High-severity npm audit vulnerabilities with affected packages
3. Patterns that violate `.claude/rules/security.md`
4. Recommended fixes for each finding, in priority order

Use the CIPHER agent reasoning standard: categorise → prioritise by impact×exploitability → recommend specifics.

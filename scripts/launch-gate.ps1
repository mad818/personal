$ErrorActionPreference = "Stop"

npm run release:boundary
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run verify
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run eval:agent-runtime:ci
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run runtime:fresh-proof
exit $LASTEXITCODE

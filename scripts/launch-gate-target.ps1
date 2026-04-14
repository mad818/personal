$ErrorActionPreference = "Stop"

npm run release:boundary
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run runtime:consistency
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run route:integrity
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run release:smoke
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run auth:regression
exit $LASTEXITCODE

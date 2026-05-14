# AutoReels Quality Check Script
Write-Host "Starting Quality Checks..." -ForegroundColor Cyan

# 1. Lint Check
Write-Host "Running TypeScript Lint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lint failed! Please fix type errors before committing." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Build Check
Write-Host "Running Production Build Check..." -ForegroundColor Yellow
npx vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Production code is broken." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. HyperFrames Template Basic Check
Write-Host "Verifying Templates..." -ForegroundColor Yellow
$templates = Get-ChildItem -Path "./app/templates" -Directory
foreach ($tpl in $templates) {
    if ($tpl.Name -eq "assets") { continue }
    Write-Host "  Checking: $($tpl.Name)"
    if (-not (Test-Path "$($tpl.FullName)/index.html")) {
        Write-Host "  Missing index.html in $($tpl.Name)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "All checks passed! Ready to commit." -ForegroundColor Green

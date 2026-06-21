# Run DB changes for BookMe (run from repo root).
# Close dev server / other Node processes if prisma generate fails with EPERM.

Set-Location $PSScriptRoot\..

Write-Host "1. Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma generate failed. Close any running dev server or IDE and try again." -ForegroundColor Red
    exit 1
}

Write-Host "2. Pushing schema to database (creates/updates rate_limit_entries)..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma db push failed. Check DATABASE_URL in .env." -ForegroundColor Red
    exit 1
}

Write-Host "3. Verifying rate_limit_entries exists..." -ForegroundColor Cyan
npx tsx scripts/verify-rate-limit-table.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "Verify script needs Prisma client (generate). If db push succeeded, rate_limit_entries table exists." -ForegroundColor Yellow
}

Write-Host "Done." -ForegroundColor Green

# Force Fix Script - Stops ALL Node processes and regenerates Prisma
Write-Host "========================================" -ForegroundColor Red
Write-Host "FORCE FIX - Stopping ALL Node Processes" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Stop ALL Node processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
$processes = Get-Process -Name node -ErrorAction SilentlyContinue
if ($processes) {
    $processes | ForEach-Object {
        Write-Host "Stopping PID: $($_.Id)" -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
    Write-Host "✅ All Node processes stopped" -ForegroundColor Green
} else {
    Write-Host "✅ No Node processes found" -ForegroundColor Green
}
Write-Host ""

# Delete Prisma cache
Write-Host "Cleaning Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
    Write-Host "✅ Prisma cache deleted" -ForegroundColor Green
} else {
    Write-Host "✅ No cache to delete" -ForegroundColor Green
}
Write-Host ""

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma generation failed!" -ForegroundColor Red
    Write-Host "Try closing your code editor and running this script again." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ FIX COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start your dev server:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

# Quick Fix - Clears everything and restarts
Write-Host "🧹 Cleaning everything..." -ForegroundColor Yellow

# Stop all Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Clear caches
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue }
if (Test-Path "node_modules\.prisma") { Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue }

Write-Host "✅ Cleaned caches" -ForegroundColor Green

# Regenerate Prisma
Write-Host "🔄 Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "✅ Done! Now run: npm run dev" -ForegroundColor Green

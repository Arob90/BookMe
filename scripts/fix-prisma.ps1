# Fix Prisma Client - Run this script after stopping your dev server

Write-Host "Stopping any running Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Generating Prisma Client..." -ForegroundColor Green
npx prisma generate

Write-Host "`nChecking database schema..." -ForegroundColor Green
npx prisma db pull

Write-Host "`nDone! You can now restart your dev server with: npm run dev" -ForegroundColor Green

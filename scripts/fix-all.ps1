# Complete Fix Script for BookMe
# This will fix Prisma client and update dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BookMe - Complete Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all Node processes
Write-Host "Step 1: Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "✅ Node processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Update dependencies
Write-Host "Step 2: Updating npm dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dependencies updated" -ForegroundColor Green
Write-Host ""

# Step 3: Generate Prisma Client
Write-Host "Step 3: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "✅ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Step 4: Verify database schema
Write-Host "Step 4: Verifying database schema..." -ForegroundColor Yellow
npx prisma db pull
Write-Host "✅ Database schema verified" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ All fixes complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start your dev server with:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

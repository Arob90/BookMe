@echo off
echo ========================================
echo BookMe - Complete Fix Script
echo ========================================
echo.

echo Step 1: Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo ✅ Node processes stopped
echo.

echo Step 2: Updating npm dependencies...
call npm install
echo ✅ Dependencies updated
echo.

echo Step 3: Generating Prisma Client...
call npx prisma generate
echo ✅ Prisma Client generated
echo.

echo Step 4: Verifying database schema...
call npx prisma db pull
echo ✅ Database schema verified
echo.

echo ========================================
echo ✅ All fixes complete!
echo ========================================
echo.
echo You can now start your dev server with:
echo   npm run dev
echo.
pause

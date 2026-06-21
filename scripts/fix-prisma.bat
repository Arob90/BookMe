@echo off
echo Stopping any running Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Generating Prisma Client...
call npx prisma generate

echo.
echo Checking database schema...
call npx prisma db pull

echo.
echo Done! You can now restart your dev server with: npm run dev
pause

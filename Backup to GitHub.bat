@echo off
cd /d "%~dp0"
echo ============================================
echo   Backing up PULSE to GitHub...
echo ============================================
echo.

git add -A
git commit -m "Backup on %date% at %time%"

if %errorlevel% neq 0 (
    echo.
    echo (Nothing new to save, or already up to date.)
)

echo.
echo Uploading to GitHub...
git push

echo.
echo ============================================
echo   Done! Check above for any errors.
echo ============================================
echo.
pause

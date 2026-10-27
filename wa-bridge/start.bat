@echo off
rem Starts the PULSE WhatsApp bridge and restarts it if it stops by itself.
rem Close this window to stop sending.
cd /d "%~dp0"
if not exist node_modules call npm install
if not exist .env (
  echo There is no .env file yet. Copy .env.example to .env and fill it in first.
  pause
  exit /b 1
)
:loop
node --env-file=.env index.js
if %errorlevel%==1 (
  echo.
  echo The bridge stopped because of a problem that needs you. Read the message above.
  pause
  exit /b 1
)
echo Bridge stopped. Restarting in 15 seconds...
timeout /t 15 >nul
goto loop

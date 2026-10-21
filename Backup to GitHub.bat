@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\pulse-backup.ps1" -Show
pause

@echo off
cd /d "%~dp0"
echo ---- %date% %time% ---- >> backup-log.txt
git add -A >> backup-log.txt 2>&1
git commit -m "Auto backup on %date% at %time%" >> backup-log.txt 2>&1
rem Get any changes made on GitHub first (e.g. new A-N-T pages), so the upload is not rejected
git pull --no-rebase --no-edit >> backup-log.txt 2>&1
git push >> backup-log.txt 2>&1
echo (done) >> backup-log.txt

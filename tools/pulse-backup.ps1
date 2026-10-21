# PULSE backup: save Obsidian/PULSE changes -> get GitHub's changes (Claude's updates) -> upload.
# Run by auto-backup.bat every 10 minutes (Windows Task Scheduler) and by "Backup to GitHub.bat" (-Show).
# PowerShell reads this whole file before it runs, so a backup that updates this file cannot trip over itself.
# If backups keep failing for 1 hour: a note "BACKUP PROBLEM - read me" appears in the PULSE vault + a pop-up.
param([switch]$Show)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$log = Join-Path $root 'backup-log.txt'
$alert = Join-Path $root 'PULSE\BACKUP PROBLEM - read me.md'
$failsFile = Join-Path $root '.backup-fails'
$stamp = Get-Date -Format 'dd/MM/yyyy HH:mm:ss'

function Log($text) { Add-Content -LiteralPath $log -Value $text -Encoding UTF8 }
function Run-Git {
  $out = & git.exe @args 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  if ($out) { Log ($out -join "`r`n"); if ($Show) { $out | ForEach-Object { Write-Host $_ } } }
  return $code
}

Log "---- $stamp ----"
if ($Show) { Write-Host 'Backing up PULSE to GitHub... please wait'; Write-Host '' }

# Someone is fixing a merge by hand - don't touch it.
if (Test-Path -LiteralPath '.git\MERGE_HEAD') {
  Log 'A merge is half-done in this folder - backup skipped.'
  if ($Show) { Write-Host 'A merge is half-done in this folder. Finish it first (ask Claude).' -ForegroundColor Red }
  exit 1
}

# The log and Obsidian's window layout change all the time - keep them off GitHub (see .gitignore).
$null = Run-Git rm -r -q --cached --ignore-unmatch backup-log.txt PULSE/.obsidian/workspace.json PULSE/.obsidian/workspace-mobile.json
$null = Run-Git add -A
$null = Run-Git commit -q -m "Auto backup on $stamp"

$why = $null
if ((Run-Git pull --no-rebase --no-edit) -ne 0) {
  # Undo a half merge so the next backup can try again; this laptop's notes stay as they are.
  if (Test-Path -LiteralPath '.git\MERGE_HEAD') { $null = Run-Git merge --abort }
  $why = 'Could not get the latest changes from GitHub. Either no internet, or the same file was changed on GitHub and on this laptop.'
} elseif ((Run-Git push -q) -ne 0) {
  $why = 'Could not upload to GitHub. Either no internet, or GitHub needs you to log in again.'
}

if (-not $why) {
  Log '(ok)'
  Remove-Item -LiteralPath $failsFile, $alert -ErrorAction SilentlyContinue
  if ($Show) { Write-Host ''; Write-Host 'Backup OK - Obsidian and GitHub are the same now.' -ForegroundColor Green }
} else {
  Log "(FAILED) $why"
  $fails = 1
  if (Test-Path -LiteralPath $failsFile) { $fails = [int](Get-Content -LiteralPath $failsFile) + 1 }
  Set-Content -LiteralPath $failsFile -Value $fails
  if ($fails -ge 6) {
    $note = @"
# BACKUP PROBLEM - read me

Your PULSE backup to GitHub has not worked for about $([math]::Round($fails / 6, 1)) hour(s). Last try: $stamp.

**Reason:** $why

## What to do
1. Check the internet.
2. Double-click **Backup to GitHub.bat** in the PULSE-app folder.
3. Still not working? Send a screenshot of that black window to Claude.

This note disappears by itself once the backup works again. Your notes on this laptop are safe.
"@
    Set-Content -LiteralPath $alert -Value $note -Encoding UTF8
  }
  if ($fails -eq 6) {
    Add-Type -AssemblyName PresentationFramework
    $null = [System.Windows.MessageBox]::Show('PULSE backup to GitHub is not working. Open the note "BACKUP PROBLEM - read me" in Obsidian.', 'PULSE backup')
  }
  if ($Show) {
    Write-Host ''
    Write-Host '*** BACKUP DID NOT WORK ***' -ForegroundColor Red
    Write-Host $why
    Write-Host 'Send a screenshot of this window to Claude.'
  }
}

# Keep only the last 400 lines of the log.
$lines = Get-Content -LiteralPath $log -Tail 400
Set-Content -LiteralPath $log -Value $lines -Encoding UTF8

# Backup – How It Works (updated 21 Oct 2026)

The PULSE vault (Obsidian) and the app code live in **C:\PULSE-app**, which is copied to **GitHub** (Suherntan/pulse-app). Claude's updates go to GitHub; your laptop must **download** them and **upload** your notes.

## What went wrong (9 → 21 Oct 2026)
- The backup files on the laptop were an **old version** that only *uploaded* and never *downloaded*.
- The fixed version was waiting on GitHub, but it could only arrive by downloading – which the old version never did (chicken-and-egg).
- So from 9 Oct every upload was **rejected** (616 laptop saves vs 18 GitHub updates). The errors only went into `backup-log.txt`, so nobody saw them.
- Fixed by hand on 21 Oct (merge, kept GitHub's code + the laptop's notes).

## What is different now
- **auto-backup.bat** (every 10 min) and **Backup to GitHub.bat** (double-click) both run `tools/pulse-backup.ps1`: save → **download** → upload.
- **Alarm:** if the backup fails for **1 hour**, a note **"BACKUP PROBLEM - read me"** appears at the top of the PULSE vault + a pop-up. It disappears by itself when the backup works again.
- A half-finished merge is cancelled automatically (your laptop notes are kept), so one problem can't block every later backup.
- `backup-log.txt` and Obsidian's window layout are no longer sent to GitHub (they changed every few minutes and caused clashes). The log keeps only the last 400 lines.
- The scripts can update themselves safely (PowerShell reads the whole script first).

## Good habits
- **Code** (Code.gs, index.html, js…) is changed only through Claude/GitHub – don't edit it on the laptop. Notes in Obsidian are fine.
- Double-click **Backup to GitHub.bat** before a big edit session in Obsidian. Green "Backup OK" = all good; red = send the screenshot to Claude.

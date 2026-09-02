# Update: Policy Number in Messages, Fixed Mark Sent Bug, Buttons Moved to Front, Colour-Coded Rows

This update needs you to paste the updated `Code.gs` (from this repo) over your Google Sheet's Apps Script Code.gs — same as before.

## What's new

**1. Policy number now shows in your WhatsApp messages** — both the birthday message and the premium due (payment) reminder now include the client's policy number automatically, e.g. "...- Su Hern (Policy No: 812227-0)". If a client row has no policy number filled in, the message just leaves that part out — it won't look broken or show something odd.

**2. Found and fixed why reminders kept resending every day** — the "Mark Sent" checkbox and "Click to Send" link on your "TODAY - SEND REMINDERS" tab only worked because the script was watching one fixed column position to notice when you ticked the box. When that tab's columns got moved around by hand, the tick landed somewhere the script wasn't watching anymore — so it never saved "sent," and the same reminder kept coming back the next day. This update rewrites that part so every piece of the script refers to columns by name instead of a fixed position, so this can't happen again even if the layout changes.

**3. Click to Send + Mark Sent moved to the front** — these two are now columns A and B on the "TODAY - SEND REMINDERS" tab (instead of the far right), so you can act on a reminder without scrolling past the message text first.

**4. Rows are now colour-coded by type** — birthdays, payment due reminders, and advance notices each get their own background colour on that tab, so you can tell them apart at a glance.

## How to install this update

1. **Back up first** — in your sheet: File > Make a copy. Name it something like "P.U.L.S.E- SU HERN (backup before Sept update)". This is your safety net.
2. **Open the script editor** — back in your real sheet: Extensions > Apps Script.
3. **Check the file list on the left.** If you see only Code.gs, go to step 4. If you see any OTHER file too (e.g. backend.gs, merged_backend.gs, or anything with a similar name), that old file may be silently overriding parts of this update — delete it (right-click > Delete) so only Code.gs remains. This script only needs the one file.
4. **Replace Code.gs entirely** — click into Code.gs, select all (Ctrl+A / Cmd+A), delete it, then paste in the `Code.gs` from this repo.
5. **Save** — Ctrl+S / Cmd+S. Wait for "Saved" to show before continuing.
6. **Go back to your Sheet tab and reload the page** (refresh your browser) so the PULSE Reminders menu picks up any changes.
7. **Click PULSE Reminders > Refresh Today's Reminders.** This rebuilds the "TODAY - SEND REMINDERS" tab with the new layout.
8. **Check the result** — Click to Open WhatsApp and Mark Sent should now be columns A and B, each row should have a background colour depending on its type, and the message preview should include the policy number where one is filled in.

## If reminders were duplicating because of a column move you made yourself

If you (or anyone) manually reordered the "TODAY - SEND REMINDERS" tab's columns before this update, that tab gets fully rebuilt every time you click "Refresh Today's Reminders" — so any manual reordering on that specific tab is undone automatically the next time it refreshes. You don't need to fix it by hand; just run "Refresh Today's Reminders" once after installing this update and it will rebuild correctly.

If a reminder still keeps coming back after this, run PULSE Reminders > "Debug: Why Does This Reminder Keep Coming Back?" — it checks each client row and tells you exactly why (e.g. a missing GREETING SENT / REMINDER SENT column on that particular tab), one row at a time.

If anything looks off after pasting, copy the exact error text back and I'll fix it.

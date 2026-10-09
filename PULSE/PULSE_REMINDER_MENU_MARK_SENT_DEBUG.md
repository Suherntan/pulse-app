# PULSE — "PULSE Reminders" menu missing + "Mark Sent" not working

_Session date: 2026-09-11 · Status when saved: **OPEN / unresolved** (see §4)_

Related: [[ANT_CLIENT_REGISTRATION_FORM]] (separate project — the ANT client form fix, already fully saved)

---

## 1. Symptoms reported (desktop browser, PULSE Google Sheet)

1. The **"PULSE Reminders" custom menu is missing** from the Sheet's menu bar.
2. Ticking **"Mark Sent"** on the `TODAY - SEND REMINDERS` tab does **not** delete that row (it should vanish).
3. Typing a message on the `EMAIL TEMPLATE` tab shows **no "Send" button**.

## 2. How PULSE is wired (so this is findable later)

| Piece | Where |
|---|---|
| Source of truth (mirror) | `C:\Users\User\OneDrive\Documents\PULSE\Code.gs` (also a twin in `PULSE-StevernPhong\Code.gs`) |
| Live script | Apps Script project **bound to the PULSE Google Sheet** — open it from the Sheet: **Extensions → Apps Script** (NOT by picking from script.google.com's "recent projects" list — easy to open the wrong project) |
| Sync | **None.** No clasp, no `appsscript.json` in the repo. `auto-backup.bat` only does `git add/commit/push` on a timer. Pushing to GitHub changes nothing in the live script — Code.gs must be **pasted by hand** into the editor. |
| Web dashboard | Same script also exposes `doGet`/`doPost` (JSON API); static frontend (`index.html`, `js/`, `css/`) auto-deploys to Vercel on push. Web-app changes also need Deploy → Manage deployments → Edit → New version. |

**Paste rules (learned the hard way):** always **full replace** — Ctrl+A, Delete, paste the whole file, Ctrl+S — never paste on top of old code. Menu items/triggers run the *saved* editor code; the `/exec` web app needs a redeploy on top.

## 3. What I verified in Code.gs (as of 2026-09-11)

- **Syntax is valid.** `node --check` passes (copy the file to a `.js` name first — node rejects `.gs`):
  `cp Code.gs Code_check.js && node --check Code_check.js`
- **Exactly one `onOpen` and one `onEdit`** in the file — no duplicate definitions. No stray top-level executable statements (only `function`/`var` literals).
- **`onOpen()` cannot throw** — it only chains `.addItem(...)`/`.addSeparator()` with function *names as strings* and ends `.addToUi()`. Nothing runs at menu-build time.
- **"Mark Sent" flow is correct on paper:** `onEdit` → sheet name `TODAY - SEND REMINDERS`, column `REMINDER_COL_MARK_SENT` (= 2), row > 1, value `true` → `markReminderSent_()` → finds the client (phone first, then exact name, across APPROACH/PRESENTATION/CLOSING) → stamps `GREETING SENT` / `REMINDER SENT` / `ADVANCE REMINDER SENT` → **`deleteRow`**. So if the row doesn't vanish, `onEdit` isn't running at all (same root cause as the missing menu — both are simple triggers).
- **Email has no in-sheet Send button — by design.** Sheets cells can't run a script on click. WhatsApp gets a per-row link only because `wa.me` URLs open without a script. Email is sent from the menu: **"Send Bulk Email (this tab)"** or **"Send Email Blast (list below template)"** (recipients typed under the template, header row 5, data from row 6). So with the menu gone, email sending is unreachable too — one root cause, three symptoms.
- The daily reminder rows use a `=HYPERLINK("https://wa.me/…","Click to Send")` in column 1 (`REMINDER_COL_WHATSAPP_LINK`); the link is blank for a row only when the phone number normalises to empty (shows "CHECK NUMBER").

## 4. Diagnosis trail — and where it stopped

1. **First hypothesis (UNCONFIRMED — treat with caution):** the Sep 8 commit added `UrlFetchApp`, a new permission scope; new scopes need a manual re-authorize (run any function from the editor → approve). *Caveat:* a simple `onOpen` can still build menus without authorization, so this may not actually explain a missing menu. It was never proven.
2. **Key clue from the user:** in the Apps Script editor's **function dropdown only `doGet` and `doPost` appeared** — none of the ~40 other functions (`onOpen`, `onEdit`, `buildTodayReminders`, `sendBulkEmail`, …). That means the editor the user was looking at did **not** contain this Code.gs's functions — i.e. wrong project, wrong file, stale editor, unsaved paste, or a parse problem — *not* a logic bug in the reminder code.
3. The file list showed the `.gs` file plus **`appsscript.json`** (the manifest — normal; code must never be pasted into it).
4. User repasted once: **dropdown still only `doGet`/`doPost`.** They then asked for the file again to repaste a second time (file re-sent). **Outcome of that second repaste was never reported → still open.**

### Ranked things to check next
1. Confirm you're in **Extensions → Apps Script opened from the PULSE Sheet itself** (right project).
2. Click the **`.gs` file** (not `appsscript.json`), Ctrl+A, Delete, paste the **full current** `Code.gs`, **Ctrl+S**, look for any **red error marker/save error**, then **reload the whole tab (F5)**. A parse error or unsaved paste leaves the function list stale.
3. The function dropdown may only list functions of the **currently selected file** — select the `.gs` file first, then open the dropdown.
4. Open **`appsscript.json`** and confirm it's plain JSON (`{ "timeZone": … }`) with no JavaScript in it.
5. Pick **`onOpen` → Run**, approve the permissions screen (Review permissions → Advanced → Go to project (unsafe) → Allow).
6. Back on the Sheet: **Ctrl+F5**, check the menu, then test a "Mark Sent" tick.
7. Still failing → **Extensions → Apps Script → Executions** (left sidebar): every `onOpen`/`onEdit` run and its exact error is logged there. Read the error text before guessing further.
8. To verify backend state independent of the editor, call the deployed **`/exec`** URL directly.

## 5. Notes for next time

- **Code.gs has moved on since this session** (commits 14–17 Sep: status-cell fix when moving a client from the web app, Hot/Warm/Cold + overdue highlighting scoped to its own column, temporary `debugCalendarRaw` removed). The copy sent on 2026-09-11 is now **older than the repo's** — always paste the **latest** file, not this session's attachment.
- Standing preference: after **any** edit to `Code.gs`, send the **full file** (not a diff/snippet) and instruct a **full replace**; strip temporary `debug…` functions once done.

## 6. Side finding — "is there a design brief?" (2026-09-10)

- **Design brief (the real one):** `C:\Users\User\OneDrive\Documents\PULSE\PULSE\Client Tracker - Design Brief for Claude Code.md` — Client Fund Tracker presentation layer: dark navy + gold, numbered cards with icons, bold headlines, insight bars, must work on phone, not template-looking; data from *Fund Watchlist - 3 Year Horizon* and *Client Fund Interest Tracker* sheets.
- Related, not design briefs: `FRONTEND_REBUILD_BRIEF.md` (BGL Field App **code** rebuild), `BGL_DESIGN_SYSTEM_HANDOVER.md`, `VISUAL_GUIDE.md` (both in this vault), and `C:\Users\User\OneDrive\Desktop\ANT\ANT PRESENTATION DESIGN GUIDE.txt` (page-by-page redesign notes for the ANT pitch deck).

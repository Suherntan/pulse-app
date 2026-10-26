# A-N-T Step 2 – Master Setup Guide (manager's Google account)

- **Created:** 8 Oct 2026
- **Cost:** $0
- **Time:** manager ~10 min once · each advisor ~3 min
- **Test account:** the "ANT Master" Gmail (later the real agency manager does the same)
- **Status 26 Oct 2026:** ✅ Master Sheet live in Su's account. Su's PULSE ✅ connected. Stevern's PULSE ✅ connected (Library version – needed the new connector + pulseAuthorize).

## What Step 2 does
- Every time an advisor **saves a client** or **saves an A-N-T Analysis**, a copy of the **data** goes to the manager's **Master Sheet**.
- **No files** (no PDFs, no folder links) – data only.
- Advisors **can't open** the Master Sheet. Each advisor has an **Advisor ID + secret key**.
- Internet down / master busy → the item waits in the advisor's **ANT_OUTBOX** tab and is re-sent **every night** automatically.
- Manager turns an advisor **off** → that advisor can't send any more; everything already sent **stays**.
- **Weekly backup** of the Master Sheet (Sunday), last 8 copies kept.

---

## Part A – Manager (in the "ANT Master" account)

1. Sign in to Google with the **ANT Master** account (Chrome profile).
2. Go to **sheets.google.com** → **Blank** → name it `A-N-T Master`.
3. **Extensions → Apps Script.**
4. Delete everything in `Code.gs`, paste all of **`ANT-Master.gs`** (from GitHub, same branch as before) → 💾 **Save**.
5. Back in the Sheet → **reload** → new menu **A-N-T Master** → **Set Up Master (one-time)** → allow permissions (Advanced → Go to project → Allow).
6. Apps Script → **Deploy → New deployment** → ⚙️ **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → copy the **Web app URL** (this is the **Master link**).
7. Sheet → **A-N-T Master → Add Advisor** → Advisor ID = the advisor's initials + a number (e.g. `SH01`) → name → it shows the **Master link + secret key**. Send these two to the advisor (WhatsApp is fine).
8. (Optional) **A-N-T Master → Turn On Weekly Backup**.

> "Anyone" only means the link can receive data. Nothing can be read through it, and only advisors with a correct key can add data.

---

## Part B – Advisor (in the advisor's own account, e.g. yours)

1. Update your **ANT** file in Apps Script with the new **`ANT.gs`** → 💾 Save. (`Code.gs` – no change.)
2. **Deploy → Manage deployments → ✏️ → New version → Deploy.**
3. Reload your PULSE Sheet → **A-N-T → Connect to Master** → paste the **Master link**, then the **secret key**.
   - Google asks for one new permission ("connect to an external service") → Allow.
   - You should see **Connected to Master ✓**.
4. Already have clients saved? **A-N-T → Send Everything to Master (one-time)**.

---

## Quick test
1. Advisor: save a test client in the form → it says **"copied to Master ✓"**.
2. Manager: Master Sheet → tab **CLIENTS** shows the row with the **Advisor ID**.
3. Advisor: save an A-N-T Analysis → Master tab **ANALYSIS** gets the row. Save an Offer Document → tab **OFFERS** (made by itself).

**Numbering in the master:** every advisor starts at C-0001, so the master adds the Advisor ID in front – column **Master ID**, e.g. `SH01-C-0001` (client), `SH01-A-0003` (analysis), `SH01-O-0002` (offer). Analysis and offer rows also have **Master Client ID** (e.g. `SH01-C-0001`), so filtering by it shows everything for one client.
4. Advisor: change the client's email and save again → Master row is **updated** (not duplicated).

## If something goes wrong
| Message | Fix |
|---|---|
| "Advisor ID or secret key is wrong" | Advisor ID in A-N-T Setup must match the one the manager added; re-enter the key. |
| "This advisor is turned off by the manager" | Manager: A-N-T Master → Turn Advisor On / Off. |
| "Master not reachable" | Check the Master link; manager must have deployed as Web app with access **Anyone**. |
| "Master copy will retry tonight" | Nothing to do – or A-N-T → Re-send Waiting Items to Master Now. |

## Moving from the test account to the real manager
1. Real manager does **Part A** in their account.
2. Each advisor: **A-N-T → Connect to Master** with the new link + key, then **Send Everything to Master (one-time)**.

## Advisors on the Library version (26 Oct 2026)
Before **Connect to Master**: their Code.gs must be the latest **PULSE-Connector.gs** → run **pulseAuthorize** → on Google's permission screen tick **Select all** (else Gmail/URL permissions are skipped) → Deploy → ✏️ → New version → Deploy.
- Their project should only have **Code.gs** (connector) + Library **PULSE**. An old **ANT.gs** left there clashes with the Library – back it up (Notepad) and delete it.
- Several Google accounts in one browser → "Sorry, unable to open the file" (`authuser=1`): use an InPrivate/Incognito window with only the advisor's account.

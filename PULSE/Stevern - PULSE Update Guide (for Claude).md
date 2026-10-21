# PULSE update – guide for Stevern's Claude (21 Oct 2026)

> **To Claude:** you are helping **Stevern**, an insurance/financial advisor in Malaysia, update his PULSE app.
> He is not technical. Use simple English, one step at a time, and wait for him to confirm each step (ask for a screenshot if unsure).
> Never ask for or show passwords, tokens or app secrets. Do not change anything not listed here.
> If something doesn't match, stop and tell him to message **Su** with a screenshot.

## What this update does
- **Offer Document history:** every SAVE TO DRIVE now keeps a new offer (own Offer ID + own PDF). Before, a 2nd save for the same client on the same day **replaced** the first one.
- **A-N-T Analysis page:** no TOTAL row, no red dots; in PRIORITY the advisor taps the areas the client wants first. (This part is in the app itself – nothing to do in the Sheet.)

## Before starting
- Use a **laptop/computer** (Apps Script doesn't work well on a phone).
- Log in to Google with the account that **owns Stevern's PULSE Sheet**.
- Su must already have updated the **PULSE Library** (Su tells Stevern when it's ready).

## Step 1 – Find out which PULSE version he has
1. Open his **PULSE Google Sheet** → menu **Extensions → Apps Script**.
2. Look at the left side:
   - **Libraries → PULSE** is listed and there is **no `ANT.gs`** file → **Library version** → go to **Step 2A**.
   - There **is** an `ANT.gs` file → **normal version** → go to **Step 2B**.

## Step 2A – Library version (2 min)
1. Left side, under **Libraries**, click **PULSE**.
2. **Version** → choose the **highest number** → **Save**.
3. Top right **Deploy → Manage deployments**.
4. Click the **✏️ pencil** (Edit) → **Version: New version** → **Deploy**.
   - ⚠️ Do **not** use "New deployment" – that makes a new link and the app would disconnect.
5. Go to **Step 3**.

## Step 2B – Normal version (5 min)
1. Open https://github.com/Suherntan/pulse-app/blob/master/ANT.gs → click the **copy** button (two squares, top right of the code).
2. Back in Apps Script → click **ANT.gs** → **Ctrl+A** → **Ctrl+V** → **Save** 💾.
3. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
   - ⚠️ Not "New deployment".
4. Go to **Step 3**.

## Step 3 – Test
1. On his phone, open PULSE → **A-N-T** → **Offer** for a test client → **SAVE TO DRIVE**.
2. Change one number → **SAVE TO DRIVE** again.
3. Open the client's folder in Google Drive: there should be **2 PDFs**; the 2nd has the time in its name (e.g. `… 15.40.pdf`).
4. Delete the test PDFs if not needed.

## Lost offers from before?
Offers replaced in the last **30 days** are in **Google Drive → Bin** (left menu). Right-click the PDF → **Restore**.

## If something goes wrong
| Message / problem | What to do |
|---|---|
| **"Library … is missing"** or **"You do not have access"** | Su must share the PULSE Library with Stevern's Gmail (Viewer). Message Su. |
| **"Unknown action: antSaveOffer"** or app says old behaviour | Step 2A.4 / 2B.3 (Deploy → New version) was skipped – do it again. |
| A **permission / Authorize** pop-up | Click **Review permissions → choose his account → Advanced → Go to … (unsafe) → Allow**. This is normal for his own script. |
| The app shows **"PULSE IS PAUSED"** | His trial switch is off – message Su. |
| Anything else | Stop, take a screenshot, send to Su. |

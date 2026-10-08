# A-N-T Step 1 – Setup Guide (agent's own Google account)

- **Created:** 6 Oct 2026
- **Cost:** $0 (Google Sheets, Drive, Apps Script – all free)
- **Time:** about 10 minutes, once per agent

## What Step 1 does
- **Fact-Find form** saves each client into your PULSE Google Sheet → new tab **ANT_CLIENTS** (Client ID C-0001, C-0002 …).
- Each client gets a **Google Drive folder**: `PULSE A-N-T Clients / C-0001 - Name`.
- After the slides, **Save to Drive** puts the **A-N-T Analysis PDF** in that client's folder and adds a row in tab **ANT_ANALYSIS**.
- Tab **ANT_LOG** records what was done and when.
- Next meeting: search the client in the form → everything comes back.

## Setup (do in this order)

### 1. Add the new code file
1. Open your **PULSE Google Sheet** → **Extensions → Apps Script**.
2. On the left, click **+** → **Script** → name it `ANT`.
3. Delete what's inside, paste everything from **`ANT.gs`** (GitHub repo `pulse-app`, branch `claude/ppt-offer-doc-automation-7yj36d`).
4. Click 💾 **Save**.

### 2. Add 3 small pieces to `Code.gs`
Open `Code.gs` (same Apps Script window).

**a) In `function doGet`** – find:
```
      case 'appointments':
        return jsonResponse(getUpcomingAppointments());
```
Paste right **below** it:
```
      // A-N-T (see ANT.gs)
      case 'antProfile':
        return jsonResponse(antProfile());
      case 'antSearchClients':
        return jsonResponse(antSearchClients(e.parameter.q));
      case 'antGetClient':
        return jsonResponse(antGetClient(e.parameter.id));
```

**b) In `function doPost`** – find:
```
      case 'importFundData':
        return jsonResponse(importFundData(data));
```
Paste right **below** it:
```
      // A-N-T (see ANT.gs)
      case 'antSaveClient':
        return jsonResponse(antSaveClient(data));
      case 'antSaveAnalysis':
        return jsonResponse(antSaveAnalysis(data));
```

**c) In `function onOpen`** – find the last line of the menu:
```
    .addToUi();
}
```
(the one right after "Remove Duplicate Client Rows") and change it to:
```
    .addToUi();
  antAddMenu_(); // A-N-T menu (ANT.gs)
}
```
Click 💾 **Save**.

> If your `Code.gs` is the same as the one on GitHub, you can instead copy the whole updated `Code.gs` from the branch.

### 3. Run the A-N-T setup
1. Go back to the Sheet and **reload the page**. A new menu **A-N-T** appears.
2. **A-N-T → Set Up A-N-T (one-time)**.
3. Google asks for permission (first time only) → choose your account → **Advanced → Go to project → Allow**. (Needed so it can make folders in your Drive.)
4. Type your **Agent ID** (e.g. `AG-001`) → OK.
5. It shows your name, phone and the new Drive folder link. Name or phone wrong? Fix in **PULSE Reminders → My Settings**.

### 4. Publish the new version (important!)
1. Apps Script → **Deploy → Manage deployments**.
2. Click ✏️ (pencil) on your current Web app.
3. **Version → New version** → **Deploy**.
4. The web-app link **stays the same** – nothing changes in the PULSE app.

### 5. Connect the form
1. Open the Fact-Find form on your phone.
2. Top right shows **DEMO** → tap it → paste your **web-app link** (same one the PULSE app uses) → OK.
3. It should now say **CONNECTED · AG-001**.
   (If you already use the PULSE app on the same website, it may connect by itself.)

## Quick test
1. Fill a test client → **Save Client** → it shows `EDIT · C-0001` and **Open client folder in Google Drive**.
2. Check the Sheet: tab **ANT_CLIENTS** has the row.
3. **Present Slides** → slide 3 → type some numbers → **Save A-N-T Analysis** → **Save to Drive**.
4. Check: the PDF is in the client's Drive folder, and tab **ANT_ANALYSIS** has a row.
5. Back in the form: search the client's name → it loads everything.

## Link with APPROACH / PRESENTATION / CLOSING / SR (added 8 Oct 2026)
- A new column **ANT CLIENT ID** is added at the end of each tab. Tabs can keep **their own column order** – rows now move by **column title** (also for manual status changes).
- **Save Fact-Find:** looks for the client in **all 4 tabs** – by ANT CLIENT ID, then **phone number + name** (012-345 6789, +60 12…, 6012… all match), then exact full name.
  - **Shared phone (family):** the phone only counts if the name also agrees (same name, one inside the other, or 2+ words in common). Dad, mum and child on one number stay 3 separate clients.
  - The form shows **which row** it linked to, e.g. "Linked to CLOSING row 15 (Tan Ah Kow)". If it's wrong, clear the ANT CLIENT ID cell on that row and type the right ID on the right row.
  - Found → linked (ID written; empty EMAIL / BIRTHDAY filled in). Existing CLOSING clients are preferred over old APPROACH rows.
  - Not found → **added to APPROACH** with today's date (remark "A-N-T Fact-Find C-000x").
- **Save A-N-T Analysis:**
  - Client in **APPROACH** → **moved to PRESENTATION** (same as changing the status by hand: date, week/day, activity log).
  - Client in PRESENTATION / **CLOSING** / **SR** → stays (existing or servicing client).
  - Remark added: "A-N-T Analysis A-000x · total gap …" (only once per day).
- ANT_CLIENTS shows the current **Pipeline Stage**.
- After updating: paste the new **Code.gs** (row moves by title) and **ANT.gs**, run **A-N-T → Set Up A-N-T** once more (adds the ANT CLIENT ID column), then Deploy → New version.

## Correcting an analysis
- Same client, **same day**: go back to the slides, fix the numbers → **Save to Drive** again. The old PDF is **replaced** (moved to Drive Bin, restorable for 30 days) and the same row in ANT_ANALYSIS is updated (same Analysis ID).
- **Another day**: saves as a new analysis, so you keep the history of each meeting.

## If something goes wrong
| Problem | Fix |
|---|---|
| Form says **NOT CONNECTED** | Link wrong, or step 4 (New version) not done. |
| "Unknown action: antSaveClient" | Step 2 pieces not pasted, or step 4 not done. |
| "CONNECTED – RUN A-N-T SETUP" | Do step 3 (Agent ID missing). |
| "Save the client in the Fact-Find form first" | The analysis needs a saved client (with a C-number). |

## Files (GitHub)
- `ANT.gs` – new backend file
- `Code.gs` – 3 small additions (routing + menu)
- `design-mockups/fact-find-form.html`, `ant-deck-preview.html`, `ant-analysis.html`, `ant-api.js`, `vendor/` (free PDF tools, MIT licence)

# A-N-T Setup – Guide for Another Agent (Stevern)

> **For Claude:** you are helping **Stevern**, an insurance agent who already runs his own copy of the PULSE app. Guide him step by step to add **A-N-T** (Fact-Find → Slides → A-N-T Analysis → Offer Document) to his PULSE.
> - He is not technical. Use **simple English, no jargon**, one step at a time, and wait for him to confirm each step before the next.
> - Everything is **free** (Google Sheets, Apps Script, Drive, the shared PULSE web page). Do not suggest paid tools.
> - His client data stays **in his own Google account**. Nothing goes to Su's account.
> - Code files are public on GitHub: `https://github.com/Suherntan/pulse-app` (branch `master`). To copy a file: open it, then click the **"Copy raw file"** button (two squares icon, top right of the code).

---

## 0. What A-N-T adds (tell Stevern this first, short)

1. **Fact-Find form**: the client's background (goals, family). It saves the client in his Google Sheet and makes a Drive folder for the client.
2. **Slides**: the A-N-T presentation, including the L.I.F.E table on slide 3.
3. **A-N-T Analysis PDF**: saved into the client's Drive folder.
4. **Offer Document**: upload Manulife proposal PDFs (they're read on the phone, free), then compare EXISTING / OFFER 1 / OFFER 2 / VALUE UP and save the PDF to Drive.
5. **Pipeline link**: the client's row in APPROACH / PRESENTATION / CLOSING / SR gets an **ANT CLIENT ID**. APPROACH clients move to PRESENTATION after the analysis or offer, and a note goes into REMARKS.
6. **Search** finds A-N-T clients and existing pipeline clients.

New tabs it creates by itself: `ANT_CLIENTS`, `ANT_ANALYSIS`, `ANT_OFFERS`, `ANT_LOG` (and `ANT_OUTBOX` later, for the manager's master list).

---

## 1. Check his setup first (ask Stevern; don't guess)

Ask him these and note the answers:

1. **Which PULSE web link does he open on his phone?**
   - **Su's shared PULSE link** (Su will send it) → good, go to step 2. The A-N-T pages are already there.
   - **His own separate site** (his own Vercel) → see **section 7** at the end.
2. **His Google Sheet tab names.** A-N-T expects pipeline tabs named exactly `APPROACH`, `PRESENTATION`, `CLOSING`, `SR`.
   - If his names differ, either rename the tabs, or change `ANT_PIPELINE_TABS` near the top of `ANT.gs` to his names.
3. **Agent ID.** Use his **initials + a number**, for example `SP01`, using letters and numbers only. Agency managers use this to tell agents apart.
4. **Settings.** In his sheet: **PULSE Reminders → My Settings**. Agent name and WhatsApp number must be filled in. They're printed on the PDFs.

---

## 2. Back up his current script (safety first)

1. Open his PULSE Google Sheet → **Extensions → Apps Script**.
2. Click `Code.gs`, select all (Ctrl+A), copy, and paste into a Notepad file saved as `Code-backup-<date>.txt`.
3. Also note any **other script files** in the left list (for example `BulkEmail.gs`). **Leave them as they are.**

> Apps Script also keeps old versions under the clock icon (**Project History**), so a backup can always be restored.

---

## 3. Update `Code.gs` (his copy is older)

Stevern's `Code.gs` is an **older twin** of Su's. A-N-T needs newer parts:
- row moves between tabs by **column title** (`moveRowToStatus_`, `copyRowByHeader_`)
- dates shown as **dd/mm/yyyy**
- the A-N-T actions in `doGet` / `doPost` and the A-N-T menu in `onOpen`

**Recommended (simplest):** replace his whole `Code.gs` with the current one.
1. Open `https://github.com/Suherntan/pulse-app/blob/master/Code.gs` → **Copy raw file**.
2. In Apps Script, click `Code.gs`, select all, delete, paste, then **Save** (disk icon).

**Before replacing, ask him:** "Did you or anyone change your Code.gs yourselves (your own special features)?"
- **No** → replace it.
- **Yes** → compare his backup with the new file. Keep his own changes by adding them back, but **never remove** these parts of the new file: `moveRowToStatus_`, `copyRowByHeader_`, `case 'antProfile' / 'antSearchClients' / 'antGetClient' / 'antSaveClient' / 'antSaveAnalysis' / 'antSaveOffer'`, and `antAddMenu_();` at the end of `onOpen`.

The new Code.gs finds columns **by their titles** (NAME, CONTACT, EMAIL, BIRTHDAY, REMARKS, PRODUCT PROPOSED …), so his column order doesn't matter.

---

## 4. Add `ANT.gs` (new file)

1. In Apps Script, click **+** (next to Files) → **Script** → name it `ANT`. It becomes `ANT.gs`.
2. Delete the few lines Google puts in it.
3. Open `https://github.com/Suherntan/pulse-app/blob/master/ANT.gs` → **Copy raw file** → paste → **Save**.

> **Do NOT** add `ANT-Master.gs`. That file is only for the agency manager's master sheet.

---

## 5. Run the setup, then publish

1. Go back to the **Google Sheet** and reload the page (F5). A new menu **A-N-T** appears (it can take about 10 seconds).
2. **A-N-T → Set Up A-N-T (one-time)**.
   - Google asks for permission the first time: **Continue → choose his account → Advanced → Go to … (unsafe) → Allow**. This is his own script, so it is safe.
   - Type his Agent ID, e.g. `SP01` → OK.
   - A box shows his name, phone and the Drive folder link. If name or phone is wrong, fix them in **PULSE Reminders → My Settings**.
3. **Publish the new code (very important):** Apps Script → **Deploy → Manage deployments** → pencil icon (**Edit**) → **Version: New version** → **Deploy**.
   - This keeps the **same web app link**, so his PULSE app keeps working.
   - If he has **never deployed** before: **Deploy → New deployment → Web app** → Execute as **Me**, Who has access **Anyone** → Deploy → copy the **Web app URL**.

> Saving alone is not enough. The app only sees the new code after **New version**. This is the step most often missed.

---

## 6. Connect and test (on his phone)

1. Open the PULSE link from step 1.
   - **First time on this phone:** he sets **his own password** for this phone. This is not Su's password; each phone has its own.
   - Paste **his** Web app URL, either on the lock screen or later under ⚙ **Settings**.
2. Tap the **A-N-T** tab. There are 4 steps: Fact-Find, Present Slides, A-N-T Analysis, Offer.
3. **Fact-Find:** the top right should say **CONNECTED · SP01**.
   - If it says **DEMO**, tap it and paste his Web app URL.
   - If it says **NOT CONNECTED**, the link is wrong or step 5.3 was missed.
4. **Quick test:**
   1. Search a name from his pipeline. It should show e.g. *"CLOSING · no A-N-T yet"*. Tap it and the form fills in.
   2. Add the background, tick consent, **Save Client**. He gets a number like `C-0001`, and the pipeline row gets **ANT CLIENT ID**.
   3. **Present Slides** → fill slide 3 → **Save A-N-T Analysis** → **Save to Drive**. The PDF goes to Drive under *PULSE A-N-T Clients / C-0001 - Name*.
   4. **Offer** → upload a Manulife proposal PDF → check the rows → **Add to Offer Doc** → **SAVE TO DRIVE**.
   5. Check his Google Sheet: the new `ANT_…` tabs have rows, and the client's pipeline row has a note in REMARKS.

---

## 7. Only if he uses his own separate website

The A-N-T pages live in the `ant/` folder of Su's site. Two choices:
- **A (easiest, free):** he uses **Su's shared PULSE link**. It's built for many agents: each phone has its own password and its own Google Sheet link, and no data is shared.
- **B:** copy into his site: the whole `ant/` folder, plus the A-N-T tab parts of `index.html` (the tab button `data-tab=ant`, the `<main id=tab-ant>` section, the matching CSS in `css/style.css`), plus `js/lock.js`. Then redeploy his site. This means more upkeep, because every future update must be copied again.

Recommend **A**.

---

## If something goes wrong

| What he sees | Likely cause → fix |
|---|---|
| No **A-N-T** menu in the sheet | Reload the sheet. Check `antAddMenu_();` is inside `onOpen` in Code.gs. |
| Fact-Find says **NOT CONNECTED** / **DEMO** | Wrong Web app URL, or no **New version** after changing code (step 5.3). |
| Toast "Pipeline clients not searched yet" | Old ANT.gs still running → paste the latest ANT.gs, then **New version**. |
| Pipeline client found but no tab/row update | Tab names differ from APPROACH / PRESENTATION / CLOSING / SR (step 1.2). |
| "Save the client in the Fact-Find form first" | Open or save the client in Fact-Find before Analysis or Offer. |
| Offer: "layout not recognised" | Not a Manulife proposal layout, or a scanned picture. Type the amounts by hand; for a new layout send a sample to Su. |
| Wrong name or phone on the PDF | PULSE Reminders → My Settings. |
| Error mentioning `moveRowToStatus_` / `getAgentSettings_` | Old Code.gs → do step 3. |

## Later: agency master list (not now)
When the agency manager sets up the master sheet, Stevern gets a **Master link + secret key**. Then: **A-N-T → Connect to Master**. His saved clients, analyses and offers are copied there as data only (no files), as `SP01-C-0001` and so on. Until then, nothing goes anywhere except his own Google account.

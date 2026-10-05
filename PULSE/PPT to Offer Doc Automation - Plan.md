# PPT → Offer Doc → PULSE Automation (Plan)

- **Created:** 5 Oct 2026
- **Status:** Phase 1 (Connection) – waiting for answers
- **Budget goal:** $0 (free tools only)

## What we want

1. You finish a **PPT** (client presentation / proposal).
2. The system reads the key details from the PPT (client name, plan, premium, sum assured, etc.).
3. It fills in an **Offer Doc** from a template and saves it (Doc + PDF).
4. It updates the **PULSE Google Sheet** (PRESENTATION / CLOSING tab) with what was done and a link to the Offer Doc.
5. The PULSE dashboard shows it.

## The options (cheapest first)

| Option | Cost | Good | Not so good |
|---|---|---|---|
| **A. Google only (Drive + Slides + Docs + Apps Script)** ✅ Recommended | **Free** | PULSE already runs on Apps Script, so no new account. Runs by itself, works from phone. | PPT must be opened as Google Slides (Drive can convert .pptx for free). |
| B. Zapier free plan | Free up to 100 tasks/month | Easy clicks, no code | Free plan only allows 2-step zaps. Our flow needs 3+ steps, so it becomes paid (~US$20/month). |
| C. Claude does it each time (Google Drive connector) | Uses Claude credits every run | Can read messy PPTs | Costs credits every single time. Use only as a backup. |
| D. Python script on your PC | Free | Works with real .pptx / .docx | PC must be on, not usable from phone. |

**Pick: Option A.** Claude is used only to *build* it once (and fix it), not to *run* it every day → saves credits.

## How the pieces connect (Option A)

```
Google Drive folder "PULSE/Proposals/1-Inbox"   ← you drop the PPT here
        │  (Apps Script checks every 15 min, or you press a button in PULSE)
        ▼
Read the "Data slide" in the PPT  (Key: Value lines)
        ▼
Copy "Offer Doc Template" (Google Doc with {{ClientName}}, {{Premium}} ...)
Fill in the blanks → save Doc + PDF in "PULSE/Proposals/3-Output"
        ▼
Write to PULSE Sheet: Offer Doc link, date, status = "Offer Sent"
Move PPT to "PULSE/Proposals/2-Done"
        ▼
PULSE dashboard shows the new status
```

### Why a "Data slide"?
If every PPT has one fixed slide (or the speaker notes of slide 1) like:

```
Client Name: Tan Ah Kow
Plan: Manulife ...
Premium: 3,000
Sum Assured: 500,000
```

…then plain Apps Script can read it reliably — **no AI needed, $0 per run**.

## Sharing the budget between "agents"

- **One source of truth:** the PULSE Google Sheet. Every agent (Apps Script, Claude, Zapier if ever used) reads and writes the same sheet. No duplicate databases.
- **Apps Script = daily worker (free).** Does the repeat work.
- **Claude = builder / fixer only.** Called when building, changing, or when a PPT can't be read.
- **Free limits to watch (Google, free account):** 90 min/day of trigger run time, 100 emails/day. Our flow uses about 5–10 seconds per offer, so plenty.

## Phase 1 – Connection (do this first)

1. In Google Drive, make folders: `PULSE/Proposals/1-Inbox`, `2-Done`, `3-Output`, `Templates`.
2. Put one sample PPT in `1-Inbox`.
3. Turn on Drive setting: ⚙️ Settings → "Convert uploads to Google Docs editor format" (free .pptx → Slides).
4. Make the Offer Doc template (Google Doc) with blanks like `{{ClientName}}`.
5. Add new columns to the PULSE tab: **Offer Doc Link**, **Offer Date**, **Offer Status**.
6. Claude adds the Apps Script code to `backend.gs` (new action `generateOffer`) and a test run.

## Questions to answer before details

1. Is the PPT made in **PowerPoint (.pptx)** or **Google Slides**?
2. Is the Offer Doc **Word** or **Google Doc**? Can you share a sample (hide client info)?
3. Which fields go from PPT → Offer Doc?
4. Which PULSE tab gets updated — PRESENTATION, CLOSING, or both?
5. Start automatically (every 15 min) or by a **button** in PULSE?
6. What is the 2nd Obsidian vault (BGL at `C:\BGL`?) so this note is copied there too.

## Next phases (later)

- Phase 2: Build the Apps Script (read PPT → fill Doc → PDF).
- Phase 3: Update PULSE sheet + dashboard button.
- Phase 4: Optional extras (email/WhatsApp the PDF to client, reminder to follow up).

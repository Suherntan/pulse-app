# PPT → Offer Doc → PULSE Automation (Plan)

- **Created:** 5 Oct 2026
- **Status:** Phase 1 (Connection) – decisions made, next: Slides + Offer Doc templates
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

## Decisions (5 Oct 2026)

- ✅ PPT will be made in **Google Slides** (we design the template together). No .pptx conversion needed → step 3 of Phase 1 can be skipped.
- ✅ Update **both PRESENTATION and CLOSING** tabs.
  - PRESENTATION: when the Offer Doc is made → Offer Doc Link, Offer Date, Offer Status = "Offer Sent".
  - CLOSING: same columns; filled when the client closes (status changes to Closed). Script finds columns **by header name**, same as the existing "Check Column Mapping" in `Code.gs`, so moving columns won't break it.

## Decisions (5 Oct 2026, part 2)

### How it starts – "✅ Presented" button
- Each client in the PULSE app (PRESENTATION list) gets one button: **✅ Presented – Make Offer**.
- Press it **after** you finish presenting. One press does everything:
  1. Reads the Data slide from that client's Google Slides.
  2. Makes the Offer Doc + PDF in `3-Output`.
  3. Saves one row in the **OFFERS** database tab.
  4. Updates PRESENTATION (Offer Status = "Offer Sent") – and CLOSING later when the client closes.
- A safety check: if the same client already has an offer for the same Slides file, it asks "Make again?" so you don't get duplicates.

### Fields (Data slide = last slide of every deck)
```
Client Name:
DOB:            (dd/mm/yyyy)
Phone:
Email:
Plan:
Premium:
Sum Assured:
```
- **Age is worked out from DOB automatically** (less typing, no mistakes).
- If a field is empty, the button stops and tells you which one is missing.

### Database = new "OFFERS" tab in the PULSE Google Sheet (free)
- The PULSE Sheet already lives in Google Drive, so this *is* a Drive database – no new tool, $0.
- Columns: Offer ID · Date Presented · Client Name · DOB · Age · Phone · Email · Plan · Premium · Sum Assured · Slides Link · Offer Doc Link · PDF Link · Status (Offer Sent / Closed / Lost)
- PULSE app gets a new **Offers** screen that pulls from this tab (new `fetchOffers` action), with tap-to-open links to the Slides / Doc / PDF.
- Other options looked at: Airtable free (1,000 rows limit, another account), Firebase (more setup). Sheet tab wins: free, already connected.

### Privacy note (do in Phase 4)
- Phone, email and DOB are personal data. Keep the `PULSE/Proposals` Drive folder **private** (not "anyone with link").
- The PULSE app currently has **no login** – anyone with the link could see data. Add a simple PIN before going live.

## Sample deck review – CLIENT_ANT_PRESENTATION_DECK_v1 (5 Oct 2026)

- 3 slides, ~26 MB (mostly pictures). Fine for Google Slides (limit 100 MB).
  1. Cover – "Helping professionals & business owners build lasting wealth & a legacy through A-N-T System"
  2. Lifestyle / Earning / Plan A / Plan B / Financial Planning / Income
  3. **L.I.F.E needs table** – Current Status + L.I.F.E (gap) = Financial Goals, for 6 areas:

| Area (top→bottom) | Current | L.I.F.E (gap) | Goal |
|---|---|---|---|
| Investment | 500,000 | = | 4,500,000 |
| Education | – | – | – |
| Death | 5,000 | 95,000 | 100,000 |
| Critical Illness | 100,000 | 900,000 | 1,000,000 |
| Disability | 100,000 | 90,000 | 1,000,000 ⚠️ adds up to 190,000, not 1,000,000 – check |
| Hospitalization | 750,000 | 250,000 | 1,000,000 |

- **No client details in the deck yet** → we add slide 4 "Data slide" (set to **Skip slide** in Google Slides so the client never sees it when presenting).
- Idea (optional): also save the 6 L.I.F.E gaps into the OFFERS tab, so PULSE shows each client's coverage gap.

## ⭐ New direction (6 Oct 2026): Form first, Google Drive as the base

**Flow is now:** Fact-Find **Form** (in PULSE app) → saved to **Google Drive** → Slides + Offer Doc are **filled from Drive** → next session, pull the same client back out.

This replaces the "Data slide" idea: data no longer has to be read *out of* the slides – it goes *into* the slides from the form. Simpler, fewer mistakes, still free.

### The form ("Client Fact-Find")
- Same look as the existing **Add Pipeline Client** form in PULSE, following the PULSE Ant Design mockup (`design-mockups/pulse-ant-design-redesign.html`) and the navy/gold A-N-T colours.
- Section A – Client: Name, DOB (age auto), Phone, Email (+ maybe Occupation, Monthly Income – to confirm)
- Section B – L.I.F.E needs: for Investment, Education, Death, Critical Illness, Disability, Hospitalization → **Current** + **Goal**. The **gap is calculated automatically** (Goal − Current), so the slide-3 maths can't go wrong.
- Section C – Recommendation (filled after presenting): Plan, Premium, Sum Assured.

### Google Drive = the base
```
PULSE Google Sheet  (already in Drive)
  └ CLIENTS tab   ← one row per client, Client ID (e.g. C-0001). The master record.
  └ OFFERS tab    ← one row per offer, linked by Client ID
  └ SESSIONS tab  ← log: date, client, what was done (form saved / slides made / offer made)
Drive folder  PULSE/Clients/C-0001 - Tan Ah Kow/
  └ Slides, Offer Docs, PDFs for that client
```
- **Next session:** search the client in PULSE → form opens **pre-filled** → change what's new → press Save → make new Slides / Offer Doc.
- **Future tools** (WhatsApp reminders, reports, etc.) all read the same CLIENTS tab – one source of truth.

### Watch out (free storage)
- Free Google Drive = 15 GB. The sample deck is ~26 MB (big photos). One copy per client → ~500 decks fills the drive.
- Fix (free): compress the deck photos once (target 3–5 MB), and keep only the PDF for old clients.

## Questions to answer before details

1. ~~PowerPoint or Google Slides?~~ → Google Slides
2. Is the Offer Doc **Word** or **Google Doc**? Can you share a sample (hide client info)?
3. ~~Fields?~~ → name, DOB (age auto), phone, email, plan, premium, sum assured
4. ~~Which tab?~~ → both
5. ~~Auto or button?~~ → button, pressed after presenting
6. ~~2nd vault?~~ → PULSE vault **only**. Nothing about PULSE goes to BGL.

## Next phases (later)

- Phase 2: Build the Apps Script (read PPT → fill Doc → PDF).
- Phase 3: Update PULSE sheet + dashboard button.
- Phase 4: Optional extras (email/WhatsApp the PDF to client, reminder to follow up).

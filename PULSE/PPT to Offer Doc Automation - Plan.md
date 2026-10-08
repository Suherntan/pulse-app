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

## Sharing the budget between "agents" (tools)

> Note 6 Oct: "agents" here = software tools. For **human insurance agents** sharing the system, see "Master account" below.

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

## 🔐 Master account for a team of agents (6 Oct 2026)

"Agents" = the insurance agents in your team. Everything they enter must also live in one **master account** (backup + overview).

| Option | Cost | Agents see others' clients? | Backup | Verdict |
|---|---|---|---|---|
| 1. One Google Sheet shared with all agents | Free | **Yes** – everyone sees & can delete everything | Weak (1 bad delete hits all) | ❌ Not safe for client data |
| 2. Each agent own Sheet, copied up to master | Free | No | Good | ⚠️ Works, but many sheets to set up & keep in sync |
| **3. Master owns everything, agents use PULSE app only** | **Free** | **No** – app shows each agent only their own clients | **Best** – all in one place | ✅ **Recommended** |
| 4. Google Workspace (paid) + Shared Drive | ~US$7 per user / month | Controlled by admin | Best | Later, when the team grows |

### How Option 3 works
- One **master Google account** (e.g. a new Gmail just for the agency). It owns the PULSE Sheet, the Drive folders, the Slides/Offer templates and the script.
- Agents **never get the Sheet link**. They open the PULSE app and log in with their **Agent ID + PIN** (AGENTS tab in the master Sheet).
- Every row saved gets an **Agent ID** column. The script only sends back rows that belong to that agent. Master/leader sees all.
- Client folders: `PULSE/Agents/<Agent>/Clients/<Client ID – Name>/`.
- **Automatic backup (free):** every Sunday the script copies the whole master Sheet into `PULSE/Backups/` (keep last 8 weeks). Code is already backed up on GitHub.
- Agent leaves the team → turn off their PIN. Their clients stay with the master.

### Limits to watch (master account, free)
- **Storage 15 GB shared by all agents.** Big decks fill it fast → compress decks, keep PDFs. If needed, Google One 100 GB is a low monthly cost.
- Script limits are per master account – fine for a small team (each action takes a few seconds).
- Client data = personal data: agents should tell clients their info is stored by the agency (consent line on the form).

## ✅ Decision (6 Oct 2026): each agent hosts, manager only collects DATA

- 10+ agents → plan big.
- **Each agent uses their own Google account** for everything: own PULSE Sheet, Drive, form, slides, offer docs, script. (Replaces Option 3 above.)
- **Agency manager's account = master DATA only.** No forms, slides or docs there. Manager sees all agents.
- Bonus: each agent has their own free 15 GB → the storage problem goes away.

### How data reaches the master (free)
- Manager deploys a small **"Receiver"** script on the master Sheet (runs as the manager).
- When an agent presses Save / Make Offer / Closed, the agent's script **sends the row** to the Receiver with the agent's **Agent ID + secret key**.
- Receiver checks the key and writes the row into the master tabs: **CLIENTS, OFFERS, SESSIONS, AGENTS** (each row tagged with Agent ID, upsert by Client ID so no duplicates).
- Agents **never get the master Sheet link** → they can't see each other's clients.
- If the internet fails, the row waits in an "Outbox" tab on the agent's Sheet; a free nightly timer re-sends it.
- Manager kicks out an agent → turn off their key. Data already sent stays in master.

### Planning big (10+ agents)
- **One shared code library ("PULSE Core")** owned by the manager. Each agent's script just calls it. Fix a bug once → all agents get it. (Without this, 10+ copies must be updated by hand.)
- **Setup kit for new agents:** a template Sheet → "Make a copy" → menu **PULSE ▸ Setup** asks for Agent ID + key → done in ~5 minutes. One PULSE app website for everyone; each agent's own link is saved in the app's Settings.
- **Size:** a Google Sheet holds 10 million cells ≈ 200,000+ client rows at ~40 columns. Fine for years. If it ever gets close, move old years to an archive Sheet.
- **Weekly backup** of the master Sheet (Sunday, keep 8 weeks) – free.
- **Policy point for the agency:** client files stay in each agent's own Drive. If an agent leaves, the agency keeps the *data* (in master) but not the files. Decide if that's OK.

## Other options besides Google (6 Oct 2026)

| Option | Free plan (check before sign-up) | Good | Not so good | Verdict |
|---|---|---|---|---|
| **Google (current plan)** | Free, 15 GB per account | Already built, Slides/Docs native, agents know it | Not a "real" database; logins are DIY | ✅ Start here |
| **Supabase** (real database) | ~500 MB database + 1 GB files, real logins | Built for many users; "each agent sees only own rows, manager sees all" is built-in | Big rebuild of PULSE; free project pauses if unused ~1 week; still need Google for Slides/Docs | ⭐ Upgrade path when team grows (30+) |
| Firebase (Google) | Free database + logins; file storage needs paid plan | Similar to Supabase | Files not free anymore; more setup | Maybe |
| Cloudflare D1 + Workers (already used in `small-dew-3892`) | 5 GB database, 100k requests/day | Very cheap, fast, already have account | Most coding work, no Slides/Docs | Later, techy option |
| Airtable | 1,000 records per base | Easy | Far too small for 10+ agents; paid ~US$20/user/month | ❌ |
| Zoho CRM | Free for ~3 users only | Real CRM | Paid for 10+ agents | ❌ |
| Microsoft 365 / OneDrive | Mostly paid | Word/PowerPoint native | Power Automate paid | ❌ |

**Recommendation:** build on Google now (free, fastest). Design the data (Client ID, Agent ID, same columns) so we can move the master to **Supabase** later without redoing the agents' side.

## ✅ Decisions (6 Oct 2026, part 3)

- **Platform:** Google now, Supabase later (keep Client ID / Agent ID / same columns so the move is easy).
- **Master gets data only** – no files, no PDFs.
- Form: **no** Occupation / Monthly Income.
- **Slide 2** = knowledge sharing, same for every client. Redesigned in A-N-T style: Lifestyle ← Plan A (Earning, stops if sickness/accident/death/retirement) ← Plan B (Financial Planning). Tagline: "Plan A builds your lifestyle. Plan B protects it."
- **Slide 3** = half concept, half questionnaire.
  - Pyramid = risk hierarchy. **Bottom = most urgent (Hospitalization)** → Disability → Critical Illness → Death → Education → **top = Investment (retirement)**.
  - Animation: pyramid builds **one tier per click, from the bottom up**; matching table row slides in.
  - Table: **Current** (what client has) · **Gap = Ideal − Current (automatic)** · **Ideal** (decided together). Gap shows only when Current + Ideal are filled; red = short, green = covered; total gap at bottom.
  - Hints under each area. Education = short term, least risk, return ~__%; Investment = long term, higher risk, return ~__%. **% to be filled later.**
- Preview file: `design-mockups/ant-deck-preview.html` (pictures in `design-mockups/ant-assets/`)

### Update (6 Oct 2026, part 4) – back to original layout
- Keep the **original slide layout, wording and click order**; only colours/design change (navy + gold, ANT logo, Oswald font). No small explanation text – the agent explains.
- Slide 2 click order (matches the agent's script): food → clothes → house → education → EARNING → PLAN A → red X → PLAN B → FINANCIAL PLANNING. LIFESTYLE, INCOME and the arrow are there from the start. Typo "PLANING" fixed to "PLANNING".
- Slide 3: title L.I.F.E; columns CURRENT STATUS · L.I.F.E (gap, automatic) · FINANCIAL GOALS. Each click: banner sweeps in (bottom first), a white brush mark drags the word out – long words run past the right side of the triangle. Return-% hints removed.
- Part 5: **solid colours** (no gradients/see-through), the 4 photos above LIFESTYLE replaced by a **gold icon diagram** (food · clothing · house · education, linked to LIFESTYLE), **ANT logo redrawn on the navy background** (`ant-assets/logo-light.png`).
- Part 6: keep the banner colours. **Slide 1 cover restyled** (Your wealth. Our purpose. + original tagline, growth chart, A·N·T blocks, 4 pillars). Slide 2 gold given depth (darker bottom edge + shadow) and a soft spotlight background. Slide 3: smaller triangle, **L.I.F.E title** bigger with gold 3D edge + underline, logo at the upper right.

### ⚠️ Google Slides can't do live maths
Google Slides tables have **no formulas**, so the automatic Gap needs one of:
1. **Present slide 3 from the PULSE app** ("Present mode", like the preview) – live maths + animation, and the numbers save straight to the client record → master. ✅ Recommended
2. Type numbers in the Fact-Find form first, script fills the slide (gap pre-calculated) – not live in front of the client.
3. Linked Google Sheets table in Slides – must press "Update" after each change; clunky.

## Fact-Find form + A-N-T Analysis PDF (6 Oct 2026)

**Order:** Fact-Find form (client background) → Slides 1-3 → **A-N-T Analysis PDF** (outcome of slide 3).

### Fact-Find form – `design-mockups/fact-find-form.html`
- Only **client background** now (L.I.F.E and Recommendation sections removed).
- Now: Name*, DOB* (age auto), Phone*, Email, consent tick. Find existing client at top.
- **B · Goals:** What motivated you to meet up with me? (text) · What financial goals? tap **Retirement** → retire at age + monthly cash flow wanted; tap **Kids' education** → children question · What other financial goals? (text)
- **C · Family:** Most important people? tap **Spouse/Partner** → what do they do · **Children** → number (− / +) + age of each · **Parents** → depending on you? Yes / Partly / No · Anyone else?
- Children are asked only once even if both "Kids' education" and "Children" are tapped.
- The A-N-T Analysis PDF now has a short **Background** part (motivation, goals, other goals, family).

### A-N-T Analysis PDF – `design-mockups/ant-analysis.html`
- Opened from the slides with the **Save A-N-T Analysis** button.
- One A4 page: navy header with logo + date · client box (name, Client ID, age, agent) · L.I.F.E pyramid + table (Current Status, L.I.F.E, Financial Goals, totals) · **Priority** list (gaps, most urgent first) · Notes box (type before saving). **No signature lines.** Agent **name + phone** shown in the client box and footer (from the agent's profile, set once in PULSE settings).
- PDF is **for records only** – not sent to the client.
- Logo position on slides 1 & 2: **on hold**.
- **Save as PDF** button (free, phone or laptop print → Save as PDF). File name: `A-N-T Analysis – <client> – <date>`.
- Next build step: script saves the PDF into the client's Drive folder automatically and sends the numbers to the master.

## ✅ Step 1 built (6 Oct 2026) – agent's own Google account
- New `ANT.gs` + 3 small additions in `Code.gs`. Tabs ANT_CLIENTS / ANT_ANALYSIS / ANT_LOG, Drive folder per client.
- Form: real search/load/save (C-0001 IDs from the sheet). Header shows DEMO / CONNECTED.
- Analysis page: **Save to Drive** makes the PDF in the browser (exact look, A4) and stores it in the client's folder; **Download PDF** still works offline.
- Tested end-to-end against the real script logic (fake Google in the test).
- Setup steps: see [[A-N-T Step 1 - Setup Guide]].
- Correction rule (8 Oct): same client + same day → **replace** the PDF and row; different day → new analysis.
## ✅ Pipeline link built (8 Oct 2026)
- Decisions: match by **phone**; search **all 4 tabs** (existing/servicing clients can do A-N-T again); not found → add to APPROACH; analysis saved → APPROACH moves to PRESENTATION, others stay.
- ANT CLIENT ID column on APPROACH / PRESENTATION / CLOSING / SR; reuses Code.gs getColumnMap_, addActivity, moveRowToStatus_.
- Update 8 Oct: tabs have different column orders → `moveRowToStatus_` now copies rows **by column title** (`copyRowByHeader_` in Code.gs – fixes manual moves too). Phone match also needs the **name to agree** (families sharing one number stay separate).
- Tested with the real Code.gs + ANT.gs on a fake sheet: link to CLOSING, add new to APPROACH, +60 phone match, move to PRESENTATION, same-day redo no duplicate remark, CLOSING stays.

## ✅ Step 2 built (8 Oct 2026) – manager's Master Sheet
- `ANT-Master.gs` in the manager's own Google Sheet: tabs AGENTS / CLIENTS / ANALYSIS / LOG, receiver web app, Add Agent (ID + secret key), Turn Agent On/Off, weekly backup (keep 8).
- `ANT.gs` (agent): A-N-T → Connect to Master; every save also sends the data (no files, no links); failures wait in ANT_OUTBOX and re-send nightly; Send Everything (one-time).
- Testing with a separate free "ANT Master" Gmail; real manager later = same steps, agents just reconnect.
- Tested: send, update without duplicates, master down → retry, wrong key, agent turned off, Agent ID can't be faked.
- Setup steps: see [[A-N-T Step 2 - Master Setup Guide]].

## Full flow (review – 6 Oct 2026)

```
0. Manager setup (once): master Sheet + Receiver + PULSE Core library; give each agent an ID + key
   Agent setup (once): copy template Sheet → PULSE ▸ Setup
1. Agent opens PULSE app (their own)
2. New client → Fact-Find FORM → Save
      → saved in agent's own Sheet + Drive folder  ──copy of data──▶ master
3. "Make Slides" → A-N-T deck copied & filled from the form → saved in client folder
4. Agent presents the deck
5. "✅ Presented – Make Offer" → Offer Doc + PDF in client folder
      → OFFERS row + PRESENTATION tab updated
6. Client closes → status Closed → CLOSING tab updated
7. Next session → search client → form pre-filled → update → new slides / offer
   (steps 2, 5, 6 each send the data row to the master)
8. Every Sunday → automatic backup copy of master Sheet
```

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

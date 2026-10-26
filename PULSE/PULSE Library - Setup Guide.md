# PULSE Library – Setup Guide (20 Oct 2026)

Goal: the PULSE automation/code lives **once, in Su's Google account** (the "PULSE Library"). Each advisor's Sheet keeps only a short **connector** (`PULSE-Connector.gs`). Advisor keeps their Sheet + client data; Su can switch the automation off by removing their access.

Links: [[Advisor Trial - Taking Back PULSE]] · [[PULSE Trial Agreement (draft)]]

## Part A – Su, once (about 15 min, laptop)
1. Go to **script.google.com** → **New project** → rename it **PULSE Library**.
2. ⚙️ **Project Settings** → Time zone **(GMT+08:00) Kuala Lumpur**.
3. Paste the latest **Code.gs** into `Code.gs`. Click **+ → Script** → name `ANT` → paste **ANT.gs**. Again **+ → Script** → name `Leads` → paste **Leads.gs**, and `Social` → paste **Social.gs**. **Save**.
4. **Deploy → New deployment** → ⚙️ → **Library** → description `v1` → **Deploy**.
5. ⚙️ **Project Settings** → copy the **Script ID** (keep it in this note: `______________`).
6. Top right **Share** (person icon) → add the advisor's Gmail as **Viewer** → Send.

## Part B – each advisor's Sheet (about 10 min)
> First do a safety copy: in their Apps Script, copy Code.gs + ANT.gs into a Notepad file (just in case).
1. Their PULSE Sheet → **Extensions → Apps Script**.
2. **Libraries +** (left side) → paste the Script ID → **Look up** → Version: the highest number → Identifier: **PULSE** → **Add**.
3. Click **ANT.gs** → ⋮ → **Delete** (and **Leads.gs** / **Social.gs** too, if they are there).
4. Click **Code.gs** → Ctrl+A → paste **PULSE-Connector.gs** → **Save**.
   (Settings like Advisor ID, client numbers, Master key and the daily timers are kept – they stay in this project.)
5. Choose function **onOpen** → **▶ Run** → Review permissions → Allow. Switch to the Sheet tab: the PULSE Reminders + A-N-T menus are there.
6. **Deploy → Manage deployments → ✏️ → New version → Deploy** (same link, so the app stays connected).
7. In the app: open the dashboard and **SAVE CLIENT** once to test.

## Updating PULSE later
1. Su: paste the new code into **PULSE Library** → **Deploy → Manage deployments → ✏️ (Library) → New version**.
2. Each advisor Sheet: Apps Script → **Libraries → PULSE → Version: newest → Save** → **Deploy → Manage deployments → ✏️ → New version**. (2 min – much shorter than pasting the code.)

## Switching an advisor off
- **Instant:** PULSE Library → **Share** → remove the advisor. Their app and menus stop ("Library … is missing"). Their Sheet and data stay.
- **Gentle:** Master ADVISORS tab → Active = No or Trial Ends date (app shows "PULSE IS PAUSED").

## Good to know
- A Viewer *can* open the library code, so it is not 100% secret – the agreement covers this.
- Google only lets non-editors use a fixed **version** of a library, so each advisor must move to the new version after an update (step 2 above).
- Library calls are a little slower (about +1 second).
- **Not yet tested live** – try it on **Stevern's** Sheet first, keep the Notepad backup until it works.

## To do later: move Su's own Sheet onto the Library (decided 26 Oct 2026 – not yet)
For now Su updates **two places** every time: her own Sheet (Code.gs, ANT.gs, Social.gs, Leads.gs) **and** the PULSE Library (for Stevern / advisors).

| | Own copy (now) | Linked to Library (later) |
|---|---|---|
| Each update | Paste twice (own Sheet + Library) | Paste once (Library) |
| Su's Sheet after an update | Deploy → New version | Library version **HEAD (development mode)** → just Deploy → New version |
| If the Library breaks | Su still works | Everyone on that version affected (fix = paste again) |
| Speed | Normal | ~1 s slower per action |
| Data, settings, timers | Own Sheet | Stay in own Sheet (unchanged) |

**When there is time (≈10 min):** make sure the Library has the latest Code.gs, ANT.gs, Social.gs, Leads.gs → Notepad backup of Su's current code → do **Part B** above on Su's own Sheet (Libraries + → Script ID → Version **HEAD**, Identifier PULSE → delete ANT/Leads/Social → Code.gs = PULSE-Connector.gs → run onOpen → Deploy → New version) → test SAVE CLIENT. Ask Claude: "switch me to the library".

## If PULSE stops connecting after pasting code (26 Oct 2026 – fixed this way)
Re-paste **all 4 files** from GitHub master into the Sheet's Apps Script – **Code.gs, ANT.gs, Social.gs, Leads.gs** (copy button on each GitHub page → Ctrl+A → Ctrl+V → Save). Keep `appsscript.json` as it is. Run **socialStatus** once (allow if asked) → **Deploy → Manage deployments → ✏️ → New version → Deploy** (not "New deployment"). Likely cause: one file was pasted into the wrong file or only part of the update was pasted.

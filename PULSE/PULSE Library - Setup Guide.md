# PULSE Library – Setup Guide (20 Oct 2026)

Goal: the PULSE automation/code lives **once, in Su's Google account** (the "PULSE Library"). Each advisor's Sheet keeps only a short **connector** (`PULSE-Connector.gs`). Advisor keeps their Sheet + client data; Su can switch the automation off by removing their access.

Links: [[Advisor Trial - Taking Back PULSE]] · [[PULSE Trial Agreement (draft)]]

## Part A – Su, once (about 15 min, laptop)
1. Go to **script.google.com** → **New project** → rename it **PULSE Library**.
2. ⚙️ **Project Settings** → Time zone **(GMT+08:00) Kuala Lumpur**.
3. Paste the latest **Code.gs** into `Code.gs`. Click **+ → Script** → name `ANT` → paste **ANT.gs**. **Save**.
4. **Deploy → New deployment** → ⚙️ → **Library** → description `v1` → **Deploy**.
5. ⚙️ **Project Settings** → copy the **Script ID** (keep it in this note: `______________`).
6. Top right **Share** (person icon) → add the advisor's Gmail as **Viewer** → Send.

## Part B – each advisor's Sheet (about 10 min)
> First do a safety copy: in their Apps Script, copy Code.gs + ANT.gs into a Notepad file (just in case).
1. Their PULSE Sheet → **Extensions → Apps Script**.
2. **Libraries +** (left side) → paste the Script ID → **Look up** → Version: the highest number → Identifier: **PULSE** → **Add**.
3. Click **ANT.gs** → ⋮ → **Delete**.
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

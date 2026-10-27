# PULSE WhatsApp bridge

Sends WhatsApp messages automatically from a **separate WhatsApp number**, so your main number is never at risk.

## What it sends

| Sends automatically | Never sends automatically |
|---|---|
| Client reminders already on the **TODAY - SEND REMINDERS** tab (birthdays, premium due). After sending, the reminder is marked sent, exactly as if you ticked the box. | Messages to the cold business leads from the lead finder. You still tap those yourself. |
| A welcome message to web-form leads who ticked the consent box. | Replies to people. Replies arrive on the new phone, and you answer them there. |

Anyone who replies **STOP** is added to the **WA OPT-OUT** tab and is never messaged again.

## Be honest with yourself about the risk

This uses an **unofficial** library (Baileys). WhatsApp's terms do not allow unofficial clients, so the new number can be banned. Nothing here can remove that risk, but the bridge lowers it:

- It only messages existing clients and people who agreed to hear from you.
- Daily cap, random waits between messages, and sending hours (all in `.env`).
- A "typing..." pause before each message, and an opt-out on every lead welcome.

Do not use your main number. Treat the new number as something you may lose.

## Setup

### 1. The new number (do this first, about 2 weeks before)
1. Get a prepaid SIM. Put it in a spare phone and install WhatsApp (or WhatsApp Business).
2. Register the number and set a name and photo.
3. **Warm it up for 1 to 2 weeks:** chat normally with real people. A brand-new number that starts sending straight away is the number most likely to be banned.

### 2. The computer
- It needs **Node.js 22 or newer**. Check with `node --version` in a terminal.
- It must stay **on, awake and online** during your sending hours (default 9:00 to 20:00).

### 3. Apps Script (your Google Sheet)
1. **Extensions → Apps Script**. Click **+ → Script**, name it `WaBridge`, and paste in [WaBridge.gs](../WaBridge.gs).
2. Replace `Leads.gs` with the new version from GitHub.
3. In `Code.gs`, find `case 'leadAction':` inside `doPost` and add these two lines right after its `return` line:
   ```js
   case 'wa':
     return jsonResponse(waHandle_(data));
   ```
4. **Project Settings (gear) → Script properties → Add**: name `WA_BRIDGE_SECRET`, value = a long random text (keep a copy). Click **Save script properties**.
5. **Deploy → Manage deployments → pencil → New version → Deploy.**

### 4. The bridge program
In a terminal, inside this `wa-bridge` folder:

```bash
npm install
```

Then copy `.env.example` to `.env` and fill in `PULSE_API_URL` and `WA_BRIDGE_SECRET`. For the first week, set `DAILY_CAP=10`.

Check that the sheet connection works (no WhatsApp yet):

```bash
npm start -- --check
```

It should say **Sheet connection OK**. If it says "Not allowed", the secret differs or the Apps Script was not redeployed.

### 5. Link the new number
```bash
npm start
```

A QR code appears. On the **new phone**: WhatsApp → **Settings → Linked devices → Link a device**, and scan it. You only do this once. The login is saved in the `auth` folder.

### 6. Switch it on
Open the **SETTINGS** tab in your sheet. Rows 11 and 12 are created the first time the bridge connects. Both start as **NO**:

- Row 11: auto client reminders. Set to **YES** when ready.
- Row 12: auto welcome to form leads. Set to **YES** when ready.

### 7. Keep it running
Double-click **start.bat**. It restarts the bridge if it stops, and stops if it needs you. To start it with Windows, put a shortcut to `start.bat` in the Startup folder (press Win+R, type `shell:startup`).

## What you will see in the sheet
- **WA OUTBOX**: welcomes waiting or sent, with status (QUEUED, SENT, FAILED, NO WHATSAPP, SKIPPED).
- **WA OPT-OUT**: everyone who said STOP. You can add numbers by hand.
- **WA LOG**: every attempt. A message that fails is not retried for 2 days.

## Keep safe
- The `auth` folder is the key to the number. Never share it or upload it. It is excluded from GitHub already.
- To unlink: delete the `auth` folder, or remove the device on the phone (Linked devices).
- The `.env` file holds your secret. It is excluded from GitHub too.

## If something goes wrong
- **"Not allowed."**: the secret in `.env` differs from the Script property, or the Apps Script was not redeployed as a new version.
- **Messages queue but nothing sends**: check the hours in `.env`, that the daily cap is not reached, and that rows 11 and 12 on SETTINGS say YES.
- **"This number was logged out"**: delete the `auth` folder and run `npm start` to scan the QR again.
- **Number banned**: stop using it. Do not move to your main number. Wait, then try a fresh number with a longer warm-up and a lower `DAILY_CAP`.

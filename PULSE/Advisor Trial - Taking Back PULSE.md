# Advisor Trial – Taking Back PULSE (20 Oct 2026)

Question: an advisor tries PULSE for 3 months; if they stop, how do we take it back?

## Who owns what today
| Piece | Owner | Can Su take it back? |
|---|---|---|
| PULSE app link (Vercel) | **Su** | Yes – but the link is shared; today anyone with it can set a password and connect their own Sheet. No per-advisor block yet. |
| Advisor's Google Sheet + Apps Script + A-N-T Clients Drive folder | **Advisor's own Google account** | **No** – Google never lets you take files out of someone else's account. |
| Client data in that Sheet | Advisor (and their clients – PDPA) | Should stay with the advisor / agency rules. Don't copy without consent. |
| Master Sheet (manager) | Su / agency manager | Yes – already has **Turn Advisor On / Off** (stops data being sent). |

## Options
| Option | Cost | Take-back | Downside |
|---|---|---|---|
| **A. Trial switch (licence)** – app + script check the Master ADVISORS tab "Active"; Off → app shows "Trial ended", features stop | Free | One click in Master | A tech-savvy person could edit the copied code to remove it; needs a written agreement too |
| B. Su owns the Sheet, shares it with the advisor | Free | Remove sharing – instant | Advisor's clients sit in Su's Google account (privacy/PDPA, Su sees their clients); advisor loses clients when trial ends |
| C. Google Workspace domain accounts for advisors | Paid | Admin owns everything | Monthly fee per advisor |
| D. Written trial agreement only | Free | Relies on trust | Nothing technical stops use |

**Recommendation: A + D.** Build the trial switch on the Master "Active" column and sign a short trial agreement (3 months, PULSE code/design stays Su's, must stop using after trial unless paid/renewed; client data stays with advisor).

## Built (20 Oct 2026) – option A + D
- **Master ADVISORS tab** has a new column **Trial Ends** (dd/mm/yyyy). "Add Advisor" asks for it (blank = no end).
- Advisor PULSE stops when **Active = No** *or* today is after **Trial Ends** → app shows **"PULSE IS PAUSED"**, saved data on the phone is cleared, all saves/loads are refused.
- The advisor's script checks the Master at most every **6 hours** (so a change can take up to 6 h). Advisor menu **A-N-T → Check PULSE On / Off** re-checks at once.
- Only works when the advisor's sheet is **connected to the Master** (Su does this during setup). Master down / no internet → PULSE keeps working (never locks out by accident).
- The Google Sheet itself still opens for the advisor (it is their file) – only the PULSE app and its tools stop.
- Agreement draft: [[PULSE Trial Agreement (draft)]].

### How to run a trial
1. Master → **A-N-T Master → Add Advisor** → ID, name, **Trial Ends** (3 months ahead) → give link + key.
2. Set up the advisor's PULSE and **A-N-T → Connect to Master** with that link + key.
3. Both sign the trial agreement.
4. End: nothing to do – it stops by itself after Trial Ends. To stop early: set **Active = No**. To extend: change **Trial Ends**.

## Can the code stay ours while the advisor keeps the Sheet? (20 Oct 2026)
| Option | Cost | Code in Su's account? | Cut off | Catch |
|---|---|---|---|---|
| Now: code copied into each advisor's Sheet (+ trial switch) | Free | No – they hold a copy | Trial switch | Copy-paste every update to every advisor |
| **Library (recommended)** – all PULSE code lives in ONE Apps Script project in Su's account; advisor's Sheet keeps only a short "connector" script that calls it | Free | **Yes** – one master copy | Remove their access to the library → automation stops at once (plus trial switch) | They need "view" access to use a library, so a determined person could still read/copy it; library calls are a little slower |
| Central script run by Su for everyone | Free | Yes, hidden | Instant | All emails/WhatsApp reminders would come from **Su's** Gmail; Su's daily Google limits shared by all advisors; Su can see all their clients – not suitable |
| Google Workspace add-on | Paid / Google review | Yes, hidden | Uninstall | Heavy setup, Google verification |
- Library bonus: update the code **once** in Su's library; each advisor then only switches to the new version number (2 min) instead of pasting Code.gs/ANT.gs.
- Status: **built 20 Oct 2026** – see [[PULSE Library - Setup Guide]].

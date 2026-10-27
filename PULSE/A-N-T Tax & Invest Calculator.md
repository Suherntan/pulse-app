# A-N-T Tax & Invest Calculator

- **Created:** 27 Oct 2026
- **Where:** PULSE app → **A-N-T** tab → **Tax & Invest Calculator** (page `ant/calculator.html`). **SAVE PDF** button prints it.
- Fills in name, age, monthly income and retire age from the last **Fact-Find** saved on this phone.

## What it shows
1. **Tax & PRS** – yearly income, taxable income (minus RM9,000 individual + EPF 11% up to RM4,000 + "other reliefs" you type), top tax rate, tax with / without PRS, **tax saved**, and a suggestion:
   - Top rate 6% or more → "RM3,000 a year (RM250/month)", tax saved, the instant "return" %, the default PRS fund for the age (below 45 Growth, 45–54 Moderate, 55+ Conservative), "before 31 December".
   - Top rate 3% or less → saving is small, emergency fund first. No tax → no saving.
2. **Emergency fund** – 6 × monthly expenses vs cash now → short by RM… .
3. **Investment plan** – invest **% of income** (default 15%), risk level **Careful / Middle / Comfortable** (100 / 110 / 120 minus age) → growth vs safe bar. Table: PRS (RM250/month) + unit trust, ETF, bond fund, fixed deposit (example returns – edit them), **+ ADD INVESTMENT** for gold, other funds etc. Each row: RM/month, Rule of 72 "doubles in", value at retirement. Your list and returns are saved on this phone.
4. **How much to invest?** – table of 5–25% of income × 3/5/7/9% a year → value at retirement (current plan highlighted).
5. Inflation line: today's expenses at 3% a year by retirement age.

## Rules used
- Tax: Malaysian resident rates YA 2023 onwards, RM400 rebate if taxable income ≤ RM35,000. **Estimate only** – the real reliefs vary.
- PRS relief up to RM3,000/yr (shared with deferred annuity), until YA 2030.
- Returns are examples, not guaranteed. General illustration, not advice.

## Later ideas
- Save the calculator result into the client's CLIENT FILE / A-N-T Analysis PDF.
- Add ETF / unit-trust fund lists with their real past returns.

## Save to client file + Analysis PDF (27 Oct 2026)
- Calculator → **SAVE TO CLIENT FILE**: saved in tab **ANT_PLANS** (ID T-0001…), copied to the Master tab **PLANS**. Also kept on this phone.
- Which client: opened from the CLIENT FILE (**+ NEW PLAN (CALCULATOR)** button) or the last Fact-Find saved on this phone. The top line shows "For Name (C-0001)". The same client's last inputs come back next time.
- **CLIENT FILE** (Fact-Find search) → section **TAX & INVEST PLAN** lists every saved plan (income, tax rate, PRS & tax saved, emergency fund, invest %, each investment, value at retirement).
- **A-N-T Analysis** → an extra page **TAX & INVEST PLAN** appears when the saved plan is for the same client. It goes into DOWNLOAD PDF and SAVE TO DRIVE. **✕ Remove** takes it out for this PDF.
- Needs: new **ANT.gs + Code.gs** (your Sheet + PULSE Library → New version) and **ANT-Master.gs** (Master → New version). Stevern: newest Library version.

## Unit trust section (27 Oct 2026)
- New card **5 UNIT TRUST** in the calculator: fund type (Equity / Shariah equity / Balanced / Bond / Money market), lump sum, monthly (empty = the unit trust amount from the plan), return % before fees, **sales charge %**, **management fee % a year**.
- Example defaults (editable): Equity 7% / 5% / 1.5% · Shariah equity 6.5% / 5% / 1.5% · Balanced 5.5% / 5% / 1.5% · Bond 4% / 2% / 1% · Money market 3% / 0% / 0.5%.
- Shows: put in, sales charge paid, management fees (estimate), return after fees, Rule of 72, value at retirement, and the **same money in EPF (6.15%, 2025 dividend, no fees) and fixed deposit (3%)**, with a tip on how much the fund must make to beat EPF.
- Saved with the plan → shown in the CLIENT FILE and on the TAX & INVEST PLAN page of the Analysis PDF.
- Update EPF_RATE in the calculator each year when EPF declares the new dividend.

- **Update 27 Oct 2026 (Su):** sales charge and management fee **removed** from the Unit Trust card. It now uses one yearly return per fund type (Equity 7%, Shariah equity 6.5%, Balanced 5.5%, Bond 4%, Money market 3% – editable) and compares with EPF and FD. The client file and Analysis PDF no longer show fees.

## Linked to the client profile (27 Oct 2026)
- Calculator top: **Find client (name or phone)** – searches the Google Sheet. Pick a client → name, age (from date of birth), monthly income, retire age come from the profile, and the **latest saved plan** for that client is loaded (works on any phone).
- Line under the search: "For Name (C-0001) · **Open client file ›**" (goes to Fact-Find with that client).
- From the CLIENT FILE, **+ NEW PLAN** opens the calculator for that client and also loads their latest plan.
- Only clients with a Fact-Find (C-number) can be picked; pipeline-only clients need a Fact-Find first.
- **Inside the client file (27 Oct 2026):** **+ NEW PLAN (CALCULATOR)** now opens the calculator as a **full-screen pop-up over the client profile** (same page). Fill in → **SAVE TO CLIENT FILE** → the pop-up closes by itself and the new plan shows at once in TAX & INVEST PLAN. **✕ CLOSE** leaves without saving.

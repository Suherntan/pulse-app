# Design Brief: Client Fund Tracker — for Claude Code

Paste this whole note to Claude Code on this computer. It should pick up
the emil-design-eng skill automatically since this is a UI/design task —
if it doesn't, just say "use the emil design skill for this."

## What I want built

A polished, client-facing view on top of my fund tracking data — something
nicer to look at than a plain spreadsheet, that I can show clients or check
on my phone. Not a replacement for the working Google Sheet (that stays as
my data-entry backend) — this is the presentation layer on top of it.

## The data behind it

Two Google Sheets (soon to be merged into one workbook with two tabs):

**Fund Watchlist - 3 Year Horizon**
Columns: Fund Name, Type (Shariah/Conventional), Category, 1Y/3Y/5Y/10Y
Return %, Data As Of, 3Y Rank, Recommended for 3-Year Horizon (Yes/Consider)

**Client Fund Interest Tracker**
Columns: Client Name, Contact, Risk Profile, Fund of Interest, Investment
Horizon, Status, Date Discussed, Notes

## Design direction

- Dark navy background, gold accents
- Numbered cards with icons (e.g. for top-ranked funds, or client status
  stages)
- Bold headlines
- Insight bars (short callout strips highlighting a key stat — e.g.
  "Top 3-year performer: HW Shariah Flexi Fund, +47.77%")
- Should NOT look generic or template-y — this is the part the
  emil-design-eng / taste-skill combo should help with (button feel,
  spacing, polish, avoiding boring/generic layout)

## What "good" looks like

- Works cleanly on a phone screen, not just desktop
- A fund summary section (top picks, Shariah vs conventional split)
- A client pipeline section (who's been shown what, what stage they're at)
- Should be easy for me to update later — either by re-pasting fresh data,
  or (if practical) connecting live to the Google Sheet

## Compliance note (please keep in)

Any fund performance shown must carry a small disclaimer: past performance
is not indicative of future results. This is a research/tracking tool, not
standalone investment advice — final recommendations depend on each
client's individual risk profile.

# P.U.L.S.E Dashboard

A mobile-friendly sales tracking dashboard for insurance agents.

## Features

- **Daily Dashboard** - See today's birthdays, payment reminders, and follow-ups at a glance
- **Weekly Target Tracker** - Track progress toward 90 approaches/week and 10 presentations/week
- **Client Management** - View all closed clients with policy numbers, birthdays, and payment dates
- **Activity Logging** - Add new activities directly from your phone
- **Mobile-First Design** - Works great on phones, tablets, and desktops

## File Structure

`
PULSE/
|-- index.html          # Main dashboard page
|-- css/
|   |-- style.css       # All styling
|-- js/
|   |-- api.js          # API communication layer
|   |-- app.js          # Main application logic
|   |-- tracker.js      # Weekly tracker utilities
|   |-- reminders.js    # Birthday/payment reminder utilities
|-- backend.gs          # Google Apps Script backend
|-- icons/
|   |-- favicon.svg     # App icon
|-- SETUP_INSTRUCTIONS.md  # Step-by-step setup guide
|-- README.md           # This file
`

## Quick Start

1. Read **SETUP_INSTRUCTIONS.md** for the full setup guide
2. Add 3 new columns to your CLOSING tab: Policy Number, Client Birthday, Payment Due Date
3. Create the Google Apps Script backend
4. Deploy as Web App
5. Host the files on Netlify or GitHub Pages
6. Connect the dashboard to your Sheet

## Requirements

- Google Sheets with tabs: APPROACH, PRESENTATION, CLOSING, SR, PERFORMANCE TRACKER
- Google account for Apps Script
- Internet connection for data sync

## License

Personal use only.
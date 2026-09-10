// --- Fund & Client Tracker: sample data ---
// Replace the rows below with your real Google Sheet data any time.
// Each object's keys match the sheet columns described in the design brief.

var FUND_DATA = [
    { name: 'HW Shariah Flexi Fund', type: 'Shariah', category: 'Flexible Allocation', ret1y: 18.42, ret3y: 47.77, ret5y: 61.30, ret10y: 112.05, asOf: '2026-08-31', rank3y: 1, recommended: 'Yes' },
    { name: 'Global Growth Equity Fund', type: 'Conventional', category: 'Equity - Global', ret1y: 15.10, ret3y: 41.20, ret5y: 58.90, ret10y: 98.40, asOf: '2026-08-31', rank3y: 2, recommended: 'Yes' },
    { name: 'Asia Pacific Shariah Equity', type: 'Shariah', category: 'Equity - Regional', ret1y: 13.75, ret3y: 36.05, ret5y: 49.80, ret10y: 87.60, asOf: '2026-08-31', rank3y: 3, recommended: 'Yes' },
    { name: 'Balanced Income Fund', type: 'Conventional', category: 'Balanced', ret1y: 9.80, ret3y: 27.40, ret5y: 38.10, ret10y: 71.20, asOf: '2026-08-31', rank3y: 4, recommended: 'Consider' },
    { name: 'Dividend Value Shariah Fund', type: 'Shariah', category: 'Equity - Income', ret1y: 8.95, ret3y: 24.60, ret5y: 35.50, ret10y: 66.90, asOf: '2026-08-31', rank3y: 5, recommended: 'Consider' },
    { name: 'Fixed Income Plus Fund', type: 'Conventional', category: 'Bond', ret1y: 5.20, ret3y: 15.30, ret5y: 24.70, ret10y: 48.10, asOf: '2026-08-31', rank3y: 6, recommended: 'Consider' }
];

var CLIENT_DATA = [
    { name: 'Tan Wei Ming', contact: '012-345 6789', riskProfile: 'Aggressive', fundOfInterest: 'HW Shariah Flexi Fund', horizon: '3 Year', status: 'Proposal Sent', dateDiscussed: '2026-09-02', notes: 'Wants Shariah-compliant only, comparing with competitor plan.' },
    { name: 'Nurul Ain Hassan', contact: '019-876 5432', riskProfile: 'Moderate', fundOfInterest: 'Asia Pacific Shariah Equity', horizon: '3 Year', status: 'Discussed', dateDiscussed: '2026-08-28', notes: 'Follow up after her bonus in October.' },
    { name: 'Raj Kumar', contact: '016-222 3344', riskProfile: 'Moderate', fundOfInterest: 'Global Growth Equity Fund', horizon: '5 Year', status: 'Closed', dateDiscussed: '2026-08-15', notes: 'Signed up, first premium collected.' },
    { name: 'Chong Mei Ling', contact: '017-555 8899', riskProfile: 'Conservative', fundOfInterest: 'Balanced Income Fund', horizon: '3 Year', status: 'New Lead', dateDiscussed: '2026-09-08', notes: 'Referred by Raj Kumar, first call scheduled.' },
    { name: 'Ahmad Faiz', contact: '013-999 1122', riskProfile: 'Aggressive', fundOfInterest: 'Dividend Value Shariah Fund', horizon: '3 Year', status: 'Considering', dateDiscussed: '2026-09-05', notes: 'Comparing returns vs conventional option before deciding.' },
    { name: 'Lim Su Yin', contact: '018-777 4455', riskProfile: 'Conservative', fundOfInterest: 'Fixed Income Plus Fund', horizon: '10 Year', status: 'Declined', dateDiscussed: '2026-08-20', notes: 'Prefers to stay in fixed deposits for now.' }
];

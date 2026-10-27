/**
 * =====================================================================
 * P.U.L.S.E — LEADS INBOX (Leads.gs)
 * ---------------------------------------------------------------------
 * Collects new potential clients on their own "LEADS INBOX" tab so they
 * do NOT count toward your APPROACH numbers until you've actually
 * contacted them. Two sources feed it:
 *   1. lead/index.html  — public form people fill in themselves
 *      (source "WEB FORM", consent box required).
 *   2. leadfinder/      — weekly GitHub robot that lists public
 *      BUSINESSES (company phone numbers only) from Google Places
 *      (source "FINDER", needs LEAD_FINDER_SECRET).
 *
 * SETUP (once):
 *   - Project Settings -> Script properties -> add LEAD_FINDER_SECRET
 *     (any long random text). Put the same text in the GitHub secret
 *     LEAD_FINDER_SECRET. Web-form leads do not need it.
 *   - Redeploy the web app (Deploy -> Manage deployments -> New version).
 * =====================================================================
 */

var LEADS_SHEET_NAME = 'LEADS INBOX';
var LEADS_HEADERS = ['DATE ADDED', 'SOURCE', 'NAME', 'COMPANY', 'PHONE', 'EMAIL',
                     'INTEREST', 'NOTES', 'CONSENT', 'STATUS'];
var LEADS_MAX_PER_HOUR = 60;   // all sources together; stops form spam floods
var LEADS_MAX_BATCH = 100;     // finder leads per request

// ---------------------------------------------------------------
// Message wording lives on the SETTINGS tab (rows 5-9), so you can edit it
// in the sheet any time -- no redeploy needed. The rows are created with
// these defaults the first time they are needed.
// Placeholders: {name} {company} {agent} {guide}
// ---------------------------------------------------------------
var LEAD_TEMPLATE_ROWS = [
  { key: 'waBusiness', row: 5, label: 'Lead WhatsApp message (business, from finder)',
    text: 'Hi, this is {agent}. I help business owners and professionals in Malaysia close the gaps in their financial plan. I put together a short free guide, "7 Financial Blind Spots". May I send it to the owner of {company}? Happy to stop if it is not relevant.' },
  { key: 'waPerson', row: 6, label: 'Lead WhatsApp message (person, from web form)',
    text: 'Hi {name}, thank you for reaching out. This is {agent}. I will send you the free "7 Financial Blind Spots" guide, and we can find a time for a short chat. When are you free this week?' },
  { key: 'mailSubject', row: 7, label: 'Lead welcome email subject',
    text: 'Your free 7 Financial Blind Spots guide' },
  { key: 'mailBody', row: 8, label: 'Lead welcome email body',
    text: 'Hi {name},\n\nThank you for getting in touch. I am {agent}, and I will contact you personally soon.\n\nIn the meantime, here is the free guide: {guide}\n\nIf you would rather not hear from me, just reply "stop" and I will not contact you again.\n\nRegards,\n{agent}' },
  { key: 'guide', row: 9, label: 'Free guide link (optional)', text: '' }
];

function getLeadTemplates_() {
  var settings = getAgentSettings_();           // makes sure SETTINGS exists
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AGENT_SETTINGS_SHEET_NAME);
  var out = { agent: settings.agentName };
  LEAD_TEMPLATE_ROWS.forEach(function (t) {
    var labelCell = sheet.getRange(t.row, 1);
    if (!String(labelCell.getValue()).trim()) {
      labelCell.setValue(t.label).setFontWeight('bold');
      sheet.getRange(t.row, 2).setValue(t.text).setWrap(true);
    }
    out[t.key] = String(sheet.getRange(t.row, 2).getValue() || '');
  });
  return out;
}

function fillLeadTemplate_(template, vars) {
  var text = String(template);
  // No guide link set: drop the line that mentions it instead of sending "{guide}".
  if (!vars.guide) {
    text = text.split('\n').filter(function (line) { return line.indexOf('{guide}') === -1; }).join('\n');
  }
  return text.split('{name}').join(vars.name || 'there')
             .split('{company}').join(vars.company || 'your company')
             .split('{agent}').join(vars.agent || '')
             .split('{advisor}').join(vars.agent || '')
             .split('{guide}').join(vars.guide || '');
}

function getLeadsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LEADS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LEADS_SHEET_NAME);
    sheet.appendRow(LEADS_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, LEADS_HEADERS.length).setFontWeight('bold');
    sheet.getRange('E:E').setNumberFormat('@');   // keep phone as text
  }
  return sheet;
}

function leadClean_(v, max) {
  var s = String(v === null || typeof v === 'undefined' ? '' : v).trim();
  // Stop spreadsheet formula injection from anything typed into the form.
  if (/^[=+\-@]/.test(s) && !/^\+?\d[\d\s\-()]*$/.test(s)) s = "'" + s;
  return s.substring(0, max);
}

function leadPhoneKey_(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-9) : '';   // last 9 digits
}

function leadEmailKey_(raw) {
  var e = String(raw || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? 'e:' + e : '';
}

/** Phone key when there is a phone, otherwise the email key ('' if neither). */
function leadKey_(phone, email) {
  return leadPhoneKey_(phone) || leadEmailKey_(email);
}

function existingLeadPhoneKeys_(sheet) {
  var keys = {};
  var last = sheet.getLastRow();
  if (last < 2) return keys;
  sheet.getRange(2, 5, last - 1, 2).getValues().forEach(function (r) {
    var k = leadPhoneKey_(r[0]);
    if (k) keys[k] = true;
    var ek = leadEmailKey_(r[1]);
    if (ek) keys[ek] = true;
  });
  return keys;
}

function leadsRateLimited_(count) {
  var cache = pulseCache_();
  var used = Number(cache.get('leads_hour_count') || 0);
  if (used + count > LEADS_MAX_PER_HOUR) return true;
  cache.put('leads_hour_count', String(used + count), 3600);
  return false;
}

/**
 * Public web form. Expected: { name, phone, email, interest, notes,
 * consent: true, website: '' }  (website is a hidden trap field for bots)
 */
function addWebLead(data) {
  if (data.website) return { success: true };               // bot: pretend OK
  if (!data.consent) return { success: false, error: 'Please tick the consent box.' };

  var name = leadClean_(data.name, 80);
  var phone = leadClean_(data.phone, 30);
  if (!name) return { success: false, error: 'Please enter your name.' };
  if (!leadPhoneKey_(phone)) return { success: false, error: 'Please enter a valid phone number.' };

  var lock = pulseLock_();
  lock.waitLock(20000);
  try {
    if (leadsRateLimited_(1)) {
      return { success: false, error: 'Too many requests right now. Please try again later.' };
    }
    var sheet = getLeadsSheet_();
    if (existingLeadPhoneKeys_(sheet)[leadPhoneKey_(phone)]) {
      return { success: true, duplicate: true };            // already have them
    }
    sheet.appendRow([
      new Date(), 'WEB FORM', name, '', phone,
      leadClean_(data.email, 100), leadClean_(data.interest, 60),
      leadClean_(data.notes, 500), 'Yes ' + new Date().toISOString(), 'NEW'
    ]);
    var newRow = sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }

  // Automatic welcome WhatsApp (WaBridge.gs): only if you switched it on in SETTINGS.
  try {
    var waTpl = getLeadTemplates_();
    waQueueLeadWelcome_(name, phone, fillLeadTemplate_(waTpl.waPerson, { name: name, agent: waTpl.agent, guide: waTpl.guide }));
  } catch (waErr) { /* the lead is already saved */ }

  // Automatic welcome email (only if they typed a valid email; they ticked consent).
  var theirEmail = leadClean_(data.email, 100);
  var welcomeNote = '';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(theirEmail)) {
    try {
      var tpl = getLeadTemplates_();
      var vars = { name: name, agent: tpl.agent, guide: tpl.guide };
      MailApp.sendEmail(theirEmail, fillLeadTemplate_(tpl.mailSubject, vars),
        fillLeadTemplate_(tpl.mailBody, vars), { name: tpl.agent });
      welcomeNote = 'welcome email sent';
    } catch (err) {
      welcomeNote = 'welcome email FAILED';
    }
    try {
      var noteCell = sheet.getRange(newRow, 8);
      noteCell.setValue([noteCell.getValue(), welcomeNote].filter(String).join(' | '));
    } catch (err2) { /* the note is a bonus */ }
  }

  try {
    var me = Session.getEffectiveUser().getEmail();
    if (me) {
      MailApp.sendEmail(me, 'New PULSE lead: ' + name,
        name + '\n' + phone + '\n' + leadClean_(data.email, 100) +
        '\nInterested in: ' + leadClean_(data.interest, 60) +
        '\n\nOpen the LEADS INBOX tab to follow up.');
    }
  } catch (err) { /* email is a bonus; the lead is already saved */ }

  return { success: true };
}

/**
 * Dashboard: leads newest first. status = 'NEW' (default, the Today card),
 * 'MOVED', 'DISMISSED' or 'ALL' (the full Leads page).
 */
function getNewLeads(status) {
  var want = String(status || 'NEW').toUpperCase();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LEADS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, LEADS_HEADERS.length).getValues();
  var tpl = getLeadTemplates_();
  var out = [];
  values.forEach(function (r, i) {
    var st = String(r[9]).trim().toUpperCase();
    if (want !== 'ALL' && st !== want) return;
    out.push({
      status: st,
      rowNumber: i + 2,
      date: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]),
      source: String(r[1]), name: String(r[2]), company: String(r[3]),
      phone: String(r[4]), email: String(r[5]), interest: String(r[6]), notes: String(r[7]),
      waMessage: fillLeadTemplate_(String(r[1]) === 'FINDER' ? tpl.waBusiness : tpl.waPerson,
        { name: String(r[2]), company: String(r[3]), agent: tpl.agent, guide: tpl.guide })
    });
  });
  return out.reverse().slice(0, want === 'ALL' ? 500 : 50);
}

/**
 * Dashboard buttons. { rowNumber, expectedPhone, action: 'approach' | 'dismiss' | 'restore' }
 * 'approach' copies the lead onto the APPROACH tab (so it counts as an
 * approach from that moment) and marks it MOVED here. 'restore' puts a
 * DISMISSED lead back to NEW (a MOVED lead can't be restored: it is
 * already on APPROACH).
 */
function leadAction(data) {
  var row = Number(data && data.rowNumber);
  var action = data && data.action;
  if (!row || row < 2 || (action !== 'approach' && action !== 'dismiss' && action !== 'restore')) {
    return { success: false, error: 'Bad request.' };
  }
  var lock = pulseLock_();
  lock.waitLock(20000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LEADS_SHEET_NAME);
    if (!sheet || row > sheet.getLastRow()) return { success: false, error: 'Lead not found -- refresh.' };
    var r = sheet.getRange(row, 1, 1, LEADS_HEADERS.length).getValues()[0];
    if (leadKey_(r[4], r[5]) !== leadKey_(data.expectedPhone, data.expectedEmail) || String(r[9]).toUpperCase() !== (action === 'restore' ? 'DISMISSED' : 'NEW')) {
      return { success: false, error: 'This lead changed -- refresh and try again.' };
    }
    if (action === 'approach') {
      var res = addActivity({
        activityType: 'APPROACH',
        name: String(r[2] || r[3]),
        contact: String(r[4] || r[5]),            // phone, or the email when there is no phone
        nature: 'Lead (' + String(r[1]).toLowerCase() + ')',
        remarks: [r[3], r[5], r[6], r[7]].filter(String).join(' | ')
      });
      if (!res.success) return res;
    }
    sheet.getRange(row, 10).setValue(action === 'approach' ? 'MOVED' : action === 'restore' ? 'NEW' : 'DISMISSED');
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Finder robot. Expected: { secret, leads: [{ name, company, phone,
 * email, notes }] }. Public-business listings only.
 */
function addFinderLeads(data) {
  var secret = pulseProps_().getProperty('LEAD_FINDER_SECRET');
  if (!secret || data.secret !== secret) {
    return { success: false, error: 'Not allowed.' };
  }
  var leads = (data.leads || []).slice(0, LEADS_MAX_BATCH);
  if (!leads.length) return { success: true, added: 0, skipped: 0 };

  var lock = pulseLock_();
  lock.waitLock(30000);
  try {
    var sheet = getLeadsSheet_();
    var seen = existingLeadPhoneKeys_(sheet);
    var rows = [];
    var skipped = 0;
    leads.forEach(function (l) {
      var phoneKey = leadPhoneKey_(l.phone);
      var emailKey = leadEmailKey_(l.email);
      // Needs a phone or an email, and neither may already be in the inbox.
      if ((!phoneKey && !emailKey) || (phoneKey && seen[phoneKey]) || (emailKey && seen[emailKey])) {
        skipped++;
        return;
      }
      if (phoneKey) seen[phoneKey] = true;
      if (emailKey) seen[emailKey] = true;
      rows.push([
        new Date(), 'FINDER', leadClean_(l.name, 80), leadClean_(l.company, 120),
        leadClean_(l.phone, 30), leadClean_(l.email, 100), '',
        leadClean_(l.notes, 500), 'Public business listing', 'NEW'
      ]);
    });
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, LEADS_HEADERS.length).setValues(rows);
    }
    return { success: true, added: rows.length, skipped: skipped };
  } finally {
    lock.releaseLock();
  }
}

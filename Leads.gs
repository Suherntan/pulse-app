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

function existingLeadPhoneKeys_(sheet) {
  var keys = {};
  var last = sheet.getLastRow();
  if (last < 2) return keys;
  sheet.getRange(2, 5, last - 1, 1).getValues().forEach(function (r) {
    var k = leadPhoneKey_(r[0]);
    if (k) keys[k] = true;
  });
  return keys;
}

function leadsRateLimited_(count) {
  var cache = CacheService.getScriptCache();
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

  var lock = LockService.getScriptLock();
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
  } finally {
    lock.releaseLock();
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
  var out = [];
  values.forEach(function (r, i) {
    var st = String(r[9]).trim().toUpperCase();
    if (want !== 'ALL' && st !== want) return;
    out.push({
      status: st,
      rowNumber: i + 2,
      date: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') : String(r[0]),
      source: String(r[1]), name: String(r[2]), company: String(r[3]),
      phone: String(r[4]), email: String(r[5]), interest: String(r[6]), notes: String(r[7])
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
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LEADS_SHEET_NAME);
    if (!sheet || row > sheet.getLastRow()) return { success: false, error: 'Lead not found -- refresh.' };
    var r = sheet.getRange(row, 1, 1, LEADS_HEADERS.length).getValues()[0];
    if (leadPhoneKey_(r[4]) !== leadPhoneKey_(data.expectedPhone) || String(r[9]).toUpperCase() !== (action === 'restore' ? 'DISMISSED' : 'NEW')) {
      return { success: false, error: 'This lead changed -- refresh and try again.' };
    }
    if (action === 'approach') {
      var res = addActivity({
        activityType: 'APPROACH',
        name: String(r[2] || r[3]),
        contact: String(r[4]),
        nature: 'Lead (' + String(r[1]).toLowerCase() + ')',
        remarks: [r[3], r[6], r[7]].filter(String).join(' | ')
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
  var secret = PropertiesService.getScriptProperties().getProperty('LEAD_FINDER_SECRET');
  if (!secret || data.secret !== secret) {
    return { success: false, error: 'Not allowed.' };
  }
  var leads = (data.leads || []).slice(0, LEADS_MAX_BATCH);
  if (!leads.length) return { success: true, added: 0, skipped: 0 };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getLeadsSheet_();
    var seen = existingLeadPhoneKeys_(sheet);
    var rows = [];
    var skipped = 0;
    leads.forEach(function (l) {
      var key = leadPhoneKey_(l.phone);
      if (!key || seen[key]) { skipped++; return; }
      seen[key] = true;
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

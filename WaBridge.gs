/**
 * =====================================================================
 * P.U.L.S.E — WHATSAPP BRIDGE (WaBridge.gs)
 * ---------------------------------------------------------------------
 * The sheet side of the automatic WhatsApp sender. A small program on
 * your PC (folder wa-bridge/) logs in to a SEPARATE WhatsApp number and
 * sends what this file hands it. It sends only:
 *   1. Client reminders already on the "TODAY - SEND REMINDERS" tab
 *      (birthdays, premium due) -- after sending, the reminder is marked
 *      sent exactly as if you had ticked the box yourself.
 *   2. A welcome message to web-form leads who ticked the consent box.
 * Cold business leads are NEVER sent automatically.
 * Anyone who replies STOP is added to WA OPT-OUT and never messaged again.
 *
 * SETUP (once):
 *   - Script properties -> add WA_BRIDGE_SECRET (any long random text);
 *     the same text goes in wa-bridge/.env.
 *   - Redeploy the web app (Deploy -> Manage deployments -> New version).
 *   - Both switches below start as NO. Set them to YES on the SETTINGS
 *     tab (rows 11-12, created automatically) when you are ready.
 * =====================================================================
 */

var WA_OUTBOX_SHEET = 'WA OUTBOX';
var WA_OPTOUT_SHEET = 'WA OPT-OUT';
var WA_LOG_SHEET = 'WA LOG';
var WA_OUTBOX_HEADERS = ['ID', 'QUEUED AT', 'PHONE', 'NAME', 'MESSAGE', 'KIND', 'STATUS', 'SENT AT', 'NOTE'];
var WA_OPTOUT_HEADERS = ['PHONE', 'DATE', 'REPLY TEXT'];
var WA_LOG_HEADERS = ['TIME', 'KEY', 'STATUS', 'DETAIL'];
var WA_FOOTER = '\n\n(Reply STOP if you do not want more messages.)';
var WA_SETTING_ROWS = {
  autoReminders: { row: 11, label: 'Auto WhatsApp: client reminders (YES/NO)' },
  autoLeads: { row: 12, label: 'Auto WhatsApp: welcome to web-form leads (YES/NO)' }
};

function waSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

/** YES/NO switch on the SETTINGS tab (created with NO the first time). */
function waSetting_(key) {
  getAgentSettings_();                                    // makes sure SETTINGS exists
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AGENT_SETTINGS_SHEET_NAME);
  var s = WA_SETTING_ROWS[key];
  if (!String(sheet.getRange(s.row, 1).getValue()).trim()) {
    sheet.getRange(s.row, 1).setValue(s.label).setFontWeight('bold');
    sheet.getRange(s.row, 2).setValue('NO');
  }
  return String(sheet.getRange(s.row, 2).getValue()).trim().toUpperCase() === 'YES';
}

/** Digits only, with country code, e.g. 60123456789 ('' if unusable). */
function waDigits_(phone) {
  return normalizePhone(phone) || '';
}

/** Malaysian mobile = 601x... (WhatsApp works there; landlines don't). */
function waIsMobile_(digits) {
  return /^601\d{8,9}$/.test(String(digits));
}

function waOptedOut_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WA_OPTOUT_SHEET);
  var set = {};
  if (!sheet || sheet.getLastRow() < 2) return set;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (r) {
    var d = String(r[0]).replace(/\D/g, '');
    if (d) set[d] = true;
  });
  return set;
}

function waLog_(key, status, detail) {
  waSheet_(WA_LOG_SHEET, WA_LOG_HEADERS).appendRow([new Date(), key, status, String(detail || '').substring(0, 300)]);
}

/** Keys already tried and failed in the last 2 days (so a failure is not retried forever). */
function waRecentFailures_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WA_LOG_SHEET);
  var failed = {};
  if (!sheet || sheet.getLastRow() < 2) return failed;
  var from = Math.max(2, sheet.getLastRow() - 499);
  var cutoff = new Date().getTime() - 2 * 86400000;
  sheet.getRange(from, 1, sheet.getLastRow() - from + 1, 3).getValues().forEach(function (r) {
    if (r[2] !== 'sent' && r[0] instanceof Date && r[0].getTime() >= cutoff) failed[r[1]] = true;
  });
  return failed;
}

/**
 * Called from addWebLead (Leads.gs): queue the welcome WhatsApp for a
 * consenting web-form lead. Does nothing unless the switch is YES.
 */
function waQueueLeadWelcome_(name, phone, message) {
  try {
    if (!waSetting_('autoLeads')) return;
    var digits = waDigits_(phone);
    if (!waIsMobile_(digits) || waOptedOut_()[digits]) return;
    var sheet = waSheet_(WA_OUTBOX_SHEET, WA_OUTBOX_HEADERS);
    var phones = sheet.getLastRow() < 2 ? [] :
      sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).replace(/\D/g, ''); });
    if (phones.indexOf(digits) > -1) return;              // already queued before
    sheet.appendRow([Utilities.getUuid().substring(0, 8), new Date(), "'" + digits, name, message + WA_FOOTER,
                     'LEAD WELCOME', 'QUEUED', '', '']);
  } catch (err) { /* never let WhatsApp break saving a lead */ }
}

/**
 * Entry point for the bridge program (POST ?action=wa). Body:
 * { secret, op: 'pending' | 'result' | 'optout', ... }
 */
function waHandle_(data) {
  var secret = PropertiesService.getScriptProperties().getProperty('WA_BRIDGE_SECRET');
  if (!secret || !data || data.secret !== secret) return { error: 'Not allowed.' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  COUNTRY_CODE = getAgentSettings_().countryCode;          // same per-sheet override Code.gs uses
  if (data.op === 'pending') return { items: waPending_(Math.min(Number(data.limit) || 5, 20)) };
  if (data.op === 'result') return waResult_(data);
  if (data.op === 'optout') return waOptOut_(data);
  return { error: 'Unknown op.' };
}

function waPending_(limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var optedOut = waOptedOut_();
  var failed = waRecentFailures_();
  var items = [];

  // 1) queued welcomes for web-form leads
  var outbox = ss.getSheetByName(WA_OUTBOX_SHEET);
  if (outbox && outbox.getLastRow() >= 2) {
    var rows = outbox.getRange(2, 1, outbox.getLastRow() - 1, WA_OUTBOX_HEADERS.length).getValues();
    for (var i = 0; i < rows.length && items.length < limit; i++) {
      var r = rows[i];
      if (String(r[6]) !== 'QUEUED') continue;
      var digits = String(r[2]).replace(/\D/g, '');
      if (optedOut[digits]) { outbox.getRange(i + 2, 7).setValue('SKIPPED'); outbox.getRange(i + 2, 9).setValue('opted out'); continue; }
      var key = 'O|' + r[0];
      if (failed[key]) continue;
      items.push({ key: key, source: 'outbox', phone: digits, name: String(r[3]), message: String(r[4]) });
    }
  }

  // 2) client reminders already built on the reminders tab
  if (items.length < limit && waSetting_('autoReminders')) {
    var rem = ss.getSheetByName(REMINDER_SHEET_NAME);
    if (rem && rem.getLastRow() >= 2) {
      var vals = rem.getRange(2, 1, rem.getLastRow() - 1, REMINDER_SHEET_NUM_COLS).getValues();
      for (var j = 0; j < vals.length && items.length < limit; j++) {
        var v = vals[j];
        var type = String(v[REMINDER_COL_TYPE - 1] || '');
        if (!type || v[REMINDER_COL_MARK_SENT - 1] === true) continue;
        var d = String(v[REMINDER_COL_PHONE_LINK - 1] || '').replace(/\D/g, '');
        var msg = String(v[REMINDER_COL_MESSAGE - 1] || '');
        if (!msg || !waIsMobile_(d) || optedOut[d]) continue;
        var rkey = 'R|' + type + '|' + d + '|' + String(v[REMINDER_COL_DATE - 1]);
        if (failed[rkey]) continue;
        items.push({ key: rkey, source: 'reminder', phone: d, name: String(v[REMINDER_COL_NAME - 1]), message: msg });
      }
    }
  }
  return items;
}

/** { key, status: 'sent' | 'failed' | 'invalid', error } */
function waResult_(data) {
  var key = String(data.key || '');
  var status = String(data.status || '');
  if (['sent', 'failed', 'invalid'].indexOf(status) === -1 || !key) return { error: 'Bad result.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    waLog_(key, status, data.error);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var parts = key.split('|');
    if (parts[0] === 'O') {
      var outbox = ss.getSheetByName(WA_OUTBOX_SHEET);
      if (outbox && outbox.getLastRow() >= 2) {
        var ids = outbox.getRange(2, 1, outbox.getLastRow() - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === parts[1]) {
            outbox.getRange(i + 2, 7).setValue(status === 'sent' ? 'SENT' : status === 'invalid' ? 'NO WHATSAPP' : 'FAILED');
            outbox.getRange(i + 2, 8).setValue(new Date());
            outbox.getRange(i + 2, 9).setValue(status === 'sent' ? '' : String(data.error || ''));
            break;
          }
        }
      }
    } else if (parts[0] === 'R' && status === 'sent') {
      // Mark it sent exactly like ticking the box: stamps the client's row and removes the reminder.
      var rem = ss.getSheetByName(REMINDER_SHEET_NAME);
      if (rem && rem.getLastRow() >= 2) {
        var vals = rem.getRange(2, 1, rem.getLastRow() - 1, REMINDER_SHEET_NUM_COLS).getValues();
        for (var j = 0; j < vals.length; j++) {
          var v = vals[j];
          if (String(v[REMINDER_COL_TYPE - 1]) === parts[1] &&
              String(v[REMINDER_COL_PHONE_LINK - 1]).replace(/\D/g, '') === parts[2] &&
              String(v[REMINDER_COL_DATE - 1]) === parts.slice(3).join('|')) {
            markReminderSent_(rem, j + 2);
            break;
          }
        }
      }
    }
  } finally {
    lock.releaseLock();
  }
  return { success: true };
}

/** { phone, text } -- someone replied STOP. */
function waOptOut_(data) {
  var digits = waDigits_(data.phone);
  if (!digits) return { error: 'Bad phone.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = waSheet_(WA_OPTOUT_SHEET, WA_OPTOUT_HEADERS);
    if (!waOptedOut_()[digits]) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 3).setValues([["'" + digits, new Date(), String(data.text || '').substring(0, 100)]]);
    }
    waLog_('OPTOUT|' + digits, 'sent', data.text);
  } finally {
    lock.releaseLock();
  }
  return { success: true };
}

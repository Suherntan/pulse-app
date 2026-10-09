/**
 * =====================================================================
 * A-N-T MASTER — the agency manager's copy of every agent's data
 * -----------------------------------------------------------------
 * Lives in the MANAGER's Google account, in its own Google Sheet
 * (not in any agent's PULSE sheet). Paste this as the only script in
 * that sheet: Extensions > Apps Script > replace Code.gs with this.
 *
 * Agents' PULSE sheets send rows here (data only, no files). Each agent
 * needs an Agent ID + secret key from the AGENTS tab, so nobody else
 * can write in, and agents never get access to this sheet.
 *
 * Tabs: AGENTS · CLIENTS · ANALYSIS · OFFERS · LOG
 * Menu: A-N-T Master > Set Up / Add Agent / Turn Agent On-Off /
 *       Weekly Backup On-Off
 * =====================================================================
 */

var M_AGENTS = 'AGENTS';
var M_CLIENTS = 'CLIENTS';
var M_ANALYSIS = 'ANALYSIS';
var M_OFFERS = 'OFFERS';
var M_LOG = 'LOG';
var M_AGENT_HEADERS = ['Agent ID', 'Agent Name', 'Phone', 'Secret Key', 'Active', 'Added', 'Last Received'];
var M_LOG_HEADERS = ['Time', 'Agent ID', 'Type', 'Record ID', 'Result'];
var M_BACKUP_FOLDER = 'A-N-T Master Backups';
var M_BACKUP_KEEP = 8;

// Each type: which tab it goes to and which column identifies the record.
// Every agent numbers from C-0001, so the master adds the Agent ID in front:
// Master ID "AG-001-C-0001" (and "AG-001-A-0003", "AG-001-O-0002"). Analysis and
// offer rows also get "Master Client ID", so a client's rows can be found across tabs.
var M_TYPES = {
  client:   { sheet: M_CLIENTS,  idKey: 'Client ID',   headers: ['Master ID', 'Agent ID', 'Client ID', 'Received'] },
  analysis: { sheet: M_ANALYSIS, idKey: 'Analysis ID', headers: ['Master ID', 'Master Client ID', 'Agent ID', 'Analysis ID', 'Client ID', 'Received'] },
  offer:    { sheet: M_OFFERS,   idKey: 'Offer ID',    headers: ['Master ID', 'Master Client ID', 'Agent ID', 'Offer ID', 'Client ID', 'Received'] }
};
function mMasterId_(agentId, id) { return id ? agentId + '-' + id : ''; }


// ---------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('A-N-T Master')
    .addItem('Set Up Master (one-time)', 'masterSetup')
    .addSeparator()
    .addItem('Add Agent (gives Agent ID + secret key)', 'masterAddAgent')
    .addItem('Turn Agent On / Off', 'masterToggleAgent')
    .addSeparator()
    .addItem('Turn On Weekly Backup (Sunday)', 'masterBackupOn')
    .addItem('Turn Off Weekly Backup', 'masterBackupOff')
    .addItem('Back Up Now', 'masterBackupNow')
    .addToUi();
}

function masterSetup() {
  mSheet_(M_AGENTS, M_AGENT_HEADERS);
  Object.keys(M_TYPES).forEach(function (k) { mSheet_(M_TYPES[k].sheet, M_TYPES[k].headers); });
  mSheet_(M_LOG, M_LOG_HEADERS);
  var def = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && SpreadsheetApp.getActiveSpreadsheet().getSheets().length > 1) {
    SpreadsheetApp.getActiveSpreadsheet().deleteSheet(def);
  }
  SpreadsheetApp.getUi().alert('A-N-T Master is ready',
    'Next:\n1. Deploy > New deployment > Web app\n   Execute as: Me · Who has access: Anyone\n' +
    '2. Copy the Web app URL – every agent needs it.\n3. A-N-T Master > Add Agent for each agent.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function masterAddAgent() {
  var ui = SpreadsheetApp.getUi();
  var idRes = ui.prompt('Add Agent', 'Agent ID (e.g. AG-001)', ui.ButtonSet.OK_CANCEL);
  if (idRes.getSelectedButton() !== ui.Button.OK) return;
  var agentId = idRes.getResponseText().trim().toUpperCase();
  if (!agentId) return;

  var sheet = mSheet_(M_AGENTS, M_AGENT_HEADERS);
  var found = mFind_(sheet, 'Agent ID', agentId);
  if (found) {
    var again = ui.alert('Agent exists', agentId + ' already has a key:\n\n' + found.row['Secret Key'] +
      '\n\nMake a NEW key? (the old one stops working)', ui.ButtonSet.YES_NO);
    if (again !== ui.Button.YES) return;
  }
  var nameRes = ui.prompt('Add Agent', 'Agent name (optional)', ui.ButtonSet.OK_CANCEL);
  if (nameRes.getSelectedButton() !== ui.Button.OK) return;

  var key = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
  mUpsert_(sheet, 'Agent ID', {
    'Agent ID': agentId,
    'Agent Name': nameRes.getResponseText().trim() || (found ? found.row['Agent Name'] : ''),
    'Secret Key': key,
    'Active': 'Yes',
    'Added': found ? found.row['Added'] : new Date()
  });
  ui.alert('Give these to ' + agentId,
    'Master link:\n' + (ScriptApp.getService().getUrl() || '(deploy the Web app first, then copy its URL)') +
    '\n\nAgent ID: ' + agentId + '\nSecret key: ' + key +
    '\n\nThe agent enters them in their PULSE sheet: A-N-T > Connect to Master.', ui.ButtonSet.OK);
}

function masterToggleAgent() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('Turn Agent On / Off', 'Agent ID', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var sheet = mSheet_(M_AGENTS, M_AGENT_HEADERS);
  var found = mFind_(sheet, 'Agent ID', res.getResponseText().trim().toUpperCase());
  if (!found) { ui.alert('Agent not found.'); return; }
  var now = String(found.row['Active']).toLowerCase() === 'yes' ? 'No' : 'Yes';
  mUpsert_(sheet, 'Agent ID', { 'Agent ID': found.row['Agent ID'], 'Active': now });
  ui.alert(found.row['Agent ID'] + ' is now ' + (now === 'Yes' ? 'ON (can send data)' : 'OFF (data already sent stays here)'));
}


// ---------------------------------------------------------------------
// Web app: agents' sheets POST here
// ---------------------------------------------------------------------

function doGet() {
  return mJson_({ ok: true, app: 'A-N-T Master' });
}

/**
 * Body: { agentId, key, type: 'client' | 'analysis' | 'offer', record: { header: value, ... } }
 * or    { agentId, key, ping: true }   (connection test)
 */
function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return mJson_({ ok: false, error: 'Bad request' }); }

  var agents = mSheet_(M_AGENTS, M_AGENT_HEADERS);
  var agentId = String(body.agentId || '').trim().toUpperCase();
  var agent = mFind_(agents, 'Agent ID', agentId);
  if (!agent || String(agent.row['Secret Key']) !== String(body.key || '')) {
    return mJson_({ ok: false, error: 'Agent ID or secret key is wrong' });
  }
  if (String(agent.row['Active']).toLowerCase() !== 'yes') {
    return mJson_({ ok: false, error: 'This agent is turned off by the manager' });
  }
  if (body.ping) return mJson_({ ok: true, agentName: agent.row['Agent Name'] });

  var t = M_TYPES[body.type];
  if (!t || !body.record || !body.record[t.idKey]) return mJson_({ ok: false, error: 'Unknown record' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rec = {};
    Object.keys(body.record).forEach(function (k) { rec[k] = body.record[k]; });
    rec['Agent ID'] = agentId;                       // always the verified agent, never what was sent
    rec['Received'] = new Date();
    rec['Master ID'] = mMasterId_(agentId, rec[t.idKey]);
    if (body.type !== 'client') rec['Master Client ID'] = mMasterId_(agentId, rec['Client ID']);
    var sheet = mSheet_(t.sheet, t.headers);
    mAddHeaders_(sheet, Object.keys(rec));
    var res = mUpsert_(sheet, [ 'Agent ID', t.idKey ], rec);
    mUpsert_(agents, 'Agent ID', { 'Agent ID': agentId, 'Last Received': new Date() });
    mSheet_(M_LOG, M_LOG_HEADERS).appendRow([new Date(), agentId, body.type, rec[t.idKey], res.isNew ? 'added' : 'updated']);
    return mJson_({ ok: true, isNew: res.isNew });
  } finally {
    lock.releaseLock();
  }
}


// ---------------------------------------------------------------------
// Weekly backup
// ---------------------------------------------------------------------

function masterBackupOn() {
  masterBackupOff();
  ScriptApp.newTrigger('masterBackupNow').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();
  SpreadsheetApp.getUi().alert('Weekly backup is ON (every Sunday ~2am). Last ' + M_BACKUP_KEEP + ' copies are kept.');
}

function masterBackupOff() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'masterBackupNow') ScriptApp.deleteTrigger(t);
  });
}

function masterBackupNow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('M_SHEET_ID'));
  var it = DriveApp.getFoldersByName(M_BACKUP_FOLDER);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(M_BACKUP_FOLDER);
  DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' – backup ' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy'), folder);

  var copies = [], files = folder.getFiles();
  while (files.hasNext()) copies.push(files.next());
  copies.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  copies.slice(M_BACKUP_KEEP).forEach(function (f) { f.setTrashed(true); });
}


// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function mJson_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function mSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('M_SHEET_ID', ss.getId());
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    mStyleHeader_(sh);
    sh.setFrozenRows(1);
    mDateFormats_(sh);
  } else {
    mAddHeaders_(sh, headers);
  }
  return sh;
}

// Master date columns show dd/mm/yyyy like the PULSE tabs.
function mDateFormats_(sh) {
  var f = { 'Added': 'dd/mm/yyyy', 'Last Received': 'dd/mm/yyyy hh:mm', 'Received': 'dd/mm/yyyy hh:mm', 'Time': 'dd/mm/yyyy hh:mm' };
  mHeaders_(sh).forEach(function (h, i) {
    if (f[h]) sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat(f[h]);
  });
}

function mStyleHeader_(sh) {
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0B2545').setFontColor('#FFFFFF');
}

function mHeaders_(sh) {
  return sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
}

function mAddHeaders_(sh, names) {
  var have = mHeaders_(sh);
  var missing = names.filter(function (n) { return n && have.indexOf(n) === -1; });
  if (!missing.length) return;
  sh.getRange(1, have.filter(String).length + 1, 1, missing.length).setValues([missing]);
  mStyleHeader_(sh);
}

function mRows_(sh) {
  var head = mHeaders_(sh), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, head.length).getValues().map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

function mFind_(sh, keys, values) {
  keys = [].concat(keys);
  var rows = mRows_(sh);
  for (var i = 0; i < rows.length; i++) {
    var hit = keys.every(function (k) { return String(rows[i][k]) === String(values[k] !== undefined ? values[k] : values); });
    if (hit) return { row: rows[i], index: i + 2 };
  }
  return null;
}

// Update the row matching `keys`, or add it. Only the given fields change.
function mUpsert_(sh, keys, rec) {
  keys = [].concat(keys);
  var head = mHeaders_(sh);
  var found = mFind_(sh, keys, rec);
  var row = head.map(function (h) {
    if (rec[h] !== undefined) return h === 'Phone' && rec[h] !== '' ? "'" + rec[h] : rec[h];   // keep leading zero
    return found ? found.row[h] : '';
  });
  if (found) sh.getRange(found.index, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
  return { isNew: !found };
}

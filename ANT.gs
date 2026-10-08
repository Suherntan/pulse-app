/**
 * =====================================================================
 * A-N-T — Fact-Find, L.I.F.E Analysis and client folders
 * -----------------------------------------------------------------
 * Add this as a SECOND file next to Code.gs in the same Apps Script
 * project (Extensions > Apps Script > + > Script > name it "ANT").
 * Code.gs routes the web-app actions below to these functions.
 *
 * What it keeps in the agent's own Google account:
 *   - ANT_CLIENTS tab   one row per client (Fact-Find answers)
 *   - ANT_ANALYSIS tab  one row per A-N-T Analysis (L.I.F.E numbers)
 *   - ANT_LOG tab       what was done, when
 *   - Drive folder "PULSE A-N-T Clients" with one sub-folder per client,
 *     holding that client's A-N-T Analysis PDFs.
 *
 * One-time setup: menu A-N-T > Set Up A-N-T. It asks for the Agent ID,
 * creates the tabs and the Drive folder. Agent name and phone come from
 * the existing SETTINGS tab (PULSE Reminders > My Settings).
 * =====================================================================
 */

var ANT_CLIENTS_SHEET = 'ANT_CLIENTS';
var ANT_ANALYSIS_SHEET = 'ANT_ANALYSIS';
var ANT_LOG_SHEET = 'ANT_LOG';
var ANT_ROOT_FOLDER_NAME = 'PULSE A-N-T Clients';
var ANT_PROP_ROOT_FOLDER = 'ANT_ROOT_FOLDER_ID';
var ANT_PROP_AGENT_ID = 'ANT_AGENT_ID';

var ANT_AREAS = ['hospitalization', 'disability', 'criticalIllness', 'death', 'education', 'investment'];
var ANT_AREA_LABELS = {
  hospitalization: 'Hospitalization', disability: 'Disability', criticalIllness: 'Critical Illness',
  death: 'Death', education: 'Education', investment: 'Investment'
};

var ANT_CLIENT_HEADERS = [
  'Client ID', 'Agent ID', 'Name', 'DOB', 'Age', 'Phone', 'Email',
  'Motivation', 'Goals', 'Retire Age', 'Retire Cash / Month', 'Other Goals',
  'Important People', 'Spouse Job', 'Children Ages', 'Parents Depending', 'Other People',
  'Consent', 'Folder Link', 'Created', 'Updated'
];

var ANT_ANALYSIS_HEADERS = (function () {
  var h = ['Analysis ID', 'Client ID', 'Agent ID', 'Client Name', 'Date'];
  ANT_AREAS.forEach(function (k) {
    var l = ANT_AREA_LABELS[k];
    h.push(l + ' Current', l + ' Goal', l + ' Gap');
  });
  return h.concat(['Total Gap', 'Notes', 'PDF Link']);
})();

var ANT_LOG_HEADERS = ['Time', 'Agent ID', 'Client ID', 'Action', 'Detail'];


// ---------------------------------------------------------------------
// Menu + one-time setup
// ---------------------------------------------------------------------

function antAddMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('A-N-T')
    .addItem('Set Up A-N-T (one-time)', 'antSetup')
    .addItem('Open A-N-T Clients Folder', 'antShowFolderLink')
    .addToUi();
}

function antSetup() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var current = props.getProperty(ANT_PROP_AGENT_ID) || '';

  var res = ui.prompt('A-N-T Setup',
    'Agent ID given by your agency manager (e.g. AG-001)' + (current ? '\nCurrent: ' + current : ''),
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var agentId = res.getResponseText().trim().toUpperCase() || current;
  if (!agentId) { ui.alert('Agent ID is needed. Please run Set Up again.'); return; }
  props.setProperty(ANT_PROP_AGENT_ID, agentId);

  antSheet_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS);
  antSheet_(ANT_ANALYSIS_SHEET, ANT_ANALYSIS_HEADERS);
  antSheet_(ANT_LOG_SHEET, ANT_LOG_HEADERS);
  var folder = antRootFolder_();
  var s = getAgentSettings_();

  ui.alert('A-N-T is ready',
    'Agent ID: ' + agentId + '\nAgent name: ' + s.agentName + '\nPhone: ' + (s.agentWhatsApp || '(not set)') +
    '\n\nClient folders: ' + folder.getUrl() +
    '\n\nName or phone wrong? Fix them in PULSE Reminders > My Settings.' +
    '\nRemember: Deploy > Manage deployments > Edit > New version, so the app sees this code.',
    ui.ButtonSet.OK);
}

function antShowFolderLink() {
  SpreadsheetApp.getUi().alert('A-N-T Clients folder', antRootFolder_().getUrl(), SpreadsheetApp.getUi().ButtonSet.OK);
}


// ---------------------------------------------------------------------
// Web-app actions (called from Code.gs doGet / doPost)
// ---------------------------------------------------------------------

/** GET ?action=antProfile — who this sheet belongs to. */
function antProfile() {
  var s = getAgentSettings_();
  return {
    ok: true,
    agentId: PropertiesService.getScriptProperties().getProperty(ANT_PROP_AGENT_ID) || '',
    agentName: s.agentName,
    agentPhone: s.agentWhatsApp
  };
}

/** GET ?action=antSearchClients&q= — name or phone, max 20 results. */
function antSearchClients(q) {
  q = String(q || '').trim().toLowerCase();
  if (!q) return { ok: true, clients: [] };
  var digits = q.replace(/\D/g, '');
  var rows = antRows_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS);
  var hits = rows.filter(function (r) {
    return String(r['Name']).toLowerCase().indexOf(q) > -1 ||
      (digits.length >= 3 && String(r['Phone']).replace(/\D/g, '').indexOf(digits) > -1) ||
      String(r['Client ID']).toLowerCase() === q;
  }).slice(0, 20);
  return {
    ok: true,
    clients: hits.map(function (r) {
      return { clientId: r['Client ID'], name: r['Name'], phone: String(r['Phone']).replace(/^'/, '') };
    })
  };
}

/** GET ?action=antGetClient&id=C-0001 — full Fact-Find record. */
function antGetClient(id) {
  var found = antFindRow_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS, 'Client ID', id);
  if (!found) return { ok: false, error: 'Client not found: ' + id };
  return { ok: true, client: antRowToClient_(found.row) };
}

/** POST ?action=antSaveClient — new client (no clientId) or update. */
function antSaveClient(data) {
  if (!data || !String(data.name || '').trim()) return { ok: false, error: 'Client name is required' };
  if (!data.consent) return { ok: false, error: 'Client consent is required' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = antSheet_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS);
    var agentId = antProfile().agentId;
    var now = new Date();
    var existing = data.clientId ? antFindRow_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS, 'Client ID', data.clientId) : null;
    var clientId = existing ? data.clientId : antNextId_(sheet, 'C-');
    var b = data.background || {};

    var folderLink = existing ? existing.row['Folder Link'] : '';
    if (!folderLink) folderLink = antClientFolder_(clientId, data.name).getUrl();

    var values = {
      'Client ID': clientId,
      'Agent ID': agentId,
      'Name': String(data.name).trim(),
      'DOB': data.dob || '',
      'Age': data.age != null ? data.age : '',
      'Phone': "'" + String(data.phone || '').trim(),   // keep leading zero
      'Email': data.email || '',
      'Motivation': b.motivation || '',
      'Goals': (b.goals || []).join(', '),
      'Retire Age': b.retireAge != null ? b.retireAge : '',
      'Retire Cash / Month': b.retireCash != null ? b.retireCash : '',
      'Other Goals': b.otherGoals || '',
      'Important People': (b.people || []).join(', '),
      'Spouse Job': b.spouseJob || '',
      'Children Ages': (b.childrenAges || []).map(function (a) { return a == null ? '?' : a; }).join(', '),
      'Parents Depending': b.parentsDepend || '',
      'Other People': b.otherPeople || '',
      'Consent': data.consent ? 'Yes' : 'No',
      'Folder Link': folderLink,
      'Created': existing ? existing.row['Created'] : now,
      'Updated': now
    };
    var rowArr = antHeaderOrder_(sheet, ANT_CLIENT_HEADERS).map(function (h) { return values[h] !== undefined ? values[h] : ''; });

    if (existing) sheet.getRange(existing.index, 1, 1, rowArr.length).setValues([rowArr]);
    else sheet.appendRow(rowArr);

    antLog_(agentId, clientId, existing ? 'Fact-Find updated' : 'Fact-Find new', values['Name']);
    return { ok: true, clientId: clientId, folderUrl: folderLink, isNew: !existing };
  } finally {
    lock.releaseLock();
  }
}

/**
 * POST ?action=antSaveAnalysis
 * { clientId, clientName, life:{area:{current,goal}}, notes, pdfBase64, fileName }
 * Saves the PDF in the client's folder and one row in ANT_ANALYSIS.
 */
function antSaveAnalysis(data) {
  if (!data || !data.clientId) return { ok: false, error: 'Save the client in the Fact-Find form first' };
  var client = antFindRow_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS, 'Client ID', data.clientId);
  if (!client) return { ok: false, error: 'Client not found: ' + data.clientId };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = antSheet_(ANT_ANALYSIS_SHEET, ANT_ANALYSIS_HEADERS);
    var agentId = antProfile().agentId;
    var now = new Date();
    // Same client, same day = a correction: replace that analysis instead of adding a new one.
    var today = antDay_(now);
    var same = antRows_(ANT_ANALYSIS_SHEET, ANT_ANALYSIS_HEADERS).map(function (r, i) { return { row: r, index: i + 2 }; })
      .filter(function (x) { return String(x.row['Client ID']) === String(data.clientId) && x.row['Date'] && antDay_(x.row['Date']) === today; })
      .pop();
    var analysisId = same ? same.row['Analysis ID'] : antNextId_(sheet, 'A-');

    var pdfLink = '';
    if (data.pdfBase64) {
      var name = String(data.fileName || ('A-N-T Analysis - ' + client.row['Name'])).replace(/[\\/:*?"<>|]/g, '-');
      if (!/\.pdf$/i.test(name)) name += '.pdf';
      var blob = Utilities.newBlob(Utilities.base64Decode(data.pdfBase64), 'application/pdf', name);
      pdfLink = antClientFolder_(data.clientId, client.row['Name']).createFile(blob).getUrl();
      if (same) antTrashFile_(same.row['PDF Link']);   // old PDF goes to Drive Bin (restorable for 30 days)
    } else if (same) {
      pdfLink = same.row['PDF Link'];
    }

    var values = {
      'Analysis ID': analysisId, 'Client ID': data.clientId, 'Agent ID': agentId,
      'Client Name': client.row['Name'], 'Date': now, 'Notes': data.notes || '', 'PDF Link': pdfLink
    };
    var totalGap = 0;
    ANT_AREAS.forEach(function (k) {
      var v = (data.life || {})[k] || {}, l = ANT_AREA_LABELS[k];
      var cur = antNum_(v.current), goal = antNum_(v.goal);
      var gap = cur !== null && goal !== null ? goal - cur : null;
      values[l + ' Current'] = cur === null ? '' : cur;
      values[l + ' Goal'] = goal === null ? '' : goal;
      values[l + ' Gap'] = gap === null ? '' : gap;
      if (gap !== null && gap > 0) totalGap += gap;
    });
    values['Total Gap'] = totalGap;

    var rowArr = antHeaderOrder_(sheet, ANT_ANALYSIS_HEADERS).map(function (h) { return values[h] !== undefined ? values[h] : ''; });
    if (same) sheet.getRange(same.index, 1, 1, rowArr.length).setValues([rowArr]);
    else sheet.appendRow(rowArr);
    antLog_(agentId, data.clientId, same ? 'A-N-T Analysis replaced (same day)' : 'A-N-T Analysis saved', pdfLink || '(no PDF)');
    return { ok: true, analysisId: analysisId, pdfUrl: pdfLink, replaced: !!same };
  } finally {
    lock.releaseLock();
  }
}


// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function antSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#0B2545').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    return sh;
  }
  // Add any header that is missing (e.g. after an update), never remove.
  var have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  var missing = headers.filter(function (h) { return have.indexOf(h) === -1; });
  if (missing.length) {
    var start = have.filter(String).length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold')
      .setBackground('#0B2545').setFontColor('#FFFFFF');
  }
  return sh;
}

// Header names in the order they sit on the sheet (columns can be moved).
function antHeaderOrder_(sheet, headers) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function antRows_(name, headers) {
  var sh = antSheet_(name, headers);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var head = antHeaderOrder_(sh, headers);
  return sh.getRange(2, 1, last - 1, head.length).getValues().map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

function antFindRow_(name, headers, key, value) {
  if (!value) return null;
  var rows = antRows_(name, headers);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][key]) === String(value)) return { row: rows[i], index: i + 2 };
  }
  return null;
}

// Next ID like C-0001, based on the highest number already used.
function antNextId_(sheet, prefix) {
  var max = 0;
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    });
  }
  return prefix + ('0000' + (max + 1)).slice(-4);
}

function antRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(ANT_PROP_ROOT_FOLDER);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* deleted – make a new one */ }
  }
  var folder = DriveApp.createFolder(ANT_ROOT_FOLDER_NAME);
  props.setProperty(ANT_PROP_ROOT_FOLDER, folder.getId());
  return folder;
}

function antClientFolder_(clientId, name) {
  var root = antRootFolder_();
  var it = root.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf(clientId + ' ') === 0 || f.getName() === clientId) return f;
  }
  return root.createFolder(clientId + ' - ' + String(name || '').trim());
}

function antRowToClient_(r) {
  var list = function (v) { return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(String); };
  var dob = r['DOB'] instanceof Date
    ? Utilities.formatDate(r['DOB'], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r['DOB'] || '');
  return {
    clientId: r['Client ID'], name: r['Name'], dob: dob, phone: String(r['Phone']).replace(/^'/, ''), email: r['Email'],
    folderUrl: r['Folder Link'],
    background: {
      motivation: r['Motivation'], goals: list(r['Goals']),
      retireAge: antNum_(r['Retire Age']), retireCash: antNum_(r['Retire Cash / Month']),
      otherGoals: r['Other Goals'], people: list(r['Important People']), spouseJob: r['Spouse Job'],
      childrenAges: list(r['Children Ages']).map(function (a) { return antNum_(a); }),
      parentsDepend: r['Parents Depending'], otherPeople: r['Other People']
    }
  };
}

function antDay_(d) {
  var date = d instanceof Date ? d : new Date(d);
  return isNaN(date) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function antTrashFile_(url) {
  var m = String(url || '').match(/\/d\/([\w-]+)/) || String(url || '').match(/[?&]id=([\w-]+)/);
  if (!m) return;
  try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (e) { /* already gone – nothing to do */ }
}

function antNum_(v) {
  if (v === null || v === undefined || v === '') return null;
  var s = String(v).replace(/[^0-9.\-]/g, '');
  if (s === '') return null;
  var n = Number(s);
  return isNaN(n) ? null : n;
}

function antLog_(agentId, clientId, action, detail) {
  antSheet_(ANT_LOG_SHEET, ANT_LOG_HEADERS).appendRow([new Date(), agentId, clientId, action, detail || '']);
}

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
var ANT_PROP_MASTER_URL = 'ANT_MASTER_URL';
var ANT_PROP_MASTER_KEY = 'ANT_MASTER_KEY';
var ANT_OUTBOX_SHEET = 'ANT_OUTBOX';
var ANT_OUTBOX_HEADERS = ['Time', 'Type', 'Record', 'Last Error'];
// Only on the agent's side – the manager's master gets data, not file links.
var ANT_LOCAL_ONLY = ['Folder Link', 'PDF Link'];
// The PULSE pipeline tabs, in the order a match is preferred
// (an existing client's CLOSING row wins over an old APPROACH row).
var ANT_PIPELINE_TABS = ['CLOSING', 'PRESENTATION', 'APPROACH', 'SR'];
var ANT_PIPELINE_ID_HEADER = 'ANT CLIENT ID';

var ANT_AREAS = ['hospitalization', 'disability', 'criticalIllness', 'death', 'education', 'investment'];
var ANT_AREA_LABELS = {
  hospitalization: 'Hospitalization', disability: 'Disability', criticalIllness: 'Critical Illness',
  death: 'Death', education: 'Education', investment: 'Investment'
};

var ANT_CLIENT_HEADERS = [
  'Client ID', 'Agent ID', 'Name', 'DOB', 'Age', 'Phone', 'Email',
  'Motivation', 'Goals', 'Retire Age', 'Retire Cash / Month', 'Other Goals',
  'Important People', 'Spouse Job', 'Children Ages', 'Parents Depending', 'Other People',
  'Consent', 'Pipeline Stage', 'Folder Link', 'Created', 'Updated'
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
    .addSeparator()
    .addItem('Connect to Master (from your manager)', 'antConnectMaster')
    .addItem('Re-send Waiting Items to Master Now', 'antFlushOutbox')
    .addItem('Send Everything to Master (one-time)', 'antSendAllToMaster')
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
  antEnsurePipelineIdColumn_();
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

    var pipeline = antLinkPipeline_(clientId, data);

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
      'Pipeline Stage': pipeline.tab || (existing ? existing.row['Pipeline Stage'] : ''),
      'Folder Link': folderLink,
      'Created': existing ? existing.row['Created'] : now,
      'Updated': now
    };
    var rowArr = antHeaderOrder_(sheet, ANT_CLIENT_HEADERS).map(function (h) { return values[h] !== undefined ? values[h] : ''; });

    if (existing) sheet.getRange(existing.index, 1, 1, rowArr.length).setValues([rowArr]);
    else sheet.appendRow(rowArr);

    antLog_(agentId, clientId, existing ? 'Fact-Find updated' : 'Fact-Find new', values['Name']);
    var master = antSendToMaster_('client', values);
    return { ok: true, clientId: clientId, folderUrl: folderLink, isNew: !existing, master: master, pipeline: pipeline.message };
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

    var pipeline = antPipelineAfterAnalysis_(data.clientId, client.row, analysisId, totalGap, !!same);

    var rowArr = antHeaderOrder_(sheet, ANT_ANALYSIS_HEADERS).map(function (h) { return values[h] !== undefined ? values[h] : ''; });
    if (same) sheet.getRange(same.index, 1, 1, rowArr.length).setValues([rowArr]);
    else sheet.appendRow(rowArr);
    antLog_(agentId, data.clientId, same ? 'A-N-T Analysis replaced (same day)' : 'A-N-T Analysis saved', pdfLink || '(no PDF)');
    var master = antSendToMaster_('analysis', values);
    return { ok: true, analysisId: analysisId, pdfUrl: pdfLink, replaced: !!same, master: master, pipeline: pipeline.message };
  } finally {
    lock.releaseLock();
  }
}


// ---------------------------------------------------------------------
// Link with the PULSE pipeline (APPROACH / PRESENTATION / CLOSING / SR)
// Uses Code.gs helpers: getColumnMap_, addActivity, moveRowToStatus_.
// ---------------------------------------------------------------------

/**
 * Adds an "ANT CLIENT ID" column to each pipeline tab that doesn't have
 * one (at the end of that tab). Rows are copied by column title when they
 * move between tabs, so the columns don't need to line up.
 */
function antEnsurePipelineIdColumn_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ANT_PIPELINE_TABS.forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (!sh) return;
    var cols = getColumnMap_(sh);
    if (antPipelineIdCol_(sh, cols) > -1) return;
    sh.getRange(cols._headerRow, sh.getLastColumn() + 1).setValue(ANT_PIPELINE_ID_HEADER).setFontWeight('bold');
  });
}

function antPipelineIdCol_(sheet, cols) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return -1;
  var head = sheet.getRange(cols._headerRow, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < head.length; i++) {
    if (String(head[i]).trim().toUpperCase() === ANT_PIPELINE_ID_HEADER) return i;
  }
  return -1;
}

// 012-345 6789, +60 12 345 6789 and 60123456789 all become 123456789.
function antPhoneKey_(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.indexOf('60') === 0 && d.length >= 11) d = d.slice(2);
  return d.replace(/^0+/, '');
}

// Same person? Exact name, one name inside the other ("Tan Ah Kow" /
// "Tan Ah Kow (Steven)"), or at least 2 name words in common.
function antSameName_(a, b) {
  var clean = function (x) { return String(x || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); };
  a = clean(a); b = clean(b);
  if (!a || !b) return false;
  if (a === b || a.indexOf(b) > -1 || b.indexOf(a) > -1) return true;
  var wb = b.split(' ');
  return a.split(' ').filter(function (w) { return w.length > 1 && wb.indexOf(w) > -1; }).length >= 2;
}

/**
 * Finds the client in the pipeline tabs:
 *   1. same ANT CLIENT ID
 *   2. same phone AND the name agrees (family members sharing one number
 *      stay separate people)
 *   3. exact same full name
 * Nothing found = a new person. Returns { sheet, cols, row, tab, idCol } or null.
 */
function antPipelineFind_(clientId, phone, name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = ANT_PIPELINE_TABS.map(function (n) {
    var sh = ss.getSheetByName(n);
    if (!sh) return null;
    var cols = getColumnMap_(sh), last = sh.getLastRow();
    var data = last >= cols._dataStartRow
      ? sh.getRange(cols._dataStartRow, 1, last - cols._dataStartRow + 1, sh.getLastColumn()).getValues() : [];
    return { sheet: sh, cols: cols, tab: n, data: data, idCol: antPipelineIdCol_(sh, cols) };
  }).filter(Boolean);

  var phoneKey = antPhoneKey_(phone), nameKey = String(name || '').trim().toLowerCase();
  var tests = [
    function (t, r) { return clientId && t.idCol > -1 && String(r[t.idCol]).trim() === clientId; },
    function (t, r) {
      return phoneKey.length >= 7 && t.cols.contact > -1 && antPhoneKey_(r[t.cols.contact]) === phoneKey &&
        t.cols.name > -1 && antSameName_(r[t.cols.name], name);
    },
    function (t, r) { return nameKey && t.cols.name > -1 && String(r[t.cols.name]).trim().toLowerCase() === nameKey; }
  ];
  for (var k = 0; k < tests.length; k++) {
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      for (var j = 0; j < t.data.length; j++) {
        if (tests[k](t, t.data[j])) {
          return { sheet: t.sheet, cols: t.cols, row: t.cols._dataStartRow + j, tab: t.tab, idCol: t.idCol };
        }
      }
    }
  }
  return null;
}

// Puts the ANT CLIENT ID on the row and fills EMAIL / BIRTHDAY only where empty.
function antStampPipelineRow_(hit, clientId, data) {
  var sh = hit.sheet, cols = hit.cols, row = hit.row;
  var idCol = hit.idCol > -1 ? hit.idCol : antPipelineIdCol_(sh, cols);
  if (idCol > -1) sh.getRange(row, idCol + 1).setValue(clientId);
  if (data && cols.email > -1 && data.email && !sh.getRange(row, cols.email + 1).getValue()) {
    sh.getRange(row, cols.email + 1).setValue(data.email);
  }
  if (data && cols.birthday > -1 && data.dob && !sh.getRange(row, cols.birthday + 1).getValue()) {
    sh.getRange(row, cols.birthday + 1).setValue(new Date(data.dob + 'T00:00:00')).setNumberFormat('yyyy-mm-dd');
  }
}

function antAddRemark_(hit, note) {
  if (hit.cols.remarks === -1) return;
  var cell = hit.sheet.getRange(hit.row, hit.cols.remarks + 1);
  var old = String(cell.getValue() || '').trim();
  cell.setValue(old ? old + ' | ' + note : note);
}

/** Fact-Find saved: link to the existing pipeline row, or add the client to APPROACH. */
function antLinkPipeline_(clientId, data) {
  try {
    antEnsurePipelineIdColumn_();
    var hit = antPipelineFind_(clientId, data.phone, data.name);
    if (hit) {
      antStampPipelineRow_(hit, clientId, data);
      var who = hit.cols.name > -1 ? hit.sheet.getRange(hit.row, hit.cols.name + 1).getValue() : '';
      return { tab: hit.tab, message: 'Linked to ' + hit.tab + ' row ' + hit.row + (who ? ' (' + who + ')' : '') };
    }
    var res = addActivity({ activityType: 'APPROACH', name: String(data.name).trim(), contact: String(data.phone || '').trim(),
      remarks: 'A-N-T Fact-Find ' + clientId });
    if (!res || !res.success) return { tab: '', message: 'Not added to APPROACH: ' + (res && res.error || 'unknown') };
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('APPROACH');
    var cols = getColumnMap_(sh);
    antStampPipelineRow_({ sheet: sh, cols: cols, row: sh.getLastRow(), idCol: antPipelineIdCol_(sh, cols) }, clientId, data);
    return { tab: 'APPROACH', message: 'Added to APPROACH' };
  } catch (e) {
    return { tab: '', message: 'Pipeline not updated: ' + e.message };
  }
}

/**
 * Analysis saved = the client has been presented to.
 * APPROACH → moves to PRESENTATION (same as changing the status by hand).
 * PRESENTATION / CLOSING / SR → stays where it is (existing or servicing client).
 * A note goes into REMARKS – once per day, so a same-day correction doesn't repeat it.
 */
function antPipelineAfterAnalysis_(clientId, clientRow, analysisId, totalGap, isReplace) {
  try {
    var hit = antPipelineFind_(clientId, clientRow['Phone'], clientRow['Name']);
    if (!hit) {
      var linked = antLinkPipeline_(clientId, { name: clientRow['Name'], phone: String(clientRow['Phone']).replace(/^'/, '') });
      hit = antPipelineFind_(clientId, clientRow['Phone'], clientRow['Name']);
      if (!hit) return { message: linked.message };
    }
    var note = 'A-N-T Analysis ' + analysisId + ' · total gap ' + Number(totalGap || 0).toLocaleString('en-US');
    var stage = hit.tab, message = 'Stays in ' + hit.tab;

    if (hit.tab === 'APPROACH') {
      if (!isReplace) antAddRemark_(hit, note);
      if (hit.cols.status > -1) hit.sheet.getRange(hit.row, hit.cols.status + 1).setValue('PRESENTATION');
      var moved = moveRowToStatus_(hit.sheet, hit.cols, hit.row, 'PRESENTATION', 'APPROACH');
      if (moved) { stage = 'PRESENTATION'; message = 'Moved to PRESENTATION'; }
    } else if (!isReplace) {
      antAddRemark_(hit, note);
    }
    antSetClientStage_(clientId, stage);
    return { message: message };
  } catch (e) {
    return { message: 'Pipeline not updated: ' + e.message };
  }
}

function antSetClientStage_(clientId, stage) {
  var sh = antSheet_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS);
  var found = antFindRow_(ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS, 'Client ID', clientId);
  var col = antHeaderOrder_(sh, ANT_CLIENT_HEADERS).indexOf('Pipeline Stage');
  if (found && col > -1) sh.getRange(found.index, col + 1).setValue(stage);
}


// ---------------------------------------------------------------------
// Copy to the manager's master sheet (data only)
// ---------------------------------------------------------------------

function antConnectMaster() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(ANT_PROP_AGENT_ID)) { ui.alert('Run A-N-T > Set Up A-N-T first.'); return; }

  var u = ui.prompt('Connect to Master', 'Master link from your manager (starts with https://script.google.com/)', ui.ButtonSet.OK_CANCEL);
  if (u.getSelectedButton() !== ui.Button.OK) return;
  var k = ui.prompt('Connect to Master', 'Secret key from your manager', ui.ButtonSet.OK_CANCEL);
  if (k.getSelectedButton() !== ui.Button.OK) return;
  props.setProperty(ANT_PROP_MASTER_URL, u.getResponseText().trim());
  props.setProperty(ANT_PROP_MASTER_KEY, k.getResponseText().trim());

  var res = antPostMaster_({ ping: true });
  if (!res.ok) { ui.alert('Not connected', res.error + '\n\nCheck the link and key with your manager, then try again.', ui.ButtonSet.OK); return; }

  // Re-send anything that failed, every night.
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'antFlushOutbox'; });
  if (!has) ScriptApp.newTrigger('antFlushOutbox').timeBased().everyDays(1).atHour(1).create();

  ui.alert('Connected to Master ✓',
    'From now on every saved client and analysis is also copied to your manager (data only, no files).' +
    '\n\nTo copy what you already have: A-N-T > Send Everything to Master (one-time).', ui.ButtonSet.OK);
}

// Returns 'sent', 'queued' (will retry) or 'off' (not connected).
function antSendToMaster_(type, values) {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(ANT_PROP_MASTER_URL)) return 'off';
  var record = antMasterRecord_(values);
  var res = antPostMaster_({ type: type, record: record });
  if (res.ok) return 'sent';
  antSheet_(ANT_OUTBOX_SHEET, ANT_OUTBOX_HEADERS).appendRow([new Date(), type, JSON.stringify(record), res.error]);
  return 'queued';
}

function antFlushOutbox() {
  var sh = antSheet_(ANT_OUTBOX_SHEET, ANT_OUTBOX_HEADERS);
  var last = sh.getLastRow(), sent = 0, left = 0;
  for (var r = last; r >= 2; r--) {                  // bottom-up so deleting rows is safe
    var row = sh.getRange(r, 1, 1, 4).getValues()[0];
    var res = antPostMaster_({ type: row[1], record: JSON.parse(row[2]) });
    if (res.ok) { sh.deleteRow(r); sent++; }
    else { sh.getRange(r, 4).setValue(res.error); left++; }
  }
  try {
    SpreadsheetApp.getUi().alert('Master: ' + sent + ' sent, ' + left + ' still waiting.');
  } catch (e) { /* running from the nightly timer – no screen */ }
}

function antSendAllToMaster() {
  var ui = SpreadsheetApp.getUi();
  if (!PropertiesService.getScriptProperties().getProperty(ANT_PROP_MASTER_URL)) { ui.alert('Connect to Master first.'); return; }
  var counts = { sent: 0, queued: 0 };
  [['client', ANT_CLIENTS_SHEET, ANT_CLIENT_HEADERS], ['analysis', ANT_ANALYSIS_SHEET, ANT_ANALYSIS_HEADERS]].forEach(function (t) {
    antRows_(t[1], t[2]).forEach(function (row) { counts[antSendToMaster_(t[0], row)]++; });
  });
  ui.alert('Sent ' + counts.sent + ' to Master.' + (counts.queued ? ' ' + counts.queued + ' waiting (see ANT_OUTBOX, retried tonight).' : ''));
}

function antMasterRecord_(values) {
  var rec = {};
  Object.keys(values).forEach(function (k) {
    if (ANT_LOCAL_ONLY.indexOf(k) > -1) return;
    var v = values[k];
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
    else if (typeof v === 'string') v = v.replace(/^'/, '');
    rec[k] = v;
  });
  return rec;
}

function antPostMaster_(payload) {
  var props = PropertiesService.getScriptProperties();
  payload.agentId = props.getProperty(ANT_PROP_AGENT_ID);
  payload.key = props.getProperty(ANT_PROP_MASTER_KEY);
  try {
    var resp = UrlFetchApp.fetch(props.getProperty(ANT_PROP_MASTER_URL), {
      method: 'post', contentType: 'text/plain', payload: JSON.stringify(payload),
      muteHttpExceptions: true, followRedirects: true
    });
    var out = JSON.parse(resp.getContentText());
    return out.ok ? out : { ok: false, error: out.error || 'Master said no' };
  } catch (e) {
    return { ok: false, error: 'Master not reachable: ' + e.message };
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

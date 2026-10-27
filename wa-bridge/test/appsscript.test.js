// Runs WaBridge.gs with a pretend Google Sheet to check what it hands the bridge.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function makeSheet(grid) {
  return {
    grid,
    getLastRow: () => grid.length,
    appendRow: (r) => grid.push(r),
    setFrozenRows() {},
    getRange(r, c, n, w) {
      return {
        getValues: () => grid.slice(r - 1, r - 1 + (n || 1)).map((row) => Array.from({ length: w || row.length }, (_, i) => row[c - 1 + i] ?? '')),
        getValue: () => (grid[r - 1] || [])[c - 1] ?? '',
        setValue(v) { grid[r - 1] = grid[r - 1] || []; grid[r - 1][c - 1] = v; return this; },
        setValues(vs) { vs.forEach((row, i) => { grid[r - 1 + i] = row; }); return this; },
        setFontWeight() { return this; },
      };
    },
  };
}

function setup({ autoReminders = 'YES', autoLeads = 'YES', secret = 'wa-secret' } = {}) {
  const sheets = {
    SETTINGS: makeSheet([['Advisor Name', 'SU']]),
    'TODAY - SEND REMINDERS': makeSheet([['h']]),
  };
  sheets.SETTINGS.grid[10] = ['Auto WhatsApp: client reminders (YES/NO)', autoReminders];
  sheets.SETTINGS.grid[11] = ['Auto WhatsApp: welcome to web-form leads (YES/NO)', autoLeads];
  const marked = [];
  const ctx = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => (sheets[n] = makeSheet([])),
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => 'abcd1234-xxxx' },
    // pieces that live in Code.gs
    AGENT_SETTINGS_SHEET_NAME: 'SETTINGS',
    REMINDER_SHEET_NAME: 'TODAY - SEND REMINDERS',
    REMINDER_COL_WHATSAPP_LINK: 1, REMINDER_COL_MARK_SENT: 2, REMINDER_COL_TYPE: 3, REMINDER_COL_FROM_TAB: 4,
    REMINDER_COL_NAME: 5, REMINDER_COL_PHONE_ENTERED: 6, REMINDER_COL_PHONE_LINK: 7, REMINDER_COL_DATE: 8,
    REMINDER_COL_MESSAGE: 9, REMINDER_SHEET_NUM_COLS: 9,
    COUNTRY_CODE: '60',
    getAgentSettings_: () => ({ agentName: 'SU', countryCode: '60' }),
    normalizePhone: (raw) => {
      const d = String(raw || '').replace(/\D/g, '');
      if (!d) return '';
      if (d.startsWith('60')) return d;
      if (d.startsWith('0')) return '60' + d.slice(1);
      return '60' + d;
    },
    markReminderSent_: (sheet, row) => { marked.push(sheet.grid[row - 1][4]); sheet.grid.splice(row - 1, 1); },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'WaBridge.gs'), 'utf8'), ctx);
  const call = (body) => ctx.waHandle_({ secret: 'wa-secret', ...body });
  const addReminder = (type, name, phone, date, msg, ticked = false) =>
    // column 6 = phone as typed, column 7 = the normalised number the sheet uses for the link
    sheets['TODAY - SEND REMINDERS'].grid.push(['', ticked, type, 'CLOSING', name, phone, ctx.normalizePhone(phone), date, msg]);
  return { ctx, sheets, call, addReminder, marked };
}

test('wrong or missing secret is refused', () => {
  const { ctx } = setup();
  assert.equal(ctx.waHandle_({ secret: 'nope', op: 'pending' }).error, 'Not allowed.');
  assert.equal(ctx.waHandle_({ op: 'pending' }).error, 'Not allowed.');
  const noSecret = setup({ secret: '' });
  assert.equal(noSecret.call({ op: 'pending' }).error, 'Not allowed.');
});

test('client reminders are offered only when the switch is YES, mobiles only, unticked only', () => {
  const on = setup();
  on.addReminder('Birthday', 'Ann', '012-345 6789', '27 Oct 2026', 'Happy birthday Ann');
  on.addReminder('Premium Due', 'Bob', '03-1234 5678', '27 Oct 2026', 'Premium due Bob');           // landline
  on.addReminder('Birthday', 'Cy', '013-111 2222', '27 Oct 2026', 'Happy birthday Cy', true);         // already ticked
  const items = on.call({ op: 'pending' }).items;
  assert.equal(items.length, 1);
  assert.deepEqual([items[0].source, items[0].phone, items[0].message], ['reminder', '60123456789', 'Happy birthday Ann']);

  const off = setup({ autoReminders: 'NO' });
  off.addReminder('Birthday', 'Ann', '012-345 6789', '27 Oct 2026', 'Happy birthday Ann');
  assert.equal(off.call({ op: 'pending' }).items.length, 0);
});

test('the switches are created as NO on a sheet that does not have them yet', () => {
  const { sheets, call, ctx } = setup();
  sheets.SETTINGS.grid.length = 1;                 // wipe rows 11-12
  assert.equal(call({ op: 'pending' }).items.length, 0);
  ctx.waQueueLeadWelcome_('Ann', '012-345 6789', 'Hi Ann');
  assert.equal(sheets.SETTINGS.grid[10][1], 'NO');
  assert.equal(sheets.SETTINGS.grid[11][1], 'NO');
});

test('sent reminder is marked sent through the normal reminder logic', () => {
  const t = setup();
  t.addReminder('Birthday', 'Ann', '012-345 6789', '27 Oct 2026', 'Happy birthday Ann');
  const [item] = t.call({ op: 'pending' }).items;
  assert.equal(t.call({ op: 'result', key: item.key, status: 'sent' }).success, true);
  assert.deepEqual(t.marked, ['Ann']);
  assert.equal(t.call({ op: 'pending' }).items.length, 0);
});

test('a failed reminder is not offered again', () => {
  const t = setup();
  t.addReminder('Birthday', 'Ann', '012-345 6789', '27 Oct 2026', 'Happy birthday Ann');
  const [item] = t.call({ op: 'pending' }).items;
  t.call({ op: 'result', key: item.key, status: 'failed', error: 'boom' });
  assert.equal(t.marked.length, 0);
  assert.equal(t.call({ op: 'pending' }).items.length, 0);
});

test('lead welcome: queued only for consenting mobiles when switched on, once per number', () => {
  const t = setup();
  t.ctx.waQueueLeadWelcome_('Ann', '012-345 6789', 'Hi Ann');
  t.ctx.waQueueLeadWelcome_('Ann again', '+60123456789', 'Hi again');         // same number
  t.ctx.waQueueLeadWelcome_('Landline', '03-1234 5678', 'Hi');
  const outbox = t.sheets['WA OUTBOX'].grid;
  assert.equal(outbox.length, 2);                                              // header + 1
  assert.match(outbox[1][4], /^Hi Ann[\s\S]*Reply STOP/);

  const off = setup({ autoLeads: 'NO' });
  off.ctx.waQueueLeadWelcome_('Ann', '012-345 6789', 'Hi Ann');
  assert.equal(off.sheets['WA OUTBOX'], undefined);
});

test('queued welcome is offered, then marked SENT with a time', () => {
  const t = setup();
  t.ctx.waQueueLeadWelcome_('Ann', '012-345 6789', 'Hi Ann');
  const [item] = t.call({ op: 'pending' }).items;
  assert.deepEqual([item.source, item.phone, item.name], ['outbox', '60123456789', 'Ann']);
  t.call({ op: 'result', key: item.key, status: 'sent' });
  const row = t.sheets['WA OUTBOX'].grid[1];
  assert.equal(row[6], 'SENT');
  assert.ok(row[7] && typeof row[7].getTime === 'function');   // a date
  assert.equal(t.call({ op: 'pending' }).items.length, 0);
});

test('someone who replied STOP is never offered or queued again', () => {
  const t = setup();
  t.ctx.waQueueLeadWelcome_('Ann', '012-345 6789', 'Hi Ann');
  t.addReminder('Birthday', 'Ann', '012-345 6789', '27 Oct 2026', 'Happy birthday Ann');
  assert.equal(t.call({ op: 'optout', phone: '60123456789', text: 'STOP' }).success, true);
  assert.equal(t.call({ op: 'pending' }).items.length, 0);
  assert.equal(t.sheets['WA OUTBOX'].grid[1][6], 'SKIPPED');
  t.ctx.waQueueLeadWelcome_('Ann', '012-345 6789', 'Hi again');
  assert.equal(t.sheets['WA OUTBOX'].grid.length, 2);                          // nothing new queued
  t.call({ op: 'optout', phone: '012-345 6789', text: 'stop' });               // second STOP: no duplicate row
  assert.equal(t.sheets['WA OPT-OUT'].grid.length, 2);
});

test('bad results and unknown operations are rejected', () => {
  const t = setup();
  assert.ok(t.call({ op: 'result', key: 'O|x', status: 'maybe' }).error);
  assert.ok(t.call({ op: 'result', status: 'sent' }).error);
  assert.ok(t.call({ op: 'launch' }).error);
});

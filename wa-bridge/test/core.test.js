import test from 'node:test';
import assert from 'node:assert/strict';
import { LoggedOutError, STOP_RE, isMalaysianMobile, localDay, runOnce, toJid, withinHours } from '../core.js';

const config = { dailyCap: 3, minDelaySec: 45, maxDelaySec: 120, fromHour: 9, toHour: 20, batch: 5 };
const at = (h) => new Date(2026, 9, 27, h, 0, 0);

function harness({ items = [], existsFn = async () => true, sendFn = async () => {}, resultFn } = {}) {
  const calls = { results: [], sent: [], sleeps: [], limits: [] };
  const state = { data: { day: '', sentToday: 0, sentKeys: [], unreported: [] }, save() {} };
  const api = {
    pending: async (limit) => { calls.limits.push(limit); return items; },
    result: async (r) => { if (resultFn) await resultFn(r); calls.results.push(r); },
  };
  const send = async (jid, text) => { await sendFn(jid, text); calls.sent.push([jid, text]); };
  const sleep = async (ms) => { calls.sleeps.push(ms); };
  const run = (now = at(10)) => runOnce({ api, send, exists: existsFn, state, config, now, sleep, rand: () => 0.5 });
  return { calls, state, run };
}
const item = (n, phone = '60123456789') => ({ key: `O|${n}`, phone, name: 'Ann', message: `hello ${n}` });

test('sends, waits a human-like delay, and reports sent', async () => {
  const h = harness({ items: [item(1)] });
  const out = await h.run();
  assert.equal(out.sent, 1);
  assert.deepEqual(h.calls.sent, [['60123456789@s.whatsapp.net', 'hello 1']]);
  assert.deepEqual(h.calls.results, [{ key: 'O|1', status: 'sent' }]);
  assert.ok(h.calls.sleeps[0] >= 45000 && h.calls.sleeps[0] <= 120000);
  assert.equal(h.state.data.sentToday, 1);
});

test('does nothing outside sending hours (and never asks the sheet)', async () => {
  const h = harness({ items: [item(1)] });
  assert.equal((await h.run(at(7))).reason, 'outside sending hours');
  assert.equal((await h.run(at(20))).reason, 'outside sending hours');
  assert.equal(h.calls.limits.length, 0);
});

test('stops at the daily cap and only asks for what is left', async () => {
  const h = harness({ items: [item(1), item(2)] });
  h.state.data.day = localDay(at(10));
  h.state.data.sentToday = 2;
  const out = await h.run();
  assert.equal(out.sent, 1);
  assert.deepEqual(h.calls.limits, [1]);
  assert.equal((await h.run()).reason, 'daily cap reached');
});

test('counters reset on a new day', async () => {
  const h = harness({ items: [] });
  h.state.data = { day: '2026-10-26', sentToday: 3, sentKeys: ['O|9'], unreported: [] };
  await h.run();
  assert.equal(h.state.data.sentToday, 0);
  assert.deepEqual(h.state.data.sentKeys, []);
});

test('landline or malformed numbers are reported invalid and never sent', async () => {
  const h = harness({ items: [item(1, '60312345678'), item(2, 'abc')] });
  const out = await h.run();
  assert.equal(out.sent, 0);
  assert.equal(h.calls.sent.length, 0);
  assert.deepEqual(h.calls.results.map((r) => r.status), ['invalid', 'invalid']);
});

test('a number that is not on WhatsApp is reported invalid, not sent', async () => {
  const h = harness({ items: [item(1)], existsFn: async () => false });
  await h.run();
  assert.equal(h.calls.sent.length, 0);
  assert.equal(h.calls.results[0].status, 'invalid');
});

test('a send error is reported as failed and the next message still goes', async () => {
  let n = 0;
  const h = harness({ items: [item(1), item(2)], sendFn: async () => { if (n++ === 0) throw new Error('boom'); } });
  const out = await h.run();
  assert.equal(out.sent, 1);
  assert.deepEqual(h.calls.results, [
    { key: 'O|1', status: 'failed', error: 'boom' },
    { key: 'O|2', status: 'sent' },
  ]);
});

test('a logged-out login stops the round', async () => {
  const h = harness({ items: [item(1)], sendFn: async () => { throw new LoggedOutError('out'); } });
  await assert.rejects(h.run(), LoggedOutError);
  assert.equal(h.calls.results.length, 0);
});

test('never resends a message the sheet was not told about; retries the report', async () => {
  let failReport = true;
  const h = harness({ items: [item(1)], resultFn: async () => { if (failReport) throw new Error('offline'); } });
  await h.run();
  assert.equal(h.calls.sent.length, 1);
  assert.equal(h.state.data.unreported.length, 1);
  failReport = false;
  await h.run();                                   // same item offered again by the sheet
  assert.equal(h.calls.sent.length, 1);            // not resent
  assert.deepEqual(h.state.data.unreported, []);   // report finally delivered
  assert.ok(h.calls.results.some((r) => r.key === 'O|1' && r.status === 'sent'));
});

test('helpers', () => {
  assert.ok(isMalaysianMobile('60123456789') && isMalaysianMobile('601112345678'));
  assert.ok(!isMalaysianMobile('60312345678') && !isMalaysianMobile('0123456789'));
  assert.equal(toJid('60123456789'), '60123456789@s.whatsapp.net');
  assert.ok(withinHours(at(9), 9, 20) && !withinHours(at(20), 9, 20));
  for (const t of ['STOP', ' stop ', 'Stop.', 'unsubscribe', 'Berhenti', '退订']) assert.ok(STOP_RE.test(t), t);
  for (const t of ['please stop by tomorrow', 'ok thanks', 'non-stop']) assert.ok(!STOP_RE.test(t), t);
});

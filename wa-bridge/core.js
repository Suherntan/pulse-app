// Decision logic for the WhatsApp bridge, kept free of WhatsApp/network code
// so it can be tested: what to send, when, how many, and what to report back.

export const STOP_RE = /^\s*(stop|unsubscribe|berhenti|cancel|取消|退订)\s*[.!]*\s*$/i;

export function isMalaysianMobile(digits) {
  return /^601\d{8,9}$/.test(String(digits));
}

export function toJid(digits) {
  return `${digits}@s.whatsapp.net`;
}

/** true when `date`'s local hour is inside [fromHour, toHour). */
export function withinHours(date, fromHour, toHour) {
  const h = date.getHours();
  return h >= fromHour && h < toHour;
}

export function localDay(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function randomBetween(min, max, rand = Math.random) {
  return Math.round(min + rand() * (max - min));
}

/** Error that means the WhatsApp login is gone: stop everything. */
export class LoggedOutError extends Error {}

/**
 * One polling round.
 *  api:      { pending(limit), result({key,status,error}) }
 *  send:     async (jid, text)   -- throws on failure
 *  exists:   async (jid) -> bool -- is this number on WhatsApp?
 *  state:    { data: {day, sentToday, sentKeys[], unreported[]}, save() }
 *  config:   { dailyCap, minDelaySec, maxDelaySec, fromHour, toHour, batch }
 */
export async function runOnce({ api, send, exists, state, config, now = new Date(), sleep, rand = Math.random, log = () => {} }) {
  const d = state.data;
  const today = localDay(now);
  if (d.day !== today) {
    d.day = today;
    d.sentToday = 0;
    d.sentKeys = [];
    state.save();
  }

  // Results that could not be reported last time go first.
  const stillUnreported = [];
  for (const r of d.unreported) {
    try { await api.result(r); } catch { stillUnreported.push(r); }
  }
  d.unreported = stillUnreported;
  state.save();

  if (!withinHours(now, config.fromHour, config.toHour)) return { sent: 0, reason: 'outside sending hours' };
  const room = config.dailyCap - d.sentToday;
  if (room <= 0) return { sent: 0, reason: 'daily cap reached' };

  const items = await api.pending(Math.min(config.batch, room));
  let sent = 0;

  for (const item of items) {
    if (d.sentKeys.includes(item.key)) {
      // Already sent but the sheet was never told: tell it again, do not resend.
      await report(d, api, { key: item.key, status: 'sent' });
      state.save();
      continue;
    }
    if (d.sentToday >= config.dailyCap) break;
    if (!isMalaysianMobile(item.phone)) {
      await report(d, api, { key: item.key, status: 'invalid', error: 'not a Malaysian mobile number' });
      state.save();
      continue;
    }
    const jid = toJid(item.phone);
    try {
      if (!(await exists(jid))) {
        await report(d, api, { key: item.key, status: 'invalid', error: 'number is not on WhatsApp' });
        state.save();
        continue;
      }
      await sleep(randomBetween(config.minDelaySec, config.maxDelaySec, rand) * 1000);
      await send(jid, item.message);
    } catch (err) {
      if (err instanceof LoggedOutError) throw err;
      log(`failed ${item.key}: ${err.message}`);
      await report(d, api, { key: item.key, status: 'failed', error: err.message });
      state.save();
      continue;
    }
    d.sentToday += 1;
    d.sentKeys.push(item.key);
    sent += 1;
    log(`sent ${item.key} to ${item.phone}`);
    await report(d, api, { key: item.key, status: 'sent' });
    state.save();
  }
  return { sent };
}

async function report(d, api, result) {
  try {
    await api.result(result);
  } catch {
    d.unreported.push(result);
  }
}

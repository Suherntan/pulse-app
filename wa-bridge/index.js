// PULSE WhatsApp bridge: logs in to a SEPARATE WhatsApp number (scan the QR
// once) and sends what the sheet queues. Start with:  npm start
// Check the sheet connection only (no WhatsApp):       npm start -- --check
import fs from 'node:fs';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { LoggedOutError, STOP_RE, randomBetween, runOnce } from './core.js';

const env = process.env;
const config = {
  apiUrl: (env.PULSE_API_URL || '').split('?')[0],
  secret: env.WA_BRIDGE_SECRET || '',
  dailyCap: Number(env.DAILY_CAP || 30),
  minDelaySec: Number(env.MIN_DELAY_SEC || 45),
  maxDelaySec: Number(env.MAX_DELAY_SEC || 120),
  fromHour: Number(env.SEND_FROM_HOUR || 9),
  toHour: Number(env.SEND_TO_HOUR || 20),
  pollSec: Number(env.POLL_SEC || 60),
  batch: 5,
};
const STATE_FILE = 'state.json';
const log = (...a) => console.log(new Date().toLocaleString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!config.apiUrl || !config.secret) {
  console.error('Fill PULSE_API_URL and WA_BRIDGE_SECRET in the .env file first (copy .env.example).');
  process.exit(1);
}

// ---- the sheet (Apps Script) ------------------------------------------------
async function call(body) {
  const res = await fetch(`${config.apiUrl}?action=wa`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: config.secret, ...body }),
  });
  const out = await res.json();
  if (out.error) throw new Error(out.error);
  return out;
}
const api = {
  pending: async (limit) => (await call({ op: 'pending', limit })).items || [],
  result: (r) => call({ op: 'result', ...r }),
  optout: (phone, text) => call({ op: 'optout', phone, text }),
};

// ---- today's counters, kept on disk so a restart never resends -----------------
function loadState() {
  let data = {};
  try { data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* first run */ }
  data = { day: '', sentToday: 0, sentKeys: [], unreported: [], ...data };
  return { data, save: () => fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2)) };
}
const state = loadState();

if (process.argv.includes('--check')) {
  try {
    const items = await api.pending(1);
    log(`Sheet connection OK. ${items.length ? 'There is a message waiting.' : 'Nothing waiting right now.'}`);
  } catch (err) {
    console.error('Cannot use the sheet:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

// ---- WhatsApp -------------------------------------------------------------------
let sock;
let polling = false;
let stopped = false;

async function connect() {
  const { state: auth, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth, logger: pino({ level: 'silent' }), browser: ['PULSE', 'Chrome', '1.0'] });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      log('Scan this QR code with the WhatsApp on your NEW phone: Settings > Linked devices > Link a device');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') log('WhatsApp connected. Waiting for messages to send.');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        log('This number was logged out. Delete the "auth" folder and start again to re-link.');
        process.exit(1);
      }
      log('Connection closed, reconnecting in 10 seconds...');
      setTimeout(() => connect().catch((e) => log('reconnect failed:', e.message)), 10000);
    }
  });

  // Anyone who replies STOP is never messaged again.
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (m.key.fromMe) continue;
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
      if (!STOP_RE.test(text)) continue;
      const jid = m.key.remoteJidAlt || m.key.remoteJid || '';
      const phone = jid.endsWith('@s.whatsapp.net') ? jid.split('@')[0] : '';
      if (!phone) { log('STOP received from a hidden-number contact; add them to WA OPT-OUT by hand.'); continue; }
      try {
        await api.optout(phone, text.trim());
        await sock.sendMessage(m.key.remoteJid, { text: 'Noted. You will not receive more messages from me.' });
        log(`opt-out recorded for ${phone}`);
      } catch (err) {
        log('could not record opt-out:', err.message);
      }
    }
  });
}

async function send(jid, text) {
  await sock.presenceSubscribe(jid).catch(() => {});
  await sock.sendPresenceUpdate('composing', jid);
  await sleep(randomBetween(1500, 4000));
  await sock.sendPresenceUpdate('paused', jid);
  await sock.sendMessage(jid, { text });
}

async function exists(jid) {
  const r = await sock.onWhatsApp(jid);
  return !!(r && r[0] && r[0].exists);
}

async function tick() {
  if (polling || stopped || !sock?.user) return;       // not connected yet, or still busy
  polling = true;
  try {
    const out = await runOnce({ api, send, exists, state, config, sleep, log });
    if (out.sent) log(`round done: ${out.sent} sent, ${state.data.sentToday}/${config.dailyCap} today`);
  } catch (err) {
    if (err instanceof LoggedOutError) { stopped = true; log('logged out'); }
    else log('round failed:', err.message);
  } finally {
    polling = false;
  }
}

await connect();
setInterval(tick, config.pollSec * 1000);
log(`Bridge started. Sends ${config.fromHour}:00-${config.toHour}:00, at most ${config.dailyCap} a day.`);

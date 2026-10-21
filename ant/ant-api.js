// Same lock as the PULSE app: if this device hasn't unlocked PULSE,
// go to the PULSE password screen first.
try { if (localStorage.getItem('pulse_unlocked') !== 'true') location.replace('../index.html'); } catch (_) {}

// Talks to the agent's own PULSE Google Apps Script (Code.gs + ANT.gs).
// Uses the same web-app link the PULSE app saves in Settings ('pulse_api_url').
// No link saved = demo mode (nothing leaves the phone).
const AntApi = {
  KEY: 'pulse_api_url',
  url() { try { return localStorage.getItem(this.KEY) || ''; } catch (_) { return ''; } },
  setUrl(u) { try { localStorage.setItem(this.KEY, u.trim()); } catch (_) {} },
  connected() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(this.url()); },

  async get(action, params = {}) {
    const u = new URL(this.url());
    u.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u.toString(), {method: 'GET', redirect: 'follow'});
    return this._read(r);
  },
  async post(action, body) {
    const u = new URL(this.url());
    u.searchParams.set('action', action);
    // text/plain avoids the CORS pre-check Apps Script can't answer
    const r = await fetch(u.toString(), {method: 'POST', redirect: 'follow',
      headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body)});
    return this._read(r);
  },
  async _read(r) {
    if (!r.ok) throw new Error('Google Sheet not reachable (' + r.status + ')');
    const data = await r.json();
    if (data.trialEnded) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0B2545;color:#F4F2EC;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center';
      d.innerHTML = '<h2 style="margin:0;color:#F3AF3D;letter-spacing:.06em">PULSE IS PAUSED</h2><p style="max-width:420px;line-height:1.5;margin:0"></p>';
      d.querySelector('p').textContent = data.error;
      document.body.appendChild(d);
    }
    if (data.error || data.ok === false) throw new Error(data.error || 'Something went wrong');
    return data;
  },
  // Ask for the link once, from the form's header button.
  promptUrl() {
    const u = prompt('Paste your PULSE web-app link (Deploy > Manage deployments > Web app URL):', this.url());
    if (u === null) return false;
    this.setUrl(u);
    return true;
  }
};

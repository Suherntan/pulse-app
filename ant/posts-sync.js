/* My Posts sync: keeps 'posts-queue' the same on every phone / computer through the
 * hidden "MY POSTS" tab in the PULSE Google Sheet (Social.gs socialPostsGet / socialPostsSave).
 * Merge: one post per title + date; Posted ticks are kept if any device ticked them;
 * a deleted post stays deleted unless it is added again later.
 * Used by Social Posts (posts.html) and the Today tab (index.html).
 */
(function () {
  'use strict';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const url = () => { try { return localStorage.getItem('pulse_api_url') || ''; } catch (_) { return ''; } };
  const connected = () => /^https:\/\/script\.google(usercontent)?\.com\//.test(url());
  const key = p => (p.title || '') + '|' + (p.date || '');
  const added = p => Math.floor(Number(p.id) || 0);

  async function call(action, body) {
    const u = new URL(url());
    u.searchParams.set('action', action);
    const r = await fetch(u.toString(), body ? {method: 'POST', redirect: 'follow',
      headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body)} : {redirect: 'follow'});
    if (!r.ok) throw new Error('Google Sheet not reachable (' + r.status + ')');
    const data = await r.json();
    if (data.error || data.ok === false) throw new Error(data.error || 'Sync failed');
    return data;
  }

  function merge(local, server, deleted) {
    const map = new Map(), order = [];
    [...local, ...server].forEach(p => {
      const k = key(p);
      if (deleted[k] && deleted[k] >= added(p)) return;    // deleted after it was added
      const cur = map.get(k);
      if (!cur) { map.set(k, Object.assign({}, p, {done: Object.assign({}, p.done)})); order.push(k); return; }
      Object.keys(p.done || {}).forEach(pl => { if (p.done[pl]) cur.done[pl] = true; });
      cur.scheduled = Math.max(cur.scheduled || 0, p.scheduled || 0) || undefined;
    });
    return order.map(k => map.get(k));
  }

  let running = null, again = false;
  async function sync() {
    if (!connected()) return read('posts-queue', []);
    if (running) { again = true; return running; }
    running = (async () => {
      try {
        const srv = await call('socialPostsGet');
        const deleted = Object.assign({}, srv.deleted || {}, read('posts-deleted', {}));
        // Keep a year of "deleted" marks.
        Object.keys(deleted).forEach(k => { if (Date.now() - deleted[k] > 365 * 864e5) delete deleted[k]; });
        const merged = merge(read('posts-queue', []), srv.posts || [], deleted);
        write('posts-queue', merged);
        write('posts-deleted', deleted);
        await call('socialPostsSave', {posts: merged, deleted});
        return merged;
      } finally {
        running = null;
        if (again) { again = false; setTimeout(sync, 0); }
      }
    })();
    return running;
  }

  let timer = null;
  window.PostsSync = {
    sync,
    // After a change on this device: send it a moment later (several changes = one send).
    soon() { clearTimeout(timer); timer = setTimeout(() => sync().catch(() => {}), 1500); },
    markDeleted(p) { const d = read('posts-deleted', {}); d[key(p)] = Date.now(); write('posts-deleted', d); },
    connected
  };
})();

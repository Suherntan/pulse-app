/* Social Posts → MAKE SLIDES
 * Turns a post into branded carousel pictures, on the phone (free, no credits):
 *   Instagram / Facebook 4:5 (1080×1350 PNG), 小红书 3:4 (1080×1440 PNG),
 *   LinkedIn PDF carousel (1080×1350 pages).
 * Slides are built from the post text (EN from the Facebook version, 中文 from 小红书)
 * and every slide can be edited before saving.
 */
(function () {
  'use strict';
  const W = 1080;
  const FORMATS = {
    ig:  {label: 'Instagram / FB 4:5', h: 1350},
    xhs: {label: '小红书 3:4', h: 1440},
    li:  {label: 'LinkedIn PDF', h: 1350, pdf: true}
  };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const store = {
    get: k => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} }
  };
  const loadScript = src => new Promise((ok, fail) => {
    if ([...document.scripts].some(s => s.src.endsWith(src))) return ok();
    const t = document.createElement('script'); t.src = src; t.onload = ok; t.onerror = () => fail(new Error('Could not load ' + src)); document.head.appendChild(t);
  });

  /* ---------- post text → slides ---------- */
  const isDisclaimer = b => /^(general info only|以上为一般资讯)/i.test(b.trim());
  const isTags = b => /^(#\S+\s*)+$/.test(b.trim());
  const isCta = b => /(message me|dm me|inbox|私信|share this|tag (a|someone)|send this|转给|收藏)/i.test(b);
  function splitLong(text, max) {
    if (text.length <= max) return [text];
    const parts = text.split(/(?<=[.!?。！？])\s*|\n/).filter(Boolean), out = [];
    let cur = '';
    parts.forEach(p => { if ((cur + ' ' + p).length > max && cur) { out.push(cur.trim()); cur = p; } else cur += (cur ? (/\n/.test(p) ? '\n' : ' ') : '') + p; });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function build(post, lang) {
    const zh = lang === 'zh';
    const text = String((zh ? post.xhs : post.fb) || '').replace(/\r/g, '');
    let blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(b => b && !isDisclaimer(b) && !isTags(b));
    blocks = blocks.map(b => b.split('\n').filter(l => !isTags(l)).join('\n').trim()).filter(Boolean);
    if (!blocks.length) return [];
    const slides = [];
    // Cover: the 小红书 title (中文) or the first line of the post (EN)
    const first = blocks.shift();
    if (zh && post.xt) slides.push({kind: 'cover', title: post.xt, body: first.length < 120 ? first : ''});
    else {
      const [t, ...rest] = first.split('\n');
      slides.push({kind: 'cover', title: t.replace(/^did you know\?\s*/i, 'Did you know?\n'), body: rest.join('\n')});
    }
    let cta = '';
    blocks.forEach(b => {
      if (isCta(b) && !/^\s*[✅①1️⃣•\-]/.test(b)) { cta = cta || b; return; }
      const lines = b.split('\n');
      let head = '', body = b;
      if (lines.length > 1 && lines[0].length <= 42) { head = lines[0]; body = lines.slice(1).join('\n'); }
      splitLong(body, zh ? 150 : 300).forEach((part, i) => slides.push({kind: 'content', title: i ? head + (head ? ' (cont.)' : '') : head, body: part}));
    });
    slides.push({kind: 'end', title: zh ? '收藏📌 转发给需要的人' : 'Save 📌  Share  DM me', body: cta});
    return slides.slice(0, 12);
  }

  /* ---------- one slide as HTML (1080 wide) ---------- */
  const fit = (s, sizes) => { const n = [...String(s)].length; return n < sizes[0][0] ? sizes[0][1] : n < sizes[1][0] ? sizes[1][1] : sizes[2][1]; };
  function slideHTML(s, i, total, h, opts) {
    const zh = opts.lang === 'zh';
    const bodyFont = zh ? "'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif" : "'Work Sans','Noto Sans SC',sans-serif";
    const headFont = zh ? "'Noto Sans SC','PingFang SC',sans-serif" : "'Oswald','Arial Narrow',sans-serif";
    const titleSize = s.kind === 'cover' ? fit(s.title, [[28, 104], [60, 84], [0, 66]]) : fit(s.title, [[24, 62], [40, 52], [0, 44]]);
    const bodySize = fit(s.body, zh ? [[60, 46], [120, 40], [0, 34]] : [[120, 46], [220, 40], [0, 34]]);
    const disc = i === total - 1 ? (zh ? '以上为一般资讯，不构成理财建议，请以官方最新规定为准。' : 'General info only, not financial advice. Check the latest rules with the relevant agency.') : '';
    // Theme: MIX = dark cover/end + light reading slides (default), DARK, LIGHT
    const light = opts.theme === 'light' || (opts.theme !== 'dark' && s.kind === 'content');
    let title = s.title || '', tag = '';
    const m = s.kind === 'cover' && title.match(/^(did you know\?)\s*\n([\s\S]+)/i);
    if (m) { tag = m[1].toUpperCase(); title = m[2]; }
    const pct = Math.round((i + 1) / total * 100);
    return `<div class="sm-slide sm-${s.kind} ${light ? 'sm-light' : 'sm-dark'}" style="width:${W}px;height:${h}px;font-family:${bodyFont}">
      <div class="sm-bg"></div><div class="sm-ring"></div><div class="sm-dot"></div>
      ${s.kind === 'content' ? `<div class="sm-num">${String(i + 1).padStart(2, '0')}</div>` : ''}
      <div class="sm-top"><div class="sm-logos">${opts.fbs ? `<img src="ant-assets/fbs-logo-${light ? 'dark' : 'light'}.png" alt="7 Financial Blind Spots">` : ''}<img src="ant-assets/${light ? 'logo-dark' : 'logo-light'}.png" alt=""></div><span>${i + 1} / ${total}</span></div>
      <div class="sm-main">
        ${tag ? `<div class="sm-tag">${esc(tag)}</div>` : ''}
        ${title ? `<h3 style="font-family:${headFont};font-size:${titleSize}px">${esc(title).replace(/\n/g, '<br>')}</h3>` : ''}
        ${s.kind !== 'end' ? '<div class="sm-rule"></div>' : ''}
        ${s.body ? `<p style="font-size:${bodySize}px">${esc(s.body).replace(/\n/g, '<br>')}</p>` : ''}
        ${s.kind === 'cover' ? `<div class="sm-swipe">${zh ? '向左滑 →' : 'Swipe →'}</div>` : ''}
      </div>
      <div class="sm-foot"><b>${esc(opts.name || (opts.fbs ? '7 Financial Blind Spots' : 'ANT Wealth System'))}</b>${disc ? `<small>${esc(disc)}</small>` : ''}</div>
      <div class="sm-bar"><i style="width:${pct}%"></i></div>
    </div>`;
  }

  const CSS = `
  .sm-wrap{display:grid;gap:12px}
  .sm-opts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .sm-opts .chip{min-height:40px}
  .sm-sched{border:1px solid var(--border,#d8dee8);border-radius:12px;padding:12px;margin-top:10px;display:grid;gap:8px}
  .sm-sched b{font-size:13px;letter-spacing:.04em}
  .sm-sched .chip:disabled{opacity:.4;cursor:not-allowed}
  .sm-sched input[type=date],.sm-sched select{padding:10px;border:1px solid var(--border,#d8dee8);border-radius:10px;font-size:15px;min-height:44px}
  .sm-sched .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .sm-sched .row[hidden]{display:none}
  .sm-strip{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 10px}
  .sm-thumb{flex:none;border-radius:8px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.18);position:relative}
  .sm-thumb .sm-scale{transform-origin:0 0}
  .sm-edit{display:grid;gap:10px}
  .sm-row{border:1px solid var(--border);border-radius:10px;padding:10px;display:grid;gap:6px;background:#fff}
  .sm-row header{position:static;background:none;color:var(--navy);padding:0;display:flex;justify-content:space-between;align-items:center;font:600 12px var(--head);letter-spacing:.1em}
  .sm-row header button{border:0;background:#EEF1F5;border-radius:8px;min-width:40px;min-height:36px;cursor:pointer;color:var(--navy);font-size:16px}
  .sm-acts{display:flex;flex-wrap:wrap;gap:8px}
  .sm-stage{position:fixed;left:-20000px;top:0}
  .sm-slide{position:relative;overflow:hidden;box-sizing:border-box;padding:80px 90px 90px;display:flex;flex-direction:column}
  .sm-slide>*{position:relative}
  .sm-slide>.sm-bg,.sm-slide>.sm-ring,.sm-slide>.sm-dot,.sm-slide>.sm-num,.sm-slide>.sm-bar{position:absolute}
  .sm-bg{inset:0}
  .sm-dark{color:#F4F2EC}
  .sm-dark .sm-bg{background:linear-gradient(160deg,#123563 0%,#0B2545 55%,#06182F 100%)}
  .sm-light{color:#0B2545}
  .sm-light .sm-bg{background:#FBF7EF}
  .sm-ring{right:-230px;top:-230px;width:640px;height:640px;border-radius:50%;border:4px solid rgba(243,175,61,.35)}
  .sm-dot{left:-160px;bottom:-200px;width:520px;height:520px;border-radius:50%;background:rgba(243,175,61,.10)}
  .sm-light .sm-ring{border-color:rgba(11,37,69,.10)}
  .sm-light .sm-dot{background:rgba(243,175,61,.16)}
  .sm-num{right:70px;top:150px;font:700 260px/1 'Oswald','Arial Narrow',sans-serif;color:rgba(11,37,69,.06)}
  .sm-dark .sm-num{color:rgba(255,255,255,.05)}
  .sm-top{display:flex;justify-content:space-between;align-items:center}
  .sm-logos{display:flex;align-items:center;gap:26px}
  .sm-top img{height:76px;width:auto}
  .sm-top span{font:600 28px 'Oswald',sans-serif;letter-spacing:.12em;padding:8px 22px;border-radius:40px;background:rgba(243,175,61,.16);color:#F3AF3D}
  .sm-light .sm-top span{background:#0B2545;color:#F3AF3D}
  .sm-main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:34px}
  .sm-main h3{margin:0;font-weight:700;line-height:1.12;letter-spacing:.01em;color:#fff}
  .sm-light .sm-main h3{color:#0B2545}
  .sm-dark.sm-content h3,.sm-end h3{color:#F3AF3D}
  .sm-end h3,.sm-end p{text-align:center}
  .sm-end .sm-main{align-items:center}
  .sm-tag{align-self:flex-start;font:700 34px 'Oswald','Arial Narrow',sans-serif;letter-spacing:.14em;background:#F3AF3D;color:#0B2545;padding:10px 26px;border-radius:10px}
  .sm-main p{margin:0;line-height:1.5;color:#E8ECF3;white-space:normal}
  .sm-light .sm-main p{color:#2B3A4F}
  .sm-rule{width:180px;height:10px;border-radius:5px;background:#F3AF3D}
  .sm-content .sm-rule{width:120px;height:8px;margin-top:-14px}
  .sm-swipe{font:600 32px 'Oswald',sans-serif;letter-spacing:.14em;color:#F3AF3D;margin-top:10px}
  .sm-light .sm-swipe{color:#B7791F}
  .sm-foot{display:flex;flex-direction:column;gap:8px;border-top:2px solid rgba(243,175,61,.45);padding-top:22px}
  .sm-foot b{font:600 30px 'Oswald',sans-serif;letter-spacing:.08em;color:#fff}
  .sm-light .sm-foot b{color:#0B2545}
  .sm-foot small{font-size:22px;color:#AEB9CB;line-height:1.4}
  .sm-light .sm-foot small{color:#5B6878}
  .sm-bar{left:0;right:0;bottom:0;height:14px;background:rgba(243,175,61,.22)}
  .sm-bar i{display:block;height:100%;background:#F3AF3D}`;

  const THEMES = [['mix', 'Mix (best to read)'], ['dark', 'Navy'], ['light', 'Light']];

  function open(post, box, toast) {
    if (!document.getElementById('sm-css')) { const st = document.createElement('style'); st.id = 'sm-css'; st.textContent = CSS; document.head.appendChild(st); }
    let lang = 'en', fmt = 'ig', slides = build(post, lang), theme = store.get('posts-slide-theme') || 'mix', fbs = store.get('posts-slide-fbs') !== 'off';
    const name = () => store.get('posts-agent-name');

    function render() {
      const f = FORMATS[fmt], total = slides.length, scale = 150 / W;
      const opts = {lang, name: name(), theme, fbs};
      box.innerHTML = `<div class="sm-wrap card">
        <h2>MAKE SLIDES</h2>
        <div class="sm-opts" role="group" aria-label="Language">
          <button class="chip" data-lang="en" aria-pressed="${lang === 'en'}">English</button>
          <button class="chip" data-lang="zh" aria-pressed="${lang === 'zh'}">中文</button>
        </div>
        <div class="sm-opts" role="group" aria-label="Size">${Object.entries(FORMATS).map(([k, v]) => `<button class="chip" data-fmt="${k}" aria-pressed="${k === fmt}">${v.label}</button>`).join('')}</div>
        <div class="sm-opts" role="group" aria-label="Look">${THEMES.map(([k, v]) => `<button class="chip" data-theme="${k}" aria-pressed="${k === theme}">${v}</button>`).join('')}
          <button class="chip" id="smFbs" aria-pressed="${fbs}">7 Blind Spots logo</button></div>
        <label for="smName">Name on slides</label>
        <input id="smName" value="${esc(name())}" placeholder="${fbs ? '7 Financial Blind Spots' : 'ANT Wealth System'}">
        <div class="sm-strip">${slides.map((s, i) => `<div class="sm-thumb" style="width:${W * scale}px;height:${f.h * scale}px"><div class="sm-scale" style="transform:scale(${scale})">${slideHTML(s, i, total, f.h, opts)}</div></div>`).join('')}</div>
        <div class="sm-acts">
          <button class="btn gold" id="smSave">${f.pdf ? 'SAVE PDF' : 'SAVE PICTURES'}</button>
          <button class="btn ghost" id="smShare">SHARE TO APP</button>
          ${typeof AntApi !== 'undefined' && AntApi.connected() ? '<button class="btn ghost" id="smFb">SCHEDULE POST (FB / IG / LinkedIn)</button>' : ''}
          <button class="btn ghost" id="smEditBtn">EDIT TEXT</button>
        </div>
        <div class="sm-sched" id="smSched" hidden></div>
        <p class="hint" id="smMsg">${slides.length} slides · ${f.label}. Tap EDIT TEXT to change any slide.</p>
        <div class="sm-edit" id="smEdit" hidden>${slides.map((s, i) => `<div class="sm-row"><header>SLIDE ${i + 1}${s.kind === 'cover' ? ' · COVER' : s.kind === 'end' ? ' · LAST' : ''}<button data-del="${i}" aria-label="Remove slide ${i + 1}">×</button></header>
          <input data-i="${i}" data-f="title" value="${esc(s.title)}" aria-label="Slide ${i + 1} heading">
          <textarea data-i="${i}" data-f="body" aria-label="Slide ${i + 1} text">${esc(s.body)}</textarea></div>`).join('')}
          <button class="btn ghost small" id="smAdd">+ ADD SLIDE</button></div>
      </div>`;
      const ed = box.querySelector('#smEdit');
      box.querySelector('#smEditBtn').onclick = () => { ed.hidden = !ed.hidden; };
      box.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { lang = b.dataset.lang; slides = build(post, lang); render(); });
      box.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { theme = b.dataset.theme; store.set('posts-slide-theme', theme); render(); });
      box.querySelector('#smFbs').onclick = () => { fbs = !fbs; store.set('posts-slide-fbs', fbs ? 'on' : 'off'); render(); };
      box.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => { fmt = b.dataset.fmt; render(); });
      box.querySelector('#smName').onchange = e => { store.set('posts-agent-name', e.target.value.trim()); render(); };
      ed.onchange = e => {
        const t = e.target;
        if (t.dataset.i != null) { slides[+t.dataset.i][t.dataset.f] = t.value; render(); box.querySelector('#smEdit').hidden = false; }
      };
      ed.onclick = e => {
        if (e.target.dataset.del != null && slides.length > 1) { slides.splice(+e.target.dataset.del, 1); render(); box.querySelector('#smEdit').hidden = false; }
        if (e.target.id === 'smAdd') { slides.splice(slides.length - 1, 0, {kind: 'content', title: '', body: ''}); render(); box.querySelector('#smEdit').hidden = false; }
      };
      box.querySelector('#smSave').onclick = () => run(false);
      box.querySelector('#smShare').onclick = () => run(true);
      const fbBtn = box.querySelector('#smFb');
      if (fbBtn) fbBtn.onclick = () => scheduleFb();
      const shareBtn = box.querySelector('#smShare');
      if (!navigator.canShare) shareBtn.hidden = true;
    }

    // Draw every slide full size, off screen, then turn it into a picture.
    async function makeFiles(asJpeg) {
      if (!window.html2canvas) await loadScript('vendor/html2canvas.min.js');
      const f = FORMATS[fmt], total = slides.length, opts = {lang, name: name(), theme, fbs};
      const stage = document.createElement('div'); stage.className = 'sm-stage'; document.body.appendChild(stage);
      try {
        await document.fonts?.ready;
        const canvases = [];
        for (let i = 0; i < total; i++) {
          stage.innerHTML = slideHTML(slides[i], i, total, f.h, opts);
          const el = stage.firstElementChild;
          await Promise.all([...el.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
          canvases.push(await html2canvas(el, {width: W, height: f.h, scale: 1, backgroundColor: null, useCORS: true}));
          box.querySelector('#smMsg').textContent = 'Making slide ' + (i + 1) + ' of ' + total + '…';
        }
        if (asJpeg) return canvases.map(c => c.toDataURL('image/jpeg', 0.88));
        const base = (post.title || 'post').replace(/[^\w一-鿿]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post';
        if (f.pdf) {
          if (!window.jspdf) await loadScript('vendor/jspdf.umd.min.js');
          const pdf = new jspdf.jsPDF({orientation: 'portrait', unit: 'px', format: [W, f.h], hotfixes: ['px_scaling']});
          canvases.forEach((c, i) => { if (i) pdf.addPage([W, f.h], 'portrait'); pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, W, f.h); });
          return [new File([pdf.output('blob')], base + '-linkedin.pdf', {type: 'application/pdf'})];
        }
        const blobs = await Promise.all(canvases.map(c => new Promise(r => c.toBlob(r, 'image/png'))));
        return blobs.map((b, i) => new File([b], `${base}-${fmt}-${i + 1}.png`, {type: 'image/png'}));
      } finally { stage.remove(); }
    }

    // Auto-post: pictures (4:5) + the FB / IG / LinkedIn text go to the SOCIAL QUEUE tab in the Google Sheet.
    // Picker: platforms, calendar date (with the posting plan's next days) and a time list.
    function scheduleFb() {
      const panel = box.querySelector('#smSched');
      if (!panel.hidden) { panel.hidden = true; return; }
      const plan = window.PostPlan;
      const today = plan ? plan.iso(new Date()) : new Date().toISOString().slice(0, 10);
      const m = String(post.date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const postDate = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
      const planDays = plan ? plan.nextDays(4) : [];
      const defDate = postDate >= today ? postDate : (planDays[0] || today);
      const times = plan ? plan.times() : ['17:00', '20:00', '21:00'];
      const tOf = k => plan ? plan.time(k) : ({facebook: '20:00', instagram: '21:00', linkedin: '17:00'})[k];
      const PL = [['facebook', 'Facebook', post.fb], ['instagram', 'Instagram', post.ig], ['linkedin', 'LinkedIn', post.li]];
      panel.innerHTML = `<b>POST ON</b>
        <div class="sm-opts">${PL.map(([k, n, t]) => `<button class="chip" data-pl="${k}" aria-pressed="${!!String(t || '').trim()}"${String(t || '').trim() ? '' : ' disabled title="No text for this platform"'}>${n}</button>`).join('')}</div>
        <b>DATE</b>
        <div class="row"><input type="date" id="smDate" min="${today}" value="${defDate}" aria-label="Post date"></div>
        ${planDays.length ? `<div class="sm-opts">${planDays.map(d => `<button class="chip" data-day="${d}" aria-pressed="${d === defDate}">${plan.label(d)}</button>`).join('')}</div>` : ''}
        <b>TIME</b>
        ${PL.map(([k, n]) => `<div class="row" data-trow="${k}"><select data-time="${k}" aria-label="${n} time">${(times.includes(tOf(k)) ? times : [tOf(k), ...times]).map(t => `<option${t === tOf(k) ? ' selected' : ''}>${t}</option>`).join('')}</select> ${n}</div>`).join('')}
        <div class="row"><button class="btn gold" id="smGo">SCHEDULE</button><button class="btn ghost" id="smCancel">CANCEL</button></div>`;
      panel.hidden = false;
      const dateIn = panel.querySelector('#smDate');
      panel.onclick = e => {
        const pl = e.target.closest('[data-pl]'), day = e.target.closest('[data-day]');
        if (pl && !pl.disabled) { pl.setAttribute('aria-pressed', pl.getAttribute('aria-pressed') !== 'true'); showTimes(); }
        if (day) { dateIn.value = day.dataset.day; dateIn.onchange(); }
        if (e.target.id === 'smCancel') panel.hidden = true;
        if (e.target.id === 'smGo') {
          const chosen = [...panel.querySelectorAll('[data-pl][aria-pressed=true]')].map(b => b.dataset.pl);
          const usable = PL.filter(([k]) => chosen.includes(k)).map(([platform, , text]) => ({platform, text: text || '', time: panel.querySelector(`[data-time=${platform}]`).value}));
          if (!usable.length) { box.querySelector('#smMsg').textContent = 'Pick at least one platform.'; return; }
          if (!dateIn.value) { box.querySelector('#smMsg').textContent = 'Pick a date.'; return; }
          panel.hidden = true;
          sendSchedule(usable, dateIn.value, usable[0].time);
        }
      };
      const showTimes = () => PL.forEach(([k]) => { panel.querySelector(`[data-trow=${k}]`).hidden = panel.querySelector(`[data-pl=${k}]`).getAttribute('aria-pressed') !== 'true'; });
      showTimes();
      dateIn.onchange = () => panel.querySelectorAll('[data-day]').forEach(b => b.setAttribute('aria-pressed', b.dataset.day === dateIn.value));
      panel.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    }

    async function sendSchedule(usable, date, time) {
      const msg = box.querySelector('#smMsg');
      const keepFmt = fmt;
      try {
        fmt = 'ig';
        msg.textContent = 'Making pictures…';
        const images = await makeFiles(true);
        msg.textContent = 'Sending to your Google Sheet…';
        const res = await AntApi.post('socialQueuePost', {title: post.title || '', posts: usable, date, time, images});
        const names = usable.map(p => ({instagram: 'Instagram', linkedin: 'LinkedIn'})[p.platform] || 'Facebook').join(' + ');
        const at = res.times ? usable.map((p, i) => ({instagram: 'IG', linkedin: 'LinkedIn'})[p.platform] + ' ' + res.times[i]).map(t => t.replace(/^undefined/, 'FB')).join(', ') : '';
        msg.textContent = 'Scheduled on ' + names + ' ✓ ' + res.when + (at ? ' (' + at + ')' : '') + ' · ' + res.pictures + ' pictures.' +
          (!res.connected ? ' Facebook is not connected yet – Sheet menu: Social Posts > Connect Facebook Page.' :
           usable.some(p => p.platform === 'instagram') && res.instagram === false ? ' Instagram is not connected yet – see the setup guide.' :
           usable.some(p => p.platform === 'linkedin') && res.linkedin === false ? ' LinkedIn is not connected yet – Sheet menu: Social Posts > Connect LinkedIn.' :
           usable.some(p => p.platform === 'linkedin') && res.liDaysLeft != null && res.liDaysLeft < 10 ? ' ⚠ LinkedIn login ends in ' + res.liDaysLeft + ' days – Sheet menu: Social Posts > Connect LinkedIn.' :
           !res.autoPost ? ' Turn on: Sheet menu Social Posts > Turn On Auto-Post.' : '');
        if (toast) toast('Scheduled on ' + names);
      } catch (err) {
        msg.textContent = 'Could not schedule: ' + (err && err.message || err);
      } finally { fmt = keepFmt; }
    }

    async function run(share) {
      const msg = box.querySelector('#smMsg');
      try {
        const files = await makeFiles();
        if (share && navigator.canShare && navigator.canShare({files})) {
          await navigator.share({files, title: post.title || 'Slides'});
          msg.textContent = 'Shared ✓';
          return;
        }
        files.forEach((file, i) => setTimeout(() => {
          const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
          document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        }, i * 400));
        msg.textContent = files.length + (files.length > 1 ? ' files' : ' file') + ' saved to your Downloads.' + (share ? ' (Sharing isn’t available on this device.)' : '');
      } catch (err) {
        if (err && err.name === 'AbortError') { msg.textContent = 'Share cancelled.'; return; }
        msg.textContent = 'Could not make the slides: ' + (err && err.message || err);
        if (toast) toast('Could not make the slides');
      }
    }

    render();
    box.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  window.SlideMaker = {open, build};
})();

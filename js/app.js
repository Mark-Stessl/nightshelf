/* Nightshelf – Oberfläche */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const view = $('#view');
  let animate = true;
  const A = () => animate ? 'fade-in' : '';

  /* ---------- Konstanten ---------- */
  const TYPES = {
    game:   { label: 'Spiel',  plural: 'Spiele', route: 'games' },
    series: { label: 'Serie',  plural: 'Serien', route: 'series' },
    anime:  { label: 'Anime',  plural: 'Anime',  route: 'anime' },
    manga:  { label: 'Manga',  plural: 'Manga',  route: 'manga' },
    movie:  { label: 'Film',   plural: 'Filme',  route: 'movies' },
  };
  const STATUS = {
    game:   { active: 'Am Spielen', done: 'Durchgespielt', planned: 'Backlog', dropped: 'Abgebrochen' },
    series: { active: 'Am Schauen', done: 'Fertig geschaut', planned: 'Merkliste', dropped: 'Abgebrochen' },
    anime:  { active: 'Am Schauen', done: 'Fertig geschaut', paused: 'Pausiert', planned: 'Merkliste', dropped: 'Abgebrochen' },
    manga:  { active: 'Am Lesen', done: 'Fertig gelesen', paused: 'Pausiert', planned: 'Leseliste', dropped: 'Abgebrochen' },
    movie:  { done: 'Gesehen', planned: 'Merkliste', dropped: 'Abgebrochen' },
  };
  const ORDER_TYPES = ['game', 'series', 'anime', 'manga', 'movie'];
  // Plattformen nach Hersteller gruppiert (für Auswahl und Filter)
  const PLATFORM_GROUPS = [
    ['PlayStation', ['PS5', 'PS4', 'PS3', 'PS2', 'PS1', 'PS Vita', 'PSP']],
    ['Nintendo', ['Switch 2', 'Switch', 'Wii U', 'Wii', 'GameCube', '3DS', 'DS', 'N64']],
    ['Xbox', ['Xbox Series', 'Xbox One', 'Xbox 360', 'Xbox']],
    ['Steam', ['Steam']],
    ['Sonstige', ['Mobile', 'Andere']],
  ];
  const PLATFORMS = PLATFORM_GROUPS.flatMap(([, list]) => list);
  const LEGACY_FAMILY = { PC: 'Steam', 'Steam Deck': 'Steam' }; // alte Einträge zählen weiter zu Steam
  const familyOf = p => LEGACY_FAMILY[p] || (PLATFORM_GROUPS.find(([, list]) => list.includes(p)) || ['Sonstige'])[0];
  const platformOptions = sel => PLATFORM_GROUPS.map(([g, list]) => `<optgroup label="${g}">${list.map(p => `<option ${p === sel ? 'selected' : ''}>${p}</option>`).join('')}</optgroup>`).join('')
    + (sel && !PLATFORMS.includes(sel) ? `<option selected>${esc(sel)}</option>` : '');
  const psDefault = p => isPS(p) ? (PSN.connected() ? 'psn' : 'paste') : (p === 'Steam' || p === 'PC' || p === 'Steam Deck') ? (Steam.connected() ? 'steam' : 'paste') : 'auto';
  const isPS = p => /^(PS5|PS4|PS3|PS Vita)$/.test(p || ''); // Plattformen mit offiziellen PlayStation-Trophäen

  const I = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
    paste: '<svg viewBox="0 0 24 24"><path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/></svg>',
    game: '<svg viewBox="0 0 24 24"><path d="M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 15h-4l-1 .6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 11v3M5.5 12.5h3M16 12h.01M18 14h.01"/></svg>',
    tv: '<svg viewBox="0 0 24 24"><path d="M3 7h18v12H3zM8 3l4 4 4-4"/></svg>',
    image: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5"/><circle cx="15.5" cy="9" r="1.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/></svg>',
    install: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h6"/></svg>',
    anime: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/></svg>',
    film: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.9-3.9M4 5v4h4M4 13a8 8 0 0 0 14.9 3.9M20 19v-4h-4"/></svg>',
  };
  const typeIcon = t => ({ game: I.game, series: I.tv, anime: I.anime, manga: I.book, movie: I.film }[t]);

  /* ---------- Hilfen ---------- */
  function hash(str) { let h = 0; for (const c of str || '') h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function initials(title) {
    const w = (title || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(' ').filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
  }
  /* Cover im Querformat: ganz zeigen (unscharfer Hintergrund) und für Spiele einmalig ein Hochformat-Cover suchen */
  const coverQueue = [];
  let coverBusy = false;
  const coverNorm = t => (t || '').toLowerCase().replace(/[-–]?\s*troph(ä|ae)en$/i, '').replace(/[™®©]/g, '').replace(/[^a-z0-9]+/g, '');
  const COVER_V = 2; // Version der Cover-Suche: alte Einträge werden mit der neuen Suche einmal nachgeholt
  const queueCover = id => { const it = Store.get(id); if (it && it.type === 'game' && !it.coverCustom && (it.coverV || 0) < COVER_V && !coverQueue.includes(id)) { coverQueue.push(id); runCoverQueue(); } };
  window.__nsCover = img => {
    const box = img.parentElement;
    if (!box || !img.naturalWidth) return;
    if (img.naturalWidth / img.naturalHeight <= 0.85) return;
    const src = img.currentSrc || img.src;
    // Logos (meist durchsichtige PNG/SVG) auf dem Farbverlauf zeigen, Fotos mit unscharfem Hintergrund
    if (/\.(png|svg)(\?|$)|logo/i.test(src)) box.classList.add('cover-logo');
    else { box.classList.add('cover-wide'); box.style.setProperty('--cover-bg', `url("${src}")`); }
    if (img.dataset.id) queueCover(img.dataset.id);
  };
  window.__nsCoverErr = img => { const id = img.dataset.id; img.remove(); if (id) queueCover(id); };
  const imgRatio = src => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth / i.naturalHeight); i.onerror = () => res(null); i.src = src; });
  async function runCoverQueue() {
    if (coverBusy) return;
    coverBusy = true;
    let changed = false;
    while (coverQueue.length) {
      const id = coverQueue.shift(), it = Store.get(id);
      if (!it || (it.coverV || 0) >= COVER_V) continue;
      let better = null;
      const q = it.title.replace(/[-–]?\s*Troph(ä|ae)en$/i, '').replace(/[™®©]/g, '').trim();
      // 1. Steam (offizielle Store-Bilder, auch für Spiele, die nicht auf Steam gespielt werden)
      if (Sync.enabled()) {
        try {
          const hit = it.steamAppId ? { appid: it.steamAppId } : await Steam.find(q);
          if (hit) { const c = await Steam.cover(hit.appid); const r = c.portrait ? await imgRatio(c.portrait) : null; if (r && r < 0.85) better = c.portrait; }
        } catch {}
      }
      // 2. Wikipedia-Packungsbild
      if (!better) {
        try {
          const want = coverNorm(q), wantShort = coverNorm(q.split(':')[0]);
          const hits = await Lookup.search('game', q);
          const hit = hits.find(h => h.cover && coverNorm(h.title) === want) || hits.find(h => h.cover && coverNorm(h.title.split(':')[0]) === wantShort && wantShort.length >= 4);
          if (hit) { const r = await imgRatio(hit.cover); if (r && r < 0.85) better = hit.cover; }
        } catch {}
      }
      Store.update(id, better ? { cover: better, coverTried: true, coverV: COVER_V } : { coverTried: true, coverV: COVER_V });
      if (better) changed = true;
      await new Promise(r => setTimeout(r, 300));
    }
    coverBusy = false;
    if (changed) render();
  }

  function playtimeEditor(it) {
    const cur = hoursOf(it);
    openModal({
      title: 'Spielzeit',
      body: `<div class="form"><div class="field"><label>Gespielte Stunden</label>
        <div class="unit-wrap"><input class="input" id="playIn" type="number" inputmode="decimal" min="0" step="0.5" value="${cur != null ? Math.round(cur * 10) / 10 : ''}" placeholder="z. B. 35"><span>Stunden</span></div>
        <div class="tiny">${it.playMin != null ? `Automatisch (${PLAY_SRC[it.playSrc] || ''}): ${fmtHours(it.playMin / 60)}. Was du hier einträgst, gilt stattdessen und wird nicht überschrieben.` : 'Bei Steam- und PlayStation-Spielen kommt die Zeit automatisch. Deine Angabe wird nie überschrieben.'}</div></div></div>`,
      foot: `${it.playH != null ? '<button class="btn btn-ghost btn-danger" id="playClear">Entfernen</button>' : ''}<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="playSave">Speichern</button>`,
      onMount: (m, close) => {
        const save = () => { const v = $('#playIn', m).value.trim(); Store.update(it.id, { playH: v === '' ? null : Math.max(0, Math.round(+v.replace(',', '.') * 10) / 10) }); close(); render(); };
        $('#playSave', m).onclick = save;
        $('#playIn', m).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); save(); } };
        $('#playClear', m) && ($('#playClear', m).onclick = () => { Store.update(it.id, { playH: null }); close(); render(); });
      },
    });
  }

  /* Eigenes Cover: Bild vom Gerät (automatisch aufs Hochformat 2:3 zugeschnitten) oder Link */
  function cropToCover(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const W = 400, H = 600, c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
        ctx.fillStyle = '#0E0B16'; ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(url);
        let q = 0.85, data = c.toDataURL('image/jpeg', q);
        while (data.length > 160000 && q > 0.5) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
        resolve(data);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }
  function coverHTML(item, opts = {}) {
    let inner;
    if (item.cover) {
      inner = `<img src="${esc(item.cover)}" alt="" loading="lazy" data-id="${esc(item.id || '')}" onload="window.__nsCover && window.__nsCover(this)" onerror="window.__nsCoverErr ? window.__nsCoverErr(this) : this.remove()">`;
    } else if (item.type === 'game' && item.id && (item.coverV || 0) < COVER_V) setTimeout(() => queueCover(item.id), 0);
    const h = hash(item.title);
    const hue = 248 + (h % 46);
    const hue2 = (h >> 3) % 3 === 0 ? 188 : hue + 30;
    const gen = `<div class="cover-gen" style="background:
      radial-gradient(120% 80% at 100% 0%, hsla(${hue2},85%,60%,.45), transparent 55%),
      linear-gradient(160deg, hsl(${hue},60%,34%), hsl(${hue + 10},45%,12%))">
      <div class="initials">${esc(initials(item.title))}</div>${opts.noTitle ? '' : `<div class="ctitle">${esc(item.title)}</div>`}</div>`;
    return gen + (inner || '');
  }
  function stars(n) { return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : ''; }
  const statusLabel = item => (STATUS[item.type] || {})[item.status] || '';
  function statusPill(item) {
    const label = (STATUS[item.type] || {})[item.status];
    if (!label) return '';
    const cls = { done: 'st-done', active: 'st-active', planned: 'st-planned', paused: 'st-planned', dropped: 'st-dropped' }[item.status];
    return `<span class="status-pill ${cls}">${label}</span>`;
  }
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }

  function allTrophyStats() {
    const games = Store.all('game');
    let pts = 0; const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 }; let earned = 0, total = 0;
    games.forEach(g => (g.trophies || []).forEach(t => {
      total++;
      if (t.done) { earned++; counts[t.tier]++; pts += Trophies.TIERS[t.tier].points; }
    }));
    return { pts, counts, earned, total, level: Trophies.levelFromPoints(pts) };
  }

  function tierCountsHTML(c) {
    return Trophies.ORDER.map(t => `<span style="color:${Trophies.TIERS[t].color}">${Trophies.icon(t, 13)} ${c[t]}</span>`).join('');
  }

  function renderSidebarLevel() {
    const s = allTrophyStats();
    $('#sidebarLevel').innerHTML = `
      <a class="level-card" href="#/trophies" style="display:block">
        <div class="level-top">
          <div class="level-badge">${s.level.level}</div>
          <div><div class="level-title">Trophäen-Level</div><div class="tiny">${s.level.into} / ${s.level.need} Punkte</div></div>
        </div>
        <div class="bar"><i style="width:${s.level.pct}%"></i></div>
        <div class="tier-counts">${tierCountsHTML(s.counts)}</div>
      </a>`;
  }

  /* ---------- Toasts ---------- */
  function toast(html, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.innerHTML = html;
    const rootEl = $('#toastRoot');
    rootEl.appendChild(el);
    while (rootEl.children.length > 3) rootEl.firstElementChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, cls === 'plat' ? 4200 : 2600);
  }
  function trophyToast(t, game) {
    toast(`<div class="tbadge">${Trophies.icon(t.tier, 22)}</div><div><b>${esc(t.name)}</b><small>${Trophies.TIERS[t.tier].label}-Trophäe · ${esc(game.title)}</small></div>`, t.tier === 'platinum' ? 'plat' : '');
  }

  /* ---------- Modal ---------- */
  // Seite im Hintergrund sperren, solange ein Fenster offen ist
  let lockedY = null;
  function lockScroll() {
    const html = document.documentElement;
    if (html.classList.contains('modal-open')) return;
    const gap = window.innerWidth - html.clientWidth;
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    if (window.matchMedia('(max-width: 820px)').matches) {
      // Handy: Seite festnageln, sonst lässt iOS sie trotzdem mitwischen
      lockedY = window.scrollY;
      Object.assign(document.body.style, { position: 'fixed', top: `-${lockedY}px`, left: '0', right: '0', width: '100%' });
    }
    html.classList.add('modal-open');
  }
  function unlockScroll() {
    const html = document.documentElement;
    if (!html.classList.contains('modal-open')) return;
    html.classList.remove('modal-open');
    Object.assign(document.body.style, { paddingRight: '', position: '', top: '', left: '', right: '', width: '' });
    if (lockedY != null) { window.scrollTo(0, lockedY); lockedY = null; }
  }
  let modalSeq = 0;
  function openModal({ title, body, foot = '', wide = false, onMount }) {
    const root = $('#modalRoot');
    const seq = ++modalSeq;
    lockScroll();
    root.innerHTML = `<div class="modal-backdrop"></div>
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head"><h2>${esc(title)}</h2><button class="btn btn-ghost icon-btn" data-close aria-label="Schließen">${I.x}</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>`;
    if (root.classList.contains('open')) root.classList.remove('open');
    void root.offsetWidth; // Startzustand festhalten, damit die Einblend-Animation läuft
    root.classList.add('open');
    // Handy: Fenster immer am sichtbaren Bereich ausrichten (iOS schiebt die Ansicht sonst bei Tastatur/Fokus hoch)
    const vv = window.visualViewport;
    const touch = window.matchMedia('(max-width: 820px)').matches;
    // Tastatur offen: Buttons ausblenden, damit das Formular den Platz bekommt.
    // Erkennung über das angetippte Feld (zuverlässig auf iOS) und zusätzlich über die geschrumpfte Höhe.
    let maxH = vv ? vv.height : 0, sawShrink = false;
    const typing = () => { const f = document.activeElement; return !!f && root.contains(f) && (f.matches('textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button])')); };
    const setKb = () => {
      const shrunk = vv ? maxH - vv.height > 120 : false;
      if (shrunk) sawShrink = true;
      // Feld angetippt: sofort ausblenden. Ist die Tastatur danach wieder zu (Höhe zurück), Buttons zeigen, auch wenn das Feld noch aktiv ist.
      const kb = touch && (shrunk || (typing() && !sawShrink));
      if (kb === root.classList.contains('kb-open')) return;
      root.classList.toggle('kb-open', kb);
      if (kb) { const f = document.activeElement; f && root.contains(f) && setTimeout(() => f.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250); }
    };
    const fit = () => {
      if (!vv) return;
      maxH = Math.max(maxH, vv.height);
      root.style.top = `${vv.offsetTop}px`; root.style.height = `${vv.height}px`; root.style.bottom = 'auto';
      setKb();
    };
    const onFocusIn = () => { sawShrink = false; setKb(); };
    const onFocusOut = () => setTimeout(setKb, 80);
    if (touch) { root.addEventListener('focusin', onFocusIn); root.addEventListener('focusout', onFocusOut); }
    if (vv && touch) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit(); }
    const close = () => {
      root.classList.remove('open');
      if (vv && touch) { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit); }
      if (touch) { root.removeEventListener('focusin', onFocusIn); root.removeEventListener('focusout', onFocusOut); }
      setTimeout(() => { if (seq === modalSeq && !root.classList.contains('open')) { root.innerHTML = ''; root.style.top = root.style.height = root.style.bottom = ''; root.classList.remove('kb-open'); unlockScroll(); } }, 280);
      document.removeEventListener('keydown', onKey);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    $('.modal-backdrop', root).onclick = close;
    $$('[data-close]', root).forEach(b => b.onclick = close);
    const modal = $('.modal', root);
    onMount && onMount(modal, close);
    // Am Handy nicht automatisch ins erste Feld springen: das öffnet die Tastatur und verschiebt die Ansicht
    const first = $('input, textarea, select', modal);
    if (first && !window.matchMedia('(pointer: coarse)').matches) setTimeout(() => first.focus(), 120);
    return close;
  }

  function confirmDialog(text, okLabel, onOk) {
    openModal({
      title: 'Bist du sicher?',
      body: `<p class="muted" style="margin:0">${text}</p>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="okBtn">${okLabel}</button>`,
      onMount: (m, close) => { $('#okBtn', m).onclick = () => { close(); onOk(); }; },
    });
  }

  function starsInput(value, name = 'rating') {
    return `<div class="stars" data-stars="${name}" data-value="${value || 0}">${[1, 2, 3, 4, 5].map(n =>
      `<button type="button" data-n="${n}" class="${n <= (value || 0) ? 'on' : ''}" aria-label="${n} Sterne">${I.star}</button>`).join('')}</div>`;
  }
  function bindStars(root) {
    $$('[data-stars]', root).forEach(box => {
      $$('button', box).forEach(b => b.onclick = () => {
        let n = +b.dataset.n;
        if (+box.dataset.value === n) n = 0;
        box.dataset.value = n;
        $$('button', box).forEach(x => x.classList.toggle('on', +x.dataset.n <= n));
        box.dispatchEvent(new CustomEvent('change', { detail: n }));
      });
    });
  }

  /* ---------- Formular: Hinzufügen / Bearbeiten ---------- */
  function itemForm(type, item = null) {
    const isEdit = !!item;
    const d = item || { type, status: type === 'movie' ? 'done' : 'active', platform: 'PS5', genre: 'adventure' };
    const st = STATUS[type];
    let trophyMode = psDefault(d.platform);

    const gameFields = type === 'game' ? `
      <div class="grid-2">
        <div class="field"><label>Plattform</label><select class="input" name="platform">${platformOptions(d.platform)}</select></div>
        <div class="field"><label>Genre</label><select class="input" name="genre">${Object.entries(Trophies.GENRES).map(([k, v]) => `<option value="${k}" ${k === d.genre ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      </div>` : '';
    const seriesFields = type === 'series' && d.seasonList?.some(x => x.episodes) ? `<p class="tiny" style="margin:0">Staffeln und Folgen bearbeitest du direkt auf der Seite der Serie.</p>` : type === 'series' ? `
      <div class="grid-2">
        <div class="field"><label>Staffeln gesamt</label><input class="input" name="seasons" type="number" min="0" value="${d.seasons || ''}" placeholder="5"></div>
        <div class="field"><label>Gesehen bis Staffel</label><input class="input" name="seasonSeen" type="number" min="0" value="${d.seasonSeen || ''}" placeholder="3"></div>
      </div>` : '';
    const mangaFields = type === 'manga' ? `
      <div class="grid-2">
        <div class="field"><label>Kapitel aktuell</label><input class="input" name="chapters" type="number" min="0" step="any" value="${d.chapters ?? ''}" placeholder="368"></div>
        <div class="field"><label>Gelesen bis Kapitel</label><input class="input" name="chaptersRead" type="number" min="0" step="any" value="${d.chaptersRead ?? ''}" placeholder="120"></div>
      </div>` : '';
    const animeFields = type === 'anime' && d.seasonList?.length ? `<p class="tiny" style="margin:0">Folgen und Staffeln bearbeitest du direkt auf der Seite des Anime.</p>` : type === 'anime' ? `
      <div class="grid-2">
        <div class="field"><label>Folgen gesamt</label><input class="input" name="episodes" type="number" min="0" value="${d.episodes || ''}" placeholder="24"></div>
        <div class="field"><label>Gesehene Folgen</label><input class="input" name="episodesSeen" type="number" min="0" value="${d.episodesSeen || ''}" placeholder="12"></div>
      </div>` : '';
    const trophySection = (type === 'game' && !isEdit) ? `
      <div class="field">
        <label>Trophäen</label>
        <div class="seg" id="tmode">
          ${PSN.connected() ? '<button type="button" data-m="psn">Von PlayStation</button>' : ''}
          ${Steam.connected() ? '<button type="button" data-m="steam">Von Steam</button>' : ''}
          <button type="button" data-m="auto">${'Automatisch erstellen'}</button>
          <button type="button" data-m="paste">Liste einfügen</button>
          <button type="button" data-m="none">Später</button>
        </div>
      </div>
      <div id="tmodeBody"></div>` : '';

    openModal({
      title: isEdit ? `${TYPES[type].label} bearbeiten` : `${TYPES[type].label} hinzufügen`,
      wide: type === 'game' && !isEdit,
      body: `<form class="form" id="itemForm" novalidate>
        <div class="field"><label>Titel</label><div class="suggest-wrap"><input class="input" name="title" value="${esc(d.title || '')}" placeholder="${type === 'game' ? 'Super Mario Odyssey' : type === 'series' ? 'All of Us Are Dead' : 'Dune: Part Two'}" autocomplete="off"><div class="suggest" id="suggest" hidden></div></div><div class="field-error" id="titleErr"></div><div id="lookupInfo"></div></div>
        ${gameFields}
        <div class="grid-2">
          <div class="field"><label>Status</label><select class="input" name="status">${Object.entries(st).map(([k, v]) => `<option value="${k}" ${k === d.status ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Jahr</label>
            <div class="year-wrap"><input class="input" name="year" type="number" min="1950" max="2100" value="${d.year || ''}" placeholder="2024">
              <button type="button" class="year-cal" id="relBtn" title="Genaues Datum wählen (optional)" aria-label="Genaues Datum wählen">${I.calendar}</button>
              <div class="calpop" id="calPop" hidden></div></div>
            <div class="rel-chip" id="relChip"></div></div>
        </div>
        ${seriesFields}${animeFields}${mangaFields}
        <div class="field"><label>Bewertung</label>${starsInput(d.rating)}</div>
        <details class="form-more" ${(isEdit && d.notes) || window.matchMedia('(min-width: 821px)').matches ? 'open' : ''}>
          <summary>Weitere Angaben <span class="tiny">${type === 'game' ? 'Notizen, Spielzeit, Cover' : 'Notizen, Cover'}</span></summary>
          <div class="form-more-body">
            <div class="field"><label>Notizen</label><textarea class="input" name="notes" placeholder="Was hat dir gefallen?">${esc(d.notes || '')}</textarea></div>
            ${type === 'game' ? `<div class="field"><label>Spielzeit <span class="tiny">(optional)</span></label><div class="unit-wrap"><input class="input" name="playH" type="number" inputmode="decimal" min="0" step="0.5" value="${d.playH != null ? d.playH : ''}" placeholder="${d.playMin != null ? `automatisch: ${Math.round(d.playMin / 60)}` : 'z. B. 35'}"><span>Stunden</span></div></div>` : ''}
            <div class="field"><label>Cover-Bild (Link, optional)</label><input class="input" name="cover" value="${esc(d.cover || '')}" placeholder="https://…/cover.jpg">
              <label class="add-pick-btn cover-pick" for="coverFile" style="margin-top:4px"><span class="add-pick-icon" id="coverPickIcon">${I.upload}</span><span class="add-pick-text"><b id="coverPickTitle">Bild auswählen</b><small id="coverPickSub">Vom Handy oder PC, wird aufs Hochformat zugeschnitten</small></span></label>
              <input type="file" id="coverFile" accept="image/*" hidden><div class="field-error" id="coverErr"></div></div>
          </div>
        </details>
        ${trophySection}
      </form>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="saveBtn">${isEdit ? 'Speichern' : 'Hinzufügen'}</button>`,
      onMount: (m, close) => {
        bindStars(m);
        const form = $('#itemForm', m);
        let customCover = null;
        // Genaues Datum (optional): Jahr reicht, Tag und Monat nur über das Kalender-Symbol
        let released = /^\d{4}-\d{2}-\d{2}/.test(d.released || '') ? d.released.slice(0, 10) : null;
        const relChip = $('#relChip', m), pop = $('#calPop', m);
        const renderRel = () => {
          relChip.innerHTML = released ? `${I.calendar}<span>${new Date(released + 'T00:00:00').toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}</span><button type="button" id="relClear" title="Datum entfernen">${I.x}</button>` : '';
          $('#relClear', m) && ($('#relClear', m).onclick = () => { released = null; renderRel(); });
        };
        // Eigener Kalender im App-Stil
        const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const ymd = (y, mo, da) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
        const todayStr = (() => { const t = new Date(); return ymd(t.getFullYear(), t.getMonth(), t.getDate()); })();
        let view = { y: 0, m: 0, mode: 'days' };
        const drawCal = () => {
          const { y, m: mo, mode } = view;
          if (mode === 'months') {
            pop.innerHTML = `<div class="cal-head"><button type="button" class="cal-nav" data-cal="py">‹</button><button type="button" class="cal-title" data-cal="days">${y}</button><button type="button" class="cal-nav" data-cal="ny">›</button></div>
              <div class="cal-months">${MONTHS.map((n, i) => `<button type="button" class="cal-month ${released && +released.slice(0, 4) === y && +released.slice(5, 7) === i + 1 ? 'sel' : ''}" data-mo="${i}">${n.slice(0, 3)}</button>`).join('')}</div>`;
          } else {
            const startDay = (new Date(y, mo, 1).getDay() + 6) % 7;
            const cells = [];
            for (let i = 0; i < 42; i++) {
              const dt = new Date(y, mo, 1 - startDay + i), str = ymd(dt.getFullYear(), dt.getMonth(), dt.getDate());
              cells.push(`<button type="button" class="cal-day ${dt.getMonth() !== mo ? 'out' : ''} ${str === todayStr ? 'today' : ''} ${str === released ? 'sel' : ''}" data-d="${str}">${dt.getDate()}</button>`);
            }
            pop.innerHTML = `<div class="cal-head"><button type="button" class="cal-nav" data-cal="pm">‹</button><button type="button" class="cal-title" data-cal="months">${MONTHS[mo]} ${y}</button><button type="button" class="cal-nav" data-cal="nm">›</button></div>
              <div class="cal-grid">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<span class="cal-wd">${w}</span>`).join('')}${cells.join('')}</div>
              <div class="cal-foot"><button type="button" class="cal-link" data-cal="today">Heute</button>${released ? '<button type="button" class="cal-link danger" data-cal="clear">Entfernen</button>' : ''}</div>`;
          }
        };
        const closeCal = () => { pop.hidden = true; document.removeEventListener('pointerdown', outside, true); };
        const outside = e => { if (!pop.contains(e.target) && !e.target.closest('#relBtn')) closeCal(); };
        const pickDate = str => { released = str; form.elements.year.value = str.slice(0, 4); renderRel(); closeCal(); };
        $('#relBtn', m).onclick = () => {
          if (!pop.hidden) { closeCal(); return; }
          const base = released ? new Date(released + 'T00:00:00') : form.elements.year.value ? new Date(+form.elements.year.value, new Date().getMonth(), 1) : new Date();
          view = { y: base.getFullYear(), m: base.getMonth(), mode: 'days' };
          drawCal(); pop.hidden = false;
          setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
          pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        };
        pop.onclick = e => {
          const b = e.target.closest('button'); if (!b) return;
          e.preventDefault();
          if (b.dataset.d) return pickDate(b.dataset.d);
          if (b.dataset.mo) { view.m = +b.dataset.mo; view.mode = 'days'; return drawCal(); }
          const a = b.dataset.cal;
          if (a === 'pm') { view.m--; if (view.m < 0) { view.m = 11; view.y--; } }
          else if (a === 'nm') { view.m++; if (view.m > 11) { view.m = 0; view.y++; } }
          else if (a === 'py') view.y--;
          else if (a === 'ny') view.y++;
          else if (a === 'months' || a === 'days') view.mode = a;
          else if (a === 'today') return pickDate(todayStr);
          else if (a === 'clear') { released = null; renderRel(); return closeCal(); }
          drawCal();
        };
        form.elements.year.addEventListener('input', () => { if (released && form.elements.year.value !== released.slice(0, 4)) { released = null; renderRel(); } });
        renderRel();
        $('#coverFile', m).onchange = async e => {
          const f = e.target.files[0]; if (!f) return;
          $('#coverErr', m).textContent = '';
          try {
            customCover = await cropToCover(f);
            $('#coverPickIcon', m).innerHTML = `<img src="${customCover}" alt="">`;
            $('#coverPickTitle', m).textContent = 'Bild ausgewählt';
            $('#coverPickSub', m).textContent = 'Tippen, um ein anderes zu nehmen';
          } catch { $('#coverErr', m).textContent = 'Dieses Bild konnte nicht gelesen werden. Versuch ein JPG oder PNG.'; }
        };
        let parsed = [];

        function renderTMode() {
          const body = $('#tmodeBody', m);
          if (!body) return;
          $$('#tmode button', m).forEach(b => b.classList.toggle('on', b.dataset.m === trophyMode));
          if (trophyMode === 'steam') {
            body.innerHTML = `<div class="hint-box">${I.trophy}<div>Die Erfolge werden von Steam geladen, mit Namen, Beschreibung und wie selten sie sind. Die Stufe kommt aus der Seltenheit: unter 5 % Gold, unter 20 % Silber, sonst Bronze. Platin gibt es für alle Erfolge.${Steam.hasProfile() ? ' Schon freigeschaltete Erfolge werden direkt abgehakt.' : ''}</div></div>`;
          } else if (trophyMode === 'psn') {
            body.innerHTML = `<div class="hint-box">${I.trophy}<div>Die echte Trophäenliste wird von deinem PlayStation-Konto geladen, mit deinen schon verdienten Trophäen. Das klappt für Spiele, die du auf PS4 oder PS5 mindestens einmal gestartet hast.</div></div>`;
          } else if (trophyMode === 'auto') {
            body.innerHTML = aiBlockedToday() ? `<div class="hint-box quota">${I.info}<div><b>Heute nicht mehr möglich.</b> ${aiQuotaText()} Wähle „Später“ und erstelle die Trophäen dann auf der Spielseite.</div></div>` : `<div class="hint-box">${I.sparkle}<div>Die KI liest sich Infos zum Spiel durch und erstellt Trophäen, die genau zu diesem Spiel passen, mit Bronze, Silber, Gold und Platin. Du kannst danach jede Trophäe umbenennen, löschen oder eigene hinzufügen.</div></div>
              <div class="field" style="margin-top:12px"><label>Umfang</label><select class="input" name="tsize"><option value="short">Kurz (7)</option><option value="normal" selected>Normal (12)</option><option value="long">Umfangreich (18)</option></select></div>`;
          } else if (trophyMode === 'paste') {
            body.innerHTML = `<div class="hint-box">${I.paste}<div>Kopiere die Trophäenliste z. B. von PSNProfiles, Exophase oder der Steam-Erfolgsseite und füge sie hier ein. Prozentwerte werden erkannt und für die Stufe genutzt, verdiente Trophäen (mit Datum) werden direkt abgehakt. Eigenes Format geht auch: <code>Name | Beschreibung | Gold</code></div></div>
              <textarea class="input" id="pasteBox" style="margin-top:12px;min-height:140px;font-size:13px" placeholder="Elden Lord&#10;Achieved the &quot;Elden Lord&quot; ending&#10;12.5%&#10;…"></textarea>
              <div id="pastePreview"></div>`;
            const box = $('#pasteBox', m);
            box.oninput = () => { parsed = Trophies.parse(box.value); renderPreview($('#pastePreview', m), parsed); };
          } else {
            body.innerHTML = `<p class="tiny" style="margin:0">Du kannst Trophäen jederzeit auf der Spielseite erstellen oder importieren.</p>`;
          }
        }
        $$('#tmode button', m).forEach(b => b.onclick = () => { trophyMode = b.dataset.m; renderTMode(); });
        const plat = form.elements.platform;
        if (plat && !isEdit) plat.onchange = () => { trophyMode = psDefault(plat.value); renderTMode(); };
        renderTMode();
        let fetched = null;
        const F = form.elements;
        const sug = $('#suggest', m), info = $('#lookupInfo', m);
        const keyHint = { movie: 'TMDB' }[type];
        if (!Lookup.hasKey(type)) info.innerHTML = `<div class="tiny" style="margin-top:4px">Tipp: Mit einem kostenlosen ${keyHint}-Schlüssel unter <a href="#/settings" data-close style="color:var(--lilac)">Daten</a> werden Cover und Infos automatisch ausgefüllt.</div>`;
        let timer, seq = 0, hits = [], activeIdx = -1;
        const hideSug = () => { sug.hidden = true; activeIdx = -1; };
        const showSug = html => { sug.innerHTML = html; sug.hidden = false; };
        async function runSearch(q) {
          const my = ++seq;
          showSug('<div class="suggest-msg">Suche…</div>');
          try {
            hits = await Lookup.search(type, q);
            if (my !== seq) return;
            if (!hits.length) { showSug('<div class="suggest-msg">Nichts gefunden. Du kannst trotzdem alles selbst eintragen.</div>'); return; }
            showSug(hits.map((h, i) => `<button type="button" class="suggest-item" data-i="${i}">
              <span class="suggest-thumb">${h.thumb ? `<img src="${esc(h.thumb)}" alt="" onerror="this.remove()">` : ''}</span>
              <span class="suggest-text"><b>${esc(h.title)}</b><small>${esc(h.sub)}</small></span></button>`).join(''));
            $$('.suggest-item', sug).forEach(b => b.onmousedown = e => { e.preventDefault(); pick(+b.dataset.i); });
          } catch (err) {
            if (my !== seq) return;
            showSug(`<div class="suggest-msg">${err.message === 'key' ? `Der ${keyHint}-Schlüssel wird nicht akzeptiert. Prüfe ihn unter Daten.` : 'Keine Verbindung zur Datenbank. Du kannst alles selbst eintragen.'}</div>`);
          }
        }
        async function pick(i) {
          const h = hits[i]; if (!h) return;
          hideSug();
          F.title.value = h.title;
          info.innerHTML = `<div class="tiny" style="margin-top:4px">Lade Infos…</div>`;
          try {
            const dt = await Lookup.detail(type, h);
            fetched = dt;
            if (dt.year) F.year.value = dt.year;
            released = /^\d{4}-\d{2}-\d{2}/.test(dt.released || '') ? dt.released.slice(0, 10) : null; renderRel();
            if (dt.cover) F.cover.value = dt.cover;
            if (type === 'series' && dt.seasons) F.seasons.value = dt.seasons;
            if (type === 'anime' && dt.episodes) F.episodes.value = dt.episodes;
            if (type === 'manga' && dt.latest) F.chapters.value = dt.latest;
            if (type === 'game') {
              if (dt.genre && F.genre) F.genre.value = dt.genre;
              if (dt.platforms?.length && !dt.platforms.includes(F.platform.value)) {
                const pref = ['PS5', 'Switch 2', 'Switch', 'PS4', 'Steam', 'Xbox Series', 'Xbox One', 'Wii U', 'PS3', 'Xbox 360', 'Wii', '3DS', 'Mobile'].find(p => dt.platforms.includes(p));
                if (pref) { F.platform.value = pref; F.platform.onchange && F.platform.onchange(); }
              }
            }
            info.innerHTML = `<div class="fetched">${dt.cover ? `<img src="${esc(dt.cover)}" alt="">` : ''}<div><b>Infos übernommen</b><small>${esc([dt.released ? fmtDate(dt.released) : dt.year, (dt.genres || []).slice(0, 3).join(', '), dt.runtime ? dt.runtime + ' Min.' : '', dt.seasons ? dt.seasons + (dt.seasons === 1 ? ' Staffel' : ' Staffeln') : '', dt.episodes ? dt.episodes + ' Folgen' : '', dt.latest ? `${dt.completed ? '' : 'laufend · '}${fmtCh(dt.latest)} Kapitel` : ''].filter(Boolean).join(' · '))}</small></div>
              <button type="button" class="btn btn-ghost btn-sm" id="undoFetch">Entfernen</button></div>`;
            $('#undoFetch', m).onclick = () => { fetched = null; F.cover.value = ''; info.innerHTML = ''; };
          } catch { info.innerHTML = `<div class="tiny" style="margin-top:4px">Details konnten nicht geladen werden.</div>`; }
        }
        F.title.oninput = () => {
          $('#titleErr', m).textContent = '';
          clearTimeout(timer);
          const q = F.title.value.trim();
          if (q.length < 2 || !Lookup.hasKey(type)) { seq++; hideSug(); return; }
          timer = setTimeout(() => runSearch(q), 350);
        };
        F.title.onkeydown = e => {
          const items = $$('.suggest-item', sug);
          if (sug.hidden || !items.length) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items.forEach((x, i) => x.classList.toggle('on', i === activeIdx));
          } else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pick(activeIdx); }
          else if (e.key === 'Escape') { e.stopPropagation(); hideSug(); }
        };
        F.title.onblur = () => setTimeout(hideSug, 150);

        $('#saveBtn', m).onclick = async e => {
          e.preventDefault();
          const title = form.elements.title.value.trim();
          if (!title) { $('#titleErr', m).textContent = 'Gib einen Titel ein.'; form.elements.title.focus(); return; }
          const data = {
            type, title,
            status: form.elements.status.value,
            year: form.elements.year.value ? +form.elements.year.value : null,
            rating: +$('[data-stars]', m).dataset.value || 0,
            cover: form.elements.cover.value.trim(),
            notes: form.elements.notes.value.trim(),
          };
          if (type === 'game') {
            data.platform = form.elements.platform.value; data.genre = form.elements.genre.value;
            const ph = form.elements.playH.value.trim();
            data.playH = ph === '' ? null : Math.max(0, Math.round(+ph.replace(',', '.') * 10) / 10);
          }
          if (customCover) Object.assign(data, { cover: customCover, coverCustom: true, coverV: COVER_V, coverTried: true });
          data.released = released || null; // nur was im Formular steht (Jahr allein = kein genaues Datum)
          // „Fertig am“ setzt die App selbst: beim Status „Fertig“ das heutige Datum, beim Bearbeiten bleibt das alte
          if (!isEdit) data.finishedAt = data.status === 'done' ? new Date().toISOString() : null;
          if (type === 'manga') {
            data.chapters = form.elements.chapters.value !== '' ? +form.elements.chapters.value : null;
            data.chaptersRead = form.elements.chaptersRead.value !== '' ? +form.elements.chaptersRead.value : 0;
            if (data.chapters != null && data.chaptersRead > data.chapters) data.chapters = data.chaptersRead;
            if (isEdit && (item.chapters || 0) > (data.chapters || 0) && !form.elements.chapters.dataset.touched) data.chapters = item.chapters;
          }
          if (type === 'anime' && form.elements.episodes) { data.episodes = form.elements.episodes.value ? +form.elements.episodes.value : null; data.episodesSeen = form.elements.episodesSeen.value ? +form.elements.episodesSeen.value : null; }
          if (type === 'series' && form.elements.seasons) { data.seasons = form.elements.seasons.value ? +form.elements.seasons.value : null; data.seasonSeen = form.elements.seasonSeen.value ? +form.elements.seasonSeen.value : null; }
          if (fetched) {
            ['genres', 'runtime', 'summary', 'external', 'anilistId', 'mangadexId', 'mdStatus', 'lastUpload', 'kind', 'authors'].forEach(k => { if (fetched[k] != null && fetched[k] !== '') data[k] = fetched[k]; });
          }

          if (isEdit) {
            Store.update(item.id, data);
            close(); render(); toast(`<div><b>Gespeichert</b></div>`);
            return;
          }
          if (type === 'game') {
            if (trophyMode === 'steam') {
              const btn = $('#saveBtn', m);
              btn.textContent = 'Lade Erfolge…'; btn.disabled = true;
              try {
                const hit = await Steam.find(title);
                if (hit) {
                  const res = await Steam.achievementsFor(hit.appid);
                  if (res.achievements.length) Object.assign(data, Steam.patchFor({ ...data, coverTried: false }, hit.appid, res));
                  else { data.steamAppId = hit.appid; data.trophies = Trophies.generate(title, data.genre, 'normal'); data.trophySource = 'generated'; setTimeout(() => toast(`<div><b>Keine Steam-Erfolge</b><small>Dieses Spiel hat auf Steam keine Erfolge, Trophäen wurden erstellt</small></div>`), 400); }
                  if (res.playerError === 'profile_private') setTimeout(() => toast(`<div><b>Steam-Profil ist privat</b><small>Freigeschaltete Erfolge konnten nicht gelesen werden</small></div>`), 900);
                } else {
                  data.trophies = Trophies.generate(title, data.genre, 'normal'); data.trophySource = 'generated';
                  setTimeout(() => toast(`<div><b>Auf Steam nicht gefunden</b><small>Trophäen wurden automatisch erstellt</small></div>`), 400);
                }
              } catch (err) {
                btn.textContent = 'Hinzufügen'; btn.disabled = false;
                $('#titleErr', m).textContent = err.code === 'key_required' ? 'Dieses Gerät ist noch nicht mit deinem Schlüssel verbunden (Daten → Sync).' : err.code === 'key_rejected' ? 'Steam lehnt den API-Schlüssel ab. Prüfe ihn unter Daten → Steam.' : 'Steam ist gerade nicht erreichbar. Wähle eine andere Option.';
                return;
              }
            } else if (trophyMode === 'psn') {
              const btn = $('#saveBtn', m);
              btn.textContent = 'Lade Trophäen…'; btn.disabled = true;
              try {
                const r = await PSN.trophiesFor(title);
                if (r) {
                  data.trophies = r.trophies; data.trophySource = 'psn'; data.psnId = r.title.id; data.psnService = r.title.service;
                  Trophies.syncPlatinum(data.trophies);
                  if (data.trophies.find(t => t.tier === 'platinum')?.done) data.status = 'done';
                } else {
                  data.trophies = Trophies.generate(title, data.genre, 'normal'); data.trophySource = 'generated';
                  setTimeout(() => toast(`<div><b>Nicht im PlayStation-Verlauf gefunden</b><small>Trophäen wurden automatisch erstellt</small></div>`), 400);
                }
              } catch (err) {
                btn.textContent = 'Hinzufügen'; btn.disabled = false;
                $('#titleErr', m).textContent = err.code === 'expired' ? 'PlayStation-Anmeldung abgelaufen. Verbinde dich unter Daten neu.' : 'PlayStation nicht erreichbar. Wähle eine andere Option.';
                return;
              }
            } else if (trophyMode === 'auto') {
              const btn = $('#saveBtn', m);
              btn.textContent = 'Analysiere Spiel…'; btn.disabled = true;
              const r = await smartTrophies(title, data.genre, data.platform, form.elements.tsize?.value || 'normal');
              if (r.reason === 'key_required') {
                btn.textContent = 'Hinzufügen'; btn.disabled = false;
                $('#titleErr', m).textContent = 'Dieses Gerät ist noch nicht mit deinem Schlüssel verbunden. Verbinde es unter Daten → Sync.';
                return;
              }
              if (r.reason === 'ai_quota') {
                btn.textContent = 'Hinzufügen'; btn.disabled = false;
                renderTMode();
                $('#titleErr', m).textContent = 'Heute nicht mehr möglich: ' + aiQuotaText() + ' Wähle „Später“, um das Spiel ohne Trophäen anzulegen.';
                return;
              }
              data.trophies = r.trophies; data.trophySource = r.ai ? 'ai' : 'generated';
              if (!r.ai) setTimeout(() => toast(`<div><b>Genre-Vorlage verwendet</b><small>Die KI war gerade nicht erreichbar</small></div>`), 400);
            }
            else if (trophyMode === 'paste') {
              data.trophies = collectPreview($('#pastePreview', m), parsed);
              data.trophySource = 'imported';
              Trophies.syncPlatinum(data.trophies);
            }
          }
          if (type === 'series' && fetched?.seasonList?.length) {
            const doneUpTo = data.status === 'done' ? fetched.seasonList.length : (data.seasonSeen || 0);
            data.seasonList = fetched.seasonList.map((x, i) => ({ ...x, id: Store.uid(), seen: i < doneUpTo ? (x.episodes || 0) : 0, complete: i < doneUpTo }));
            Object.assign(data, seasonTotals(data.seasonList), { seasons: data.seasonList.length, seasonSeen: Math.min(doneUpTo, data.seasonList.length) });
          }
          if (type === 'anime' && fetched?.anilistId && fetched.format === 'MOVIE') {
            const btn = $('#saveBtn', m);
            btn.textContent = 'Suche passende Reihe…'; btn.disabled = true;
            let related = [];
            try { related = await Lookup.animeRelatedIds(fetched.anilistId); } catch {}
            const hit = findAnimeFor({ anilistId: fetched.anilistId, relatedIds: related, title: data.title });
            if (hit) {
              if (!hit.already) {
                const seen = data.status === 'done' || (data.episodesSeen || 0) > 0;
                attachMovies(hit.item, [{ anilistId: fetched.anilistId, title: data.title, episodes: fetched.episodes || 1, seen: seen ? (fetched.episodes || 1) : 0, complete: seen, year: data.year, cover: data.cover }]);
              }
              close();
              location.hash = `#/item/${hit.item.id}`;
              toast(hit.already ? `<div><b>Schon vorhanden</b><small>${esc(data.title)} ist bei ${esc(hit.item.title)} dabei</small></div>` : `<div><b>Film hinzugefügt</b><small>bei ${esc(hit.item.title)}</small></div>`);
              return;
            }
            btn.textContent = 'Hinzufügen'; btn.disabled = false;
          }
          if (type === 'anime' && fetched?.anilistId) {
            const btn = $('#saveBtn', m);
            btn.textContent = 'Lade Staffeln…'; btn.disabled = true;
            try {
              const list = await Lookup.animeSeasons(fetched.anilistId);
              if (list.length) {
                data.seasonList = list.map(x => ({ ...x, id: Store.uid(), seen: 0 }));
                distributeSeen(data.seasonList.filter(x => x.format !== 'MOVIE'), data.episodesSeen || 0, data.status === 'done');
                Object.assign(data, seasonTotals(data.seasonList));
                const base = data.seasonList[0];
                if (data.seasonList.length > 1 && base.anilistId !== fetched.anilistId) {
                  data.title = base.title || data.title; data.year = base.year || data.year;
                  if (base.cover) data.cover = base.cover;
                  data.anilistId = base.anilistId; data.external = `anilist:${base.anilistId}`; delete data.released;
                }
              }
            } catch {}
          }
          const created = Store.add(data);
          // Neues Spiel: sofort nach einem Hochformat-Cover suchen (Steam-Bibliothek zuerst, dann Wikipedia)
          if (type === 'game' && (created.coverV || 0) < COVER_V) queueCover(created.id);
          close();
          if (['anime', 'series'].includes(type)) setTimeout(() => EpisodeWatch.check({ force: true, ids: [created.id] }).then(() => render()), 400);
          location.hash = `#/item/${created.id}`;
          toast(`<div class="tbadge" style="color:var(--lilac)">${typeIcon(type).replace('<svg', '<svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8"')}</div><div><b>${esc(title)}</b><small>wurde hinzugefügt</small></div>`);
        };
      },
    });
  }

  function renderPreview(el, list) {
    if (!el) return;
    if (!list.length) { el.innerHTML = ''; return; }
    const earned = list.filter(t => t.done).length;
    el.innerHTML = `<div class="tiny" style="margin-top:12px">${list.length} Trophäen erkannt${earned ? ` · ${earned} davon schon verdient` : ''}. Prüfe die Stufen und entferne, was nicht dazugehört.</div>
      <div class="preview-list">${list.map((t, i) => `
        <div class="preview-row" data-i="${i}">
          <select class="input">${Trophies.ORDER.map(k => `<option value="${k}" ${k === t.tier ? 'selected' : ''}>${Trophies.TIERS[k].label}</option>`).join('')}<option value="__skip">Weglassen</option></select>
          <div><div class="pn">${esc(t.name)}${t.done ? ' <span class="tier-tag tt-platinum">verdient</span>' : ''}</div>${t.desc ? `<div class="pd">${esc(t.desc)}</div>` : ''}</div>
        </div>`).join('')}</div>`;
  }
  function collectPreview(el, list) {
    if (!el) return [];
    return $$('.preview-row', el).map(r => {
      const t = list[+r.dataset.i];
      const tier = $('select', r).value;
      if (tier === '__skip') return null;
      return { id: t.id, name: t.name, desc: t.desc, tier, rarity: t.rarity, done: !!t.done, doneAt: t.done ? new Date().toISOString() : null };
    }).filter(Boolean);
  }

  /* ---------- Trophäen-Modals ---------- */
  function trophyEdit(game, trophy = null) {
    const t = trophy || { tier: 'bronze', name: '', desc: '' };
    openModal({
      title: trophy ? 'Trophäe bearbeiten' : 'Eigene Trophäe',
      body: `<form class="form" id="tf" novalidate>
        <div class="field"><label>Name</label><input class="input" name="name" value="${esc(t.name)}" placeholder="Glückspilz"><div class="field-error" id="tErr"></div></div>
        <div class="field"><label>Beschreibung</label><input class="input" name="desc" value="${esc(t.desc)}" placeholder="Was musst du dafür tun?"></div>
        <div class="field"><label>Stufe</label><div class="seg" id="tierSeg">${Trophies.ORDER.slice().reverse().map(k => `<button type="button" data-t="${k}" class="${k === t.tier ? 'on' : ''}" style="color:${Trophies.TIERS[k].color}">${Trophies.TIERS[k].label}</button>`).join('')}</div></div>
        ${t.tier === 'platinum' || !trophy ? '<p class="tiny" style="margin:0">Platin wird automatisch verdient, sobald alle anderen Trophäen abgehakt sind.</p>' : ''}
      </form>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="tSave">Speichern</button>`,
      onMount: (m, close) => {
        let tier = t.tier;
        $$('#tierSeg button', m).forEach(b => b.onclick = () => { tier = b.dataset.t; $$('#tierSeg button', m).forEach(x => x.classList.toggle('on', x === b)); });
        const f = $('#tf', m);
        f.elements.name.oninput = () => $('#tErr', m).textContent = '';
        $('#tSave', m).onclick = () => {
          const name = f.elements.name.value.trim();
          if (!name) { $('#tErr', m).textContent = 'Gib einen Namen ein.'; f.elements.name.focus(); return; }
          const list = game.trophies || [];
          if (tier === 'platinum' && list.some(x => x.tier === 'platinum' && x.id !== t.id)) {
            $('#tErr', m).textContent = 'Dieses Spiel hat schon eine Platin-Trophäe.'; return;
          }
          if (trophy) Object.assign(trophy, { name, desc: f.elements.desc.value.trim(), tier });
          else list.push({ id: Store.uid(), name, desc: f.elements.desc.value.trim(), tier, done: false });
          Trophies.syncPlatinum(list);
          Store.update(game.id, { trophies: list, trophySource: game.trophySource === 'generated' ? 'custom' : (game.trophySource || 'custom') });
          close(); render();
        };
      },
    });
  }

  function trophyImport(game) {
    let parsed = [];
    openModal({
      title: 'Trophäenliste einfügen', wide: true,
      body: `<div class="hint-box">${I.paste}<div>Füge die Liste ein, z. B. von PSNProfiles, Exophase oder Steam. Eigenes Format: <code>Name | Beschreibung | Gold</code> pro Zeile.</div></div>
        <textarea class="input" id="pasteBox" style="margin-top:12px;min-height:160px;font-size:13px" placeholder="Trophäenliste hier einfügen"></textarea>
        <div class="field" style="margin-top:12px"><label>Bestehende Trophäen</label>
          <div class="seg" id="impMode"><button type="button" data-m="replace" class="on">Ersetzen</button><button type="button" data-m="append">Ergänzen</button></div></div>
        <div id="pastePreview"></div><div class="field-error" id="impErr" style="margin-top:8px"></div>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="impBtn">Übernehmen</button>`,
      onMount: (m, close) => {
        let mode = 'replace';
        $$('#impMode button', m).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#impMode button', m).forEach(x => x.classList.toggle('on', x === b)); });
        $('#pasteBox', m).oninput = e => { $('#impErr', m).textContent = ''; parsed = Trophies.parse(e.target.value); renderPreview($('#pastePreview', m), parsed); };
        $('#impBtn', m).onclick = () => {
          const items = collectPreview($('#pastePreview', m), parsed);
          if (!items.length) { $('#impErr', m).textContent = 'Füge zuerst eine Liste ein.'; return; }
          let list = mode === 'replace' ? items : [...(game.trophies || []), ...items];
          if (mode === 'append' && items.some(t => t.tier === 'platinum') && (game.trophies || []).some(t => t.tier === 'platinum')) {
            list = list.filter((t, i, a) => t.tier !== 'platinum' || a.findIndex(x => x.tier === 'platinum') === i);
          }
          Trophies.syncPlatinum(list);
          Store.update(game.id, { trophies: list, trophySource: 'imported' });
          close(); render(); toast(`<div><b>${items.length} Trophäen übernommen</b></div>`);
        };
      },
    });
  }

  const AI_KEY = 'nightshelf.aiQuota';
  const utcDay = () => new Date().toISOString().slice(0, 10);
  const aiBlockedToday = () => { try { return localStorage.getItem(AI_KEY) === utcDay(); } catch { return false; } };
  function aiResetTime() {
    const d = new Date(); d.setUTCHours(24, 0, 0, 0);
    return d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  }
  const aiQuotaText = () => `Die KI-Trophäen sind für heute aufgebraucht. Ab ${aiResetTime()} Uhr geht es wieder.`;

  /* ---------- Sync zwischen Geräten ---------- */
  function syncLine(st) {
    const when = st.lastSync ? new Date(st.lastSync).toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' }) : null;
    if (st.status === 'syncing' || st.status === 'pending') return '<span class="sync-dot busy"></span>Synchronisiere…';
    if (st.status === 'error') return `<span class="sync-dot err"></span>${{ network: 'Server nicht erreichbar, nächster Versuch beim nächsten Speichern', key_required: 'Schlüssel ungültig, bitte neu verbinden', too_large: 'Deine Daten sind zu groß für den Speicher' }[st.error] || 'Sync fehlgeschlagen'}`;
    return `<span class="sync-dot"></span>${when ? `Zuletzt synchronisiert: ${when}` : 'Verbunden'}`;
  }
  function renderSyncPanel() {
    const el = $('#syncPanel'); if (!el) return;
    const st = Sync.status();
    if (Sync.enabled()) {
      el.innerHTML = `<h3>Sync zwischen Geräten</h3>
        <p>Dieses Gerät ist verbunden. Änderungen werden automatisch gespeichert und auf deinen anderen Geräten übernommen.</p>
        <div class="tiny sync-line" id="syncLine">${syncLine(st)}</div>
        <div class="field" style="margin-top:14px"><label>Dein Schlüssel</label>
          <div class="key-row"><input class="input mono" id="syncKey" type="password" value="${esc(st.key)}" readonly><button class="btn" id="syncShow">Anzeigen</button><button class="btn" id="syncCopy">${I.copy || ''}Kopieren</button></div>
          <div class="tiny">Gib diesen Schlüssel auf deinen anderen Geräten ein. Bewahre ihn gut auf, ohne ihn kommst du nicht an deine Daten.</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-primary" id="syncNow">${I.refresh} Jetzt synchronisieren</button><button class="btn btn-ghost btn-danger" id="syncOff">Auf diesem Gerät trennen</button></div>`;
      $('#syncShow').onclick = () => { const i = $('#syncKey'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; $('#syncShow').textContent = show ? 'Verbergen' : 'Anzeigen'; };
      $('#syncCopy').onclick = async () => { try { await navigator.clipboard.writeText(st.key); toast('<div><b>Schlüssel kopiert</b></div>'); } catch { $('#syncKey').type = 'text'; $('#syncKey').select(); } };
      $('#syncNow').onclick = () => Sync.syncNow();
      $('#syncOff').onclick = () => confirmDialog('Dieses Gerät synchronisiert dann nicht mehr. Deine Daten bleiben hier und auf dem Server erhalten.', 'Trennen', () => { Sync.disconnect(); renderSyncPanel(); });
      return;
    }
    el.innerHTML = `<h3>Sync zwischen Geräten</h3>
      <p>Speichere deine Spiele, Serien, Anime, Filme und Trophäen auf deinem Cloudflare-Server, dann sind sie auf PC und Handy gleich. Ein persönlicher Schlüssel schützt deine Daten und deinen Server.</p>
      <div class="sync-options">
        <div class="sync-opt"><b>Erstes Gerät</b><span class="tiny">Richte den Sync auf dem Gerät mit deinen meisten Daten ein. Du bekommst einen Schlüssel.</span><button class="btn btn-primary" id="syncSetup">Sync einrichten</button></div>
        <div class="sync-opt"><b>Weiteres Gerät</b><span class="tiny">Gib den Schlüssel ein, den du auf deinem ersten Gerät bekommen hast.</span>
          <div class="key-row"><input class="input mono" id="syncIn" placeholder="ABCD-EFGH-…" autocomplete="off" spellcheck="false"><button class="btn" id="syncJoin">Verbinden</button></div></div>
      </div>
      <div class="field-error" id="syncErr" style="margin-top:10px"></div>`;
    const err = msg => { $('#syncErr').textContent = msg; };
    $('#syncIn').oninput = () => err('');
    $('#syncSetup').onclick = async () => {
      const b = $('#syncSetup'); b.disabled = true; b.textContent = 'Richte ein…'; err('');
      try { await Sync.setup(); renderSyncPanel(); $('#syncKey').type = 'text'; toast('<div><b>Sync eingerichtet</b><small>Notiere dir deinen Schlüssel</small></div>'); render(); }
      catch (e) { b.disabled = false; b.textContent = 'Sync einrichten'; err(e.code === 'already_claimed' ? 'Auf deinem Server ist schon ein Schlüssel eingerichtet. Gib ihn bei „Weiteres Gerät“ ein.' : e.code === 'network' ? 'Server nicht erreichbar. Versuch es gleich nochmal.' : 'Einrichten hat nicht geklappt.'); }
    };
    $('#syncJoin').onclick = async () => {
      const v = $('#syncIn').value.trim();
      if (!v) { err('Gib deinen Schlüssel ein.'); return; }
      const b = $('#syncJoin'); b.disabled = true; b.textContent = 'Verbinde…';
      try { await Sync.connect(v); renderSyncPanel(); toast('<div><b>Gerät verbunden</b><small>Deine Daten wurden zusammengeführt</small></div>'); render(); }
      catch (e) { b.disabled = false; b.textContent = 'Verbinden'; err(e.code === 'key_wrong' ? 'Dieser Schlüssel passt nicht. Prüfe ihn auf deinem ersten Gerät.' : e.code === 'not_claimed' ? 'Auf dem Server ist noch kein Sync eingerichtet. Nimm „Sync einrichten“.' : 'Verbinden hat nicht geklappt. Versuch es gleich nochmal.'); }
    };
  }
  Sync.onChange(st => { const l = $('#syncLine'); if (l) l.innerHTML = syncLine(st); });
  window.addEventListener('nightshelf:synced', () => { if (!$('#modalRoot').classList.contains('open')) render(); });


  /* ---------- App installieren & Benachrichtigungen ---------- */
  async function renderAppPanel() {
    const el = $('#appPanel'); if (!el) return;
    const st = Pwa.installState();
    const install = {
      installed: `<div class="key-ok">${I.check} Nightshelf läuft hier als App</div>`,
      prompt: `<button class="btn btn-primary" id="appInstall">${I.install} Nightshelf installieren</button><div class="tiny" style="margin-top:8px">${Pwa.isMobile ? 'Die App landet auf deinem Startbildschirm.' : 'Die App bekommt ein eigenes Fenster, einen Eintrag im Startmenü bzw. Dock und ein Symbol in der Taskleiste.'}</div>`,
      ios: `<ol class="app-steps"><li>Tippe in Safari unten auf <b>Teilen</b> (Quadrat mit Pfeil).</li><li>Wähle <b>Zum Home-Bildschirm</b>.</li><li>Öffne Nightshelf ab jetzt über das neue Symbol.</li></ol>`,
      'mac-safari': `<ol class="app-steps"><li>Klicke in Safari in der Menüleiste auf <b>Ablage</b>.</li><li>Wähle <b>Zum Dock hinzufügen</b>.</li></ol><div class="tiny">In Chrome oder Edge geht es mit einem Klick auf das Installieren-Symbol in der Adressleiste.</div>`,
      firefox: `<div class="tiny">Firefox kann Web-Apps am Desktop nicht installieren. Öffne Nightshelf in <b>Chrome</b> oder <b>Edge</b> und klick in der Adressleiste auf das Installieren-Symbol.</div>`,
      'android-firefox': `<ol class="app-steps"><li>Tippe oben rechts auf das Menü (⋮).</li><li>Wähle <b>Installieren</b> bzw. <b>Zum Startbildschirm hinzufügen</b>.</li></ol>`,
      manual: `<ol class="app-steps"><li>Klicke in der Adressleiste rechts auf das <b>Installieren</b>-Symbol, oder öffne das Browser-Menü.</li><li>Wähle <b>App installieren</b> bzw. <b>Nightshelf installieren</b>.</li></ol>`,
    }[st];
    let push;
    const sub = await Pwa.subscription().catch(() => null);
    if (!Pwa.pushSupported()) push = Pwa.isIOS && !Pwa.standalone()
      ? `<div class="tiny">Auf iPhone und iPad gehen Benachrichtigungen nur, wenn Nightshelf zum Home-Bildschirm hinzugefügt ist (Anleitung oben). Öffne danach die App und schalte sie hier ein.</div>`
      : `<div class="tiny">Dieser Browser kann keine Benachrichtigungen empfangen.</div>`;
    else if (!Sync.enabled()) push = `<div class="tiny">Dafür muss dieses Gerät mit deinem Sync verbunden sein (oben), weil dein Server deine Liste kennen muss, um nach Neuem zu suchen.</div>`;
    else if (sub && Notification.permission === 'granted') push = `<div class="key-ok">${I.bell} An auf diesem Gerät</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" id="pushTest">Test senden</button><button class="btn btn-ghost btn-danger" id="pushOff">Ausschalten</button></div>`;
    else if (Notification.permission === 'denied') push = `<div class="tiny" style="color:var(--danger)">Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Browser-Einstellungen (Schloss-Symbol in der Adressleiste) und lade die Seite neu.</div>`;
    else push = `<button class="btn btn-primary" id="pushOn">${I.bell} Benachrichtigungen einschalten</button>`;
    el.innerHTML = `<h3>App & Benachrichtigungen</h3>
      <p>Installiere Nightshelf als App auf dem Handy und am PC oder Mac. Sie startet wie ein eigenes Programm und funktioniert auch offline mit deinen gespeicherten Daten.</p>
      <div class="field"><label>Als App installieren</label>${install}</div>
      <div class="field" style="margin-top:16px"><label>Benachrichtigungen</label>
        <div class="tiny" style="margin-bottom:10px">Dein Server schaut alle 30 Minuten nach neuen Folgen, Staffeln und Manga-Kapiteln und schickt dir eine Nachricht, auch wenn Nightshelf geschlossen ist. Gemeldet wird alles mit Status „Am Schauen“, „Am Lesen“, „Pausiert“ oder „Fertig“, nicht Merkliste und Abgebrochen. Für Anime nutzt der Server die Sendetermine, die Nightshelf beim Öffnen lädt; sie reichen etwa sechs Wochen im Voraus.</div>
        ${push}<div class="field-error" id="pushErr" style="margin-top:8px"></div></div>`;
    const err = m => { $('#pushErr').textContent = m; };
    $('#appInstall') && ($('#appInstall').onclick = async () => { await Pwa.install(); renderAppPanel(); });
    $('#pushOn') && ($('#pushOn').onclick = async () => {
      const b = $('#pushOn'); b.disabled = true; b.textContent = 'Schalte ein…'; err('');
      try { await Pwa.enablePush(); toast(`<div><b>Benachrichtigungen an</b><small>Du hörst von uns, sobald etwas Neues erscheint</small></div>`); renderAppPanel(); }
      catch (e) {
        b.disabled = false; b.innerHTML = `${I.bell} Benachrichtigungen einschalten`;
        err({ denied: 'Du hast Benachrichtigungen nicht erlaubt. Erlaube sie in den Browser-Einstellungen und versuch es nochmal.', sync_required: 'Verbinde dieses Gerät zuerst mit deinem Sync.', key_required: 'Dein Schlüssel passt nicht mehr. Verbinde das Gerät neu.', ios_install: 'Füge Nightshelf zuerst zum Home-Bildschirm hinzu.' }[e.code] || 'Einschalten hat nicht geklappt. Prüf deine Verbindung und versuch es nochmal.');
      }
    });
    $('#pushOff') && ($('#pushOff').onclick = async () => { await Pwa.disablePush(); toast('<div><b>Benachrichtigungen aus</b><small>auf diesem Gerät</small></div>'); renderAppPanel(); });
    $('#pushTest') && ($('#pushTest').onclick = async () => {
      const b = $('#pushTest'); b.disabled = true; b.textContent = 'Sende…'; err('');
      try { const r = await Pwa.testPush(); if (!r.sent) err('Der Server kennt dieses Gerät nicht mehr. Schalte die Benachrichtigungen aus und wieder ein.'); }
      catch { err('Test hat nicht geklappt. Versuch es gleich nochmal.'); }
      b.disabled = false; b.textContent = 'Test senden';
    });
  }
  Pwa.onChange(() => { renderAppPanel(); renderInstallSlot(); });
  function renderInstallSlot() {
    const el = $('#installSlot'); if (!el) return;
    el.innerHTML = Pwa.installState() === 'prompt' ? `<button class="btn btn-sm install-btn" id="sideInstall">${I.install} App installieren</button>` : '';
    $('#sideInstall') && ($('#sideInstall').onclick = () => Pwa.install());
  }

  async function renderAiPanel() {
    const el = $('#aiPanel'); if (!el) return;
    el.innerHTML = `<h3>KI-Trophäen</h3><p style="margin:0">Lade dein Kontingent für heute…</p>`;
    let u;
    try {
      const r = await fetch(`${PSN.worker()}/ai-usage`, { headers: Sync.header() });
      u = await r.json();
      if (!r.ok) throw new Error(u.error);
    } catch {
      if ($('#aiPanel')) $('#aiPanel').innerHTML = `<h3>KI-Trophäen</h3><p style="margin:0">Das Kontingent konnte gerade nicht geladen werden.</p>`;
      return;
    }
    if (!$('#aiPanel')) return;
    if (u.full) { try { localStorage.setItem(AI_KEY, utcDay()); } catch {} }
    const pct = Math.min(100, Math.round(u.used / u.limit * 100));
    const avg = u.avg || 250;
    const games = u.full ? 0 : Math.max(0, Math.floor(u.remaining / avg));
    const reset = new Date(u.resetAt).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
    $('#aiPanel').innerHTML = `<h3>KI-Trophäen</h3>
      <p>Gratis-Kontingent bei Cloudflare für heute. Es wird jeden Tag um ${reset} Uhr wieder aufgefüllt.</p>
      <div class="quota-row">
        <div><div class="quota-big">${u.full ? 0 : u.remaining.toLocaleString('de-AT')}</div><div class="tiny">von ${u.limit.toLocaleString('de-AT')} Neurons übrig</div></div>
        <div style="text-align:right"><div class="quota-big" style="color:${games ? 'var(--cyan)' : 'var(--danger)'}">≈ ${games}</div><div class="tiny">Spiele heute noch möglich</div></div>
      </div>
      <div class="bar quota-bar ${pct >= 90 ? 'low' : ''}" style="margin-top:12px"><i style="width:${u.full ? 100 : pct}%"></i></div>
      <div class="tiny" style="margin-top:8px">${u.full ? 'Heute aufgebraucht.' : `Heute ${u.runs} ${u.runs === 1 ? 'Liste' : 'Listen'} erstellt, im Schnitt ${avg} Neurons pro Spiel.`} Die Zahlen sind aus den Token-Mengen berechnet und können leicht von Cloudflares Abrechnung abweichen.</div>`;
  }

  async function smartTrophies(title, genre, platform, size = 'normal') {
    if (aiBlockedToday()) return { trophies: null, ai: false, reason: 'ai_quota' };
    try {
      const res = await fetch(`${PSN.worker()}/achievements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...Sync.header() },
        body: JSON.stringify({ title, genre: Trophies.GENRES[genre] || '', platform: platform || '', size }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.trophies) || !data.trophies.length) throw Object.assign(new Error(data.error || 'ai'), { code: data.error });
      const trophies = data.trophies.map(t => ({ id: Store.uid(), name: t.name, desc: t.desc || '', tier: Trophies.TIERS[t.tier] ? t.tier : 'bronze', done: false }));
      const rank = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
      trophies.sort((a, b) => rank[a.tier] - rank[b.tier]);
      return { trophies, ai: true };
    } catch (e) {
      if (e.code === 'ai_quota') { try { localStorage.setItem(AI_KEY, utcDay()); } catch {} return { trophies: null, ai: false, reason: 'ai_quota' }; }
      if (e.code === 'key_required') return { trophies: null, ai: false, reason: 'key_required' };
      return { trophies: Trophies.generate(title, genre, size), ai: false, reason: e.code };
    }
  }

  function trophyGenerate(game) {
    openModal({
      title: 'Trophäen erstellen',
      body: `<div class="form">
        <div class="hint-box">${I.sparkle}<div>Erstellt eine neue Liste für ${esc(game.title)}. Deine bisherigen Trophäen werden dabei ersetzt.</div></div>
        <div class="field"><label>Art</label><div class="seg" id="gMode"><button type="button" data-m="ai" class="${aiBlockedToday() ? '' : 'on'}">Passend zum Spiel (KI)</button><button type="button" data-m="genre" class="${aiBlockedToday() ? 'on' : ''}">Genre-Vorlage</button></div></div>
        ${aiBlockedToday() ? `<div class="hint-box quota">${I.info}<div><b>Heute nicht mehr möglich.</b> ${aiQuotaText()}</div></div>` : ''}
        <div class="grid-2">
          <div class="field"><label>Genre</label><select class="input" id="gGenre">${Object.entries(Trophies.GENRES).map(([k, v]) => `<option value="${k}" ${k === game.genre ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Umfang</label><select class="input" id="gSize"><option value="short">Kurz</option><option value="normal" selected>Normal</option><option value="long">Umfangreich</option></select></div>
        </div><div class="field-error" id="gErr"></div></div>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="gBtn">${I.sparkle} Erstellen</button>`,
      onMount: (m, close) => {
        let mode = aiBlockedToday() ? 'genre' : 'ai';
        $$('#gMode button', m).forEach(b => b.onclick = () => { mode = b.dataset.m; $('#gErr', m).textContent = ''; $$('#gMode button', m).forEach(x => x.classList.toggle('on', x === b)); });
        $('#gBtn', m).onclick = async () => {
          const genre = $('#gGenre', m).value, size = $('#gSize', m).value;
          if (mode === 'genre') {
            Store.update(game.id, { genre, trophies: Trophies.generate(game.title, genre, size), trophySource: 'generated' });
            close(); render(); return;
          }
          const b = $('#gBtn', m); b.disabled = true; b.textContent = 'Analysiere Spiel…';
          const r = await smartTrophies(game.title, genre, game.platform, size);
          if (!r.ai) {
            b.disabled = false; b.innerHTML = `${I.sparkle} Erstellen`;
            $('#gErr', m).textContent = r.reason === 'key_required' ? 'Dieses Gerät ist noch nicht mit deinem Schlüssel verbunden. Verbinde es unter Daten → Sync.' : r.reason === 'ai_quota' ? 'Heute nicht mehr möglich: ' + aiQuotaText() : 'Die KI war gerade nicht erreichbar. Versuch es nochmal oder nimm die Genre-Vorlage.';
            return;
          }
          Store.update(game.id, { genre, trophies: r.trophies, trophySource: 'ai' });
          close(); render(); toast(`<div><b>${r.trophies.length} Trophäen erstellt</b><small>passend zu ${esc(game.title)}</small></div>`);
        };
      },
    });
  }

  /* ---------- Views ---------- */
  function emptyState(type) {
    const txt = {
      game: ['Deine Spielesammlung wartet', 'Füge dein erstes Spiel hinzu und hake Trophäen ab.'],
      series: ['Noch keine Serien', 'Halte fest, welche Serien du gesehen hast oder gerade schaust.'],
      manga: ['Noch keine Manga', 'Füge Manga hinzu. Die aktuelle Kapitelzahl hält Nightshelf automatisch auf dem neuesten Stand.'],
      anime: ['Noch keine Anime', 'Füge Anime hinzu. Staffeln werden automatisch von AniList geladen.'],
      movie: ['Noch keine Filme', 'Sammle alle Filme, die du gesehen hast, mit Bewertung.'],
    }[type];
    return `<div class="empty ${A()}"><div class="empty-icon">${typeIcon(type)}</div><h3>${txt[0]}</h3><p>${txt[1]}</p>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" data-add="${type}">${I.plus} ${TYPES[type].label} hinzufügen</button>${type === 'anime' ? `<button class="btn" data-lcimport>${I.paste} LiveChart-Liste einfügen</button>` : ''}</div></div>`;
  }

  /* Spielzeit: eigene Angabe gilt vor automatischer (Steam/PlayStation) */
  const hoursOf = it => it.playH != null ? it.playH : it.playMin != null ? it.playMin / 60 : null;
  const fmtHours = h => h == null ? '' : h > 0 && h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${Math.round(h).toLocaleString('de-AT')} h`;
  const PLAY_SRC = { steam: 'Steam', psn: 'PlayStation' };

  /* Zustand einer Karte: noch nicht erschienen hat Vorrang, sonst der Status */
  function releaseInfo(item) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const future = d => d && /^\d{4}-\d{2}-\d{2}/.test(d) && Date.parse(d.slice(0, 10) + 'T00:00:00') > today.getTime();
    if (['game', 'movie'].includes(item.type) && future(item.released)) return { date: item.released.slice(0, 10) };
    if (['anime', 'series'].includes(item.type) && item.seasonList?.length) {
      const shows = item.seasonList.filter(x => x.format !== 'MOVIE');
      if (shows.length && shows.every(x => x.airing === 'NOT_YET_RELEASED' || (x.aired === 0 && !x.seen))) {
        const x = shows[0];
        return { date: x.nextAt ? x.nextAt.slice(0, 10) : x.start || (future(item.released) ? item.released.slice(0, 10) : null) };
      }
    }
    if (!item.released && item.year && item.year > today.getFullYear() && item.type !== 'manga') return { year: item.year };
    return null;
  }
  function releaseLabel(r) {
    if (r.year) return `Erscheint ${r.year}`;
    if (!r.date) return 'Bald';
    const d = new Date(r.date + 'T00:00:00');
    const days = Math.round((d - new Date(new Date().toDateString())) / 86400000);
    if (days === 1) return 'Morgen';
    if (days < 7) return `In ${days} Tagen`;
    return d.toLocaleDateString('de-AT', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  }
  // Fortschritt 0..1 für laufende Einträge (Folgen, Kapitel)
  function mediaProgress(item) {
    if (['anime', 'series'].includes(item.type) && item.seasonList?.length) {
      const shows = item.seasonList.filter(x => x.format !== 'MOVIE');
      const total = shows.reduce((a, x) => a + (released(x) || 0), 0);
      const seen = shows.reduce((a, x) => a + Math.min(x.seen || 0, released(x) || x.seen || 0), 0);
      return total ? seen / total : null;
    }
    if (item.type === 'anime' && item.episodes) return (item.episodesSeen || 0) / item.episodes;
    if (item.type === 'manga' && item.chapters) return Math.min(1, (item.chaptersRead || 0) / item.chapters);
    return null;
  }
  const STATE_BADGE = {
    done: ['check', 'Fertig'], active: ['play', 'Läuft'], paused: ['pause', 'Pausiert'], planned: ['bookmark', 'Merkliste'], dropped: ['x', 'Abgebrochen'],
  };

  function cardHTML(item) {
    const meta = [];
    if (item.type === 'game' && item.platform) meta.push(esc(item.platform));
    if (item.type === 'series' && item.seasons) meta.push(`${item.seasonSeen || 0}/${item.seasons} ${item.seasons === 1 ? 'Staffel' : 'Staffeln'}`);
    if (['anime', 'series'].includes(item.type) && item.seasonList?.length > 1 && item.seasonList.some(x => x.episodes)) { const cur = currentSeason(item); meta.length = 0; meta.push(`${cur.label} · ${seasonDone(cur) ? '✓' : `${cur.seen || 0}/${cur.episodes || '?'}`}`); }
    else if (item.type === 'anime' && (item.episodes || item.episodesSeen)) meta.push(`${item.episodesSeen || 0}/${item.episodes || '?'} Folgen`);
    if (item.type === 'manga' && (item.chapters || item.chaptersRead)) meta.push(`Kap. ${fmtCh(item.chaptersRead || 0)}/${item.chapters ? fmtCh(item.chapters) : '?'}`);
    if (item.year) meta.push(item.year);
    let extra = '';
    if (item.type === 'game' && item.trophies?.length) {
      const p = Trophies.progress(item.trophies);
      const plat = item.trophies.find(t => t.tier === 'platinum' && t.done);
      extra = `<div class="cover-progress"><i style="width:${Math.round(p.done / p.total * 100)}%"></i></div>${plat ? `<div class="cover-plat" title="Platin">${Trophies.icon('platinum', 15)}</div>` : ''}`;
    }
    const behind = newCount(item);
    if (behind > 0 && ['active', 'paused', 'done'].includes(item.status)) extra += `<div class="cover-new" title="${behind} ${item.type === 'manga' ? 'ungelesene Kapitel' : 'neue Folgen'}">+${behind > 99 ? '99' : fmtCh(behind)}</div>`;
    const rel = releaseInfo(item);
    const state = rel ? 'upcoming' : item.status;
    if (rel) extra += `<div class="cover-release">${I.calendar}<span>${esc(releaseLabel(rel))}</span></div>`;
    else if (item.type === 'game' && hoursOf(item) > 0) extra += `<div class="cover-hrs" title="Spielzeit">${I.clock}${fmtHours(hoursOf(item))}</div>`;
    else {
      const b = STATE_BADGE[item.status];
      if (b) extra += `<div class="cover-state" title="${esc(statusLabel(item))}">${I[b[0]]}</div>`;
      if (item.type !== 'game' && ['active', 'paused'].includes(item.status)) {
        const pr = mediaProgress(item);
        if (pr != null) extra += `<div class="cover-progress"><i style="width:${Math.round(Math.min(1, pr) * 100)}%"></i></div>`;
      }
    }
    return `<a class="card cs-${state} ${A()}" href="#/item/${item.id}">
      <div class="cover">${coverHTML(item)}${item.type === 'game' && item.platform ? `<span class="cover-tag">${esc(item.platform)}</span>` : ''}${extra}</div>
      <div><div class="card-title">${esc(item.title)}</div>
      <div class="card-meta">${meta.join('<span class="dot"></span>')}${item.rating ? `${meta.length ? '<span class="dot"></span>' : ''}<span class="stars-mini">${'★'.repeat(item.rating)}</span>` : ''}</div></div>
    </a>`;
  }

  const libState = { game: { q: '', status: 'all', fam: 'all', platform: 'all', sort: 'added' }, series: { q: '', status: 'all', sort: 'added' }, movie: { q: '', status: 'all', sort: 'added' }, anime: { q: '', status: 'all', sort: 'added' }, manga: { q: '', status: 'all', sort: 'added' } };
  // Sortierung und Filter merken (auch nach Neuladen); die Suche startet immer leer
  const LIB_KEY = 'nightshelf.libState';
  try { const saved = JSON.parse(localStorage.getItem(LIB_KEY) || '{}'); Object.keys(libState).forEach(t => { if (saved[t]) Object.assign(libState[t], saved[t], { q: '' }); }); } catch {}
  const saveLib = () => { try { localStorage.setItem(LIB_KEY, JSON.stringify(Object.fromEntries(Object.entries(libState).map(([t, v]) => [t, { ...v, q: '' }])))); } catch {} };

  function viewLibrary(type) {
    const s = libState[type];
    const items = Store.all(type);
    const head = `<div class="page-head"><div><h1 class="page-title">${TYPES[type].plural}</h1><p class="page-sub">${items.length} ${items.length === 1 ? 'Eintrag' : 'Einträge'}</p></div>
      <div class="head-actions" style="display:flex;gap:8px;flex-wrap:wrap">${type === 'game' && PSN.connected() ? `<button class="btn" data-psnsync>${I.refresh} PlayStation sync</button>` : ''}${type === 'game' && Steam.connected() && Steam.hasProfile() ? `<button class="btn" data-steamsync>${I.refresh} Steam sync</button>` : ''}${type === 'anime' ? `<button class="btn" data-lcimport>${I.paste} LiveChart-Liste einfügen</button>` : ''}${type === 'manga' && items.length ? `<button class="btn" data-mangacheck>${I.refresh} Neue Kapitel prüfen</button>` : ''}${['anime', 'series'].includes(type) && items.length ? `<button class="btn" data-aircheck>${I.refresh} Neue Folgen prüfen</button>` : ''}<button class="btn btn-primary fab" data-add="${type}" aria-label="${TYPES[type].label} hinzufügen">${I.plus}<span>${TYPES[type].label} hinzufügen</span></button></div></div>`;
    if (!items.length) { view.innerHTML = head + emptyState(type); return; }

    const platforms = type === 'game' ? [...new Set(items.map(i => i.platform).filter(Boolean))] : [];
    view.innerHTML = head + `
      <div class="toolbar">
        <div class="search">${I.search}<input class="input" id="q" placeholder="Suchen" value="${esc(s.q)}"></div>
        <div class="chips" id="statusChips">
          <button class="chip ${s.status === 'all' ? 'on' : ''}" data-s="all">Alle</button>
          ${Object.entries(STATUS[type]).map(([k, v]) => `<button class="chip ${s.status === k ? 'on' : ''}" data-s="${k}">${v}</button>`).join('')}
        </div>
        ${platforms.length > 1 ? (() => {
          // Stufe 1: Hersteller, Stufe 2 (nur wenn sinnvoll): einzelne Konsole
          const fams = PLATFORM_GROUPS.map(([g]) => g).filter(g => platforms.some(p => familyOf(p) === g));
          if (!fams.includes(s.fam)) { s.fam = 'all'; s.platform = 'all'; }
          const consoles = s.fam === 'all' ? [] : platforms.filter(p => familyOf(p) === s.fam).sort((a, b) => PLATFORMS.indexOf(a) - PLATFORMS.indexOf(b));
          if (!consoles.includes(s.platform)) s.platform = 'all';
          const famSel = fams.length > 1 ? `<select class="input" id="fam" style="width:auto"><option value="all">Alle Plattformen</option>${fams.map(g => `<option value="${esc(g)}" ${s.fam === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>` : '';
          const conSel = consoles.length > 1 ? `<select class="input" id="plat" style="width:auto"><option value="all">Alle ${esc(s.fam)}</option>${consoles.map(p => `<option value="${esc(p)}" ${p === s.platform ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : '';
          // Nur ein Hersteller vorhanden: direkt die Konsolen anbieten
          const onlyCon = fams.length === 1 ? `<select class="input" id="plat" style="width:auto"><option value="all">Alle Plattformen</option>${platforms.sort((a, b) => PLATFORMS.indexOf(a) - PLATFORMS.indexOf(b)).map(p => `<option value="${esc(p)}" ${p === s.platform ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : '';
          return famSel + conSel + onlyCon;
        })() : ''}
        <select class="input" id="sort" style="width:auto">
          <option value="added" ${s.sort === 'added' ? 'selected' : ''}>Zuletzt hinzugefügt</option>
          <option value="title" ${s.sort === 'title' ? 'selected' : ''}>Titel A–Z</option>
          <option value="rating" ${s.sort === 'rating' ? 'selected' : ''}>Beste Bewertung</option>
          ${type === 'game' ? `<option value="progress" ${s.sort === 'progress' ? 'selected' : ''}>Trophäen-Fortschritt</option>` : ''}
        </select>
      </div>
      <div class="grid" id="grid"></div>`;

    const drawGrid = () => {
      let list = items.filter(i => (s.status === 'all' || i.status === s.status)
        && (type !== 'game' || ((s.fam === 'all' || familyOf(i.platform) === s.fam) && (s.platform === 'all' || i.platform === s.platform)))
        && (!s.q || i.title.toLowerCase().includes(s.q.toLowerCase())));
      const prog = i => { const p = Trophies.progress(i.trophies); return p.total ? p.done / p.total : -1; };
      list.sort({
        added: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''),
        title: (a, b) => a.title.localeCompare(b.title, 'de'),
        rating: (a, b) => (b.rating || 0) - (a.rating || 0),
        progress: (a, b) => prog(b) - prog(a),
      }[s.sort]);
      $('#grid').innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="list-empty" style="grid-column:1/-1">Keine Treffer</div>`;
    };
    drawGrid();
    $('#q').oninput = e => { s.q = e.target.value; drawGrid(); };
    $$('#statusChips .chip').forEach(c => c.onclick = () => { s.status = c.dataset.s; saveLib(); $$('#statusChips .chip').forEach(x => x.classList.toggle('on', x === c)); drawGrid(); });
    $('#sort').onchange = e => { s.sort = e.target.value; saveLib(); drawGrid(); };
    $('#plat') && ($('#plat').onchange = e => { s.platform = e.target.value; saveLib(); drawGrid(); });
    $('#fam') && ($('#fam').onchange = e => { s.fam = e.target.value; s.platform = 'all'; saveLib(); render(); });
  }

  function trophyRow(t, game) {
    const isPlat = t.tier === 'platinum';
    return `<div class="trophy ${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="check ${t.done ? 'on' : ''} ${isPlat ? 'auto' : ''}" data-toggle="${t.id}" aria-label="${t.done ? 'Als offen markieren' : 'Abhaken'}" ${isPlat ? 'title="Wird automatisch verdient"' : ''}>${I.check}</button>
      <div class="tbadge">${Trophies.icon(t.tier, 22)}</div>
      <div style="min-width:0">
        <div class="trophy-name">${esc(t.name)} <span class="tier-tag tt-${t.tier}">${Trophies.TIERS[t.tier].label}</span>${t.dlc ? ' <span class="tier-tag tt-dlc">DLC</span>' : ''}</div>
        ${t.desc ? `<div class="trophy-desc">${esc(t.desc)}</div>` : ''}
        ${t.done && t.doneAt ? `<div class="tiny" style="margin-top:2px">Verdient am ${fmtDate(t.doneAt)}</div>` : ''}
      </div>
      <div class="trophy-meta">
        ${t.rarity != null ? `<span class="rarity">${String(t.rarity).replace('.', ',')} %</span>` : ''}
        <div class="row-actions">
          <button class="btn btn-ghost" data-tedit="${t.id}" aria-label="Bearbeiten">${I.edit}</button>
          <button class="btn btn-ghost btn-danger" data-tdel="${t.id}" aria-label="Löschen">${I.trash}</button>
        </div>
      </div>
    </div>`;
  }

  const detailFilter = { value: 'all' };

  /* ---------- Anime-Filme zur passenden Reihe ---------- */
  const titleSegment = t => normTitle(String(t || '').split(/[:!]| - |-(?=[A-Za-z])/)[0]);
  function findAnimeFor({ anilistId, relatedIds = [], title }) {
    const anime = Store.all('anime');
    const idsOf = a => [a.anilistId, ...(a.seasonList || []).map(x => x.anilistId)].filter(Boolean);
    const own = anime.find(a => idsOf(a).includes(anilistId));
    if (own) return { item: own, already: true };
    const rel = anime.find(a => idsOf(a).some(id => relatedIds.includes(id)));
    if (rel) return { item: rel, already: false };
    const seg = titleSegment(title);
    const byName = seg.length >= 6 && anime.find(a => { const sa = titleSegment(a.title); return sa.length >= 6 && (seg.startsWith(sa) || sa.startsWith(seg)); });
    return byName ? { item: byName, already: false } : null;
  }
  function attachMovies(item, movies) {
    const list = materialize(item);
    let n = list.filter(x => x.format === 'MOVIE').length;
    movies.forEach(mv => {
      if (mv.anilistId && list.some(x => x.anilistId === mv.anilistId)) return;
      list.push({ ...mv, id: Store.uid(), format: 'MOVIE', label: `Film${++n > 1 ? ' ' + n : ''}` });
    });
    saveSeasons(item, list, { autoStatus: false });
  }

  /* ---------- LiveChart-Liste einfügen ---------- */
  function parseLiveChart(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    const PROG = /^(\d+)\s*\/\s*(\d+|–|-|\?)$/;
    const out = [];
    lines.forEach((l, p) => {
      const m = l.match(PROG);
      if (!m || p < 4) return;
      const rating = lines[p - 1], status = lines[p - 2], format = lines[p - 3], title = lines[p - 4];
      if (!title || /^\d+([.,]\d+)?$/.test(title) || PROG.test(title)) return;
      const r = /^\d{1,2}$/.test(rating) ? +rating : null;
      out.push({
        title, format, status, movie: /^THTR\b/i.test(format),
        rating: r && r <= 10 ? r : null,
        seen: +m[1], total: /^\d+$/.test(m[2]) ? +m[2] : null,
        upcoming: /^\d{4}$/.test(status) || /\d+d\s+\d+h/.test(status),
      });
    });
    return out;
  }
  const entryDone = e => !!e.total && e.seen >= e.total;
  const normTitle = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

  function buildImport(result) {
    const anime = Store.all('anime');
    const groups = result.groups.map(g => {
      const seasons = g.seasons.map(sea => {
        const hit = g.entries.find(x => x.anilistId === sea.anilistId);
        const e = hit?.entry;
        const seen = e ? (e.total ? Math.min(e.seen, e.total) : e.seen) : 0;
        return { ...sea, episodes: sea.episodes || e?.total || null, seen, complete: !!e && entryDone(e) };
      });
      const es = g.entries.map(x => x.entry);
      const ratings = es.map(e => e.rating).filter(Boolean);
      const status = es.every(entryDone) ? 'done' : es.some(e => e.seen > 0) ? 'active' : 'planned';
      const ids = new Set(g.seasons.map(x => x.anilistId));
      const names = new Set([g.title, ...g.seasons.map(x => x.title), ...g.entries.map(x => x.entry.title)].map(normTitle).filter(Boolean));
      const existing = anime.find(a => ids.has(a.anilistId) || (a.seasonList || []).some(x => ids.has(x.anilistId)) || names.has(normTitle(a.title)) || (a.seasonList || []).some(x => names.has(normTitle(x.title))));
      const movieOnly = g.seasons.every(x => x.format === 'MOVIE');
      const attach = !existing && movieOnly ? findAnimeFor({ anilistId: g.mainId, relatedIds: g.relatedIds || [], title: g.title }) : null;
      return {
        attachTo: attach && !attach.already ? attach.item : null,
        key: 'g' + g.root, root: g.mainId || g.root, title: g.title || g.seasons[0].title, cover: g.cover || g.seasons[0].cover, year: g.year || g.seasons[0].year, genres: g.genres,
        seasons, status, rating: ratings.length ? Math.max(1, Math.min(5, Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length / 2))) : 0,
        entries: es.length, existing, include: !existing,
      };
    }).sort((a, b) => a.title.localeCompare(b.title, 'de'));
    const singles = result.unmatched.map((e, i) => ({
      key: 'u' + i, title: e.title, cover: '', seasons: [{ id: null, label: e.movie ? 'Film' : 'Staffel 1', title: e.title, episodes: e.total, seen: e.total ? Math.min(e.seen, e.total) : e.seen, complete: entryDone(e), format: e.movie ? 'MOVIE' : 'TV' }],
      status: entryDone(e) ? 'done' : e.seen > 0 ? 'active' : 'planned', rating: e.rating ? Math.max(1, Math.round(e.rating / 2)) : 0,
      entries: 1, existing: anime.find(a => normTitle(a.title) === normTitle(e.title)), unmatched: true,
    }));
    singles.forEach(r => { r.include = !r.existing; });
    return [...groups, ...singles];
  }

  function applyImport(rows) {
    let added = 0;
    rows.filter(r => r.include && !r.existing).forEach(r => {
      if (r.attachTo) { const cur = Store.get(r.attachTo.id); if (cur) { attachMovies(cur, r.seasons); added++; } return; }
      const list = r.seasons.map(sea => ({ ...sea, id: Store.uid() }));
      Store.add({
        type: 'anime', title: r.title, status: r.status, rating: r.rating, cover: r.cover || '', year: r.year || null,
        genres: r.genres || [], seasonList: list, ...seasonTotals(list), notes: '',
        ...(r.root ? { anilistId: r.root, external: `anilist:${r.root}` } : {}),
      });
      added++;
    });
    return { added };
  }

  function animeImport() {
    let rows = [];
    openModal({
      title: 'LiveChart-Liste einfügen', wide: true,
      body: `<div id="lcStep">
        <div class="hint-box">${I.paste}<div>Öffne deine Bibliothek auf LiveChart.me, markiere alles (Strg+A bzw. Cmd+A), kopiere es und füge es hier ein. Staffeln derselben Reihe werden zu einem Anime mit Staffel-Tabs zusammengefasst, Cover und Folgenzahlen kommen von AniList.</div></div>
        <textarea class="input" id="lcText" style="margin-top:12px;min-height:200px;font-size:13px" placeholder="Hier deine LiveChart-Bibliothek einfügen"></textarea>
        <div class="tiny" id="lcCount" style="margin-top:6px">&nbsp;</div>
        <div class="field-error" id="lcErr"></div></div>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="lcGo">Auswerten</button>`,
      onMount: (m, close) => {
        const ta = $('#lcText', m);
        ta.oninput = () => { const n = parseLiveChart(ta.value).length; $('#lcErr', m).textContent = ''; $('#lcCount', m).textContent = n ? `${n} Anime erkannt` : ' '; };
        $('#lcGo', m).onclick = async () => {
          const entries = parseLiveChart(ta.value);
          if (!entries.length) { $('#lcErr', m).textContent = 'Darin habe ich keine LiveChart-Einträge gefunden. Kopiere die ganze Bibliothek-Seite.'; return; }
          const go = $('#lcGo', m); go.disabled = true; go.textContent = 'Werte aus…';
          const step = $('#lcStep', m);
          step.innerHTML = `<p class="muted" id="lcPhase" style="margin:0 0 12px">Suche ${entries.length} Anime auf AniList…</p><div class="bar"><i id="lcBar" style="width:3%"></i></div><p class="tiny" id="lcWait" style="margin-top:10px">&nbsp;</p>`;
          Lookup.onRateLimit = sec => { const w = $('#lcWait'); if (w) w.textContent = `AniList bremst gerade, kurze Pause (${sec} Sekunden)…`; };
          let result;
          try {
            result = await Lookup.matchAnimeList(entries, p => {
              const bar = $('#lcBar'), ph = $('#lcPhase'), w = $('#lcWait');
              if (w) w.innerHTML = '&nbsp;';
              if (p.phase === 'match') { if (bar) bar.style.width = Math.round(p.done / p.total * 75) + '%'; if (ph) ph.textContent = `Suche Anime auf AniList… ${p.done} von ${p.total}`; }
              else { if (bar) bar.style.width = Math.min(97, 75 + p.done * 4) + '%'; if (ph) ph.textContent = 'Fasse Staffeln zu Reihen zusammen…'; }
            });
          } catch {
            step.innerHTML = `<p class="field-error" style="margin:0">AniList war nicht erreichbar. Versuch es gleich nochmal.</p>`;
            go.textContent = 'Auswerten'; return;
          } finally { Lookup.onRateLimit = null; }
          rows = buildImport(result).sort((a, b) => (!!a.existing - !!b.existing));
          const renderPreview = () => {
            const inc = rows.filter(r => r.include && !r.existing);
            const skipN = rows.filter(r => r.existing).length;
            const sum = $('#lcSum');
            if (sum) sum.textContent = `${entries.length} Einträge → ${rows.length} Anime · ${inc.length} ${inc.length === 1 ? 'wird' : 'werden'} hinzugefügt${skipN ? ` · ${skipN} schon in deinem Regal (bleiben unverändert)` : ''}${rows.some(r => r.unmatched && !r.existing) ? ` · ${rows.filter(r => r.unmatched && !r.existing).length} nicht auf AniList gefunden` : ''}`;
              go.textContent = inc.length ? `${inc.length} hinzufügen` : 'Nichts Neues'; go.disabled = !inc.length;
          };
          step.innerHTML = `<p class="muted" id="lcSum" style="margin:0 0 12px"></p>
            <div class="import-list">${rows.map((r, i) => `
              <label class="import-row ${r.existing ? 'skip' : ''}">
                <input type="checkbox" data-i="${i}" ${r.existing ? 'disabled' : 'checked'}>
                <span class="import-thumb">${r.cover ? `<img src="${esc(r.cover)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
                <span class="import-text"><b>${esc(r.title)}</b>
                  <small>${r.unmatched ? 'Nicht auf AniList gefunden · wird ohne Cover angelegt' : `${r.seasons.length} ${r.seasons.length === 1 ? 'Teil' : 'Teile'} · ${r.seasons.filter(seasonDone).length} fertig${r.entries > 1 ? ` · aus ${r.entries} LiveChart-Einträgen` : ''}`}</small></span>
                <span class="import-tags">${r.existing ? '<span class="tier-tag tt-silver">Schon da</span>' : r.attachTo ? `<span class="tier-tag tt-dlc">Film zu ${esc(r.attachTo.title)}</span>` : statusPill({ type: 'anime', status: r.status })}</span>
              </label>`).join('')}</div>`;
          $$('.import-row input', m).forEach(c => c.onchange = () => { rows[+c.dataset.i].include = c.checked; renderPreview(); });
          renderPreview();
          go.onclick = () => {
            const r = applyImport(rows);
            Object.assign(libState.anime, { q: '', status: 'all' }); saveLib();
            close();
            if (!location.hash.startsWith('#/anime')) location.hash = '#/anime'; else render();
            toast(`<div><b>LiveChart-Liste übernommen</b><small>${r.added} neue Anime hinzugefügt</small></div>`);
          };
        };
      },
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-lcimport]')) { e.preventDefault(); animeImport(); } });

  /* ---------- Manga ---------- */
  const fmtCh = n => (Math.round(n * 10) / 10).toLocaleString('de-AT');
  const mangaBehind = m => (m.chapters != null ? Math.max(0, m.chapters - (m.chaptersRead || 0)) : 0);
  function relTime(iso) {
    if (!iso) return '';
    const d = (Date.now() - Date.parse(iso)) / 1000;
    if (d < 90) return 'gerade eben';
    if (d < 3600) return `vor ${Math.round(d / 60)} Min.`;
    if (d < 86400) return `vor ${Math.round(d / 3600)} Std.`;
    if (d < 86400 * 45) return `vor ${Math.round(d / 86400)} Tagen`;
    return fmtDate(iso);
  }

  function saveManga(item, patch) {
    const read = patch.chaptersRead ?? item.chaptersRead ?? 0;
    const total = Math.max(patch.chapters ?? item.chapters ?? 0, read) || null;
    const delta = read - (item.chaptersRead || 0);
    const p = { ...patch, chaptersRead: read, chapters: total };
    if (delta > 0) p.readLog = [...(item.readLog || []), { at: new Date().toISOString(), n: delta }].slice(-3000);
    if (!['dropped', 'paused'].includes(item.status)) {
      if (total && read >= total && item.mdStatus === 'completed') p.status = 'done';
      else if (read > 0 && item.status !== 'done') p.status = 'active';
      else if (read > 0 && item.status === 'done' && read < total) p.status = 'active';
    }
    return Store.update(item.id, p);
  }

  function mangaSection(item) {
    const read = item.chaptersRead || 0, total = item.chapters;
    const behind = mangaBehind(item);
    const pct = total ? Math.min(100, Math.round(read / total * 100)) : 0;
    const ongoing = item.mdStatus && item.mdStatus !== 'completed';
    const stale = item.lastUpload && Date.now() - Date.parse(item.lastUpload) > 180 * 86400 * 1000 && ongoing;
    return `<section class="section">
      <div class="trophy-head">
        <div><h2 class="section-title" style="margin:0">Kapitel</h2>
          <div class="tiny">${total ? `${fmtCh(read)} von ${fmtCh(total)} gelesen · ${pct} %` : `${fmtCh(read)} gelesen`}${behind > 0 ? ` · <span style="color:var(--cyan)">${fmtCh(behind)} ungelesen</span>` : ''}</div></div>
        ${item.mangadexId ? `<button class="btn btn-sm" id="mCheck">${I.refresh} Jetzt prüfen</button>` : ''}
      </div>
      <div class="season-panel manga-panel ${A()}">
        <div class="manga-count">
          <div class="ep-stepper" style="margin-top:0">
            <button class="btn icon-btn" id="chMinus" aria-label="Ein Kapitel zurück">−</button>
            <div class="ep-count"><input type="number" id="chInput" min="0" step="any" value="${read}" aria-label="Gelesen bis Kapitel"><span>/ ${total ? fmtCh(total) : '?'} Kapitel</span></div>
            <button class="btn icon-btn btn-primary" id="chPlus" aria-label="Ein Kapitel weiter">+</button>
          </div>
          <div class="bar" style="max-width:420px"><i style="width:${pct}%"></i></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
            ${total && read < total ? `<button class="btn btn-sm btn-primary" id="chAll">${I.check} Bis Kapitel ${fmtCh(total)} gelesen</button>` : ''}
            <button class="btn btn-sm" id="chTotal">${I.edit} Kapitelzahl ändern</button>
          </div>
        </div>
        <div class="manga-info tiny">
          ${item.mangadexId ? `<div><b>Neuestes Kapitel:</b> ${total ? fmtCh(total) : 'unbekannt'}${ongoing ? ' · Manga läuft noch' : item.mdStatus === 'completed' ? ' · Manga abgeschlossen' : ''}</div>
          ${item.lastUpload ? `<div>Zuletzt ein neues Kapitel: ${relTime(item.lastUpload)}</div>` : ''}
          <div>Automatisch geprüft: ${item.chapterCheckedAt ? relTime(item.chapterCheckedAt) : 'noch nie'}</div>
          ${stale ? `<div class="stale">Seit über einem halben Jahr kam hier kein Kapitel mehr. Falls du weißt, dass es weitergeht, trag die Zahl selbst ein.</div>` : ''}`
          : `<div>Dieser Manga ist nicht mit MangaDex verknüpft, deshalb wird die Kapitelzahl nicht automatisch aktualisiert. Über „Bearbeiten“ und die Titelsuche kannst du ihn verknüpfen.</div>`}
        </div>
      </div>
    </section>`;
  }

  function bindManga(item) {
    const fresh = () => Store.get(item.id);
    const set = v => { const it = fresh(); saveManga(it, { chaptersRead: Math.max(0, Math.round(v * 10) / 10) }); render(); };
    $('#chMinus').onclick = () => set((fresh().chaptersRead || 0) - 1);
    $('#chPlus').onclick = () => set(Math.floor(fresh().chaptersRead || 0) + 1);
    $('#chInput').onchange = e => set(+e.target.value || 0);
    $('#chAll') && ($('#chAll').onclick = () => set(fresh().chapters));
    $('#chTotal').onclick = () => {
      const it = fresh();
      openModal({
        title: 'Kapitelzahl ändern',
        body: `<form class="form" id="ctf" novalidate><div class="field"><label>Aktuelles Kapitel</label><input class="input" name="total" type="number" min="0" step="any" value="${it.chapters ?? ''}" placeholder="368"><div class="field-error" id="ctErr"></div></div>
          <p class="tiny" style="margin:0">Die automatische Prüfung erhöht die Zahl weiter, sobald ein neueres Kapitel erscheint. Kleiner wird sie dadurch nie.</p></form>`,
        foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="ctSave">Speichern</button>`,
        onMount: (m, close) => {
          $('#ctSave', m).onclick = () => {
            const v = $('#ctf', m).elements.total.value;
            if (v === '' || +v < 0) { $('#ctErr', m).textContent = 'Gib eine Kapitelzahl ein.'; return; }
            Store.update(it.id, { chapters: +v, chaptersRead: Math.min(it.chaptersRead || 0, +v) });
            close(); render();
          };
        },
      });
    };
    $('#mCheck') && ($('#mCheck').onclick = async () => {
      const b = $('#mCheck'); b.disabled = true; b.textContent = 'Prüfe…';
      const r = await MangaWatch.check({ force: true, ids: [fresh().mangadexId] });
      if (r.error) toast(`<div><b>Prüfen hat nicht geklappt</b><small>${r.error === 'key_required' ? 'Verbinde das Gerät unter Daten mit deinem Schlüssel' : 'Server nicht erreichbar'}</small></div>`);
      else if (!r.updated.length) toast('<div><b>Keine neuen Kapitel</b></div>');
      render();
    });
  }

  const MangaWatch = (() => {
    const KEY = 'nightshelf.mangaCheck';
    const INTERVAL = 3 * 3600 * 1000;
    let running = false;
    async function check({ force = false, ids = null } = {}) {
      if (running) return { updated: [] };
      let last = 0; try { last = +localStorage.getItem(KEY) || 0; } catch {}
      if (!force && Date.now() - last < INTERVAL) return { updated: [] };
      const list = Store.all('manga').filter(m => m.mangadexId && (ids ? ids.includes(m.mangadexId) : m.mdStatus !== 'completed'));
      if (!list.length) return { updated: [] };
      running = true;
      const updated = [];
      try {
        const all = [...new Set(list.map(m => m.mangadexId))];
        for (let i = 0; i < all.length; i += 40) {
          const res = await fetch(`${PSN.worker()}/manga/latest`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...Sync.header() }, body: JSON.stringify({ ids: all.slice(i, i + 40) }) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { updated, error: data.error || 'error' };
          const now = new Date().toISOString();
          Object.entries(data.series || {}).forEach(([id, info]) => {
            Store.all('manga').filter(m => m.mangadexId === id).forEach(m => {
              const patch = { chapterCheckedAt: now };
              if (info.status) patch.mdStatus = info.status;
              if (info.latest && info.latest > (m.chapters || 0)) {
                patch.chapters = info.latest; patch.lastUpload = now; patch.newChapterAt = now;
                updated.push({ title: m.title, from: m.chapters || 0, to: info.latest });
              }
              Store.update(m.id, patch);
            });
          });
        }
        if (!ids) try { localStorage.setItem(KEY, String(Date.now())); } catch {}
      } catch { return { updated, error: 'network' }; }
      finally { running = false; }
      if (updated.length === 1) toast(`<div class="tbadge" style="color:var(--cyan)">${I.book.replace('<svg', '<svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8"')}</div><div><b>${esc(updated[0].title)}</b><small>Kapitel ${fmtCh(updated[0].to)} ist da</small></div>`);
      else if (updated.length > 1) toast(`<div class="tbadge" style="color:var(--cyan)">${I.book.replace('<svg', '<svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8"')}</div><div><b>${updated.length} Manga mit neuen Kapiteln</b><small>${esc(updated.slice(0, 3).map(u => u.title).join(', '))}${updated.length > 3 ? ' …' : ''}</small></div>`);
      return { updated };
    }
    return { check };
  })();
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-mangacheck]')) return;
    e.preventDefault();
    const b = e.target.closest('[data-mangacheck]'); b.disabled = true; b.textContent = 'Prüfe…';
    const r = await MangaWatch.check({ force: true });
    if (r.error) toast(`<div><b>Prüfen hat nicht geklappt</b><small>${r.error === 'key_required' ? 'Verbinde das Gerät unter Daten mit deinem Schlüssel' : 'Server nicht erreichbar'}</small></div>`);
    else if (!r.updated.length) toast('<div><b>Keine neuen Kapitel</b><small>Alles auf dem neuesten Stand</small></div>');
    render();
  });
  const autoMangaCheck = () => MangaWatch.check().then(r => { if (r.updated.length) render(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoMangaCheck(); });

  /* ---------- Hinzufügen: erst Art wählen ---------- */
  function addPicker() {
    const hint = { game: 'mit Trophäen', series: 'mit Staffeln', anime: 'mit Staffeln & Filmen', manga: 'mit Kapiteln', movie: 'mit Kinostart' };
    openModal({
      title: 'Was möchtest du hinzufügen?',
      body: `<div class="add-pick">${ORDER_TYPES.map(t => `<button type="button" class="add-pick-btn" data-pick="${t}">
        <span class="add-pick-icon">${typeIcon(t)}</span><span class="add-pick-text"><b>${TYPES[t].label}</b><small>${hint[t]}</small></span></button>`).join('')}</div>`,
      onMount: (m, close) => {
        $$('[data-pick]', m).forEach(b => b.onclick = () => { const t = b.dataset.pick; close(); setTimeout(() => itemForm(t), 60); });
      },
    });
  }

  /* ---------- Neue Folgen (Anime und Serien) ---------- */
  // Erschienene Folgen einer Staffel: aus den Ausstrahlungsdaten, sonst die Gesamtzahl
  const released = x => x.aired != null ? (x.episodes ? Math.min(x.aired, x.episodes) : x.aired) : (x.episodes || 0);
  const airingNow = x => x.airing === 'RELEASING';
  // Zählt als „neu“: Staffel mit neu dazugekommenen Folgen, oder laufende Staffel, die du schon angefangen hast
  // Staffel läuft noch und hat weniger erschienene Folgen als geplant (oder Gesamtzahl unbekannt)
  const partialAir = x => x.format !== 'MOVIE' && x.aired != null && x.airing !== 'FINISHED' && (!x.episodes || x.aired < x.episodes);
  const epTotal = x => x.episodes || (x.aired != null && x.aired > 0 ? x.aired : null);
  const countsAsNew = x => x.format !== 'MOVIE' && !x.complete && (!!x.newAt || (airingNow(x) && (x.seen || 0) > 0));
  // Ungesehene Folgen in Staffeln, die gerade laufen oder in denen neue Folgen dazugekommen sind
  function episodesBehind(item) {
    if (!['anime', 'series'].includes(item.type) || !item.seasonList?.length) return 0;
    return item.seasonList.filter(countsAsNew)
      .reduce((a, x) => a + Math.max(0, released(x) - (x.seen || 0)), 0);
  }
  const newCount = it => it.type === 'manga' ? mangaBehind(it) : episodesBehind(it);
  const showsNew = it => ['active', 'paused', 'done'].includes(it.status) && newCount(it) > 0;
  const recentDate = (d, days) => !d || Date.parse(d) > Date.now() - days * 86400000;
  const lastShow = it => [...seasonsOf(it)].reverse().find(x => x.format !== 'MOVIE');
  function fmtWhen(isoStr, dateOnly = false) {
    const d = new Date(isoStr);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((day - today) / 86400000);
    const dayTxt = diff === 0 ? 'heute' : diff === 1 ? 'morgen' : diff > 1 && diff < 7 ? `am ${d.toLocaleDateString('de-AT', { weekday: 'long' })}` : `am ${d.toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}`;
    return dateOnly ? dayTxt : `${dayTxt} um ${d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const EpisodeWatch = (() => {
    const KEY = 'nightshelf.airCheck', SEQ_KEY = 'nightshelf.sequelCheck';
    const INTERVAL = 3 * 3600 * 1000, SEQ_INTERVAL = 20 * 3600 * 1000;
    let running = false;
    const lsGet = k => { try { return +localStorage.getItem(k) || 0; } catch { return 0; } };
    const lsSet = k => { try { localStorage.setItem(k, String(Date.now())); } catch {} };
    const tracked = it => it.status !== 'dropped';
    const strip = list => JSON.stringify(list.map(({ id, ...x }) => x));

    function store(it, list, extra) {
      const before = strip(seasonsOf(it)) + JSON.stringify({ u: it.upcoming || [], s: it.showStatus || '' });
      const after = strip(list) + JSON.stringify({ u: extra.upcoming || [], s: extra.showStatus || it.showStatus || '' });
      if (before === after) return false;
      Store.update(it.id, extra);
      saveSeasons(Store.get(it.id), list, { autoStatus: false });
      return true;
    }

    async function checkAnime(only, news) {
      const items = Store.all('anime').filter(it => tracked(it) && it.seasonList?.some(x => x.anilistId) && (!only || only.includes(it.id)));
      if (!items.length) return;
      const want = new Set();
      items.forEach(it => it.seasonList.forEach(x => { if (x.anilistId && (only || !['FINISHED', 'CANCELLED'].includes(x.airing))) want.add(x.anilistId); }));
      let seq = new Map();
      if (only || Date.now() - lsGet(SEQ_KEY) > SEQ_INTERVAL) {
        const lastIds = [...new Set(items.map(it => lastShow(it)?.anilistId).filter(Boolean))];
        seq = await Airing.animeSequels(lastIds).catch(() => new Map());
        seq.forEach(list => list.forEach(s => want.add(s.anilistId)));
        if (!only) lsSet(SEQ_KEY);
      }
      const info = want.size ? await Airing.anime([...want]) : new Map();
      const now = new Date().toISOString();
      for (const it0 of items) {
        const it = Store.get(it0.id); if (!it) continue;
        const list = seasonsOf(it).map(x => ({ ...x }));
        const removed = it.removedSeasons || [];
        (seq.get(lastShow(it)?.anilistId) || []).forEach(s => {
          if (list.some(x => x.anilistId === s.anilistId) || removed.includes(s.anilistId)) return;
          if (s.airing === 'FINISHED' && !recentDate(s.start, 300)) return; // ältere Teile, die bewusst fehlen, nicht nachtragen
          const movie = s.format === 'MOVIE';
          list.push({ ...s, id: Store.uid(), label: '', seen: 0, complete: false, newAt: now, aired: s.airing === 'NOT_YET_RELEASED' ? 0 : null });
          news.push({ item: it, kind: 'season', text: s.airing === 'NOT_YET_RELEASED' ? `${movie ? 'Neuer Film' : 'Neue Staffel'} angekündigt${s.start ? ` · ab ${fmtDate(s.start)}` : ''}` : `${movie ? 'Neuer Film' : 'Neue Staffel'} ist da` });
        });
        const shows = list.filter(x => x.format !== 'MOVIE').length;
        const upcoming = [];
        list.forEach(x => {
          const a = info.get(x.anilistId); if (!a) return;
          x.airing = a.status;
          if (a.episodes) x.episodes = a.episodes;
          if (a.aired != null) {
            if (x.aired != null && a.aired > x.aired && x.format !== 'MOVIE') {
              x.newAt = now;
              const n = a.aired - x.aired;
              news.push({ item: it, kind: 'ep', text: `${n > 1 ? `Folgen ${x.aired + 1}–${a.aired} sind` : `Folge ${a.aired} ist`} da${shows > 1 ? ` · ${x.label}` : ''}` });
            }
            x.aired = a.aired;
          }
          x.nextEp = a.next?.ep || null; x.nextAt = a.next?.at || null; x.start = a.start || x.start || null;
          a.schedule.forEach(s => upcoming.push({ at: s.at, kind: 'ep', ep: s.ep, season: shows > 1 ? x.label : '', last: !!(x.episodes && s.ep === x.episodes) }));
          if (a.status === 'NOT_YET_RELEASED' && !a.schedule.length && a.start) upcoming.push({ at: a.start + 'T00:00:00', dateOnly: true, kind: x.format === 'MOVIE' ? 'movie' : 'start', season: x.label });
        });
        upcoming.sort((a, b) => a.at.localeCompare(b.at));
        store(it, list, { upcoming: upcoming.slice(0, 12), airCheckedAt: now });
      }
    }

    async function checkSeries(only, news) {
      const items = Store.all('series').filter(it => tracked(it) && /^tvmaze:\d+$/.test(it.external || '') && (only ? only.includes(it.id) : it.showStatus !== 'Ended'));
      for (const it0 of items) {
        let s;
        try { s = await Airing.series(+it0.external.split(':')[1]); } catch { continue; }
        await Airing.sleep(300);
        const it = Store.get(it0.id); if (!it) continue;
        const now = new Date().toISOString();
        const hasIds = it.seasonList?.some(x => x.tvmazeId);
        const list = hasIds ? seasonsOf(it).map(x => ({ ...x })) : seasonsOf(it);
        if (hasIds) {
          s.seasons.forEach(ts => {
            const running = s.upcoming.some(u => u.season === ts.number) && ts.aired > 0;
            const airing = ts.aired === 0 ? 'NOT_YET_RELEASED' : running || (ts.episodes && ts.aired < ts.episodes) ? 'RELEASING' : 'FINISHED';
            let x = list.find(o => o.tvmazeId === ts.tvmazeId);
            if (!x) {
              if ((it.removedSeasons || []).includes(ts.tvmazeId) || !recentDate(ts.premiere, 300)) return;
              list.push({ id: Store.uid(), tvmazeId: ts.tvmazeId, label: '', title: ts.name || '', episodes: ts.episodes, year: ts.premiere ? +ts.premiere.slice(0, 4) : null, cover: ts.cover || it.cover || '', format: 'TV', seen: 0, complete: false, newAt: now, aired: ts.aired, airing });
              news.push({ item: it, kind: 'season', text: ts.aired ? `Staffel ${ts.number} ist da` : `Staffel ${ts.number} angekündigt${ts.premiere ? ` · ab ${fmtDate(ts.premiere)}` : ''}` });
              return;
            }
            if (ts.episodes && ts.episodes > (x.episodes || 0)) x.episodes = ts.episodes;
            if (x.aired != null && ts.aired > x.aired) {
              x.newAt = now;
              const n = ts.aired - x.aired;
              news.push({ item: it, kind: 'ep', text: n > 1 ? `${n} neue Folgen · Staffel ${ts.number}` : `Neue Folge · Staffel ${ts.number}, Folge ${ts.aired}` });
            }
            x.aired = ts.aired; x.airing = airing;
            const next = s.upcoming.find(u => u.season === ts.number);
            x.nextEp = next?.ep || null; x.nextAt = next?.at || null; x.start = ts.premiere || x.start || null;
          });
        }
        const upcoming = s.upcoming.map(u => ({ at: u.at, kind: 'ep', ep: u.ep, season: `Staffel ${u.season}`, name: u.name, dateOnly: u.dateOnly }));
        s.seasons.filter(ts => ts.aired === 0 && ts.premiere && !s.upcoming.some(u => u.season === ts.number) && Date.parse(ts.premiere) > Date.now() - 86400000)
          .forEach(ts => upcoming.push({ at: ts.premiere + 'T00:00:00', dateOnly: true, kind: 'start', season: `Staffel ${ts.number}` }));
        upcoming.sort((a, b) => a.at.localeCompare(b.at));
        const extra = { upcoming: upcoming.slice(0, 12), showStatus: s.status, airCheckedAt: now };
        if (hasIds) store(it, list, extra);
        else if (JSON.stringify(it.upcoming || []) !== JSON.stringify(extra.upcoming) || it.showStatus !== s.status) Store.update(it.id, extra);
      }
    }

    async function check({ force = false, ids = null } = {}) {
      if (running) return { news: [] };
      if (!force && Date.now() - lsGet(KEY) < INTERVAL) return { news: [] };
      running = true;
      const news = []; let error = null;
      try {
        await checkAnime(ids, news).catch(() => { error = 'network'; });
        await checkSeries(ids, news).catch(() => { error = 'network'; });
        if (!ids && !error) lsSet(KEY);
        const stamp = new Date().toISOString();
        [...new Set(news.map(n => n.item.id))].forEach(id => Store.update(id, { newEpisodeAt: stamp }));
      } finally { running = false; }
      if (news.length === 1) toast(`<div class="tbadge" style="color:var(--cyan)">${I.tv.replace('<svg', '<svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8"')}</div><div><b>${esc(news[0].item.title)}</b><small>${esc(news[0].text)}</small></div>`);
      else if (news.length > 1) { const t = [...new Set(news.map(n => n.item.title))]; toast(`<div class="tbadge" style="color:var(--cyan)">${I.tv.replace('<svg', '<svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8"')}</div><div><b>${news.length} Neuigkeiten</b><small>${esc(t.slice(0, 3).join(', '))}${t.length > 3 ? ' …' : ''}</small></div>`); }
      return { news, error };
    }
    return { check };
  })();
  const autoAirCheck = () => EpisodeWatch.check().then(r => { if (r.news.length) render(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoAirCheck(); });
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-aircheck]'); if (!b) return;
    e.preventDefault();
    const label = b.innerHTML; b.disabled = true; b.textContent = 'Prüfe…';
    const [a, m] = await Promise.all([EpisodeWatch.check({ force: true }), Store.all('manga').length ? MangaWatch.check({ force: true }) : Promise.resolve({ updated: [] })]);
    if (!a.news.length && !m.updated.length) toast(`<div><b>${a.error ? 'Nicht alles erreichbar' : 'Nichts Neues'}</b><small>${a.error ? 'Später nochmal versuchen' : 'Alles auf dem neuesten Stand'}</small></div>`);
    b.disabled = false; b.innerHTML = label;
    render();
  });

  /* ---------- Demnächst ---------- */
  function upcomingEntries() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const now = Date.now(), out = [];
    Store.all().forEach(it => {
      if (it.status === 'dropped') return;
      (it.upcoming || []).forEach(u => { const t = Date.parse(u.at); if (u.dateOnly ? t >= today : t > now) out.push({ it, ...u, t }); });
      if (['movie', 'game'].includes(it.type) && /^\d{4}-\d{2}-\d{2}/.test(it.released || '')) {
        const t = Date.parse(it.released.slice(0, 10) + 'T00:00:00');
        if (t >= today) out.push({ it, at: it.released, t, dateOnly: true, kind: it.type });
      }
    });
    return out.sort((a, b) => a.t - b.t);
  }
  function upcomingText(u) {
    if (u.kind === 'ep') return [u.season, `Folge ${u.ep}${u.last ? ' (Finale)' : ''}`, u.name].filter(Boolean).map(esc).join(' · ');
    if (u.kind === 'start') return `${esc(u.season)} startet`;
    if (u.kind === 'movie') return u.it.type === 'movie' ? 'Kinostart' : `${esc(u.season)} erscheint`;
    if (u.kind === 'game') return `Erscheint${u.it.platform ? ` für ${esc(u.it.platform)}` : ''}`;
    return '';
  }
  function upcomingRow(u) {
    const time = u.dateOnly ? '' : new Date(u.t).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
    return `<a class="list-row" href="#/item/${u.it.id}"><div class="thumb">${coverHTML(u.it, { noTitle: true })}</div>
      <div class="grow"><div class="title">${esc(u.it.title)}</div><div class="sub">${TYPES[u.it.type].label} · ${upcomingText(u)}</div></div>
      ${time ? `<div class="up-time">${time}</div>` : ''}</a>`;
  }
  function newRow(it) {
    const n = newCount(it);
    let sub;
    if (it.type === 'manga') sub = `Manga · ${fmtCh(n)} ${n === 1 ? 'neues Kapitel' : 'neue Kapitel'} · bis Kapitel ${fmtCh(it.chapters)}`;
    else {
      const x = it.seasonList.find(s => countsAsNew(s) && released(s) > (s.seen || 0));
      sub = `${TYPES[it.type].label} · ${n} ${n === 1 ? 'neue Folge' : 'neue Folgen'}${x && it.seasonList.length > 1 ? ` · ${esc(x.label)}` : ''}`;
    }
    return `<a class="list-row" href="#/item/${it.id}"><div class="thumb">${coverHTML(it, { noTitle: true })}</div>
      <div class="grow"><div class="title">${esc(it.title)}</div><div class="sub">${sub}</div></div><div class="up-new">+${n > 99 ? '99' : fmtCh(n)}</div></a>`;
  }
  const newItems = () => Store.all().filter(showsNew).sort((a, b) => (b.newEpisodeAt || b.newChapterAt || b.updatedAt || '').localeCompare(a.newEpisodeAt || a.newChapterAt || a.updatedAt || ''));

  function viewUpcoming() {
    const entries = upcomingEntries();
    const fresh = newItems();
    const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayLabel = t => {
      const d = new Date(t); d.setHours(0, 0, 0, 0);
      const diff = Math.round((d - today) / 86400000);
      if (diff === 0) return 'Heute';
      if (diff === 1) return 'Morgen';
      return new Date(t).toLocaleDateString('de-AT', diff < 7 ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'long', year: new Date(t).getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    };
    const soon = entries.filter(u => u.t < today.getTime() + 60 * 86400000);
    const later = entries.filter(u => u.t >= today.getTime() + 60 * 86400000).slice(0, 40);
    const groups = [];
    soon.forEach(u => { const k = dayKey(u.t); const g = groups[groups.length - 1]; if (g && g.k === k) g.list.push(u); else groups.push({ k, label: dayLabel(u.t), list: [u] }); });
    const months = [];
    later.forEach(u => { const k = new Date(u.t).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' }); const g = months[months.length - 1]; if (g && g.k === k) g.list.push(u); else months.push({ k, list: [u] }); });
    const hasSeasons = Store.all().some(it => ['anime', 'series'].includes(it.type) && it.seasonList?.some(x => x.anilistId || x.tvmazeId));
    view.innerHTML = `<div class="${A()}" style="max-width:900px">
      <div class="page-head"><div><h1 class="page-title">Demnächst</h1><p class="page-sub">Neue Folgen, Staffeln, Filme und Spiele aus deinem Regal</p></div>
        <button class="btn" data-aircheck>${I.refresh} Jetzt prüfen</button></div>
      ${fresh.length ? `<section class="section" style="margin-top:0"><h2 class="section-title">Neu für dich</h2><div class="list-card">${fresh.map(newRow).join('')}</div></section>` : ''}
      ${groups.length ? groups.map(g => `<section class="section up-day"><h2 class="section-title">${esc(g.label)}<span class="tiny" style="font-weight:400">${g.list.length} ${g.list.length === 1 ? 'Termin' : 'Termine'}</span></h2><div class="list-card">${g.list.map(upcomingRow).join('')}</div></section>`).join('') : ''}
      ${months.length ? `<section class="section"><h2 class="section-title">Später</h2>${months.map(g => `<div class="season-row-label">${esc(g.k)}</div><div class="list-card" style="margin-bottom:14px">${g.list.map(u => upcomingRow({ ...u, dateOnly: true, season: u.season }).replace('<div class="grow">', `<div class="up-date">${new Date(u.t).getDate()}.</div><div class="grow">`)).join('')}</div>`).join('')}</section>` : ''}
      ${!entries.length ? `<div class="empty"><div class="empty-icon">${I.calendar}</div><h3>Gerade nichts angekündigt</h3><p>${hasSeasons ? 'Sobald zu deinen Serien, Anime, Filmen oder Spielen ein Termin bekannt ist, steht er hier.' : 'Lade bei deinen Serien und Anime die Staffeln (Button „Von TVmaze laden“ bzw. „Von AniList laden“), dann erscheinen hier die nächsten Folgen.'}</p></div>` : ''}
    </div>`;
  }

  /* ---------- Staffeln (Anime und Serien) ---------- */
  const seasonTab = {};
  const isImplicit = x => String(x.id).startsWith('implicit');
  function seasonsOf(item) {
    if (item.seasonList?.length) return relabel(item.seasonList);
    if (item.type === 'series') {
      const n = Math.max(1, item.seasons || 1);
      return Array.from({ length: n }, (_, i) => ({ id: `implicit-${i + 1}`, title: item.title, label: `Staffel ${i + 1}`, episodes: null, seen: 0, complete: i < (item.seasonSeen || 0), year: null, cover: '' }));
    }
    return [{ id: 'implicit-1', title: item.title, label: 'Staffel 1', format: 'TV', episodes: item.episodes || null, seen: item.episodesSeen || 0, year: item.year || null, cover: item.cover || '' }];
  }
  function seasonTotals(list) {
    const known = list.filter(x => x.episodes);
    return {
      episodes: known.length === list.length ? list.reduce((a, x) => a + x.episodes, 0) : (known.reduce((a, x) => a + x.episodes, 0) || null),
      episodesSeen: list.reduce((a, x) => a + (x.seen || 0), 0),
    };
  }
  function distributeSeen(list, seen, allDone) {
    let rest = seen;
    list.forEach(x => {
      if (allDone) { x.seen = x.episodes || x.seen || 0; x.complete = true; return; }
      const take = x.episodes ? Math.min(x.episodes, rest) : rest;
      x.seen = take; rest -= take;
    });
  }
  const seasonDone = x => !!x.complete || (!!x.episodes && (x.seen || 0) >= x.episodes);
  function currentSeason(item) {
    const list = seasonsOf(item);
    return list.find(x => (x.seen || 0) > 0 && !seasonDone(x)) || list.find(x => !seasonDone(x)) || list[list.length - 1];
  }
  // Automatische Namen ("Staffel 3", "Film 12") nach Löschen/Hinzufügen lückenlos neu nummerieren
  const AUTO_LABEL = /^(Staffel \d+|Film( \d+)?)$/;
  function relabel(list) {
    const shows = list.filter(x => x.format !== 'MOVIE'), movies = list.filter(x => x.format === 'MOVIE');
    shows.forEach((x, i) => { if (!x.label || AUTO_LABEL.test(x.label)) x.label = `Staffel ${i + 1}`; });
    movies.forEach((x, i) => { if (!x.label || AUTO_LABEL.test(x.label)) x.label = movies.length > 1 ? `Film ${i + 1}` : 'Film'; });
    return list;
  }
  function saveSeasons(item, list, { autoStatus = true } = {}) {
    relabel(list);
    list.forEach(x => { if (x.episodes && (x.seen || 0) < x.episodes && x.complete) x.complete = false; });
    const tot = seasonTotals(list);
    const patch = { seasonList: list, ...tot };
    if (item.type === 'series') { patch.seasons = list.length; patch.seasonSeen = list.filter(seasonDone).length; }
    const before = item.episodesSeen ?? seasonTotals(seasonsOf(item)).episodesSeen;
    const delta = tot.episodesSeen - (before || 0);
    if (autoStatus && delta > 0) patch.watchLog = [...(item.watchLog || []), { at: new Date().toISOString(), n: delta }].slice(-3000);
    if (autoStatus && !['dropped', 'paused'].includes(item.status)) {
      if (list.every(seasonDone)) patch.status = 'done';
      else if (list.some(x => (x.seen || 0) > 0 || seasonDone(x))) patch.status = 'active';
    }
    return Store.update(item.id, patch);
  }
  const seasonSource = item => item.type === 'anime' ? 'AniList' : 'TVmaze';

  function seasonSection(item) {
    const list = seasonsOf(item);
    const activeId = list.some(x => x.id === seasonTab[item.id]) ? seasonTab[item.id] : currentSeason(item).id;
    seasonTab[item.id] = activeId;
    const sea = list.find(x => x.id === activeId);
    const tot = seasonTotals(list.filter(x => x.format !== 'MOVIE').length ? list.filter(x => x.format !== 'MOVIE') : list);
    const pct = seasonDone(sea) ? 100 : sea.episodes ? Math.min(100, Math.round((sea.seen || 0) / sea.episodes * 100)) : 0;
    const totPct = tot.episodes ? Math.min(100, Math.round(tot.episodesSeen / tot.episodes * 100)) : 0;
    const coverSrc = sea.cover || item.cover;
    const nShows = list.filter(x => x.format !== 'MOVIE').length, nFilms = list.length - nShows;
    const unit = item.type === 'anime'
      ? [nShows ? `${nShows} ${nShows === 1 ? 'Staffel' : 'Staffeln'}` : '', nFilms ? `${nFilms} ${nFilms === 1 ? 'Film' : 'Filme'}` : ''].filter(Boolean).join(' · ')
      : (list.length === 1 ? 'Staffel' : 'Staffeln');
    const noEpisodes = list.every(x => !x.episodes);
    return `<section class="section">
      <div class="trophy-head">
        <div><h2 class="section-title" style="margin:0">${nShows ? 'Staffeln' : 'Filme'}${nShows && nFilms ? ' & Filme' : ''}</h2><div class="tiny">${item.type === 'anime' ? unit : `${list.length} ${unit}`}${noEpisodes ? ` · ${list.filter(seasonDone).length} fertig` : ` · ${tot.episodesSeen}/${tot.episodes || '?'} Folgen gesehen${tot.episodes ? ` · ${totPct} %` : ''}`}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" id="sAdd">${I.plus} Staffel</button>
          <button class="btn btn-sm ${noEpisodes ? 'btn-primary' : ''}" id="sLoad">${I.refresh} Von ${seasonSource(item)} laden</button>
        </div>
      </div>
      ${noEpisodes ? `<div class="hint-box" style="margin-bottom:14px">${I.info}<div>Lade die Staffeln von ${seasonSource(item)}, dann bekommst du Folgenzahlen und Cover pro Staffel. Deine fertigen Staffeln bleiben abgehakt.</div></div>` : ''}
      ${(() => {
        const tab = x => `<button class="season-tab ${x.id === activeId ? 'on' : ''} ${seasonDone(x) ? 'done' : ''}" role="tab" aria-selected="${x.id === activeId}" data-season="${x.id}">
          <span>${esc(x.label)}</span><small>${seasonDone(x) ? '✓' : x.format === 'MOVIE' ? 'offen' : `${x.seen || 0}/${epTotal(x) || '?'}`}</small></button>`;
        const shows = list.filter(x => x.format !== 'MOVIE'), films = list.filter(x => x.format === 'MOVIE');
        return `${shows.length ? `<div class="season-tabs" role="tablist" aria-label="Staffeln">${shows.map(tab).join('')}</div>` : ''}
          ${films.length ? `<div class="season-row-label">Filme</div><div class="season-tabs" role="tablist" aria-label="Filme">${films.map(tab).join('')}</div>` : ''}`;
      })()}
      <div class="season-panel ${A()}">
        <div class="season-cover">${coverSrc ? `<img src="${esc(coverSrc)}" alt="" onerror="this.remove()">` : ''}</div>
        <div class="season-body">
          <div class="season-title">${esc(sea.title || item.title)}</div>
          <div class="card-meta" style="margin-top:4px">${[esc(sea.label), sea.year, sea.format === 'MOVIE' && (sea.episodes || 1) === 1 ? '' : sea.episodes ? `${sea.episodes} Folgen` : sea.aired ? `${sea.aired} Folgen erschienen` : 'Folgenzahl unbekannt'].filter(Boolean).join('<span class="dot"></span>')}</div>
          ${airInfo(sea)}
          ${sea.format === 'MOVIE' && (sea.episodes || 1) === 1 ? '' : `<div class="ep-stepper">
            <button class="btn icon-btn" id="epMinus" aria-label="Eine Folge weniger">−</button>
            <div class="ep-count"><input type="number" id="epInput" min="0" ${sea.episodes ? `max="${sea.episodes}"` : ''} value="${sea.seen || 0}" aria-label="Gesehene Folgen"><span>/ ${epTotal(sea) || '?'} Folgen</span></div>
            <button class="btn icon-btn btn-primary" id="epPlus" aria-label="Eine Folge mehr">+</button>
          </div>`}
          ${sea.format === 'MOVIE' && (sea.episodes || 1) === 1 ? `<div class="movie-state ${seasonDone(sea) ? 'on' : ''}">${seasonDone(sea) ? `${I.check} Gesehen` : 'Noch nicht gesehen'}</div>` : `<div class="bar" style="max-width:420px"><i style="width:${pct}%"></i></div>`}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
            ${seasonDone(sea) ? `<button class="btn btn-sm" id="sReset">${sea.format === 'MOVIE' ? 'Als ungesehen markieren' : 'Zurücksetzen'}</button>` : (partialAir(sea) && (sea.seen || 0) >= sea.aired ? `<div class="movie-state on" style="margin:0">${I.check} Auf dem neuesten Stand</div>` : `<button class="btn btn-sm btn-primary" id="sDone">${I.check} ${sea.format === 'MOVIE' ? 'Gesehen' : partialAir(sea) && sea.aired > 0 ? `Bis Folge ${sea.aired} gesehen` : 'Ganz gesehen'}</button>`)}
            <button class="btn btn-sm" id="sEdit">${I.edit} Bearbeiten</button>
            ${list.length > 1 ? `<button class="btn btn-sm btn-ghost btn-danger" id="sDel">${I.trash} Entfernen</button>` : ''}
          </div>
        </div>
      </div>
    </section>`;
  }

  function airInfo(sea) {
    const bits = [];
    if (sea.airing === 'NOT_YET_RELEASED') bits.push(sea.nextAt ? `${sea.format === 'MOVIE' ? 'Erscheint' : 'Startet'} ${fmtWhen(sea.nextAt)}` : sea.start ? `${sea.format === 'MOVIE' ? 'Erscheint' : 'Startet'} ${fmtWhen(sea.start + 'T00:00:00', true)}` : 'Noch nicht erschienen, Termin unbekannt');
    else if (sea.nextAt) bits.push(`Folge ${sea.nextEp} kommt ${fmtWhen(sea.nextAt)}`);
    if (sea.format !== 'MOVIE' && sea.aired != null && sea.episodes && sea.aired < sea.episodes && sea.aired > 0) bits.push(`${sea.aired} von ${sea.episodes} Folgen erschienen`);
    const unseen = countsAsNew(sea) ? released(sea) - (sea.seen || 0) : 0;
    if (unseen > 0) bits.push(`<b>${unseen} ${unseen === 1 ? 'neue Folge' : 'neue Folgen'} für dich</b>`);
    return bits.length ? `<div class="air-info">${I.calendar}<span>${bits.join(' · ')}</span></div>` : '';
  }

  function materialize(it) { return seasonsOf(it).map(x => ({ ...x, id: isImplicit(x) ? Store.uid() : x.id })); }

  function bindSeasons(item) {
    const fresh = () => Store.get(item.id);
    const withList = fn => {
      const it = fresh(); const orig = seasonsOf(it); const list = materialize(it);
      const idx = Math.max(0, orig.findIndex(x => x.id === seasonTab[it.id]));
      fn(list, idx); seasonTab[it.id] = list[idx].id; saveSeasons(it, list); render();
    };
    $$('[data-season]').forEach(b => b.onclick = () => { seasonTab[item.id] = b.dataset.season; render(); });
    const setSeen = v => withList((list, i) => { const x = list[i]; x.seen = Math.max(0, x.episodes ? Math.min(x.episodes, v) : v); if (!x.episodes || x.seen < x.episodes) x.complete = false; });
    if ($('#epMinus')) $('#epMinus').onclick = () => setSeen((+$('#epInput').value || 0) - 1);
    if ($('#epPlus')) $('#epPlus').onclick = () => {
      const it = fresh(); const cur = seasonsOf(it).find(x => x.id === seasonTab[it.id]);
      const next = (cur.seen || 0) + 1;
      setSeen(next);
      if (cur.episodes && next === cur.episodes) toast(`<div><b>${esc(cur.label)} fertig</b><small>${esc(it.title)}</small></div>`);
    };
    if ($('#epInput')) $('#epInput').onchange = e => setSeen(Math.round(+e.target.value || 0));
    $('#sDone') && ($('#sDone').onclick = () => {
      const it = fresh(); const cur = seasonsOf(it).find(x => x.id === seasonTab[it.id]);
      withList((list, i) => {
        const x = list[i], partial = partialAir(x);
        if (partial) { x.seen = x.aired; x.complete = false; } else { if (x.episodes) x.seen = x.episodes; x.complete = true; }
      });
      toast(`<div><b>${esc(cur.label)} fertig</b><small>${esc(it.title)}</small></div>`);
    });
    $('#sReset') && ($('#sReset').onclick = () => withList((list, i) => { list[i].seen = 0; list[i].complete = false; }));
    $('#sEdit').onclick = () => seasonEdit(fresh());
    $('#sAdd').onclick = () => seasonEdit(fresh(), true);
    $('#sDel') && ($('#sDel').onclick = () => {
      const it = fresh(); const cur = seasonsOf(it).find(x => x.id === seasonTab[it.id]);
      confirmDialog(`„${esc(cur.label)}“ wird aus ${esc(it.title)} entfernt.`, 'Entfernen', () => {
        const list = materialize(it).filter((x, i) => seasonsOf(it)[i].id !== cur.id);
        const ext = cur.anilistId || cur.tvmazeId;
        if (ext) Store.update(it.id, { removedSeasons: [...new Set([...(it.removedSeasons || []), ext])].slice(-200) });
        delete seasonTab[it.id]; saveSeasons(Store.get(it.id), list); render();
      });
    });
    $('#sLoad').onclick = async () => {
      const b = $('#sLoad'); b.disabled = true; b.textContent = 'Lade…';
      const it = fresh();
      try {
        let loaded = [], patch = {};
        if (it.type === 'anime') {
          let id = it.anilistId || (it.external?.startsWith('anilist:') ? +it.external.split(':')[1] : null);
          if (!id) { const hits = await Lookup.search('anime', it.title); id = hits[0]?.id; }
          loaded = id ? await Lookup.animeSeasons(id) : [];
          patch = { anilistId: id };
        } else {
          let id = it.external?.startsWith('tvmaze:') ? +it.external.split(':')[1] : null;
          if (!id) { const hits = await Lookup.search('series', it.title); id = hits[0]?.id; }
          loaded = id ? await Lookup.seriesSeasons(id, it.cover) : [];
          if (id && !it.external) patch = { external: `tvmaze:${id}` };
        }
        if (!loaded.length) { toast(`<div><b>Nichts auf ${seasonSource(it)} gefunden</b></div>`); render(); return; }
        const old = seasonsOf(it);
        const srcKey = it.type === 'anime' ? 'anilistId' : 'tvmazeId';
        const matched = old.some(o => o[srcKey]);
        const list = loaded.map((x, i) => {
          const prev = matched ? old.find(o => o[srcKey] && o[srcKey] === x[srcKey]) : (it.type === 'series' ? old[i] : null);
          const done = prev && seasonDone(prev);
          return { ...x, id: (prev && !isImplicit(prev)) ? prev.id : Store.uid(), seen: done ? (x.episodes || prev.seen || 0) : Math.min(prev?.seen || 0, x.episodes || Infinity), complete: !!done };
        });
        if (!matched && it.type === 'anime') distributeSeen(list.filter(x => x.format !== 'MOVIE'), old.reduce((a, x) => a + (x.seen || 0), 0), it.status === 'done');
        delete seasonTab[it.id];
        if (Object.keys(patch).length) Store.update(it.id, patch);
        saveSeasons(Store.get(it.id), list, { autoStatus: false });
        toast(`<div><b>${list.length} ${it.type === 'anime' ? (list.length === 1 ? 'Teil' : 'Teile') : (list.length === 1 ? 'Staffel' : 'Staffeln')} geladen</b><small>${esc(it.title)}</small></div>`);
        EpisodeWatch.check({ force: true, ids: [it.id] }).then(() => render());
      } catch { toast(`<div><b>${seasonSource(it)} nicht erreichbar</b><small>Später nochmal versuchen</small></div>`); }
      render();
    };
  }

  function seasonEdit(item, isNew = false) {
    const list = seasonsOf(item);
    const cur = isNew ? { label: `Staffel ${list.filter(x => x.format !== 'MOVIE').length + 1}`, title: '', episodes: null, seen: 0, year: null, format: 'TV' } : list.find(x => x.id === seasonTab[item.id]);
    openModal({
      title: isNew ? 'Staffel hinzufügen' : 'Staffel bearbeiten',
      body: `<form class="form" id="sf" novalidate>
        ${item.type === 'anime' ? `<div class="field"><label>Art</label><div class="seg" id="sKind"><button type="button" data-k="TV" class="${cur.format !== 'MOVIE' ? 'on' : ''}">Staffel</button><button type="button" data-k="MOVIE" class="${cur.format === 'MOVIE' ? 'on' : ''}">Film</button></div></div>` : ''}
        <div class="grid-2">
          <div class="field"><label>Bezeichnung</label><input class="input" name="label" value="${esc(cur.label)}" placeholder="Staffel 2"><div class="field-error" id="sErr"></div></div>
          <div class="field"><label>Jahr</label><input class="input" name="year" type="number" value="${cur.year || ''}" placeholder="2024"></div>
        </div>
        <div class="field"><label>Titel (optional)</label><input class="input" name="title" value="${esc(cur.title || '')}" placeholder="${esc(item.title)}"></div>
        <div class="grid-2">
          <div class="field"><label>Folgen gesamt</label><input class="input" name="episodes" type="number" min="0" value="${cur.episodes || ''}" placeholder="12"></div>
          <div class="field"><label>Gesehene Folgen</label><input class="input" name="seen" type="number" min="0" value="${cur.seen || 0}"></div>
        </div>
      </form>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="sSave">Speichern</button>`,
      onMount: (m, close) => {
        const F = $('#sf', m).elements;
        let kind = cur.format === 'MOVIE' ? 'MOVIE' : 'TV';
        $$('#sKind button', m).forEach(b => b.onclick = () => {
          kind = b.dataset.k; $$('#sKind button', m).forEach(x => x.classList.toggle('on', x === b));
          if (isNew) {
            F.label.value = kind === 'MOVIE' ? `Film${list.filter(x => x.format === 'MOVIE').length ? ' ' + (list.filter(x => x.format === 'MOVIE').length + 1) : ''}` : `Staffel ${list.filter(x => x.format !== 'MOVIE').length + 1}`;
            if (kind === 'MOVIE' && !F.episodes.value) F.episodes.value = 1;
          }
        });
        F.label.oninput = () => { $('#sErr', m).textContent = ''; };
        $('#sSave', m).onclick = () => {
          const label = F.label.value.trim();
          if (!label) { $('#sErr', m).textContent = 'Gib eine Bezeichnung ein.'; F.label.focus(); return; }
          const episodes = F.episodes.value ? +F.episodes.value : null;
          const seen = Math.max(0, episodes ? Math.min(episodes, +F.seen.value || 0) : +F.seen.value || 0);
          const patch = { label, title: F.title.value.trim() || item.title, year: F.year.value ? +F.year.value : null, episodes, seen, ...(item.type === 'anime' ? { format: kind } : {}) };
          const next = materialize(item);
          if (isNew) { const s2 = { id: Store.uid(), format: 'TV', cover: '', ...patch }; next.push(s2); seasonTab[item.id] = s2.id; }
          else { const i = list.findIndex(x => x.id === cur.id); Object.assign(next[i], patch); if (episodes && seen < episodes) next[i].complete = false; seasonTab[item.id] = next[i].id; }
          saveSeasons(item, next);
          close(); render();
        };
      },
    });
  }

  function viewDetail(id) {
    const item = Store.get(id);
    if (!item) { view.innerHTML = `<div class="empty"><h3>Nicht gefunden</h3><p>Dieser Eintrag existiert nicht mehr.</p><a class="btn" href="#/">Zur Übersicht</a></div>`; return; }
    const T = TYPES[item.type];
    const meta = [];
    if (item.platform) meta.push(esc(item.platform));
    if (item.genre && item.type === 'game') meta.push(Trophies.GENRES[item.genre]);
    if (item.year) meta.push(item.year);
    if (item.type === 'series' && item.seasons) meta.push(`${item.seasons} ${item.seasons === 1 ? 'Staffel' : 'Staffeln'}`);
    if (item.type === 'anime' && item.seasonList?.length > 1) {
      const nS = item.seasonList.filter(x => x.format !== 'MOVIE').length, nF = item.seasonList.length - nS;
      if (nS) meta.push(`${nS} ${nS === 1 ? 'Staffel' : 'Staffeln'}`);
      if (nF) meta.push(`${nF} ${nF === 1 ? 'Film' : 'Filme'}`);
    }
    if (item.type === 'anime' && item.episodes) meta.push(`${item.episodes} Folgen`);
    if (item.type === 'manga') { if (item.kind) meta.push(esc(item.kind)); if (item.authors?.length) meta.push(esc(item.authors.join(', '))); if (item.mdStatus) meta.push({ ongoing: 'Laufend', completed: 'Abgeschlossen', hiatus: 'Pausiert', cancelled: 'Eingestellt' }[item.mdStatus] || esc(item.mdStatus)); }
    if (item.runtime) meta.push(`${item.runtime} Min.`);
    if (item.genres?.length && item.type !== 'game') meta.push(esc(item.genres.slice(0, 3).join(', ')));
    if (item.released) meta.push(`Erschienen ${fmtDate(item.released)}`);

    let trophySection = '';
    let ring = '';
    if (item.type === 'game') {
      const list = item.trophies || [];
      const p = Trophies.progress(list);
      const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
      const C = 2 * Math.PI * 40;
      ring = list.length ? `<div class="ring-wrap">
        <div class="ring"><svg viewBox="0 0 92 92"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs>
          <circle class="track" cx="46" cy="46" r="40"/><circle class="val" cx="46" cy="46" r="40" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg>
          <div class="ring-label"><b>${pct}%</b><span>${p.done}/${p.total}</span></div></div>
        <div class="tier-box">${Trophies.ORDER.filter(t => p.counts[t][1]).map(t => `<div class="tier-stat"><div class="t">${Trophies.icon(t, 14)} ${Trophies.TIERS[t].label}</div><b>${p.counts[t][0]}<span class="muted" style="font-size:13px;font-weight:500"> / ${p.counts[t][1]}</span></b></div>`).join('')}</div>
      </div>` : '';

      const src = { generated: 'Genre-Vorlage', ai: 'Von der KI passend zum Spiel erstellt', imported: 'Importiert', custom: 'Eigene Liste', psn: 'Von PlayStation', steam: 'Von Steam · Stufe nach Seltenheit' }[item.trophySource] || '';
      const sorted = list.slice().sort((a, b) => Trophies.ORDER.indexOf(a.tier) - Trophies.ORDER.indexOf(b.tier));
      const filtered = sorted.filter(t => detailFilter.value === 'all' || (detailFilter.value === 'open' ? !t.done : t.done));
      const h = hoursOf(item), manual = item.playH != null, auto = item.playMin != null;
      const playBox = `<section class="section"><div class="play-box ${h == null ? 'empty' : ''}">
        <div class="play-icon">${I.clock}</div>
        <div class="grow">${h != null
          ? `<div class="play-big">${fmtHours(h)}</div><div class="play-src">${manual ? `Selbst eingetragen${auto ? ` · ${PLAY_SRC[item.playSrc] || 'Automatisch'}: ${fmtHours(item.playMin / 60)} <button type="button" class="link-btn" id="playAuto">übernehmen</button>` : ''}` : `Von <b>${PLAY_SRC[item.playSrc] || 'automatisch'}</b>${item.lastPlayed ? ` · zuletzt gespielt ${relTime(item.lastPlayed)}` : ''}`}</div>`
          : `<div class="play-big muted">Noch keine Spielzeit</div><div class="play-src">${['Steam', 'PS5', 'PS4'].includes(item.platform) ? 'Kommt beim nächsten Sync automatisch, oder trag sie selbst ein' : `Für ${esc(item.platform || 'diese Plattform')} gibt es keine automatische Angabe`}</div>`}</div>
        <div class="play-btns">${h != null ? `<button class="btn btn-sm" id="playPlus">+1 h</button><button class="btn btn-sm" id="playEdit">Ändern</button>` : `<button class="btn btn-sm btn-primary" id="playEdit">Eintragen</button>`}</div>
      </div></section>`;
      trophySection = playBox + `<section class="section">
        <div class="trophy-head">
          <div><h2 class="section-title" style="margin:0">Trophäen</h2>${src ? `<div class="tiny">${src}</div>` : ''}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${list.length ? `<div class="chips" id="tFilter">${[['all', 'Alle'], ['open', 'Offen'], ['done', 'Verdient']].map(([k, v]) => `<button class="chip ${detailFilter.value === k ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>` : ''}
            ${list.length ? (list.every(t => t.done) ? `<button class="btn btn-sm" id="tAll" data-mode="reset">Alle zurücksetzen</button>` : `<button class="btn btn-sm btn-primary" id="tAll" data-mode="all">${I.check} Alle abhaken</button>`) : ''}
            <button class="btn btn-sm" id="tAdd">${I.plus} Eigene</button>
            <button class="btn btn-sm" id="tImp">${I.paste} Liste einfügen</button>
            ${item.psnId && PSN.connected() ? `<button class="btn btn-sm" id="tPsn">${I.refresh} Von PlayStation</button>` : ''}
            ${Steam.connected() && (item.steamAppId || ['Steam', 'PC', 'Steam Deck'].includes(item.platform)) ? `<button class="btn btn-sm" id="tSteam">${I.refresh} Von Steam</button>` : ''}
            <button class="btn btn-sm" id="tGen">${I.sparkle} Erstellen</button>
          </div>
        </div>
        ${list.length ? `<div class="trophy-list">${filtered.map(t => trophyRow(t, item)).join('') || '<div class="list-empty">Nichts in dieser Ansicht</div>'}</div>`
          : `<div class="empty" style="padding:44px 20px"><div class="empty-icon">${I.trophy}</div><h3>Noch keine Trophäen</h3><p>${isPS(item.platform) ? 'Füge die offizielle Liste ein oder lass eine erstellen.' : 'Für dieses Spiel gibt es keine offiziellen Trophäen? Lass dir eine Liste erstellen.'}</p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" id="tGen2">${I.sparkle} Trophäen erstellen</button><button class="btn" id="tImp2">${I.paste} Liste einfügen</button></div></div>`}
      </section>`;
    }

    let seriesBlock = '';
    if (item.type === 'anime' && item.episodes && !item.seasonList?.length) {
      seriesBlock = `<div style="margin-top:18px;max-width:360px"><div class="tiny" style="margin-bottom:6px">Fortschritt: Folge ${item.episodesSeen || 0} von ${item.episodes}</div><div class="bar"><i style="width:${Math.min(100, Math.round((item.episodesSeen || 0) / item.episodes * 100))}%"></i></div></div>`;
    }
    if (false && item.type === 'series' && item.seasons) {
      seriesBlock = `<div style="margin-top:18px;max-width:360px"><div class="tiny" style="margin-bottom:6px">Fortschritt: Staffel ${item.seasonSeen || 0} von ${item.seasons}</div><div class="bar"><i style="width:${Math.min(100, Math.round((item.seasonSeen || 0) / item.seasons * 100))}%"></i></div></div>`;
    }

    view.innerHTML = `<div class="${A()}">
      <a class="back" href="#/${T.route}">${I.back} ${T.plural}</a>
      <div class="hero">
        <div class="hero-bg">${item.cover ? `<img src="${esc(item.cover)}" alt="" onerror="this.remove()">` : coverHTML(item, { noTitle: true })}</div>
        <div class="cover">${coverHTML(item)}</div>
        <div class="hero-info">
          <div class="hero-head">
            ${statusPill(item)}${(() => { const r = releaseInfo(item); return r ? `<span class="status-pill st-upcoming">${I.calendar} ${r.date && !r.year ? `Erscheint am ${new Date(r.date + 'T00:00:00').toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}` : esc(releaseLabel(r))}</span>` : ''; })()}
            <h1 class="hero-title">${esc(item.title)}</h1>
            <div class="hero-meta">${meta.join('<span class="dot"></span>')}</div>
            <div class="hero-stars" style="margin-top:12px">${starsInput(item.rating, 'heroRating')}</div>
          </div>
          ${item.notes ? `<div class="hero-notes">${esc(item.notes)}</div>` : ''}
          ${item.summary ? `<div class="hero-summary" id="heroSummary">${esc(item.summary)}</div><button class="more-btn" id="moreBtn" type="button" hidden aria-expanded="false">Mehr lesen</button>` : ''}
          ${item.external ? `<div class="tiny" style="margin-top:8px">Infos von ${{ tvmaze: 'TVmaze', tmdb: 'TMDB', wikidata: 'Wikipedia / Wikidata', rawg: 'RAWG', anilist: 'AniList', livechart: 'LiveChart', mangadex: 'MangaDex' }[item.external.split(':')[0]] || 'externer Datenbank'}</div>` : ''}
          ${ring}${seriesBlock}
          <div class="hero-actions">
            <select class="input" id="quickStatus" style="width:auto">${Object.entries(STATUS[item.type]).map(([k, v]) => `<option value="${k}" ${k === item.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <button class="btn" id="editBtn">${I.edit} Bearbeiten</button>
            <button class="btn btn-ghost btn-danger" id="delBtn">${I.trash} Löschen</button>
          </div>
        </div>
      </div>
      ${trophySection}${['anime', 'series'].includes(item.type) ? seasonSection(item) : ''}${item.type === 'manga' ? mangaSection(item) : ''}
    </div>`;

    bindStars(view);
    const sumEl = $('#heroSummary'), moreBtn = $('#moreBtn');
    if (sumEl && moreBtn) {
      requestAnimationFrame(() => { if (sumEl.scrollHeight > sumEl.clientHeight + 2) moreBtn.hidden = false; });
      moreBtn.onclick = () => {
        const open = sumEl.classList.toggle('open');
        moreBtn.textContent = open ? 'Weniger anzeigen' : 'Mehr lesen';
        moreBtn.setAttribute('aria-expanded', String(open));
      };
    }
    if (['anime', 'series'].includes(item.type)) bindSeasons(item);
    if (item.type === 'manga') bindManga(item);
    $('[data-stars="heroRating"]').addEventListener('change', e => { Store.update(item.id, { rating: e.detail }); });
    $('#quickStatus').onchange = e => { Store.update(item.id, { status: e.target.value }); render(); };
    $('#editBtn').onclick = () => itemForm(item.type, item);
    $('#delBtn').onclick = () => confirmDialog(`„${esc(item.title)}“ wird mit allen Trophäen gelöscht.`, 'Löschen', () => { Store.remove(item.id); location.hash = `#/${T.route}`; });

    if (item.type === 'game') {
      const g = () => Store.get(item.id);
      $('#tAdd').onclick = () => trophyEdit(g());
      $('#tAll') && ($('#tAll').onclick = () => {
        const game = g(); const all = $('#tAll').dataset.mode === 'all';
        const open = game.trophies.filter(t => t.tier !== 'platinum' && !t.done).length;
        confirmDialog(all
          ? `Alle ${open} offenen Trophäen in „${esc(game.title)}“ werden als verdient markiert${game.trophies.some(t => t.tier === 'platinum') ? ', inklusive Platin' : ''}.`
          : `Alle Trophäen in „${esc(game.title)}“ werden wieder auf offen gesetzt.`,
          all ? 'Alle abhaken' : 'Zurücksetzen', () => {
            const now = new Date().toISOString();
            game.trophies.forEach(t => { if (t.tier === 'platinum') return; if (all && !t.done) { t.done = true; t.doneAt = now; } if (!all) { t.done = false; t.doneAt = null; } });
            const platChange = Trophies.syncPlatinum(game.trophies);
            Store.update(game.id, { trophies: game.trophies, status: platChange === 'earned' ? 'done' : game.status });
            const plat = game.trophies.find(t => t.tier === 'platinum');
            if (all) {
              if (platChange === 'earned' && plat) trophyToast(plat, game);
              else toast(`<div><b>${open} Trophäen verdient</b><small>${esc(game.title)}</small></div>`);
            } else toast(`<div><b>Trophäen zurückgesetzt</b></div>`);
            render();
          });
      });
      $('#tImp').onclick = () => trophyImport(g());
      $('#tPsn') && ($('#tPsn').onclick = async () => {
        const b = $('#tPsn'); b.disabled = true; b.textContent = 'Lade…';
        try { const r = await PSN.syncOne(g()); toast(r ? `<div><b>Trophäen aktualisiert</b><small>${r.filter(t => t.done).length} von ${r.length} verdient</small></div>` : `<div><b>Nicht im PlayStation-Verlauf gefunden</b></div>`); }
        catch (err) { toast(`<div><b>${err.code === 'expired' ? 'PlayStation-Anmeldung abgelaufen' : 'PlayStation nicht erreichbar'}</b><small>${err.code === 'expired' ? 'Unter Daten neu verbinden' : 'Später nochmal versuchen'}</small></div>`); }
        render();
      });
      $('#tSteam') && ($('#tSteam').onclick = async () => {
        const b = $('#tSteam'); b.disabled = true; b.textContent = 'Lade…';
        try {
          const game = g();
          const hit = game.steamAppId ? { appid: game.steamAppId } : await Steam.find(game.title);
          if (!hit) toast(`<div><b>Auf Steam nicht gefunden</b><small>Prüfe den Titel des Spiels</small></div>`);
          else {
            const res = await Steam.achievementsFor(hit.appid);
            if (!res.achievements.length) toast(`<div><b>Keine Steam-Erfolge</b><small>Dieses Spiel hat auf Steam keine Erfolge</small></div>`);
            else {
              Store.update(game.id, Steam.patchFor(game, hit.appid, res));
              const t = Store.get(game.id).trophies;
              toast(`<div><b>Erfolge geladen</b><small>${t.filter(x => x.done).length} von ${t.length} verdient${res.playerError === 'profile_private' ? ' · Profil privat' : ''}</small></div>`);
            }
          }
        } catch (err) { toast(`<div><b>${err.code === 'key_rejected' ? 'Steam lehnt den Schlüssel ab' : 'Steam nicht erreichbar'}</b><small>${err.code === 'key_rejected' ? 'Unter Daten neu verbinden' : 'Später nochmal versuchen'}</small></div>`); }
        render();
      });
      $('#playPlus') && ($('#playPlus').onclick = () => { const it = g(); Store.update(it.id, { playH: Math.round((hoursOf(it) || 0)) + 1 }); render(); });
      $('#playAuto') && ($('#playAuto').onclick = () => { Store.update(g().id, { playH: null }); render(); });
      $('#playEdit') && ($('#playEdit').onclick = () => playtimeEditor(g()));
      $('#tGen').onclick = () => (g().trophies?.length ? trophyGenerate(g()) : trophyGenerate(g()));
      $('#tGen2') && ($('#tGen2').onclick = () => trophyGenerate(g()));
      $('#tImp2') && ($('#tImp2').onclick = () => trophyImport(g()));
      $$('#tFilter .chip').forEach(c => c.onclick = () => { detailFilter.value = c.dataset.f; render(); });
      $$('[data-toggle]').forEach(b => b.onclick = () => {
        const game = g(); const t = game.trophies.find(x => x.id === b.dataset.toggle);
        if (!t || t.tier === 'platinum') { if (t) toast(`<div><b>Platin kommt von allein</b><small>Hake alle anderen Trophäen ab</small></div>`); return; }
        t.done = !t.done; t.doneAt = t.done ? new Date().toISOString() : null;
        const platChange = Trophies.syncPlatinum(game.trophies);
        Store.update(game.id, { trophies: game.trophies, status: platChange === 'earned' ? 'done' : game.status });
        if (t.done) trophyToast(t, game);
        if (platChange === 'earned') setTimeout(() => trophyToast(game.trophies.find(x => x.tier === 'platinum'), game), 500);
        render();
      });
      $$('[data-tedit]').forEach(b => b.onclick = () => { const game = g(); trophyEdit(game, game.trophies.find(x => x.id === b.dataset.tedit)); });
      $$('[data-tdel]').forEach(b => b.onclick = () => {
        const game = g(); const list = game.trophies.filter(x => x.id !== b.dataset.tdel);
        Trophies.syncPlatinum(list); Store.update(game.id, { trophies: list }); render();
      });
    }
  }

  function listRow(item, sub) {
    return `<a class="list-row" href="#/item/${item.id}"><div class="thumb">${coverHTML(item, { noTitle: true })}</div>
      <div class="grow"><div class="title">${esc(item.title)}</div><div class="sub">${sub}</div></div></a>`;
  }

  function recentTrophies(limit = 6) {
    const out = [];
    Store.all('game').forEach(g => (g.trophies || []).forEach(t => { if (t.done && t.doneAt) out.push({ t, g }); }));
    return out.sort((a, b) => b.t.doneAt.localeCompare(a.t.doneAt)).slice(0, limit);
  }

  function viewHome() {
    const games = Store.all('game'), series = Store.all('series'), movies = Store.all('movie'), animes = Store.all('anime'), mangas = Store.all('manga');
    const s = allTrophyStats();
    const total = games.length + series.length + movies.length + animes.length + mangas.length;
    const hour = new Date().getHours();
    const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
    const active = [...mangas, ...series, ...animes].filter(i => i.status === 'active' && newCount(i) > 0).concat([...games, ...series, ...animes, ...mangas].filter(i => i.status === 'active' && !(newCount(i) > 0))).slice(0, 6);
    const recent = recentTrophies();

    if (!total) {
      view.innerHTML = `<div class="${A()}"><div class="page-head"><div><h1 class="page-title">${greet}</h1><p class="page-sub">Dein Regal ist noch leer. Womit fangen wir an?</p></div></div>
        <div class="stats">${ORDER_TYPES.map(t => `<button class="stat" data-add="${t}" style="text-align:left;cursor:pointer;color:inherit">
          <div class="stat-label">${typeIcon(t).replace('<svg', '<svg style="width:18px;height:18px"')} ${TYPES[t].plural}</div>
          <div class="stat-value" style="font-size:20px;margin-top:10px">${TYPES[t].label} hinzufügen</div><div class="stat-hint">${t === 'game' ? 'Mit Trophäen zum Abhaken' : t === 'series' ? 'Mit Staffel-Fortschritt' : t === 'manga' ? 'Kapitel zählen sich selbst hoch' : t === 'anime' ? 'Mit allen Staffeln' : 'Mit Bewertung'}</div></button>`).join('')}</div></div>`;
      return;
    }

    const platCount = s.counts.platinum;
    view.innerHTML = `<div class="${A()}">
      <div class="page-head"><div><h1 class="page-title">${greet}</h1><p class="page-sub">${total} Einträge in deinem Regal</p></div>
        <div class="head-actions" style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="#/upcoming">${I.calendar} Demnächst</a><a class="btn" href="#/stats">${I.chart} Statistik</a><button class="btn btn-primary" data-addpick>${I.plus} Hinzufügen</button></div></div>
      <div class="stats">
        <a class="stat feature" href="#/trophies"><div class="stat-label">${I.trophy} Trophäen-Level</div><div class="stat-value">${s.level.level}</div><div class="bar" style="margin-top:8px"><i style="width:${s.level.pct}%"></i></div><div class="stat-hint" style="margin-top:6px">${s.earned} von ${s.total} Trophäen</div></a>
        <a class="stat" href="#/trophies"><div class="stat-label">${Trophies.icon('platinum', 16)} Platin</div><div class="stat-value" style="color:var(--platinum)">${platCount}</div><div class="stat-hint">${games.filter(g => g.status === 'done').length} Spiele durchgespielt</div></a>
        <a class="stat" href="#/games"><div class="stat-label">${I.game} Spiele</div><div class="stat-value">${games.length}</div><div class="stat-hint">${games.filter(g => g.status === 'active').length} am Spielen</div></a>
        <a class="stat" href="#/series"><div class="stat-label">${I.tv} Serien</div><div class="stat-value">${series.length}</div><div class="stat-hint">${series.filter(g => g.status === 'done').length} fertig geschaut</div></a>
        <a class="stat" href="#/manga"><div class="stat-label">${I.book} Manga</div><div class="stat-value">${mangas.length}</div><div class="stat-hint">${(() => { const n = mangas.filter(m => m.status === 'active' && mangaBehind(m) > 0).length; return n ? `${n} mit neuen Kapiteln` : `${mangas.filter(m => m.status === 'active').length} am Lesen`; })()}</div></a>
        <a class="stat" href="#/anime"><div class="stat-label">${I.anime} Anime</div><div class="stat-value">${animes.length}</div><div class="stat-hint">${animes.filter(g => g.status === 'done').length} fertig geschaut</div></a>
        <a class="stat" href="#/movies"><div class="stat-label">${I.film} Filme</div><div class="stat-value">${movies.length}</div><div class="stat-hint">${movies.filter(g => g.status === 'done').length} gesehen</div></a>
      </div>
      <div class="two-col section">
        <div><h2 class="section-title">Gerade dabei</h2><div class="list-card">${active.length ? active.map(i => {
          let sub = TYPES[i.type].label;
          if (i.type === 'game' && i.trophies?.length) { const p = Trophies.progress(i.trophies); sub += ` · ${p.done}/${p.total} Trophäen`; }
          if (i.type === 'series' && i.seasons) sub += ` · Staffel ${i.seasonSeen || 0}/${i.seasons}`;
          if (i.type === 'manga') { const b = mangaBehind(i); sub = `Manga · Kapitel ${fmtCh(i.chaptersRead || 0)}/${i.chapters ? fmtCh(i.chapters) : '?'}${b > 0 ? ` · <span style="color:var(--cyan)">${fmtCh(b)} neu</span>` : ''}`; }
          else if (['anime', 'series'].includes(i.type) && i.seasonList?.some(x => x.episodes)) { const cur = currentSeason(i); const n = episodesBehind(i); sub = `${TYPES[i.type].label} · ${cur.label} · Folge ${cur.seen || 0}/${cur.episodes || '?'}${n > 0 ? ` · <span style="color:var(--cyan)">${n} neu</span>` : ''}`; }
          else if (i.type === 'anime' && i.seasonList?.length > 1) { const cur = currentSeason(i); sub += ` · ${cur.label} · Folge ${cur.seen || 0}/${cur.episodes || '?'}`; }
          else if (i.type === 'anime' && i.episodes) sub += ` · Folge ${i.episodesSeen || 0}/${i.episodes}`;
          return listRow(i, sub);
        }).join('') : '<div class="list-empty">Nichts in Arbeit. Setz bei einem Spiel oder einer Serie den Status auf „Am Spielen“ oder „Am Schauen“.</div>'}</div></div>
        <div><h2 class="section-title">Zuletzt verdient <a href="#/trophies">Alle</a></h2><div class="list-card">${recent.length ? recent.map(({ t, g }) => `
          <a class="list-row" href="#/item/${g.id}"><div class="tbadge">${Trophies.icon(t.tier, 22)}</div><div class="grow"><div class="title">${esc(t.name)}</div><div class="sub">${esc(g.title)} · ${fmtDate(t.doneAt)}</div></div></a>`).join('')
          : '<div class="list-empty">Hake Trophäen in einem Spiel ab, dann erscheinen sie hier.</div>'}</div></div>
      </div>
      ${(() => {
        const fresh = newItems().slice(0, 5), up = upcomingEntries().filter((u, i, all) => all.findIndex(o => o.it.id === u.it.id) === i).slice(0, 5);
        if (!fresh.length && !up.length) return '';
        return `<div class="two-col section">
          <div><h2 class="section-title">Neu für dich <a href="#/upcoming">Alle</a></h2><div class="list-card">${fresh.length ? fresh.map(newRow).join('') : '<div class="list-empty">Du bist überall auf dem neuesten Stand.</div>'}</div></div>
          <div><h2 class="section-title">Demnächst <a href="#/upcoming">Kalender</a></h2><div class="list-card">${up.length ? up.map(u => upcomingRow(u).replace('<div class="sub">', `<div class="sub"><span style="color:var(--lilac)">${esc(fmtWhen(u.at, true).replace(/^am /, ''))}</span> · `)).join('') : '<div class="list-empty">Gerade nichts angekündigt.</div>'}</div></div>
        </div>`;
      })()}
      ${ORDER_TYPES.map(t => {
        const list = Store.all(t).slice(0, 12);
        return list.length ? `<section class="section"><h2 class="section-title">${TYPES[t].plural} <a href="#/${TYPES[t].route}">Alle ansehen</a></h2><div class="home-row">${list.map(cardHTML).join('')}</div></section>` : '';
      }).join('')}
    </div>`;
  }

  function viewTrophies() {
    const s = allTrophyStats();
    const games = Store.all('game').filter(g => g.trophies?.length);
    const recent = recentTrophies(12);
    view.innerHTML = `<div class="${A()}">
      <div class="page-head"><div><h1 class="page-title">Trophäen</h1><p class="page-sub">${s.earned} von ${s.total} verdient · ${s.pts.toLocaleString('de-AT')} Punkte</p></div><a class="btn" href="#/stats">${I.chart} Statistik & Jahresrückblick</a></div>
      <div class="stats">
        <div class="stat feature"><div class="stat-label">${I.trophy} Level</div><div class="stat-value">${s.level.level}</div><div class="bar" style="margin-top:8px"><i style="width:${s.level.pct}%"></i></div><div class="stat-hint" style="margin-top:6px">Noch ${s.level.need - s.level.into} Punkte bis Level ${s.level.level + 1}</div></div>
        ${Trophies.ORDER.map(t => `<div class="stat"><div class="stat-label">${Trophies.icon(t, 16)} ${Trophies.TIERS[t].label}</div><div class="stat-value" style="color:${Trophies.TIERS[t].color}">${s.counts[t]}</div><div class="stat-hint">${Trophies.TIERS[t].points} Punkte pro Stück</div></div>`).join('')}
      </div>
      <div class="two-col section">
        <div><h2 class="section-title">Spiele nach Fortschritt</h2><div class="list-card">${games.length ? games
          .map(g => ({ g, p: Trophies.progress(g.trophies) }))
          .sort((a, b) => b.p.done / b.p.total - a.p.done / a.p.total)
          .map(({ g, p }) => `<a class="list-row" href="#/item/${g.id}"><div class="thumb">${coverHTML(g, { noTitle: true })}</div>
            <div class="grow"><div class="title">${esc(g.title)} ${g.trophies.some(t => t.tier === 'platinum' && t.done) ? Trophies.icon('platinum', 15) : ''}</div>
            <div class="sub">${esc(g.platform || '')} · ${p.done}/${p.total}</div><div class="bar" style="margin-top:6px"><i style="width:${Math.round(p.done / p.total * 100)}%"></i></div></div>
            <b style="font-family:var(--display);font-size:15px;min-width:42px;text-align:right">${Math.round(p.done / p.total * 100)}%</b></a>`).join('')
          : '<div class="list-empty">Noch keine Spiele mit Trophäen.</div>'}</div></div>
        <div><h2 class="section-title">Zuletzt verdient</h2><div class="list-card">${recent.length ? recent.map(({ t, g }) => `
          <a class="list-row" href="#/item/${g.id}"><div class="tbadge">${Trophies.icon(t.tier, 22)}</div><div class="grow"><div class="title">${esc(t.name)}</div><div class="sub">${esc(g.title)} · ${fmtDate(t.doneAt)}</div></div></a>`).join('')
          : '<div class="list-empty">Noch nichts verdient.</div>'}</div></div>
      </div>
    </div>`;
  }

  /* ---------- Statistik & Jahresrückblick ---------- */
  const statsState = { year: String(new Date().getFullYear()) };
  const MONTHS = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const MONTHS_LONG = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const yearOf = iso => iso ? new Date(iso).getFullYear() : null;

  function collectStats(year) {
    const all = year === 'all';
    const inPeriod = iso => !!iso && (all || String(yearOf(iso)) === year);
    const items = Store.all();
    const trophies = [];
    items.filter(i => i.type === 'game').forEach(g => (g.trophies || []).forEach(t => { if (t.done && t.doneAt) trophies.push({ t, g }); }));
    trophies.sort((a, b) => a.t.doneAt.localeCompare(b.t.doneAt));
    const plats = trophies.filter(x => x.t.tier === 'platinum').map((x, i) => ({ ...x, n: i + 1 }));
    const periodTrophies = trophies.filter(x => inPeriod(x.t.doneAt));
    const years = new Set([String(new Date().getFullYear())]);
    trophies.forEach(x => years.add(String(yearOf(x.t.doneAt))));
    items.forEach(i => { if (i.finishedAt) years.add(String(yearOf(i.finishedAt))); (i.watchLog || []).forEach(w => years.add(String(yearOf(w.at)))); });

    // Balken: Monate eines Jahres oder Jahre insgesamt
    let buckets;
    if (all) {
      const ys = [...years].map(Number).sort((a, b) => a - b);
      const from = ys[0], to = ys[ys.length - 1];
      buckets = Array.from({ length: to - from + 1 }, (_, i) => ({ key: from + i, label: String(from + i), long: String(from + i), tiers: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, episodes: 0 }));
    } else {
      buckets = MONTHS.map((m, i) => ({ key: i, label: m, long: `${MONTHS_LONG[i]} ${year}`, tiers: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, episodes: 0 }));
    }
    const bucketOf = iso => { const d = new Date(iso); return all ? buckets.find(b => b.key === d.getFullYear()) : buckets[d.getMonth()]; };
    periodTrophies.forEach(x => { const b = bucketOf(x.t.doneAt); if (b) b.tiers[x.t.tier]++; });
    let episodes = 0, chapters = 0;
    items.forEach(i => (i.readLog || []).forEach(w => { if (inPeriod(w.at)) chapters += w.n; }));
    items.forEach(i => (i.watchLog || []).forEach(w => { if (inPeriod(w.at)) { episodes += w.n; const b = bucketOf(w.at); if (b) b.episodes += w.n; } }));

    const finished = items.filter(i => inPeriod(i.finishedAt)).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
    const rare = periodTrophies.filter(x => x.t.rarity != null).sort((a, b) => a.t.rarity - b.t.rarity).slice(0, 5);
    const rated = (all ? items : finished).filter(i => i.rating).sort((a, b) => b.rating - a.rating || (b.finishedAt || '').localeCompare(a.finishedAt || '')).slice(0, 6);
    const tierCount = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    periodTrophies.forEach(x => tierCount[x.t.tier]++);
    const busiest = buckets.reduce((best, b) => { const n = Object.values(b.tiers).reduce((a, c) => a + c, 0); return n > best.n ? { n, b } : best; }, { n: 0, b: null });
    return {
      all, years: [...years].sort().reverse(), buckets, trophies: periodTrophies, tierCount, episodes, chapters,
      plats: plats.filter(x => inPeriod(x.t.doneAt)).reverse(), allPlats: plats.length, finished, rare, rated, busiest,
      undatedFinished: all ? items.filter(i => i.status === 'done' && !i.finishedAt).length : 0,
    };
  }

  function niceTicks(values) {
    const max = Math.max(1, ...values);
    const mag = Math.pow(10, Math.floor(Math.log10(max)));
    const step = max <= 4 ? 1 : max <= 10 ? 2 : [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10].map(f => f * mag).filter(Number.isInteger).find(st => max / st <= 5) || mag * 10;
    const top = Math.ceil(max / step) * step;
    const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
    return { top, ticks };
  }

  function stackedChart(st) {
    const order = ['bronze', 'silver', 'gold', 'platinum'];
    const totals = st.buckets.map(b => order.reduce((a, t) => a + b.tiers[t], 0));
    const { top, ticks } = niceTicks(totals);
    return `<div class="chart" role="img" aria-label="Verdiente Trophäen ${st.all ? 'pro Jahr' : 'pro Monat'}: ${st.buckets.map((b, i) => `${b.long} ${totals[i]}`).join(', ')}">
      <div class="chart-legend">${order.slice().reverse().map(t => `<span>${Trophies.icon(t, 14)} ${Trophies.TIERS[t].label}</span>`).join('')}</div>
      <div class="chart-plot">
        <div class="chart-grid">${ticks.slice().reverse().map(v => `<div class="tick"><span>${v}</span></div>`).join('')}</div>
        <div class="chart-bars" style="--cols:${st.buckets.length}">${st.buckets.map((b, i) => `
          <div class="chart-col" data-tip="${esc(b.long)}|${order.slice().reverse().map(t => `${Trophies.TIERS[t].label}: ${b.tiers[t]}`).join('|')}|Gesamt: ${totals[i]}">
            <div class="stack" style="height:${totals[i] / top * 100}%">${order.filter(t => b.tiers[t]).map(t => `<i style="flex:${b.tiers[t]};background:${Trophies.TIERS[t].hex}"></i>`).join('')}</div>
          </div>`).join('')}</div>
      </div>
      <div class="chart-x" style="--cols:${st.buckets.length}">${st.buckets.map(b => `<span>${b.label}</span>`).join('')}</div>
    </div>`;
  }

  function simpleChart(st, key, label) {
    const vals = st.buckets.map(b => b[key]);
    const { top: max, ticks } = niceTicks(vals);
    return `<div class="chart" role="img" aria-label="${label}: ${st.buckets.map((b, i) => `${b.long} ${vals[i]}`).join(', ')}">
      <div class="chart-plot">
        <div class="chart-grid">${ticks.slice().reverse().map(v => `<div class="tick"><span>${v.toLocaleString('de-AT')}</span></div>`).join('')}</div>
        <div class="chart-bars" style="--cols:${st.buckets.length}">${st.buckets.map((b, i) => `
          <div class="chart-col" data-tip="${esc(b.long)}|${label}: ${vals[i]}"><div class="stack" style="height:${vals[i] / max * 100}%">${vals[i] ? `<i style="flex:1;background:var(--violet)"></i>` : ''}</div></div>`).join('')}</div>
      </div>
      <div class="chart-x" style="--cols:${st.buckets.length}">${st.buckets.map(b => `<span>${b.label}</span>`).join('')}</div>
    </div>`;
  }

  /* ---------- Jahresrückblick als Bild (zum Teilen/Speichern, ohne Konto) ---------- */
  function loadImg(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const i = new Image();
      if (!src.startsWith('data:')) i.crossOrigin = 'anonymous';
      const t = setTimeout(() => res(null), 5000);
      i.onload = () => { clearTimeout(t); res(i); };
      i.onerror = () => { clearTimeout(t); res(null); };
      i.src = src;
    });
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitText(ctx, text, max) { if (ctx.measureText(text).width <= max) return text; let t = text; while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }

  async function makeYearCard(st, year) {
    await document.fonts?.ready;
    const W = 1080, H = 1920, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    // Hintergrund
    x.fillStyle = '#0E0B16'; x.fillRect(0, 0, W, H);
    const glow = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(14,11,22,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
    glow(160, 120, 900, 'rgba(139,92,246,.45)'); glow(1000, 1500, 800, 'rgba(34,211,238,.18)'); glow(900, 300, 500, 'rgba(196,181,253,.12)');
    const display = '"Space Grotesk", Inter, sans-serif', body = 'Inter, system-ui, sans-serif';
    // Kopf
    x.fillStyle = '#C4B5FD'; x.font = `600 30px ${body}`; x.letterSpacing = '8px'; x.fillText('NIGHTSHELF', 80, 140); x.letterSpacing = '0px';
    x.fillStyle = '#F4F1FA'; x.font = `700 136px ${display}`; x.fillText(st.all ? 'Mein Regal' : `Mein ${year}`, 72, 300);
    x.fillStyle = '#B8AECD'; x.font = `500 38px ${body}`; x.fillText(st.all ? 'Alles, was ich je gespielt und geschaut habe' : 'Mein Jahr in Spielen, Serien & Anime', 80, 370);
    // Kacheln
    const games = Store.all('game'), hrs = games.reduce((a, g) => a + (hoursOf(g) || 0), 0);
    const by = t => st.finished.filter(i => i.type === t).length;
    const tiles = [
      ['Platin', st.tierCount.platinum, '#22D3EE'],
      ['Trophäen', st.trophies.length, '#E9BE58'],
      ['Spiele fertig', by('game'), '#F4F1FA'],
      ['Folgen gesehen', st.episodes, '#F4F1FA'],
      ['Serien & Anime fertig', by('series') + by('anime'), '#F4F1FA'],
      ['Filme gesehen', by('movie'), '#F4F1FA'],
      ['Manga-Kapitel', Math.round(st.chapters), '#F4F1FA'],
      ...(st.all && hrs ? [['Stunden gespielt', Math.round(hrs), '#C4B5FD']] : []),
    ].filter(t => t[1] > 0).slice(0, 6);
    const tw = (W - 160 - 30) / 2, th = 210;
    tiles.forEach(([label, val, col], i) => {
      const tx = 80 + (i % 2) * (tw + 30), ty = 450 + Math.floor(i / 2) * (th + 30);
      rr(x, tx, ty, tw, th, 36); x.fillStyle = i === 0 ? 'rgba(34,211,238,.10)' : 'rgba(26,21,38,.85)'; x.fill();
      x.strokeStyle = i === 0 ? 'rgba(34,211,238,.45)' : 'rgba(255,255,255,.08)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = col; x.font = `700 92px ${display}`; x.fillText(val.toLocaleString('de-AT'), tx + 40, ty + 120);
      x.fillStyle = '#B8AECD'; x.font = `500 32px ${body}`; x.fillText(label, tx + 42, ty + 172);
    });
    let y = 450 + Math.ceil(Math.max(tiles.length, 1) / 2) * (th + 30) + 40;
    // Highlights mit Covern
    const hi = st.rated.slice(0, 3);
    if (hi.length) {
      x.fillStyle = '#F4F1FA'; x.font = `700 48px ${display}`; x.fillText(st.all ? 'Meine Favoriten' : 'Highlights', 80, y); y += 40;
      const cw = (W - 160 - 2 * 30) / 3, ch = cw * 1.5;
      const imgs = await Promise.all(hi.map(i => loadImg(i.cover)));
      hi.forEach((it, i) => {
        const cx = 80 + i * (cw + 30);
        x.save(); rr(x, cx, y, cw, ch, 28); x.clip();
        const g = x.createLinearGradient(cx, y, cx + cw, y + ch); g.addColorStop(0, '#4c2c8a'); g.addColorStop(1, '#140c22'); x.fillStyle = g; x.fillRect(cx, y, cw, ch);
        const im = imgs[i];
        if (im) { const sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight); const w = im.naturalWidth * sc, h = im.naturalHeight * sc; x.drawImage(im, cx + (cw - w) / 2, y + (ch - h) / 2, w, h); }
        else { x.fillStyle = 'rgba(255,255,255,.9)'; x.font = `700 70px ${display}`; x.fillText(initials(it.title), cx + 28, y + ch - 50); }
        x.restore();
        x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 2; rr(x, cx, y, cw, ch, 28); x.stroke();
        x.fillStyle = '#F4F1FA'; x.font = `600 30px ${body}`; x.fillText(fitText(x, it.title, cw), cx, y + ch + 46);
        x.fillStyle = '#C4B5FD'; x.font = `500 28px ${body}`; x.fillText('★'.repeat(it.rating || 0), cx, y + ch + 86);
      });
      y += ch + 130;
    }
    // Letzte Platin
    const plat = st.plats[0];
    if (plat && y < H - 260) {
      rr(x, 80, y, W - 160, 130, 32); x.fillStyle = 'rgba(26,21,38,.85)'; x.fill(); x.strokeStyle = 'rgba(34,211,238,.35)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = '#22D3EE'; x.font = `600 28px ${body}`; x.fillText(st.all ? 'Letzte Platin' : `Platin #${plat.n}`, 120, y + 52);
      x.fillStyle = '#F4F1FA'; x.font = `600 38px ${body}`; x.fillText(fitText(x, plat.g.title, W - 240), 120, y + 100);
    }
    // Fuß
    x.fillStyle = '#7D7296'; x.font = `500 28px ${body}`; x.fillText('mark-stessl.github.io/nightshelf', 80, H - 80);
    x.textAlign = 'right'; x.fillText(new Date().toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' }), W - 80, H - 80); x.textAlign = 'left';
    return c;
  }

  async function shareYear(st, year) {
    openModal({
      title: st.all ? 'Rückblick teilen' : `Dein ${year} teilen`,
      body: `<div class="share-prev" id="sharePrev"><div class="tiny">Bild wird erstellt…</div></div>`,
      foot: `<button class="btn btn-ghost" data-close>Schließen</button><button class="btn" id="shareSave" disabled>${I.download || I.upload} Speichern</button><button class="btn btn-primary" id="shareGo" disabled>${I.share} Teilen</button>`,
      onMount: async m => {
        const canvas = await makeYearCard(st, year);
        let blob;
        try { blob = await new Promise(r => canvas.toBlob(r, 'image/png')); } catch { blob = null; }
        const prev = $('#sharePrev', m); if (!prev) return;
        if (!blob) { prev.innerHTML = '<div class="tiny">Das Bild konnte nicht erstellt werden.</div>'; return; }
        const url = URL.createObjectURL(blob);
        const name = `nightshelf-${st.all ? 'rueckblick' : year}.png`;
        prev.innerHTML = `<img src="${url}" alt="Jahresrückblick">`;
        const file = new File([blob], name, { type: 'image/png' });
        const go = $('#shareGo', m), save = $('#shareSave', m);
        save.disabled = false;
        save.onclick = () => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          go.disabled = false;
          go.onclick = () => navigator.share({ files: [file], title: 'Nightshelf' }).catch(() => {});
        } else go.remove();
      },
    });
  }

  function viewStats() {
    const st = collectStats(statsState.year);
    if (!st.all && !st.years.includes(statsState.year)) statsState.year = st.years[0];
    const period = st.all ? 'insgesamt' : `in ${statsState.year}`;
    const byType = t => st.finished.filter(i => i.type === t).length;
    view.innerHTML = `<div class="${A()}">
      <div class="page-head"><div><h1 class="page-title">${st.all ? 'Statistik' : `Dein ${statsState.year}`}</h1><p class="page-sub">${st.all ? 'Alles, was du je gespielt und geschaut hast' : 'Dein Jahresrückblick'}</p></div>
        <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;min-width:0"><button class="btn btn-primary" id="shareYear">${I.share} ${st.all ? 'Rückblick teilen' : `${statsState.year} teilen`}</button>
        <div class="chips" id="yearChips">${st.years.map(y => `<button class="chip ${statsState.year === y ? 'on' : ''}" data-y="${y}">${y}</button>`).join('')}<button class="chip ${st.all ? 'on' : ''}" data-y="all">Gesamt</button></div></div></div>

      <div class="stats">
        <div class="stat feature"><div class="stat-label">${I.trophy} Trophäen ${period}</div><div class="stat-value">${st.trophies.length.toLocaleString('de-AT')}</div><div class="stat-hint">${['gold', 'silver', 'bronze'].map(t => `${st.tierCount[t]} ${Trophies.TIERS[t].label}`).join(' · ')}</div></div>
        <div class="stat"><div class="stat-label">${Trophies.icon('platinum', 16)} Platin</div><div class="stat-value" style="color:var(--platinum)">${st.tierCount.platinum}</div><div class="stat-hint">${st.allPlats} insgesamt</div></div>
        <div class="stat"><div class="stat-label">${I.check} Abgeschlossen</div><div class="stat-value">${st.finished.length}</div><div class="stat-hint">${[['game', 'Spiele'], ['series', 'Serien'], ['anime', 'Anime'], ['manga', 'Manga'], ['movie', 'Filme']].filter(([t]) => byType(t)).map(([t, l]) => `${byType(t)} ${l}`).join(' · ') || 'noch nichts mit Datum'}</div></div>
        <div class="stat"><div class="stat-label">${I.tv} Folgen gesehen</div><div class="stat-value">${st.episodes.toLocaleString('de-AT')}</div><div class="stat-hint">Serien und Anime${st.chapters ? ` · ${Math.round(st.chapters).toLocaleString('de-AT')} Manga-Kapitel gelesen` : ''}</div></div>
      </div>

      <section class="section"><h2 class="section-title">Trophäen ${st.all ? 'pro Jahr' : 'pro Monat'}${st.busiest.b ? `<span class="tiny" style="font-family:var(--font)">Stärkster ${st.all ? 'Jahrgang' : 'Monat'}: ${esc(st.busiest.b.long)} mit ${st.busiest.n}</span>` : ''}</h2>
        <div class="panel chart-panel">${st.trophies.length ? stackedChart(st) : '<div class="list-empty">In diesem Zeitraum hast du noch keine Trophäen mit Datum.</div>'}</div></section>

      <div class="two-col section">
        <div><h2 class="section-title">Platin-Chronik</h2><div class="list-card">${st.plats.length ? st.plats.map(({ t, g, n }) => `
          <a class="list-row" href="#/item/${g.id}"><div class="plat-n">#${n}</div><div class="thumb">${coverHTML(g, { noTitle: true })}</div>
            <div class="grow"><div class="title">${esc(g.title)}</div><div class="sub">${esc(t.name)} · ${fmtDate(t.doneAt)}</div></div></a>`).join('')
          : '<div class="list-empty">Keine Platin-Trophäe in diesem Zeitraum.</div>'}</div></div>
        <div>
          <h2 class="section-title">Seltenste Trophäen</h2><div class="list-card" style="margin-bottom:26px">${st.rare.length ? st.rare.map(({ t, g }) => `
            <a class="list-row" href="#/item/${g.id}"><div class="tbadge">${Trophies.icon(t.tier, 22)}</div><div class="grow"><div class="title">${esc(t.name)}</div><div class="sub">${esc(g.title)}</div></div><b class="rare-pct">${String(t.rarity).replace('.', ',')} %</b></a>`).join('')
            : '<div class="list-empty">Seltenheit gibt es nur für Trophäen von PlayStation oder eingefügte Listen.</div>'}</div>
          <h2 class="section-title">${st.all ? 'Bestbewertet' : 'Highlights des Jahres'}</h2><div class="list-card">${st.rated.length ? st.rated.map(i => listRow(i, `${TYPES[i.type].label} · <span class="stars-mini">${'★'.repeat(i.rating)}</span>`)).join('')
            : '<div class="list-empty">Bewerte, was du abgeschlossen hast, dann erscheint es hier.</div>'}</div>
        </div>
      </div>

      ${(() => {
        const games = Store.all('game').filter(g => g.status !== 'planned');
        const withH = games.filter(g => hoursOf(g) > 0).sort((a, b) => hoursOf(b) - hoursOf(a));
        if (!withH.length) return '';
        const total = withH.reduce((a, g) => a + hoursOf(g), 0), missing = games.length - withH.length;
        const src = k => withH.filter(g => g.playH == null && g.playSrc === k).reduce((a, g) => a + g.playMin / 60, 0);
        const manual = withH.filter(g => g.playH != null).reduce((a, g) => a + g.playH, 0);
        const top = withH.slice(0, 5), max = hoursOf(top[0]);
        return `<section class="section"><h2 class="section-title">Spielzeit<span class="tiny" style="font-family:var(--font)">insgesamt, nicht nach Jahren</span></h2>
          <div class="panel play-stats">
            <div class="play-total"><div class="stat-value">${fmtHours(total)}</div><div class="stat-hint">in ${withH.length} ${withH.length === 1 ? 'Spiel' : 'Spielen'}${missing ? ` · ${missing} ${missing === 1 ? 'Spiel' : 'Spiele'} ohne Spielzeit` : ''}</div>
              <div class="play-split">${[['Steam', src('steam')], ['PlayStation', src('psn')], ['Selbst eingetragen', manual]].filter(x => x[1] > 0).map(([l, v]) => `<span><b>${fmtHours(v)}</b> ${l}</span>`).join('')}</div></div>
            <div class="play-bars">${top.map(g => `<a class="play-bar" href="#/item/${g.id}"><span class="n">${esc(g.title)}</span><i style="width:${Math.max(4, hoursOf(g) / max * 100)}%"></i><span class="v">${fmtHours(hoursOf(g))}</span></a>`).join('')}</div>
          </div></section>`;
      })()}

      <section class="section"><h2 class="section-title">Folgen ${st.all ? 'pro Jahr' : 'pro Monat'}</h2>
        <div class="panel chart-panel">${st.episodes ? simpleChart(st, 'episodes', 'Folgen') : '<div class="list-empty">Gezählt wird ab jetzt: Jede Folge, die du bei Serien und Anime mit + abhakst, landet hier.</div>'}</div></section>

      <section class="section"><h2 class="section-title">Abgeschlossen ${period}</h2><div class="list-card">${st.finished.length ? st.finished.slice(0, 30).map(i => listRow(i, `${TYPES[i.type].label} · ${fmtDate(i.finishedAt)}`)).join('')
        : '<div class="list-empty">Noch nichts mit Datum. Wenn du etwas auf „Durchgespielt“, „Fertig geschaut“ oder „Gesehen“ setzt, wird das Datum gespeichert.</div>'}</div>
        ${st.undatedFinished ? `<p class="tiny" style="margin-top:8px">${st.undatedFinished} abgeschlossene Einträge haben kein Datum und fehlen deshalb in den Jahren.</p>` : ''}</section>
    </div>`;

    $$('#yearChips .chip').forEach(c => c.onclick = () => { statsState.year = c.dataset.y; animate = true; render(); animate = false; });
    $('#shareYear').onclick = () => shareYear(st, statsState.year);
    bindChartTips();
  }

  function bindChartTips() {
    let tip = $('#chartTip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'chartTip'; tip.className = 'chart-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    const show = (col, x, y) => {
      const [head, ...rows] = col.dataset.tip.split('|');
      tip.innerHTML = `<b>${head}</b>${rows.map(r => `<span>${r}</span>`).join('')}`;
      tip.style.opacity = '1';
      const r = tip.getBoundingClientRect();
      tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + 'px';
      tip.style.top = Math.max(8, y - r.height - 14) + 'px';
      $$('.chart-col.hover').forEach(c => c.classList.remove('hover')); col.classList.add('hover');
    };
    const hide = () => { tip.style.opacity = '0'; $$('.chart-col.hover').forEach(c => c.classList.remove('hover')); };
    $$('.chart-col').forEach(col => {
      col.onmouseenter = e => show(col, e.clientX, col.getBoundingClientRect().top + col.offsetHeight - (col.querySelector('.stack')?.offsetHeight || 0));
      col.onmousemove = e => show(col, e.clientX, col.getBoundingClientRect().top + col.offsetHeight - (col.querySelector('.stack')?.offsetHeight || 0));
      col.onmouseleave = hide;
      col.onclick = e => show(col, e.clientX, col.getBoundingClientRect().top + col.offsetHeight - (col.querySelector('.stack')?.offsetHeight || 0));
    });
    window.addEventListener('scroll', hide, { once: true });
  }

  function viewSettings() {
    const n = Store.all().length;
    view.innerHTML = `<div class="${A()}" style="max-width:720px">
      <div class="page-head"><div><h1 class="page-title">Daten</h1><p class="page-sub">${n} Einträge sind in diesem Browser gespeichert.</p></div></div>
      <div class="panel" id="syncPanel"></div>
      <div class="panel" id="appPanel"></div>
      <div class="panel" id="aiPanel"></div>
      <div class="panel" id="psnPanel"></div>
      <div class="panel" id="steamPanel"></div>
      <div class="panel"><h3>Automatische Infos</h3><p>Beim Hinzufügen werden Cover, Erscheinungsdatum und Genre automatisch gesucht. Serien und Spiele funktionieren ohne Schlüssel. Für Filme brauchst du einen kostenlosen TMDB-Schlüssel. Er bleibt nur in diesem Browser gespeichert.</p>
        <div class="form">
          <div class="field"><label>Serien · TVmaze</label><div class="key-ok">Aktiv, kein Schlüssel nötig</div></div>
          <div class="field"><label>Filme · TMDB-Schlüssel</label><div class="key-row"><input class="input" id="kTmdb" placeholder="API-Schlüssel oder Lesezugriffs-Token" autocomplete="off" spellcheck="false"><button class="btn" data-test="movie">Testen</button></div>
            <div class="tiny">Kostenlos auf <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" style="color:var(--lilac)">themoviedb.org/settings/api</a></div><div class="tiny" id="tMovie"></div></div>
          <div class="field"><label>Spiele · Wikipedia</label><div class="key-ok">Aktiv, kein Schlüssel nötig</div>
        </div></div>
      <div class="panel"><h3>Sichern</h3><p>Lade alle Spiele, Serien, Filme und Trophäen als Datei herunter. Damit kannst du sie auf ein anderes Gerät mitnehmen oder ein Backup behalten.</p>
        <button class="btn btn-primary" id="exp">${I.download} Backup herunterladen</button></div>
      <div class="panel"><h3>Wiederherstellen</h3><p>Lies eine Nightshelf-Backupdatei ein. Beim Zusammenführen bleiben deine aktuellen Einträge erhalten.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn">${I.upload} Datei zusammenführen<input type="file" accept=".json,application/json" id="impMerge" hidden></label>
        <label class="btn btn-ghost">Datei ersetzt alles<input type="file" accept=".json,application/json" id="impReplace" hidden></label></div>
        <div class="field-error" id="impErr" style="margin-top:8px"></div></div>
      <div class="panel"><h3>Quellen</h3><p style="margin:0">Serien-Infos von <a href="https://www.tvmaze.com" target="_blank" rel="noopener" style="color:var(--lilac)">TVmaze</a> (CC BY-SA), Film-Infos von <a href="https://www.themoviedb.org" target="_blank" rel="noopener" style="color:var(--lilac)">TMDB</a>, Spiele-Infos von <a href="https://www.wikipedia.org" target="_blank" rel="noopener" style="color:var(--lilac)">Wikipedia</a> und <a href="https://www.wikidata.org" target="_blank" rel="noopener" style="color:var(--lilac)">Wikidata</a>. Dieses Produkt nutzt die TMDB-API, ist aber nicht von TMDB unterstützt oder zertifiziert.</p></div>
      <div class="panel"><h3>Zurücksetzen</h3><p>Löscht alle Einträge in diesem Browser. Lade vorher ein Backup herunter.</p>
        <button class="btn btn-danger" id="wipe">${I.trash} Alles löschen</button></div>
    </div>`;
    $('#exp').onclick = () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `nightshelf-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    const doImport = mode => e => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then(txt => {
        try { const c = Store.importJSON(txt, mode); toast(`<div><b>${c} Einträge eingelesen</b></div>`); render(); }
        catch (err) { $('#impErr').textContent = 'Das ist keine gültige Nightshelf-Datei.'; }
      });
    };
    $('#impMerge').onchange = doImport('merge');
    $('#impReplace').onchange = doImport('replace');
    renderPsnPanel();
    renderSteamPanel();
    renderAiPanel();
    renderSyncPanel();
    renderAppPanel();
    const k = Lookup.keys();
    $('#kTmdb').value = k.tmdb || '';
    const saveKeys = () => Lookup.setKeys({ ...Lookup.keys(), tmdb: $('#kTmdb').value.trim() });
    $('#kTmdb').oninput = saveKeys;
    $$('[data-test]').forEach(b => b.onclick = async () => {
      saveKeys();
      const t = b.dataset.test, out = $('#tMovie');
      if (!Lookup.hasKey(t)) { out.innerHTML = '<span style="color:var(--danger)">Trag zuerst einen Schlüssel ein.</span>'; return; }
      out.textContent = 'Teste…';
      try { await Lookup.test(t); out.innerHTML = '<span style="color:var(--cyan)">Funktioniert</span>'; }
      catch (e) { out.innerHTML = `<span style="color:var(--danger)">${e.message === 'key' ? 'Schlüssel wird nicht akzeptiert.' : 'Keine Verbindung.'}</span>`; }
    });
    $('#wipe').onclick = () => confirmDialog('Alle Spiele, Serien, Filme und Trophäen in diesem Browser werden gelöscht.', 'Alles löschen', () => { Store.clear(); render(); });
  }

  /* ---------- PlayStation ---------- */
  function renderPsnPanel() {
    const el = $('#psnPanel'); if (!el) return;
    const st = PSN.state();
    const on = PSN.connected();
    el.innerHTML = `<h3>PlayStation</h3>
      ${on ? `<p>Verbunden. Die Anmeldung gilt bis ${fmtDate(new Date(st.refreshExpiresAt).toISOString())}.${st.lastSync ? ` Zuletzt synchronisiert: ${new Date(st.lastSync).toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" data-psnsync>${I.refresh} Jetzt synchronisieren</button><button class="btn btn-ghost btn-danger" id="psnOff">Trennen</button></div>`
      : `<p>Hol dir alle Spiele, die du auf PS4 und PS5 gespielt hast, mit der echten Trophäenliste und deinen schon verdienten Trophäen.</p>
        <ol class="steps">
          <li>Melde dich auf <a href="https://www.playstation.com" target="_blank" rel="noopener">playstation.com</a> an.</li>
          <li>Öffne danach im selben Browser <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noopener">ca.account.sony.com/api/v1/ssocookie</a>.</li>
          <li>Kopiere den angezeigten Text (oder nur den Wert hinter „npsso“) und füge ihn hier ein.</li>
        </ol>
        <div class="field"><label>NPSSO-Code</label><div class="key-row"><input class="input" id="npsso" type="password" placeholder="64 Zeichen" autocomplete="off" spellcheck="false"><button class="btn btn-primary" id="psnOn">Verbinden</button></div>
          <div class="tiny">Behandle den Code wie ein Passwort und gib ihn niemandem. Er wird nur einmal zum Anmelden verwendet und nicht gespeichert.</div><div class="field-error" id="psnErr"></div></div>`}
      <details class="adv"><summary>Erweitert</summary>
        <div class="field" style="margin-top:10px"><label>Server-Adresse</label><input class="input" id="psnWorker" value="${esc(PSN.worker())}" placeholder="https://nightshelf-psn.….workers.dev" spellcheck="false"></div>
      </details>`;
    $('#psnWorker').onchange = e => PSN.save({ worker: e.target.value.trim() });
    $('#psnOff') && ($('#psnOff').onclick = () => { PSN.disconnect(); renderPsnPanel(); toast('<div><b>PlayStation getrennt</b></div>'); });
    $('#psnOn') && ($('#psnOn').onclick = async () => {
      const b = $('#psnOn'), err = $('#psnErr'), val = $('#npsso').value.trim();
      err.textContent = '';
      if (!val) { err.textContent = 'Füge zuerst den NPSSO-Code ein.'; return; }
      if (!$('#psnWorker').value.trim()) { err.textContent = 'Es ist noch keine Server-Adresse eingetragen.'; return; }
      b.disabled = true; b.textContent = 'Verbinde…';
      try {
        await PSN.connect(val, $('#psnWorker').value);
        renderPsnPanel();
        toast('<div><b>Mit PlayStation verbunden</b></div>');
        runPsnSync();
      } catch (e) {
        b.disabled = false; b.textContent = 'Verbinden';
        err.textContent = e.code === 'npsso_invalid' || e.code === 'auth_failed' ? 'Der Code wird nicht akzeptiert. Hol dir einen neuen (Schritt 2).' : e.code === 'network' ? 'Server nicht erreichbar. Prüfe die Server-Adresse.' : e.code === 'key_required' ? 'Verbinde dieses Gerät zuerst oben unter „Sync zwischen Geräten“ mit deinem Schlüssel.' : 'Verbinden hat nicht geklappt: ' + e.message;
      }
    });
  }

  function renderSteamPanel() {
    const el = $('#steamPanel'); if (!el) return;
    const on = Steam.connected();
    el.innerHTML = `<h3>Steam</h3>
      ${on ? `<p>Verbunden${Steam.profile() ? ` als <b>${esc(Steam.profile())}</b>` : ''}. Beim Hinzufügen von Steam-Spielen werden die Erfolge automatisch geladen${Steam.hasProfile() ? ', schon freigeschaltete werden abgehakt' : ''}.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${Steam.hasProfile() ? `<button class="btn btn-primary" data-steamsync>${I.refresh} Steam-Spiele synchronisieren</button>` : ''}<button class="btn btn-ghost btn-danger" id="steamOff">Trennen</button></div>`
      : `<p>Lade die echten Steam-Erfolge deiner Spiele, mit Seltenheit. Die Stufe richtet sich danach, wie selten ein Erfolg ist.</p>
        <ol class="steps">
          <li>Melde dich auf <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener">steamcommunity.com/dev/apikey</a> an und erstelle einen Schlüssel. Als Domain kannst du z. B. <code>nightshelf</code> eintragen.</li>
          <li>Füge den Schlüssel hier ein. Optional dein Steam-Profil-Link, dann werden freigeschaltete Erfolge abgehakt.</li>
          <li>Für freigeschaltete Erfolge muss in Steam unter Profil → Privatsphäre „Spieldetails: Öffentlich“ eingestellt sein.</li>
        </ol>
        <div class="field"><label>Steam-API-Schlüssel</label><input class="input" id="steamKey" type="password" placeholder="32 Zeichen" autocomplete="off" spellcheck="false"></div>
        <div class="field" style="margin-top:10px"><label>Steam-Profil <span class="tiny">(optional: Link, Name oder ID)</span></label><div class="key-row"><input class="input" id="steamProfile" placeholder="steamcommunity.com/id/…" autocomplete="off" spellcheck="false"><button class="btn btn-primary" id="steamOn">Verbinden</button></div>
          <div class="tiny">Der Schlüssel wird nur auf deinem eigenen Server gespeichert, geschützt durch deinen Sync-Schlüssel.</div><div class="field-error" id="steamErr"></div></div>`}`;
    $('#steamOff') && ($('#steamOff').onclick = async () => { await Steam.disconnect(); renderSteamPanel(); toast('<div><b>Steam getrennt</b></div>'); });
    $('#steamOn') && ($('#steamOn').onclick = async () => {
      const b = $('#steamOn'), err = $('#steamErr');
      const key = $('#steamKey').value.trim(), prof = $('#steamProfile').value.trim();
      err.textContent = '';
      if (!/^[0-9A-Fa-f]{32}$/.test(key)) { err.textContent = 'Der Schlüssel hat 32 Zeichen (Ziffern und A–F).'; return; }
      if (!Sync.enabled()) { err.textContent = 'Verbinde dieses Gerät zuerst oben unter „Sync zwischen Geräten“.'; return; }
      b.disabled = true; b.textContent = 'Verbinde…';
      try {
        const r = await Steam.connect(key, prof);
        renderSteamPanel();
        toast(`<div><b>Mit Steam verbunden</b>${r.name ? `<small>${esc(r.name)}</small>` : ''}</div>`);
      } catch (e) {
        b.disabled = false; b.textContent = 'Verbinden';
        err.textContent = { key_invalid: 'Der Schlüssel hat nicht das richtige Format.', key_rejected: 'Steam akzeptiert den Schlüssel nicht. Kopiere ihn nochmal von der Steam-Seite.', profile_not_found: 'Dieses Steam-Profil wurde nicht gefunden. Nimm den Link zu deinem Profil.', key_required: 'Verbinde dieses Gerät zuerst unter „Sync zwischen Geräten“.' }[e.code] || 'Steam ist gerade nicht erreichbar. Versuch es gleich nochmal.';
      }
    });
  }

  let steamSyncing = false;
  function runSteamSync() {
    if (steamSyncing) return;
    steamSyncing = true;
    openModal({
      title: 'Steam synchronisieren',
      body: `<div id="ssBody"><p class="muted" style="margin:0 0 12px">Lade deine Steam-Bibliothek…</p><div class="bar"><i id="ssBar" style="width:2%"></i></div><p class="tiny" id="ssName" style="margin-top:10px">&nbsp;</p></div>`,
      foot: `<button class="btn" data-close>Im Hintergrund</button>`,
      onMount: () => {
        Steam.syncAll({
          onProgress: (i, total, name) => {
            const bar = $('#ssBar'), nm = $('#ssName'), p = $('#ssBody p');
            if (bar) bar.style.width = Math.round(i / total * 100) + '%';
            if (nm) nm.textContent = `${i} von ${total}: ${name}`;
            if (p) p.textContent = 'Lade Erfolge…';
          },
        }).then(r => {
          steamSyncing = false;
          const msg = `${r.added} neue Spiele, ${r.updated} aktualisiert, ${r.earned} neu verdiente Erfolge${r.failed ? `, ${r.failed} konnten nicht geladen werden` : ''}.`;
          const body = $('#ssBody');
          if (body) body.innerHTML = `<div class="hint-box">${I.check}<div><b style="color:var(--text)">Fertig</b><br>${msg}</div></div>`;
          else toast(`<div><b>Steam synchronisiert</b><small>${msg}</small></div>`);
          render();
        }).catch(e => {
          steamSyncing = false;
          const body = $('#ssBody');
          const msg = e.code === 'profile_private' ? 'Dein Steam-Profil ist privat. Stelle unter Profil → Privatsphäre „Spieldetails: Öffentlich“ ein.' : 'Steam ist gerade nicht erreichbar. Versuch es später nochmal.';
          if (body) body.innerHTML = `<div class="hint-box quota">${I.info}<div>${msg}</div></div>`;
        });
      },
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-steamsync]')) { e.preventDefault(); runSteamSync(); } });

  let syncing = false;
  function runPsnSync() {
    if (syncing) return;
    syncing = true;
    openModal({
      title: 'PlayStation synchronisieren',
      body: `<div id="syncBody"><p class="muted" style="margin:0 0 12px">Lade deine Spieleliste…</p><div class="bar"><i id="syncBar" style="width:2%"></i></div><p class="tiny" id="syncName" style="margin-top:10px">&nbsp;</p></div>`,
      foot: `<button class="btn" data-close>Im Hintergrund</button>`,
      onMount: () => {
        PSN.syncAll({
          onProgress: ({ i, total, name }) => {
            const bar = $('#syncBar'), nm = $('#syncName'), p = $('#syncBody p');
            if (bar) bar.style.width = Math.round(i / total * 100) + '%';
            if (nm) nm.textContent = `${i} von ${total}: ${name}`;
            if (p) p.textContent = 'Lade Trophäen…';
          },
        }).then(r => {
          syncing = false;
          const body = $('#syncBody');
          const msg = `${r.added} neue Spiele, ${r.updated} aktualisiert, ${r.earned} verdiente Trophäen${r.failed ? `, ${r.failed} konnten nicht geladen werden` : ''}.`;
          if (body) body.innerHTML = `<div class="hint-box">${I.check}<div><b style="color:var(--text)">Fertig</b><br>${msg}</div></div>`;
          else toast(`<div><b>PlayStation synchronisiert</b><small>${msg}</small></div>`);
          render();
        }).catch(e => {
          syncing = false;
          const body = $('#syncBody');
          const msg = e.code === 'expired' ? 'Die Anmeldung ist abgelaufen. Verbinde dich unter Daten neu.' : e.code === 'no_worker' ? 'Es ist keine Server-Adresse eingetragen.' : 'PlayStation war nicht erreichbar. Versuch es später nochmal.';
          if (body) body.innerHTML = `<p class="field-error" style="margin:0">${msg}</p>`; else toast(`<div><b>Sync fehlgeschlagen</b><small>${msg}</small></div>`);
          render();
        });
      },
    });
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-psnsync]')) { e.preventDefault(); runPsnSync(); } });

  /* ---------- Router ---------- */
  function render() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [route, param] = hash.split('/');
    let active = route || 'home';
    if (route === 'item') { const it = Store.get(param); active = it ? TYPES[it.type].route : 'home'; }
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === active));
    const tipEl = $('#chartTip'); if (tipEl) tipEl.style.opacity = '0';

    if (!route) viewHome();
    else if (route === 'games') viewLibrary('game');
    else if (route === 'series') viewLibrary('series');
    else if (route === 'movies') viewLibrary('movie');
    else if (route === 'anime') viewLibrary('anime');
    else if (route === 'manga') viewLibrary('manga');
    else if (route === 'stats') viewStats();
    else if (route === 'upcoming') viewUpcoming();
    else if (route === 'trophies') viewTrophies();
    else if (route === 'settings') viewSettings();
    else if (route === 'item') viewDetail(param);
    else viewHome();

    renderSidebarLevel();
    Pwa.badge(Store.all().filter(showsNew).length);
    renderInstallSlot();
  }

  let lastRoute = '';
  window.addEventListener('hashchange', () => {
    const r = location.hash;
    if (!r.startsWith('#/item/') || r !== lastRoute) detailFilter.value = 'all';
    lastRoute = r;
    animate = true;
    render();
    animate = false;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  });
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); itemForm(add.dataset.add); return; }
    if (e.target.closest('[data-addpick]')) { e.preventDefault(); addPicker(); }
  });

  render();
  animate = false;
  Sync.syncNow().finally(() => { setTimeout(autoMangaCheck, 1500); setTimeout(autoAirCheck, 3000); });
  if (Sync.enabled()) Steam.refresh().then(() => { if (/^#\/(settings|games)/.test(location.hash)) render(); });
  Pwa.init({ toast, render });
})();

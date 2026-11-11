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
    movie:  { label: 'Film',   plural: 'Filme',  route: 'movies' },
  };
  const STATUS = {
    game:   { active: 'Am Spielen', done: 'Durchgespielt', planned: 'Backlog', dropped: 'Abgebrochen' },
    series: { active: 'Am Schauen', done: 'Fertig geschaut', planned: 'Merkliste', dropped: 'Abgebrochen' },
    movie:  { done: 'Gesehen', planned: 'Merkliste', dropped: 'Abgebrochen' },
  };
  const PLATFORMS = ['PS5', 'PS4', 'Switch 2', 'Switch', 'PC', 'Steam Deck', 'Xbox', 'Mobile', 'Andere'];
  const isPS = p => /^PS/.test(p || '');

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
    film: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
  };
  const typeIcon = t => ({ game: I.game, series: I.tv, movie: I.film }[t]);

  /* ---------- Hilfen ---------- */
  function hash(str) { let h = 0; for (const c of str || '') h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function initials(title) {
    const w = (title || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(' ').filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
  }
  function coverHTML(item, opts = {}) {
    let inner;
    if (item.cover) {
      inner = `<img src="${esc(item.cover)}" alt="" loading="lazy" onerror="this.remove()">`;
    }
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
  function statusPill(item) {
    const label = (STATUS[item.type] || {})[item.status];
    if (!label) return '';
    const cls = { done: 'st-done', active: 'st-active', planned: 'st-planned', dropped: 'st-dropped' }[item.status];
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
    return Trophies.ORDER.map(t => `<span style="color:${Trophies.TIERS[t].color}">${Trophies.icon(t, 15)} ${c[t]}</span>`).join('');
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
  function openModal({ title, body, foot = '', wide = false, onMount }) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-backdrop"></div>
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head"><h2>${esc(title)}</h2><button class="btn btn-ghost icon-btn" data-close aria-label="Schließen">${I.x}</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>`;
    requestAnimationFrame(() => root.classList.add('open'));
    const close = () => { root.classList.remove('open'); setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 280); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    $('.modal-backdrop', root).onclick = close;
    $$('[data-close]', root).forEach(b => b.onclick = close);
    const modal = $('.modal', root);
    onMount && onMount(modal, close);
    const first = $('input, textarea, select', modal);
    first && setTimeout(() => first.focus(), 120);
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
    let trophyMode = isPS(d.platform) ? 'paste' : 'auto';

    const gameFields = type === 'game' ? `
      <div class="grid-2">
        <div class="field"><label>Plattform</label><select class="input" name="platform">${PLATFORMS.map(p => `<option ${p === d.platform ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="field"><label>Genre</label><select class="input" name="genre">${Object.entries(Trophies.GENRES).map(([k, v]) => `<option value="${k}" ${k === d.genre ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      </div>` : '';
    const seriesFields = type === 'series' ? `
      <div class="grid-2">
        <div class="field"><label>Staffeln gesamt</label><input class="input" name="seasons" type="number" min="0" value="${d.seasons || ''}" placeholder="5"></div>
        <div class="field"><label>Gesehen bis Staffel</label><input class="input" name="seasonSeen" type="number" min="0" value="${d.seasonSeen || ''}" placeholder="3"></div>
      </div>` : '';
    const trophySection = (type === 'game' && !isEdit) ? `
      <div class="field">
        <label>Trophäen</label>
        <div class="seg" id="tmode">
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
          <div class="field"><label>Jahr</label><input class="input" name="year" type="number" min="1950" max="2100" value="${d.year || ''}" placeholder="2024"></div>
        </div>
        ${seriesFields}
        <div class="grid-2">
          <div class="field"><label>Bewertung</label>${starsInput(d.rating)}</div>
          <div class="field"><label>Cover-Bild (Link, optional)</label><input class="input" name="cover" value="${esc(d.cover || '')}" placeholder="https://…/cover.jpg"></div>
        </div>
        <div class="field"><label>Notizen</label><textarea class="input" name="notes" placeholder="Was hat dir gefallen?">${esc(d.notes || '')}</textarea></div>
        ${trophySection}
      </form>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="saveBtn">${isEdit ? 'Speichern' : 'Hinzufügen'}</button>`,
      onMount: (m, close) => {
        bindStars(m);
        const form = $('#itemForm', m);
        let parsed = [];

        function renderTMode() {
          const body = $('#tmodeBody', m);
          if (!body) return;
          $$('#tmode button', m).forEach(b => b.classList.toggle('on', b.dataset.m === trophyMode));
          if (trophyMode === 'auto') {
            body.innerHTML = `<div class="hint-box">${I.sparkle}<div>Passend zum Genre wird eine Trophäenliste mit Bronze, Silber, Gold und Platin erstellt. Du kannst danach jede Trophäe umbenennen, löschen oder eigene hinzufügen.</div></div>
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
        if (plat && !isEdit) plat.onchange = () => { trophyMode = isPS(plat.value) ? 'paste' : 'auto'; renderTMode(); };
        renderTMode();
        let fetched = null;
        const F = form.elements;
        const sug = $('#suggest', m), info = $('#lookupInfo', m);
        const keyHint = { movie: 'TMDB', game: 'RAWG' }[type];
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
            if (dt.cover) F.cover.value = dt.cover;
            if (type === 'series' && dt.seasons) F.seasons.value = dt.seasons;
            if (type === 'game') {
              if (dt.genre && F.genre) F.genre.value = dt.genre;
              if (dt.platforms?.length && !dt.platforms.includes(F.platform.value)) {
                const pref = ['PS5', 'Switch 2', 'Switch', 'PS4', 'PC', 'Xbox', 'Mobile'].find(p => dt.platforms.includes(p));
                if (pref) { F.platform.value = pref; F.platform.onchange && F.platform.onchange(); }
              }
            }
            info.innerHTML = `<div class="fetched">${dt.cover ? `<img src="${esc(dt.cover)}" alt="">` : ''}<div><b>Infos übernommen</b><small>${esc([dt.released ? fmtDate(dt.released) : dt.year, (dt.genres || []).slice(0, 3).join(', '), dt.runtime ? dt.runtime + ' Min.' : '', dt.seasons ? dt.seasons + ' Staffeln' : ''].filter(Boolean).join(' · '))}</small></div>
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

        $('#saveBtn', m).onclick = e => {
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
          if (type === 'game') { data.platform = form.elements.platform.value; data.genre = form.elements.genre.value; }
          if (type === 'series') { data.seasons = form.elements.seasons.value ? +form.elements.seasons.value : null; data.seasonSeen = form.elements.seasonSeen.value ? +form.elements.seasonSeen.value : null; }
          if (fetched) {
            ['genres', 'released', 'runtime', 'summary', 'external'].forEach(k => { if (fetched[k] != null && fetched[k] !== '') data[k] = fetched[k]; });
          }

          if (isEdit) {
            Store.update(item.id, data);
            close(); render(); toast(`<div><b>Gespeichert</b></div>`);
            return;
          }
          if (type === 'game') {
            if (trophyMode === 'auto') { data.trophies = Trophies.generate(title, data.genre, form.elements.tsize.value); data.trophySource = 'generated'; }
            else if (trophyMode === 'paste') {
              data.trophies = collectPreview($('#pastePreview', m), parsed);
              data.trophySource = 'imported';
              Trophies.syncPlatinum(data.trophies);
            }
          }
          const created = Store.add(data);
          close();
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

  function trophyGenerate(game) {
    openModal({
      title: 'Trophäen erstellen',
      body: `<div class="form">
        <div class="hint-box">${I.sparkle}<div>Erstellt eine neue Liste passend zum Genre. Deine bisherigen Trophäen für ${esc(game.title)} werden dabei ersetzt.</div></div>
        <div class="grid-2">
          <div class="field"><label>Genre</label><select class="input" id="gGenre">${Object.entries(Trophies.GENRES).map(([k, v]) => `<option value="${k}" ${k === game.genre ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label>Umfang</label><select class="input" id="gSize"><option value="short">Kurz (7)</option><option value="normal" selected>Normal (12)</option><option value="long">Umfangreich (18)</option></select></div>
        </div></div>`,
      foot: `<button class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-primary" id="gBtn">${I.sparkle} Erstellen</button>`,
      onMount: (m, close) => {
        $('#gBtn', m).onclick = () => {
          const genre = $('#gGenre', m).value;
          Store.update(game.id, { genre, trophies: Trophies.generate(game.title, genre, $('#gSize', m).value), trophySource: 'generated' });
          close(); render();
        };
      },
    });
  }

  /* ---------- Views ---------- */
  function emptyState(type) {
    const txt = {
      game: ['Deine Spielesammlung wartet', 'Füge dein erstes Spiel hinzu und hake Trophäen ab.'],
      series: ['Noch keine Serien', 'Halte fest, welche Serien du gesehen hast oder gerade schaust.'],
      movie: ['Noch keine Filme', 'Sammle alle Filme, die du gesehen hast, mit Bewertung.'],
    }[type];
    return `<div class="empty ${A()}"><div class="empty-icon">${typeIcon(type)}</div><h3>${txt[0]}</h3><p>${txt[1]}</p>
      <button class="btn btn-primary" data-add="${type}">${I.plus} ${TYPES[type].label} hinzufügen</button></div>`;
  }

  function cardHTML(item) {
    const meta = [];
    if (item.type === 'game' && item.platform) meta.push(esc(item.platform));
    if (item.type === 'series' && item.seasons) meta.push(`${item.seasonSeen || 0}/${item.seasons} Staffeln`);
    if (item.year) meta.push(item.year);
    let extra = '';
    if (item.type === 'game' && item.trophies?.length) {
      const p = Trophies.progress(item.trophies);
      const plat = item.trophies.find(t => t.tier === 'platinum' && t.done);
      extra = `<div class="cover-progress"><i style="width:${Math.round(p.done / p.total * 100)}%"></i></div>${plat ? `<div class="cover-plat" title="Platin">${Trophies.icon('platinum', 15)}</div>` : ''}`;
    }
    return `<a class="card ${A()}" href="#/item/${item.id}">
      <div class="cover">${coverHTML(item)}${item.type === 'game' && item.platform ? `<span class="cover-tag">${esc(item.platform)}</span>` : ''}${extra}</div>
      <div><div class="card-title">${esc(item.title)}</div>
      <div class="card-meta">${meta.join('<span class="dot"></span>')}${item.rating ? `${meta.length ? '<span class="dot"></span>' : ''}<span class="stars-mini">${'★'.repeat(item.rating)}</span>` : ''}</div></div>
    </a>`;
  }

  const libState = { game: { q: '', status: 'all', platform: 'all', sort: 'added' }, series: { q: '', status: 'all', sort: 'added' }, movie: { q: '', status: 'all', sort: 'added' } };

  function viewLibrary(type) {
    const s = libState[type];
    const items = Store.all(type);
    const head = `<div class="page-head"><div><h1 class="page-title">${TYPES[type].plural}</h1><p class="page-sub">${items.length} ${items.length === 1 ? 'Eintrag' : 'Einträge'}</p></div>
      <button class="btn btn-primary" data-add="${type}">${I.plus} ${TYPES[type].label} hinzufügen</button></div>`;
    if (!items.length) { view.innerHTML = head + emptyState(type); return; }

    const platforms = type === 'game' ? [...new Set(items.map(i => i.platform).filter(Boolean))] : [];
    view.innerHTML = head + `
      <div class="toolbar">
        <div class="search">${I.search}<input class="input" id="q" placeholder="Suchen" value="${esc(s.q)}"></div>
        <div class="chips" id="statusChips">
          <button class="chip ${s.status === 'all' ? 'on' : ''}" data-s="all">Alle</button>
          ${Object.entries(STATUS[type]).map(([k, v]) => `<button class="chip ${s.status === k ? 'on' : ''}" data-s="${k}">${v}</button>`).join('')}
        </div>
        ${platforms.length > 1 ? `<select class="input" id="plat" style="width:auto"><option value="all">Alle Plattformen</option>${platforms.map(p => `<option ${p === s.platform ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : ''}
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
        && (s.platform === 'all' || type !== 'game' || i.platform === s.platform)
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
    $$('#statusChips .chip').forEach(c => c.onclick = () => { s.status = c.dataset.s; $$('#statusChips .chip').forEach(x => x.classList.toggle('on', x === c)); drawGrid(); });
    $('#sort').onchange = e => { s.sort = e.target.value; drawGrid(); };
    $('#plat') && ($('#plat').onchange = e => { s.platform = e.target.value; drawGrid(); });
  }

  function trophyRow(t, game) {
    const isPlat = t.tier === 'platinum';
    return `<div class="trophy ${t.done ? 'done' : ''}" data-id="${t.id}">
      <button class="check ${t.done ? 'on' : ''} ${isPlat ? 'auto' : ''}" data-toggle="${t.id}" aria-label="${t.done ? 'Als offen markieren' : 'Abhaken'}" ${isPlat ? 'title="Wird automatisch verdient"' : ''}>${I.check}</button>
      <div class="tbadge">${Trophies.icon(t.tier, 22)}</div>
      <div style="min-width:0">
        <div class="trophy-name">${esc(t.name)} <span class="tier-tag tt-${t.tier}">${Trophies.TIERS[t.tier].label}</span></div>
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

  function viewDetail(id) {
    const item = Store.get(id);
    if (!item) { view.innerHTML = `<div class="empty"><h3>Nicht gefunden</h3><p>Dieser Eintrag existiert nicht mehr.</p><a class="btn" href="#/">Zur Übersicht</a></div>`; return; }
    const T = TYPES[item.type];
    const meta = [];
    if (item.platform) meta.push(esc(item.platform));
    if (item.genre && item.type === 'game') meta.push(Trophies.GENRES[item.genre]);
    if (item.year) meta.push(item.year);
    if (item.type === 'series' && item.seasons) meta.push(`${item.seasons} Staffeln`);
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

      const src = { generated: 'Automatisch erstellt', imported: 'Importiert', custom: 'Eigene Liste' }[item.trophySource] || '';
      const sorted = list.slice().sort((a, b) => Trophies.ORDER.indexOf(a.tier) - Trophies.ORDER.indexOf(b.tier));
      const filtered = sorted.filter(t => detailFilter.value === 'all' || (detailFilter.value === 'open' ? !t.done : t.done));
      trophySection = `<section class="section">
        <div class="trophy-head">
          <div><h2 class="section-title" style="margin:0">Trophäen</h2>${src ? `<div class="tiny">${src}</div>` : ''}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${list.length ? `<div class="chips" id="tFilter">${[['all', 'Alle'], ['open', 'Offen'], ['done', 'Verdient']].map(([k, v]) => `<button class="chip ${detailFilter.value === k ? 'on' : ''}" data-f="${k}">${v}</button>`).join('')}</div>` : ''}
            <button class="btn btn-sm" id="tAdd">${I.plus} Eigene</button>
            <button class="btn btn-sm" id="tImp">${I.paste} Liste einfügen</button>
            <button class="btn btn-sm" id="tGen">${I.sparkle} Erstellen</button>
          </div>
        </div>
        ${list.length ? `<div class="trophy-list">${filtered.map(t => trophyRow(t, item)).join('') || '<div class="list-empty">Nichts in dieser Ansicht</div>'}</div>`
          : `<div class="empty" style="padding:44px 20px"><div class="empty-icon">${I.trophy}</div><h3>Noch keine Trophäen</h3><p>${isPS(item.platform) ? 'Füge die offizielle Liste ein oder lass eine erstellen.' : 'Für dieses Spiel gibt es keine offiziellen Trophäen? Lass dir eine Liste erstellen.'}</p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" id="tGen2">${I.sparkle} Trophäen erstellen</button><button class="btn" id="tImp2">${I.paste} Liste einfügen</button></div></div>`}
      </section>`;
    }

    let seriesBlock = '';
    if (item.type === 'series' && item.seasons) {
      seriesBlock = `<div style="margin-top:18px;max-width:360px"><div class="tiny" style="margin-bottom:6px">Fortschritt: Staffel ${item.seasonSeen || 0} von ${item.seasons}</div><div class="bar"><i style="width:${Math.min(100, Math.round((item.seasonSeen || 0) / item.seasons * 100))}%"></i></div></div>`;
    }

    view.innerHTML = `<div class="${A()}">
      <a class="back" href="#/${T.route}">${I.back} ${T.plural}</a>
      <div class="hero">
        <div class="hero-bg">${item.cover ? `<img src="${esc(item.cover)}" alt="" onerror="this.remove()">` : coverHTML(item, { noTitle: true })}</div>
        <div class="cover">${coverHTML(item)}</div>
        <div>
          ${statusPill(item)}
          <h1 class="hero-title">${esc(item.title)}</h1>
          <div class="hero-meta">${meta.join('<span class="dot"></span>')}</div>
          <div style="margin-top:12px">${starsInput(item.rating, 'heroRating')}</div>
          ${item.notes ? `<div class="hero-notes">${esc(item.notes)}</div>` : ''}
          ${item.summary ? `<div class="hero-summary">${esc(item.summary)}</div>` : ''}
          ${ring}${seriesBlock}
          <div class="hero-actions">
            <select class="input" id="quickStatus" style="width:auto">${Object.entries(STATUS[item.type]).map(([k, v]) => `<option value="${k}" ${k === item.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
            <button class="btn" id="editBtn">${I.edit} Bearbeiten</button>
            <button class="btn btn-ghost btn-danger" id="delBtn">${I.trash} Löschen</button>
          </div>
        </div>
      </div>
      ${trophySection}
    </div>`;

    bindStars(view);
    $('[data-stars="heroRating"]').addEventListener('change', e => { Store.update(item.id, { rating: e.detail }); });
    $('#quickStatus').onchange = e => { Store.update(item.id, { status: e.target.value }); render(); };
    $('#editBtn').onclick = () => itemForm(item.type, item);
    $('#delBtn').onclick = () => confirmDialog(`„${esc(item.title)}“ wird mit allen Trophäen gelöscht.`, 'Löschen', () => { Store.remove(item.id); location.hash = `#/${T.route}`; });

    if (item.type === 'game') {
      const g = () => Store.get(item.id);
      $('#tAdd').onclick = () => trophyEdit(g());
      $('#tImp').onclick = () => trophyImport(g());
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
    const games = Store.all('game'), series = Store.all('series'), movies = Store.all('movie');
    const s = allTrophyStats();
    const total = games.length + series.length + movies.length;
    const hour = new Date().getHours();
    const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
    const active = [...games, ...series].filter(i => i.status === 'active').slice(0, 6);
    const recent = recentTrophies();

    if (!total) {
      view.innerHTML = `<div class="${A()}"><div class="page-head"><div><h1 class="page-title">${greet}</h1><p class="page-sub">Dein Regal ist noch leer. Womit fangen wir an?</p></div></div>
        <div class="stats">${['game', 'series', 'movie'].map(t => `<button class="stat" data-add="${t}" style="text-align:left;cursor:pointer;color:inherit">
          <div class="stat-label">${typeIcon(t).replace('<svg', '<svg style="width:18px;height:18px"')} ${TYPES[t].plural}</div>
          <div class="stat-value" style="font-size:20px;margin-top:10px">${TYPES[t].label} hinzufügen</div><div class="stat-hint">${t === 'game' ? 'Mit Trophäen zum Abhaken' : t === 'series' ? 'Mit Staffel-Fortschritt' : 'Mit Bewertung'}</div></button>`).join('')}</div></div>`;
      return;
    }

    const platCount = s.counts.platinum;
    view.innerHTML = `<div class="${A()}">
      <div class="page-head"><div><h1 class="page-title">${greet}</h1><p class="page-sub">${total} Einträge in deinem Regal</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${['game', 'series', 'movie'].map(t => `<button class="btn ${t === 'game' ? 'btn-primary' : ''}" data-add="${t}">${I.plus} ${TYPES[t].label}</button>`).join('')}</div></div>
      <div class="stats">
        <a class="stat feature" href="#/trophies"><div class="stat-label">${I.trophy} Trophäen-Level</div><div class="stat-value">${s.level.level}</div><div class="bar" style="margin-top:8px"><i style="width:${s.level.pct}%"></i></div><div class="stat-hint" style="margin-top:6px">${s.earned} von ${s.total} Trophäen</div></a>
        <a class="stat" href="#/trophies"><div class="stat-label">${Trophies.icon('platinum', 16)} Platin</div><div class="stat-value" style="color:var(--platinum)">${platCount}</div><div class="stat-hint">${games.filter(g => g.status === 'done').length} Spiele durchgespielt</div></a>
        <a class="stat" href="#/games"><div class="stat-label">${I.game} Spiele</div><div class="stat-value">${games.length}</div><div class="stat-hint">${games.filter(g => g.status === 'active').length} am Spielen</div></a>
        <a class="stat" href="#/series"><div class="stat-label">${I.tv} Serien</div><div class="stat-value">${series.length}</div><div class="stat-hint">${series.filter(g => g.status === 'done').length} fertig geschaut</div></a>
        <a class="stat" href="#/movies"><div class="stat-label">${I.film} Filme</div><div class="stat-value">${movies.length}</div><div class="stat-hint">${movies.filter(g => g.status === 'done').length} gesehen</div></a>
      </div>
      <div class="two-col section">
        <div><h2 class="section-title">Gerade dabei</h2><div class="list-card">${active.length ? active.map(i => {
          let sub = TYPES[i.type].label;
          if (i.type === 'game' && i.trophies?.length) { const p = Trophies.progress(i.trophies); sub += ` · ${p.done}/${p.total} Trophäen`; }
          if (i.type === 'series' && i.seasons) sub += ` · Staffel ${i.seasonSeen || 0}/${i.seasons}`;
          return listRow(i, sub);
        }).join('') : '<div class="list-empty">Nichts in Arbeit. Setz bei einem Spiel oder einer Serie den Status auf „Am Spielen“ oder „Am Schauen“.</div>'}</div></div>
        <div><h2 class="section-title">Zuletzt verdient <a href="#/trophies">Alle</a></h2><div class="list-card">${recent.length ? recent.map(({ t, g }) => `
          <a class="list-row" href="#/item/${g.id}"><div class="tbadge">${Trophies.icon(t.tier, 22)}</div><div class="grow"><div class="title">${esc(t.name)}</div><div class="sub">${esc(g.title)} · ${fmtDate(t.doneAt)}</div></div></a>`).join('')
          : '<div class="list-empty">Hake Trophäen in einem Spiel ab, dann erscheinen sie hier.</div>'}</div></div>
      </div>
      ${['game', 'series', 'movie'].map(t => {
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
      <div class="page-head"><div><h1 class="page-title">Trophäen</h1><p class="page-sub">${s.earned} von ${s.total} verdient · ${s.pts.toLocaleString('de-AT')} Punkte</p></div></div>
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

  function viewSettings() {
    const n = Store.all().length;
    view.innerHTML = `<div class="${A()}" style="max-width:720px">
      <div class="page-head"><div><h1 class="page-title">Daten</h1><p class="page-sub">${n} Einträge sind in diesem Browser gespeichert.</p></div></div>
      <div class="panel"><h3>Automatische Infos</h3><p>Beim Hinzufügen werden Cover, Erscheinungsdatum und Genre automatisch gesucht. Serien funktionieren ohne Schlüssel. Für Filme und Spiele brauchst du je einen kostenlosen API-Schlüssel. Er bleibt nur in diesem Browser gespeichert.</p>
        <div class="form">
          <div class="field"><label>Serien · TVmaze</label><div class="key-ok">Aktiv, kein Schlüssel nötig</div></div>
          <div class="field"><label>Filme · TMDB-Schlüssel</label><div class="key-row"><input class="input" id="kTmdb" placeholder="API-Schlüssel oder Lesezugriffs-Token" autocomplete="off" spellcheck="false"><button class="btn" data-test="movie">Testen</button></div>
            <div class="tiny">Kostenlos auf <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener" style="color:var(--lilac)">themoviedb.org/settings/api</a></div><div class="tiny" id="tMovie"></div></div>
          <div class="field"><label>Spiele · RAWG-Schlüssel</label><div class="key-row"><input class="input" id="kRawg" placeholder="API-Schlüssel" autocomplete="off" spellcheck="false"><button class="btn" data-test="game">Testen</button></div>
            <div class="tiny">Kostenlos auf <a href="https://rawg.io/apidocs" target="_blank" rel="noopener" style="color:var(--lilac)">rawg.io/apidocs</a></div><div class="tiny" id="tGame"></div></div>
        </div></div>
      <div class="panel"><h3>Sichern</h3><p>Lade alle Spiele, Serien, Filme und Trophäen als Datei herunter. Damit kannst du sie auf ein anderes Gerät mitnehmen oder ein Backup behalten.</p>
        <button class="btn btn-primary" id="exp">${I.download} Backup herunterladen</button></div>
      <div class="panel"><h3>Wiederherstellen</h3><p>Lies eine Nightshelf-Backupdatei ein. Beim Zusammenführen bleiben deine aktuellen Einträge erhalten.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn">${I.upload} Datei zusammenführen<input type="file" accept=".json,application/json" id="impMerge" hidden></label>
        <label class="btn btn-ghost">Datei ersetzt alles<input type="file" accept=".json,application/json" id="impReplace" hidden></label></div>
        <div class="field-error" id="impErr" style="margin-top:8px"></div></div>
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
    const k = Lookup.keys();
    $('#kTmdb').value = k.tmdb || ''; $('#kRawg').value = k.rawg || '';
    const saveKeys = () => Lookup.setKeys({ tmdb: $('#kTmdb').value.trim(), rawg: $('#kRawg').value.trim() });
    $('#kTmdb').oninput = saveKeys; $('#kRawg').oninput = saveKeys;
    $$('[data-test]').forEach(b => b.onclick = async () => {
      saveKeys();
      const t = b.dataset.test, out = $(t === 'movie' ? '#tMovie' : '#tGame');
      if (!Lookup.hasKey(t)) { out.innerHTML = '<span style="color:var(--danger)">Trag zuerst einen Schlüssel ein.</span>'; return; }
      out.textContent = 'Teste…';
      try { await Lookup.test(t); out.innerHTML = '<span style="color:var(--cyan)">Funktioniert</span>'; }
      catch (e) { out.innerHTML = `<span style="color:var(--danger)">${e.message === 'key' ? 'Schlüssel wird nicht akzeptiert.' : 'Keine Verbindung.'}</span>`; }
    });
    $('#wipe').onclick = () => confirmDialog('Alle Spiele, Serien, Filme und Trophäen in diesem Browser werden gelöscht.', 'Alles löschen', () => { Store.clear(); render(); });
  }

  /* ---------- Router ---------- */
  function render() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [route, param] = hash.split('/');
    let active = route || 'home';
    if (route === 'item') { const it = Store.get(param); active = it ? TYPES[it.type].route : 'home'; }
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === active));

    if (!route) viewHome();
    else if (route === 'games') viewLibrary('game');
    else if (route === 'series') viewLibrary('series');
    else if (route === 'movies') viewLibrary('movie');
    else if (route === 'trophies') viewTrophies();
    else if (route === 'settings') viewSettings();
    else if (route === 'item') viewDetail(param);
    else viewHome();

    renderSidebarLevel();
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
    if (add) { e.preventDefault(); itemForm(add.dataset.add); }
  });

  render();
  animate = false;
})();

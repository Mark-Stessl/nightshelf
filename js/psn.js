/* Nightshelf – PlayStation-Synchronisierung über den eigenen Cloudflare Worker */
const PSN = (() => {
  const KEY = 'nightshelf.psn';
  const DEFAULT_WORKER = 'https://nightshelf-psn.stesslmark4.workers.dev';
  let titleCache = null;

  function state() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(patch) { const s = { ...state(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} return s; }
  const worker = () => (state().worker || DEFAULT_WORKER).replace(/\/+$/, '');
  const connected = () => { const s = state(); return !!(s.refreshToken && s.refreshExpiresAt > Date.now()); };

  function fail(code, message) { const e = new Error(message || code); e.code = code; return e; }

  async function call(path, { method = 'GET', body, token } = {}) {
    if (!worker()) throw fail('no_worker', 'Kein Server eingetragen');
    let res;
    try {
      res = await fetch(worker() + path, {
        method,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...Sync.header() },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch { throw fail('network', 'Server nicht erreichbar'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw fail(data.error || 'error', data.detail || data.error || `Fehler ${res.status}`);
    return data;
  }

  async function connect(npsso, workerUrl) {
    if (workerUrl != null) save({ worker: workerUrl.trim() });
    let raw = (npsso || '').trim();
    try { const j = JSON.parse(raw); if (j.npsso) raw = j.npsso; } catch {}
    const tokens = await call('/auth', { method: 'POST', body: { npsso: raw } });
    save(tokens);
    titleCache = null;
    return tokens;
  }

  function disconnect() {
    const { worker: w } = state();
    try { localStorage.setItem(KEY, JSON.stringify({ worker: w })); } catch {}
    titleCache = null;
  }

  async function token() {
    const s = state();
    if (s.accessToken && s.expiresAt > Date.now() + 60000) return s.accessToken;
    if (!s.refreshToken || s.refreshExpiresAt < Date.now()) throw fail('expired', 'Anmeldung abgelaufen');
    const t = await call('/refresh', { method: 'POST', body: { refreshToken: s.refreshToken } }).catch(e => { throw fail('expired', e.message); });
    save(t);
    return t.accessToken;
  }

  async function api(path) {
    try { return await call(path, { token: await token() }); }
    catch (e) {
      if (e.code === 'token_expired') { save({ expiresAt: 0 }); return call(path, { token: await token() }); }
      throw e;
    }
  }

  async function titles(force = false) {
    if (titleCache && !force) return titleCache;
    titleCache = (await api('/titles')).titles || [];
    return titleCache;
  }

  const TYPE = { bronze: 'bronze', silver: 'silver', gold: 'gold', platinum: 'platinum' };
  async function trophies(title) {
    const list = (await api(`/trophies?id=${encodeURIComponent(title.id)}&service=${encodeURIComponent(title.service)}`)).trophies || [];
    return list.map(t => ({
      id: `psn-${title.id}-${t.id}`,
      name: t.name || 'Versteckte Trophäe',
      desc: t.desc || '',
      tier: TYPE[t.type] || 'bronze',
      rarity: t.rate,
      done: !!t.earned,
      doneAt: t.earned ? (t.earnedAt || new Date().toISOString()) : null,
      dlc: t.group && t.group !== 'default' ? true : undefined,
    }));
  }

  const norm = s => (s || '').toLowerCase()
    .replace(/[™®©]/g, '').replace(/\b(trophies|trophäen|ps4|ps5|playstation ?[45]|edition|remastered|digital deluxe)\b/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  const cleanName = s => (s || '').replace(/[™®]/g, '').replace(/\s+trophies$/i, '').replace(/\s{2,}/g, ' ').trim();
  function platformOf(t) {
    const p = (t.platform || '').toUpperCase();
    if (p.includes('PS5')) return 'PS5';
    if (p.includes('PS4')) return 'PS4';
    if (p.includes('PS3')) return 'PS3';
    if (p.includes('VITA')) return 'PS Vita';
    return 'PS5';
  }

  function findTitle(name, list) {
    const n = norm(name);
    if (!n) return null;
    const cands = list.filter(t => norm(t.name) === n);
    const loose = cands.length ? cands : list.filter(t => { const m = norm(t.name); return m.length > 3 && (m.startsWith(n) || n.startsWith(m)); });
    return loose.sort((a, b) => (b.progress || 0) - (a.progress || 0) || (platformOf(a) === 'PS5' ? -1 : 1))[0] || null;
  }

  async function trophiesFor(name) {
    const t = findTitle(name, await titles());
    if (!t) return null;
    return { title: t, trophies: await trophies(t), platform: platformOf(t) };
  }

  function applyToItem(item, t, list) {
    Trophies.syncPlatinum(list);
    const plat = list.find(x => x.tier === 'platinum');
    const patch = { trophies: list, trophySource: 'psn', psnId: t.id, psnService: t.service };
    if ((plat && plat.done) || (!plat && list.length && list.every(x => x.done))) patch.status = 'done';
    return Store.update(item.id, patch);
  }

  async function syncAll({ onProgress, enrich = true } = {}) {
    const all = await titles(true);
    const groups = new Map();
    all.forEach(t => {
      const k = norm(t.name);
      const cur = groups.get(k);
      if (!cur || (t.progress || 0) > (cur.progress || 0) || ((t.progress || 0) === (cur.progress || 0) && platformOf(t) === 'PS5')) groups.set(k, t);
    });
    const list = [...groups.values()];
    const result = { added: 0, updated: 0, earned: 0, failed: 0, total: list.length };
    const games = Store.all('game');
    let i = 0;
    for (const t of list) {
      i++;
      const name = cleanName(t.name);
      onProgress && onProgress({ i, total: list.length, name });
      try {
        const trophyList = await trophies(t);
        result.earned += trophyList.filter(x => x.done).length;
        let item = games.find(g => g.psnId === t.id) || games.find(g => norm(g.title) === norm(t.name));
        if (item) {
          applyToItem(item, t, trophyList);
          result.updated++;
        } else {
          const recent = t.updated && (Date.now() - Date.parse(t.updated)) < 30 * 864e5;
          const data = {
            type: 'game', title: name, platform: platformOf(t), genre: 'other',
            status: recent ? 'active' : 'done', rating: 0, notes: '', cover: t.icon || '',
            year: null, trophies: [],
          };
          if (enrich) {
            try {
              const hits = await Lookup.search('game', name);
              const hit = hits.find(h => norm(h.title) === norm(name)) || null;
              if (hit) {
                const d = await Lookup.detail('game', hit);
                if (d.cover) data.cover = d.cover;
                if (d.year) data.year = d.year;
                if (d.genre) data.genre = d.genre;
                ['genres', 'released', 'external'].forEach(k => { if (d[k]) data[k] = d[k]; });
              }
            } catch {}
          }
          item = Store.add(data);
          games.push(item);
          applyToItem(item, t, trophyList);
          result.added++;
        }
      } catch (e) {
        if (e.code === 'expired' || e.code === 'no_worker') throw e;
        result.failed++;
      }
      await new Promise(r => setTimeout(r, 150));
    }
    save({ lastSync: new Date().toISOString() });
    return result;
  }

  async function syncOne(item) {
    const all = await titles();
    const t = (item.psnId && all.find(x => x.id === item.psnId)) || findTitle(item.title, all);
    if (!t) return null;
    const list = await trophies(t);
    applyToItem(item, t, list);
    return list;
  }

  return { state, save, worker, connected, connect, disconnect, titles, trophiesFor, syncAll, syncOne, DEFAULT_WORKER };
})();

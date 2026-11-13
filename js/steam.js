/* Nightshelf – Steam-Erfolge über den eigenen Server (offizielle Steam Web API).
   Steam kennt keine Stufen: die Stufe kommt aus der Seltenheit, Platin gibt es für alle Erfolge. */
const Steam = (() => {
  const LS = 'nightshelf.steam';
  let state = (() => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } })();
  const save = s => { state = s || {}; try { localStorage.setItem(LS, JSON.stringify(state)); } catch {} };

  async function call(path, body) {
    const res = await fetch(`${PSN.worker()}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...Sync.header() },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) { const e = new Error(data.error || 'error'); e.code = data.error || 'error'; throw e; }
    return data;
  }

  const connected = () => !!state.connected;
  const profile = () => state.name || null;
  async function refresh() { try { save(await call('/steam/status')); } catch {} return state; }
  async function connect(apiKey, prof) {
    const r = await call('/steam/connect', { apiKey, profile: prof || undefined });
    save({ connected: true, steamid: r.steamid, name: r.name });
    return r;
  }
  async function disconnect() { await call('/steam/disconnect', {}).catch(() => {}); save({}); }

  const norm = s => (s || '').toLowerCase().replace(/[™®©]/g, '').replace(/[-–]?\s*(troph(ä|ae)en|achievements)$/i, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  // Spiel im Steam-Store finden: zuerst exakter Name, dann Name vor dem Doppelpunkt
  async function find(title) {
    const { results } = await call(`/steam/search?q=${encodeURIComponent(title)}`);
    const want = norm(title), short = norm(title.split(':')[0]);
    return results.find(r => norm(r.name) === want) || results.find(r => norm(r.name.split(':')[0]) === short && short.length >= 4) || null;
  }

  const tierOf = rarity => rarity == null ? 'bronze' : rarity <= 5 ? 'gold' : rarity <= 20 ? 'silver' : 'bronze';
  function toTrophies(appid, list, previous = []) {
    const prev = new Map(previous.map(t => [t.id, t]));
    const out = list.map(a => {
      const id = `steam-${appid}-${a.api}`;
      const old = prev.get(id);
      const done = a.done || (!state.steamid && !!old?.done); // ohne Profil: eigene Haken behalten
      return {
        id, name: a.name, desc: a.desc || (a.hidden ? 'Versteckter Erfolg' : ''), tier: tierOf(a.rarity), rarity: a.rarity, icon: a.icon || undefined,
        done, doneAt: done ? (a.doneAt || old?.doneAt || new Date().toISOString()) : null,
      };
    });
    if (out.length) {
      const pid = `steam-${appid}-platinum`;
      const last = out.map(t => t.doneAt).filter(Boolean).sort().pop() || null;
      const all = out.every(t => t.done);
      out.unshift({ id: pid, name: 'Alle Erfolge', desc: 'Alle Steam-Erfolge dieses Spiels freigeschaltet', tier: 'platinum', rarity: null, done: all, doneAt: all ? (prev.get(pid)?.doneAt || last) : null });
    }
    return out;
  }

  async function achievementsFor(appid) { return call(`/steam/achievements?appid=${appid}`); }

  // Patch für ein Spiel: Erfolge, App-ID, Hochformat-Cover (falls bisher keins), Status bei 100 %
  function patchFor(item, appid, res) {
    const trophies = toTrophies(appid, res.achievements, item.trophies || []);
    const patch = { trophies, trophySource: 'steam', steamAppId: appid };
    if (res.cover && (!item.cover || !item.coverTried)) { patch.cover = res.cover; patch.coverTried = true; }
    const plat = trophies.find(t => t.tier === 'platinum');
    if (plat?.done) { patch.status = 'done'; patch.finishedAt = plat.doneAt || item.finishedAt || null; }
    return patch;
  }

  // Alle gespielten Steam-Spiele übernehmen bzw. aktualisieren
  async function syncAll({ onProgress } = {}) {
    const { games } = await call('/steam/games');
    const played = games.filter(g => g.minutes > 0).sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''));
    const result = { added: 0, updated: 0, earned: 0, failed: 0, total: played.length };
    let i = 0;
    for (const g of played) {
      i++;
      onProgress && onProgress(i, played.length, g.name);
      const mine = Store.all('game');
      const existing = mine.find(x => x.steamAppId === g.appid) || mine.find(x => norm(x.title) === norm(g.name) && (x.platform === 'Steam' || !x.platform));
      try {
        const res = await achievementsFor(g.appid);
        const before = existing ? Trophies.progress(existing.trophies || []).done : 0;
        if (existing) {
          Store.update(existing.id, patchFor(existing, g.appid, res));
          result.updated++;
        } else {
          const base = { type: 'game', title: g.name, platform: 'Steam', genre: 'other', status: 'active', cover: '', year: null };
          const created = Store.add(base);
          Store.update(created.id, patchFor(created, g.appid, res));
          result.added++;
        }
        const after = Trophies.progress(Store.get(existing?.id || Store.all('game').find(x => x.steamAppId === g.appid)?.id)?.trophies || []).done;
        result.earned += Math.max(0, after - before);
      } catch { result.failed++; }
      await new Promise(r => setTimeout(r, 250));
    }
    return result;
  }

  return { connected, profile, refresh, connect, disconnect, find, achievementsFor, patchFor, toTrophies, syncAll, hasProfile: () => !!state.steamid };
})();

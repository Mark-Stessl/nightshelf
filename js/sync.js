/* Nightshelf – Sync zwischen Geräten über den eigenen Cloudflare Worker */
const Sync = (() => {
  const KEY = 'nightshelf.sync';
  const listeners = new Set();
  let status = 'idle', lastError = null, timer = null, busy = null, lastPull = 0;

  function state() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(patch) { const s = { ...state(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} return s; }
  const enabled = () => !!state().key;
  const header = () => { const k = state().key; return k ? { 'X-Nightshelf-Key': k } : {}; };
  const fail = (code, msg) => Object.assign(new Error(msg || code), { code });
  function setStatus(s, err = null) { status = s; lastError = err; listeners.forEach(fn => fn({ status, error: lastError, ...state() })); }

  async function req(path, { method = 'GET', body, keepalive = false } = {}) {
    let res;
    try {
      res = await fetch(PSN.worker() + path, {
        method, keepalive,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...header() },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch { throw fail('network', 'Server nicht erreichbar'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw fail(data.error || 'error', data.detail || data.error);
    return data;
  }

  function genKey() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    const chars = [...bytes].map(b => abc[b % abc.length]).join('');
    return chars.match(/.{4}/g).join('-');
  }
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* Zusammenführen: pro Eintrag gewinnt die neuere Änderung, Löschungen gewinnen gegen ältere Stände */
  const stamp = i => i.updatedAt || i.addedAt || '';
  function merge(local, remote) {
    const del = new Map();
    [...(remote.deleted || []), ...(local.deleted || [])].forEach(d => { if (!del.has(d.id) || del.get(d.id) < d.at) del.set(d.id, d.at); });
    const items = new Map();
    [...(remote.items || []), ...(local.items || [])].forEach(it => { const cur = items.get(it.id); if (!cur || stamp(cur) < stamp(it)) items.set(it.id, it); });
    const out = [...items.values()].filter(it => !del.has(it.id) || stamp(it) > del.get(it.id));
    out.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
    const keepDel = [...del].filter(([id]) => !out.some(i => i.id === id)).map(([id, at]) => ({ id, at }));
    return { items: out, deleted: keepDel };
  }
  const fingerprint = d => d.items.map(i => i.id + stamp(i)).join('|') + '#' + d.deleted.map(x => x.id).sort().join('|');

  async function push(attempt = 0) {
    const snap = Store.snapshot();
    try {
      const r = await req('/data', { method: 'PUT', body: { items: snap.items, deleted: snap.deleted, baseVersion: state().version ?? 0 } });
      save({ version: r.version, lastSync: new Date().toISOString() });
    } catch (e) {
      if (e.code === 'conflict' && attempt < 3) { await pull(); return push(attempt + 1); }
      throw e;
    }
  }

  async function pull() {
    const remote = await req('/data');
    const merged = merge(Store.snapshot(), remote);
    const changedLocal = fingerprint(merged) !== fingerprint(Store.snapshot());
    if (changedLocal) Store.replaceAll(merged);
    save({ version: remote.version, lastSync: new Date().toISOString() });
    lastPull = Date.now();
    return { merged, remote, changedLocal, needsPush: fingerprint(merged) !== fingerprint({ items: remote.items || [], deleted: remote.deleted || [] }) };
  }

  async function syncNow() {
    if (!enabled()) return;
    if (busy) return busy;
    clearTimeout(timer); timer = null;
    setStatus('syncing');
    busy = (async () => {
      try {
        const r = await pull();
        if (r.needsPush) await push();
        setStatus('ok');
        if (r.changedLocal) window.dispatchEvent(new CustomEvent('nightshelf:synced'));
      } catch (e) {
        setStatus('error', e.code || 'error');
        if (e.code === 'key_required') save({ key: null });
      } finally { busy = null; }
    })();
    return busy;
  }

  function schedulePush() {
    if (!enabled()) return;
    setStatus('pending');
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (busy) { schedulePush(); return; }
      setStatus('syncing');
      busy = push().then(() => setStatus('ok')).catch(e => { setStatus('error', e.code || 'error'); if (e.code === 'key_required') save({ key: null }); }).finally(() => { busy = null; });
    }, 2500);
  }

  async function setup() {
    const info = await req('/');
    if (info.claimed) throw fail('already_claimed');
    const key = genKey();
    await req('/claim', { method: 'POST', body: { keyHash: await sha256(key) } });
    save({ key, version: 0 });
    await syncNow();
    if (status === 'error') throw fail(lastError);
    return key;
  }

  async function connect(rawKey) {
    const key = rawKey.trim().toUpperCase().replace(/\s+/g, '');
    save({ key, version: 0 });
    try { await req('/data'); }
    catch (e) { save({ key: null }); throw fail(e.code === 'key_required' ? 'key_wrong' : e.code); }
    await syncNow();
    if (status === 'error') throw fail(lastError);
  }

  function disconnect() { clearTimeout(timer); save({ key: null, version: 0 }); setStatus('idle'); }

  Store.subscribe((_, opts) => { if (!opts?.silent) schedulePush(); });
  document.addEventListener('visibilitychange', () => {
    if (!enabled()) return;
    if (document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer); timer = null;
      const snap = Store.snapshot();
      req('/data', { method: 'PUT', keepalive: true, body: { items: snap.items, deleted: snap.deleted, baseVersion: state().version ?? 0 } })
        .then(r => save({ version: r.version, lastSync: new Date().toISOString() })).catch(() => {});
    } else if (document.visibilityState === 'visible' && Date.now() - lastPull > 30000) syncNow();
  });

  return {
    state, enabled, header, setup, connect, disconnect, syncNow,
    status: () => ({ status, error: lastError, ...state() }),
    onChange: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    merge,
  };
})();

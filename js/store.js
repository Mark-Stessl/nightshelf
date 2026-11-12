/* Nightshelf – Datenhaltung (localStorage + Export/Import + Löschmarker für den Geräte-Sync) */
const Store = (() => {
  const KEY = 'nightshelf.v1';
  let state = { items: [], deleted: [], updatedAt: null };
  const listeners = new Set();
  const now = () => new Date().toISOString();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) state = { deleted: [], ...parsed };
      }
    } catch (e) { console.warn('Laden fehlgeschlagen', e); }
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Speichern fehlgeschlagen', e); }
  }

  function save({ silent = false } = {}) {
    state.updatedAt = now();
    persist();
    listeners.forEach(fn => fn(state, { silent }));
  }

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const tombstone = id => { state.deleted = state.deleted.filter(d => d.id !== id); state.deleted.push({ id, at: now() }); };

  function all(type) { return type ? state.items.filter(i => i.type === type) : state.items.slice(); }
  function get(id) { return state.items.find(i => i.id === id); }

  function add(data) {
    const t = now();
    const item = { id: uid(), addedAt: t, trophies: [], ...data, updatedAt: t };
    state.items.unshift(item);
    save();
    return item;
  }

  function update(id, patch) {
    const item = get(id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: now() });
    save();
    return item;
  }

  function remove(id) {
    state.items = state.items.filter(i => i.id !== id);
    tombstone(id);
    save();
  }

  function exportJSON() {
    return JSON.stringify({ app: 'nightshelf', version: 1, exportedAt: now(), items: state.items }, null, 2);
  }

  function importJSON(text, mode = 'merge') {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(items)) throw new Error('Keine gültige Nightshelf-Datei');
    const t = now();
    if (mode === 'replace') {
      const keep = new Set(items.map(i => i.id));
      state.items.forEach(i => { if (!keep.has(i.id)) tombstone(i.id); });
      state.items = items.map(i => ({ ...i, updatedAt: t }));
    } else {
      const ids = new Set(state.items.map(i => i.id));
      items.forEach(i => { if (!ids.has(i.id)) state.items.push({ ...i, updatedAt: t }); });
    }
    save();
    return items.length;
  }

  function clear() { state.items.forEach(i => tombstone(i.id)); state.items = []; save(); }

  /* Für den Sync: kompletten Stand lesen und zusammengeführten Stand übernehmen */
  function snapshot() { return { items: state.items, deleted: state.deleted }; }
  function replaceAll({ items, deleted }) {
    state.items = items;
    state.deleted = deleted;
    save({ silent: true });
  }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  load();
  return { all, get, add, update, remove, exportJSON, importJSON, clear, subscribe, uid, snapshot, replaceAll };
})();

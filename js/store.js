/* Nightshelf – Datenhaltung (localStorage + Export/Import) */
const Store = (() => {
  const KEY = 'nightshelf.v1';
  let state = { items: [], updatedAt: null };
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) state = parsed;
      }
    } catch (e) { console.warn('Laden fehlgeschlagen', e); }
  }

  function save() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Speichern fehlgeschlagen', e); }
    listeners.forEach(fn => fn(state));
  }

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function all(type) { return type ? state.items.filter(i => i.type === type) : state.items.slice(); }
  function get(id) { return state.items.find(i => i.id === id); }

  function add(data) {
    const item = { id: uid(), addedAt: new Date().toISOString(), trophies: [], ...data };
    state.items.unshift(item);
    save();
    return item;
  }

  function update(id, patch) {
    const item = get(id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    save();
    return item;
  }

  function remove(id) {
    state.items = state.items.filter(i => i.id !== id);
    save();
  }

  function exportJSON() {
    return JSON.stringify({ app: 'nightshelf', version: 1, exportedAt: new Date().toISOString(), items: state.items }, null, 2);
  }

  function importJSON(text, mode = 'merge') {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(items)) throw new Error('Keine gültige Nightshelf-Datei');
    if (mode === 'replace') {
      state.items = items;
    } else {
      const ids = new Set(state.items.map(i => i.id));
      items.forEach(i => { if (!ids.has(i.id)) state.items.push(i); });
    }
    save();
    return items.length;
  }

  function clear() { state.items = []; save(); }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  load();
  return { all, get, add, update, remove, exportJSON, importJSON, clear, subscribe, uid };
})();

/* Nightshelf – Zustand der Seiten, der beim Wechseln erhalten bleibt */
import { createBus } from './bus.js';
import { lsGet, lsSet } from './util.js';

// Sortierung und Filter im Regal merken (auch nach Neuladen); die Suche startet immer leer
const LIB_KEY = 'nightshelf.libState';
const libDefault = { game: { q: '', status: 'all', fam: 'all', platform: 'all', sort: 'added' }, series: { q: '', status: 'all', sort: 'added' }, movie: { q: '', status: 'all', sort: 'added' }, anime: { q: '', status: 'all', sort: 'added' }, manga: { q: '', status: 'all', sort: 'added' } };
const libInit = (() => {
  const s = structuredClone(libDefault);
  try { const saved = JSON.parse(lsGet(LIB_KEY, '{}')); Object.keys(s).forEach(t => { if (saved[t]) Object.assign(s[t], saved[t], { q: '' }); }); } catch {}
  return s;
})();
export const libState = createBus(libInit);
export const setLib = (type, patch) => {
  libState.set(s => ({ ...s, [type]: { ...s[type], ...patch } }));
  if (!('q' in patch && Object.keys(patch).length === 1)) lsSet(LIB_KEY, JSON.stringify(Object.fromEntries(Object.entries(libState.get()).map(([t, v]) => [t, { ...v, q: '' }]))));
};

// Welche Staffel bei einem Eintrag gerade offen ist
export const seasonTab = {};

// Trophäen-Filter auf der Detailseite (wird beim Wechsel auf einen anderen Eintrag zurückgesetzt)
export const detailFilter = createBus({ value: 'all' });

// Kalender „Demnächst“
export const calState = createBus((() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth(), sel: null, mode: lsGet('nightshelf.calMode', 'month'), weekStart: null }; })());

// Statistik: gewähltes Jahr
export const statsState = createBus({ year: String(new Date().getFullYear()) });

// Regal-Tabs am Handy: Scrollposition beim Wechseln behalten
export const shelfTabs = { x: 0 };

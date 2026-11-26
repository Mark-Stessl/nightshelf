/* Nightshelf – Verbindung zwischen Datenmodulen und React: Store-Version, Toasts, Fenster */
import { useSyncExternalStore } from 'react';
import { Store } from './store.js';

/* ---------- Daten-Version: jede Änderung im Store oder ein manuelles refresh() zeichnet neu ---------- */
let version = 0;
const subs = new Set();
const emit = () => { version++; subs.forEach(fn => fn()); };
Store.subscribe(() => emit());
export const refresh = emit;
export const useDataVersion = () => useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn); }, () => version);

/* Kleiner Helfer für eigene, global geteilte Zustände (z. B. Filter, die beim Seitenwechsel bleiben) */
export function createBus(initial) {
  let state = initial;
  const ls = new Set();
  return {
    get: () => state,
    set: patch => { state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }; ls.forEach(fn => fn()); },
    use: () => useSyncExternalStore(fn => { ls.add(fn); return () => ls.delete(fn); }, () => state),
  };
}

/* ---------- Toasts ---------- */
// content: React-Knoten oder (für alte Aufrufer wie die PWA) ein HTML-String
export const toasts = createBus([]);
let toastSeq = 0;
export function toast(content, cls = '', ms = 0) {
  const id = ++toastSeq;
  toasts.set(list => [...list, { id, content, cls, out: false }].slice(-3));
  setTimeout(() => {
    toasts.set(list => list.map(t => t.id === id ? { ...t, out: true } : t));
    setTimeout(() => toasts.set(list => list.filter(t => t.id !== id)), 300);
  }, ms || (cls === 'plat' ? 4200 : 2600));
  return id;
}
export function dismissToast(id) {
  toasts.set(list => list.map(t => t.id === id ? { ...t, out: true } : t));
  setTimeout(() => toasts.set(list => list.filter(t => t.id !== id)), 300);
}

/* ---------- Fenster (Modal) ---------- */
// openModal(close => <Dialog close={close} />) – immer nur ein Fenster gleichzeitig
export const modal = createBus({ seq: 0, render: null, open: false });
export function openModal(render) {
  const seq = modal.get().seq + 1;
  modal.set({ seq, render, open: true });
  return () => closeModal(seq);
}
export function closeModal(seq = modal.get().seq) {
  if (modal.get().seq !== seq || !modal.get().open) return;
  modal.set({ open: false });
  setTimeout(() => { const m = modal.get(); if (m.seq === seq && !m.open) modal.set({ render: null }); }, 280);
}
export const modalIsOpen = () => modal.get().open;

/* ---------- Navigation ---------- */
export const go = hash => { location.hash = hash; };

/* ---------- Trophäen-Meldung (oben, eigene Ebene) ---------- */
export const unlocks = createBus([]);
let unlockSeq = 0;
export function unlock(data) {
  const id = ++unlockSeq;
  unlocks.set(list => [...list, { id, ...data, out: false }].slice(-2));
  setTimeout(() => {
    unlocks.set(list => list.map(u => u.id === id ? { ...u, out: true } : u));
    setTimeout(() => unlocks.set(list => list.filter(u => u.id !== id)), 350);
  }, data.t.tier === 'platinum' ? 5500 : 3800);
}

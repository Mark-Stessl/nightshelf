/* Nightshelf – bessere Cover für Spiele suchen (Hochformat statt Querformat) */
import { Store } from './store.js';
import { Sync } from './sync.js';
import { Steam } from './steam.js';
import { Lookup } from './lookup.js';

export const COVER_V = 2; // Version der Cover-Suche: alte Einträge werden mit der neuen Suche einmal nachgeholt
const queue = [];
let busy = false;
const norm = t => (t || '').toLowerCase().replace(/[-–]?\s*troph(ä|ae)en$/i, '').replace(/[™®©]/g, '').replace(/[^a-z0-9]+/g, '');
const imgRatio = src => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth / i.naturalHeight); i.onerror = () => res(null); i.src = src; });

export function queueCover(id) {
  const it = Store.get(id);
  if (it && it.type === 'game' && !it.coverCustom && (it.coverV || 0) < COVER_V && !queue.includes(id)) { queue.push(id); run(); }
}

async function run() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const id = queue.shift(), it = Store.get(id);
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
        const want = norm(q), wantShort = norm(q.split(':')[0]);
        const hits = await Lookup.search('game', q);
        const hit = hits.find(h => h.cover && norm(h.title) === want) || hits.find(h => h.cover && norm(h.title.split(':')[0]) === wantShort && wantShort.length >= 4);
        if (hit) { const r = await imgRatio(hit.cover); if (r && r < 0.85) better = hit.cover; }
      } catch {}
    }
    Store.update(id, better ? { cover: better, coverTried: true, coverV: COVER_V } : { coverTried: true, coverV: COVER_V });
    await new Promise(r => setTimeout(r, 300));
  }
  busy = false;
}

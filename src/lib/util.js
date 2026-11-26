/* Nightshelf – Konstanten und reine Hilfsfunktionen (ohne Oberfläche) */
import { Store } from './store.js';
import { PSN } from './psn.js';
import { Steam } from './steam.js';
import { Trophies } from './trophies.js';

export const TYPES = {
  game:   { label: 'Spiel',  plural: 'Spiele', route: 'games' },
  series: { label: 'Serie',  plural: 'Serien', route: 'series' },
  anime:  { label: 'Anime',  plural: 'Anime',  route: 'anime' },
  manga:  { label: 'Manga',  plural: 'Manga',  route: 'manga' },
  movie:  { label: 'Film',   plural: 'Filme',  route: 'movies' },
};
export const ROUTE_TYPE = Object.fromEntries(Object.entries(TYPES).map(([t, v]) => [v.route, t]));
export const STATUS = {
  game:   { active: 'Am Spielen', done: 'Durchgespielt', planned: 'Backlog', dropped: 'Abgebrochen' },
  series: { active: 'Am Schauen', done: 'Fertig geschaut', planned: 'Merkliste', dropped: 'Abgebrochen' },
  anime:  { active: 'Am Schauen', done: 'Fertig geschaut', paused: 'Pausiert', planned: 'Merkliste', dropped: 'Abgebrochen' },
  manga:  { active: 'Am Lesen', done: 'Fertig gelesen', paused: 'Pausiert', planned: 'Leseliste', dropped: 'Abgebrochen' },
  movie:  { done: 'Gesehen', planned: 'Merkliste', dropped: 'Abgebrochen' },
};
export const ORDER_TYPES = ['game', 'series', 'anime', 'manga', 'movie'];
// Plattformen nach Hersteller gruppiert (für Auswahl und Filter)
export const PLATFORM_GROUPS = [
  ['PlayStation', ['PS5', 'PS4', 'PS3', 'PS2', 'PS1', 'PS Vita', 'PSP']],
  ['Nintendo', ['Switch 2', 'Switch', 'Wii U', 'Wii', 'GameCube', '3DS', 'DS', 'N64']],
  ['Xbox', ['Xbox Series', 'Xbox One', 'Xbox 360', 'Xbox']],
  ['Steam', ['Steam']],
  ['Sonstige', ['Mobile', 'Andere']],
];
export const PLATFORMS = PLATFORM_GROUPS.flatMap(([, list]) => list);
const LEGACY_FAMILY = { PC: 'Steam', 'Steam Deck': 'Steam' }; // alte Einträge zählen weiter zu Steam
export const familyOf = p => LEGACY_FAMILY[p] || (PLATFORM_GROUPS.find(([, list]) => list.includes(p)) || ['Sonstige'])[0];
export const isPS = p => /^(PS5|PS4|PS3|PS Vita)$/.test(p || ''); // Plattformen mit offiziellen PlayStation-Trophäen
export const psDefault = p => isPS(p) ? (PSN.connected() ? 'psn' : 'paste') : (p === 'Steam' || p === 'PC' || p === 'Steam Deck') ? (Steam.connected() ? 'steam' : 'paste') : 'auto';

export const mq = q => typeof window !== 'undefined' && window.matchMedia(q).matches;
export const isTouch = () => mq('(hover: none)');
export const isCoarse = () => mq('(pointer: coarse)');
export const isMobileWidth = () => mq('(max-width: 820px)');

export function hash(str) { let h = 0; for (const c of str || '') h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
export function initials(title) {
  const w = (title || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(' ').filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
}
export const stars = n => n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '';
export const statusLabel = item => (STATUS[item.type] || {})[item.status] || '';
export const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const fmtCh = n => (Math.round(n * 10) / 10).toLocaleString('de-AT', { useGrouping: n >= 10000 });
export function relTime(iso) {
  if (!iso) return '';
  const d = (Date.now() - Date.parse(iso)) / 1000;
  if (d < 90) return 'gerade eben';
  if (d < 3600) return `vor ${Math.round(d / 60)} Min.`;
  if (d < 86400) return `vor ${Math.round(d / 3600)} Std.`;
  if (d < 86400 * 45) return `vor ${Math.round(d / 86400)} Tagen`;
  return fmtDate(iso);
}
export function fmtWhen(isoStr, dateOnly = false) {
  const d = new Date(isoStr);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today) / 86400000);
  const dayTxt = diff === 0 ? 'heute' : diff === 1 ? 'morgen' : diff > 1 && diff < 7 ? `am ${d.toLocaleDateString('de-AT', { weekday: 'long' })}` : `am ${d.toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}`;
  return dateOnly ? dayTxt : `${dayTxt} um ${d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}`;
}
export const ymdOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const MONTH_NAMES = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const MONTHS_SHORT = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const weekStartOf = d => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s.getTime(); };
export const lsGet = (k, fallback = null) => { try { const v = localStorage.getItem(k); return v == null ? fallback : v; } catch { return fallback; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

/* ---------- Trophäen ---------- */
export function allTrophyStats() {
  const games = Store.all('game');
  let pts = 0; const counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 }; let earned = 0, total = 0;
  games.forEach(g => (g.trophies || []).forEach(t => {
    total++;
    if (t.done) { earned++; counts[t.tier]++; pts += Trophies.TIERS[t.tier].points; }
  }));
  return { pts, counts, earned, total, level: Trophies.levelFromPoints(pts) };
}
export function recentTrophies(limit = 6) {
  const out = [];
  Store.all('game').forEach(g => (g.trophies || []).forEach(t => { if (t.done && t.doneAt) out.push({ t, g }); }));
  return out.sort((a, b) => b.t.doneAt.localeCompare(a.t.doneAt)).slice(0, limit);
}

/* ---------- Spielzeit: eigene Angabe gilt vor automatischer (Steam/PlayStation) ---------- */
export const hoursOf = it => it.playH != null ? it.playH : it.playMin != null ? it.playMin / 60 : null;
export const fmtHours = h => h == null ? '' : h > 0 && h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${Math.round(h).toLocaleString('de-AT')} h`;
export const PLAY_SRC = { steam: 'Steam', psn: 'PlayStation' };
// „12,5“, „12.5“, „12 h“ → 12.5; leer → null (keine Angabe); Unsinn → undefined
export const parseHours = v => { const t = String(v || '').trim().replace(/\s*(h|std\.?|stunden)$/i, '').replace(',', '.'); if (!t) return null; const n = +t; return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : undefined; };

/* ---------- Staffeln (Anime und Serien) ---------- */
export const isImplicit = x => String(x.id).startsWith('implicit');
const AUTO_LABEL = /^(Staffel \d+|Film( \d+)?)$/;
// Automatische Namen ("Staffel 3", "Film 12") nach Löschen/Hinzufügen lückenlos neu nummerieren
export function relabel(list) {
  const shows = list.filter(x => x.format !== 'MOVIE'), movies = list.filter(x => x.format === 'MOVIE');
  shows.forEach((x, i) => { if (!x.label || AUTO_LABEL.test(x.label)) x.label = `Staffel ${i + 1}`; });
  movies.forEach((x, i) => { if (!x.label || AUTO_LABEL.test(x.label)) x.label = movies.length > 1 ? `Film ${i + 1}` : 'Film'; });
  return list;
}
export function seasonsOf(item) {
  if (item.seasonList?.length) return relabel(item.seasonList);
  if (item.type === 'series') {
    const n = Math.max(1, item.seasons || 1);
    return Array.from({ length: n }, (_, i) => ({ id: `implicit-${i + 1}`, title: item.title, label: `Staffel ${i + 1}`, episodes: null, seen: 0, complete: i < (item.seasonSeen || 0), year: null, cover: '' }));
  }
  return [{ id: 'implicit-1', title: item.title, label: 'Staffel 1', format: 'TV', episodes: item.episodes || null, seen: item.episodesSeen || 0, year: item.year || null, cover: item.cover || '' }];
}
export function seasonTotals(list) {
  const known = list.filter(x => x.episodes);
  return {
    episodes: known.length === list.length ? list.reduce((a, x) => a + x.episodes, 0) : (known.reduce((a, x) => a + x.episodes, 0) || null),
    episodesSeen: list.reduce((a, x) => a + (x.seen || 0), 0),
  };
}
export function distributeSeen(list, seen, allDone) {
  let rest = seen;
  list.forEach(x => {
    if (allDone) { x.seen = x.episodes || x.seen || 0; x.complete = true; return; }
    const take = x.episodes ? Math.min(x.episodes, rest) : rest;
    x.seen = take; rest -= take;
  });
}
export const seasonDone = x => !!x.complete || (!!x.episodes && (x.seen || 0) >= x.episodes);
export function currentSeason(item) {
  const list = seasonsOf(item);
  return list.find(x => (x.seen || 0) > 0 && !seasonDone(x)) || list.find(x => !seasonDone(x)) || list[list.length - 1];
}
export function saveSeasons(item, list, { autoStatus = true } = {}) {
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
export const seasonSource = item => item.type === 'anime' ? 'AniList' : 'TVmaze';
export const materialize = it => seasonsOf(it).map(x => ({ ...x, id: isImplicit(x) ? Store.uid() : x.id }));

/* ---------- Neue Folgen und Kapitel ---------- */
// Erschienene Folgen einer Staffel: aus den Ausstrahlungsdaten, sonst die Gesamtzahl
export const released = x => x.aired != null ? (x.episodes ? Math.min(x.aired, x.episodes) : x.aired) : (x.episodes || 0);
const airingNow = x => x.airing === 'RELEASING';
// Staffel läuft noch und hat weniger erschienene Folgen als geplant (oder Gesamtzahl unbekannt)
export const partialAir = x => x.format !== 'MOVIE' && x.aired != null && x.airing !== 'FINISHED' && (!x.episodes || x.aired < x.episodes);
export const epTotal = x => x.episodes || (x.aired != null && x.aired > 0 ? x.aired : null);
// Zählt als „neu“: Staffel mit neu dazugekommenen Folgen, oder laufende Staffel, die du schon angefangen hast
export const countsAsNew = x => x.format !== 'MOVIE' && !x.complete && (!!x.newAt || (airingNow(x) && (x.seen || 0) > 0));
export function episodesBehind(item) {
  if (!['anime', 'series'].includes(item.type) || !item.seasonList?.length) return 0;
  return item.seasonList.filter(countsAsNew).reduce((a, x) => a + Math.max(0, released(x) - (x.seen || 0)), 0);
}
export const mangaBehind = m => (m.chapters != null ? Math.max(0, m.chapters - (m.chaptersRead || 0)) : 0);
export const newCount = it => it.type === 'manga' ? mangaBehind(it) : episodesBehind(it);
export const showsNew = it => ['active', 'paused', 'done'].includes(it.status) && newCount(it) > 0;
export const newItems = () => Store.all().filter(showsNew).sort((a, b) => (b.newEpisodeAt || b.newChapterAt || b.updatedAt || '').localeCompare(a.newEpisodeAt || a.newChapterAt || a.updatedAt || ''));
export const recentDate = (d, days) => !d || Date.parse(d) > Date.now() - days * 86400000;
export const lastShow = it => [...seasonsOf(it)].reverse().find(x => x.format !== 'MOVIE');

export function saveManga(item, patch) {
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

/* ---------- Zustand einer Karte: noch nicht erschienen hat Vorrang, sonst der Status ---------- */
export function releaseInfo(item) {
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
export function releaseLabel(r) {
  if (r.year) return `Erscheint ${r.year}`;
  if (!r.date) return 'Bald';
  const d = new Date(r.date + 'T00:00:00');
  const days = Math.round((d - new Date(new Date().toDateString())) / 86400000);
  if (days === 1) return 'Morgen';
  if (days < 7) return `In ${days} Tagen`;
  return d.toLocaleDateString('de-AT', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}
// Fortschritt 0..1 für laufende Einträge (Folgen, Kapitel)
export function mediaProgress(item) {
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

/* ---------- Demnächst ---------- */
export function upcomingEntries() {
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
export function upcomingText(u) {
  if (u.kind === 'ep') return [u.season, `Folge ${u.ep}${u.last ? ' (Finale)' : ''}`, u.name].filter(Boolean).join(' · ');
  if (u.kind === 'start') return `${u.season} startet`;
  if (u.kind === 'movie') return u.it.type === 'movie' ? 'Kinostart' : `${u.season} erscheint`;
  if (u.kind === 'game') return `Erscheint${u.it.platform ? ` für ${u.it.platform}` : ''}`;
  return '';
}

/* ---------- Anime-Filme zur passenden Reihe ---------- */
export const normTitle = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const titleSegment = t => normTitle(String(t || '').split(/[:!]| - |-(?=[A-Za-z])/)[0]);
export function findAnimeFor({ anilistId, relatedIds = [], title }) {
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
export function attachMovies(item, movies) {
  const list = materialize(item);
  let n = list.filter(x => x.format === 'MOVIE').length;
  movies.forEach(mv => {
    if (mv.anilistId && list.some(x => x.anilistId === mv.anilistId)) return;
    list.push({ ...mv, id: Store.uid(), format: 'MOVIE', label: `Film${++n > 1 ? ' ' + n : ''}` });
  });
  saveSeasons(item, list, { autoStatus: false });
}

/* ---------- Eigenes Cover: Bild vom Gerät, aufs Hochformat 2:3 zugeschnitten ---------- */
export function cropToCover(file) {
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

/* ---------- Schnell weiter: +1 Folge oder Kapitel (Übersicht) ---------- */
// Index der aktuellen Staffel, gleiche Regel wie currentSeason()
const currentIndex = list => {
  let i = list.findIndex(x => (x.seen || 0) > 0 && !seasonDone(x));
  if (i < 0) i = list.findIndex(x => !seasonDone(x));
  return i < 0 ? list.length - 1 : i;
};
// Was „+1“ bei diesem Eintrag bedeutet, oder null, wenn es nichts weiterzuzählen gibt
export function plusOneLabel(item) {
  if (item.type === "game") return (item.trophies || []).some(t => !t.done && t.tier !== "platinum") ? "Trophäe" : null;
  if (item.type === "series" && !item.seasonList?.some(x => x.episodes)) return item.seasons && (item.seasonSeen || 0) < item.seasons ? "Staffel" : null;
  if (item.type === 'manga') return item.chapters && (item.chaptersRead || 0) >= item.chapters ? null : 'Kapitel';
  if (!['series', 'anime'].includes(item.type)) return null;
  const cur = seasonsOf(item)[currentIndex(seasonsOf(item))];
  if (!cur || cur.format === 'MOVIE' || seasonDone(cur)) return null;
  const max = epTotal(cur);
  return max && (cur.seen || 0) < max ? 'Folge' : null;
}
export function plusOne(item) {
  if (item.type === "series" && !item.seasonList?.some(x => x.episodes)) { const n = Math.min(item.seasons || Infinity, (item.seasonSeen || 0) + 1); Store.update(item.id, { seasonSeen: n }); return { staffel: n }; }
  if (item.type === 'manga') { saveManga(item, { chaptersRead: Math.floor(item.chaptersRead || 0) + 1 }); return; }
  const list = materialize(item), i = currentIndex(seasonsOf(item)), x = list[i];
  x.seen = Math.min(epTotal(x) || Infinity, (x.seen || 0) + 1);
  if (!x.episodes || x.seen < x.episodes) x.complete = false;
  saveSeasons(item, list);
  return x;
}

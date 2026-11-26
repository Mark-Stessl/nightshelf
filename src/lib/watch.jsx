/* Nightshelf – neue Kapitel (MangaDex) und neue Folgen (AniList, TVmaze) im Hintergrund prüfen */
import { Store } from './store.js';
import { Sync } from './sync.js';
import { PSN } from './psn.js';
import { Airing } from './airing.js';
import { Trophies } from './trophies.js';
import { toast } from './bus.js';
import { fmtCh, fmtDate, lastShow, recentDate, saveSeasons, seasonsOf } from './util.js';
import { I, ToastIcon } from '../components/icons.jsx';

const lsNum = k => { try { return +localStorage.getItem(k) || 0; } catch { return 0; } };
const lsNow = k => { try { localStorage.setItem(k, String(Date.now())); } catch {} };

export const MangaWatch = (() => {
  const KEY = 'nightshelf.mangaCheck';
  const INTERVAL = 3 * 3600 * 1000;
  let running = false;
  async function check({ force = false, ids = null } = {}) {
    if (running) return { updated: [] };
    if (!force && Date.now() - lsNum(KEY) < INTERVAL) return { updated: [] };
    const list = Store.all('manga').filter(m => m.mangadexId && (ids ? ids.includes(m.mangadexId) : m.mdStatus !== 'completed'));
    if (!list.length) return { updated: [] };
    running = true;
    const updated = [];
    try {
      const all = [...new Set(list.map(m => m.mangadexId))];
      for (let i = 0; i < all.length; i += 40) {
        const res = await fetch(`${PSN.worker()}/manga/latest`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...Sync.header() }, body: JSON.stringify({ ids: all.slice(i, i + 40) }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { updated, error: data.error || 'error' };
        const now = new Date().toISOString();
        Object.entries(data.series || {}).forEach(([id, info]) => {
          Store.all('manga').filter(m => m.mangadexId === id).forEach(m => {
            const patch = { chapterCheckedAt: now };
            if (info.status) patch.mdStatus = info.status;
            if (info.latest && info.latest > (m.chapters || 0)) {
              patch.chapters = info.latest; patch.lastUpload = now; patch.newChapterAt = now;
              updated.push({ title: m.title, from: m.chapters || 0, to: info.latest });
            }
            Store.update(m.id, patch);
          });
        });
      }
      if (!ids) lsNow(KEY);
    } catch { return { updated, error: 'network' }; }
    finally { running = false; }
    const icon = <ToastIcon icon={I.book} color="var(--cyan)" />;
    if (updated.length === 1) toast(<>{icon}<div><b>{updated[0].title}</b><small>Kapitel {fmtCh(updated[0].to)} ist da</small></div></>);
    else if (updated.length > 1) toast(<>{icon}<div><b>{updated.length} Manga mit neuen Kapiteln</b><small>{updated.slice(0, 3).map(u => u.title).join(', ')}{updated.length > 3 ? ' …' : ''}</small></div></>);
    return { updated };
  }
  return { check };
})();

export const EpisodeWatch = (() => {
  const KEY = 'nightshelf.airCheck', SEQ_KEY = 'nightshelf.sequelCheck';
  const INTERVAL = 3 * 3600 * 1000, SEQ_INTERVAL = 20 * 3600 * 1000;
  let running = false;
  const tracked = it => it.status !== 'dropped';
  const strip = list => JSON.stringify(list.map(({ id, ...x }) => x));

  function store(it, list, extra) {
    const before = strip(seasonsOf(it)) + JSON.stringify({ u: it.upcoming || [], s: it.showStatus || '' });
    const after = strip(list) + JSON.stringify({ u: extra.upcoming || [], s: extra.showStatus || it.showStatus || '' });
    if (before === after) return false;
    Store.update(it.id, extra);
    saveSeasons(Store.get(it.id), list, { autoStatus: false });
    return true;
  }

  async function checkAnime(only, news) {
    const items = Store.all('anime').filter(it => tracked(it) && it.seasonList?.some(x => x.anilistId) && (!only || only.includes(it.id)));
    if (!items.length) return;
    const want = new Set();
    items.forEach(it => it.seasonList.forEach(x => { if (x.anilistId && (only || !['FINISHED', 'CANCELLED'].includes(x.airing))) want.add(x.anilistId); }));
    let seq = new Map();
    if (only || Date.now() - lsNum(SEQ_KEY) > SEQ_INTERVAL) {
      const lastIds = [...new Set(items.map(it => lastShow(it)?.anilistId).filter(Boolean))];
      seq = await Airing.animeSequels(lastIds).catch(() => new Map());
      seq.forEach(list => list.forEach(s => want.add(s.anilistId)));
      if (!only) lsNow(SEQ_KEY);
    }
    const info = want.size ? await Airing.anime([...want]) : new Map();
    const now = new Date().toISOString();
    for (const it0 of items) {
      const it = Store.get(it0.id); if (!it) continue;
      const list = seasonsOf(it).map(x => ({ ...x }));
      const removed = it.removedSeasons || [];
      (seq.get(lastShow(it)?.anilistId) || []).forEach(s => {
        if (list.some(x => x.anilistId === s.anilistId) || removed.includes(s.anilistId)) return;
        if (s.airing === 'FINISHED' && !recentDate(s.start, 300)) return; // ältere Teile, die bewusst fehlen, nicht nachtragen
        const movie = s.format === 'MOVIE';
        list.push({ ...s, id: Store.uid(), label: '', seen: 0, complete: false, newAt: now, aired: s.airing === 'NOT_YET_RELEASED' ? 0 : null });
        news.push({ item: it, kind: 'season', text: s.airing === 'NOT_YET_RELEASED' ? `${movie ? 'Neuer Film' : 'Neue Staffel'} angekündigt${s.start ? ` · ab ${fmtDate(s.start)}` : ''}` : `${movie ? 'Neuer Film' : 'Neue Staffel'} ist da` });
      });
      const shows = list.filter(x => x.format !== 'MOVIE').length;
      const upcoming = [];
      list.forEach(x => {
        const a = info.get(x.anilistId); if (!a) return;
        x.airing = a.status;
        if (a.episodes) x.episodes = a.episodes;
        if (a.aired != null) {
          if (x.aired != null && a.aired > x.aired && x.format !== 'MOVIE') {
            x.newAt = now;
            const n = a.aired - x.aired;
            news.push({ item: it, kind: 'ep', text: `${n > 1 ? `Folgen ${x.aired + 1}–${a.aired} sind` : `Folge ${a.aired} ist`} da${shows > 1 ? ` · ${x.label}` : ''}` });
          }
          x.aired = a.aired;
        }
        x.nextEp = a.next?.ep || null; x.nextAt = a.next?.at || null; x.start = a.start || x.start || null;
        a.schedule.forEach(s => upcoming.push({ at: s.at, kind: 'ep', ep: s.ep, season: shows > 1 ? x.label : '', last: !!(x.episodes && s.ep === x.episodes) }));
        if (a.status === 'NOT_YET_RELEASED' && !a.schedule.length && a.start) upcoming.push({ at: a.start + 'T00:00:00', dateOnly: true, kind: x.format === 'MOVIE' ? 'movie' : 'start', season: x.label });
      });
      upcoming.sort((a, b) => a.at.localeCompare(b.at));
      store(it, list, { upcoming: upcoming.slice(0, 12), airCheckedAt: now });
    }
  }

  async function checkSeries(only, news) {
    const items = Store.all('series').filter(it => tracked(it) && /^tvmaze:\d+$/.test(it.external || '') && (only ? only.includes(it.id) : it.showStatus !== 'Ended'));
    for (const it0 of items) {
      let s;
      try { s = await Airing.series(+it0.external.split(':')[1]); } catch { continue; }
      await Airing.sleep(300);
      const it = Store.get(it0.id); if (!it) continue;
      const now = new Date().toISOString();
      const hasIds = it.seasonList?.some(x => x.tvmazeId);
      const list = hasIds ? seasonsOf(it).map(x => ({ ...x })) : seasonsOf(it);
      if (hasIds) {
        s.seasons.forEach(ts => {
          const running = s.upcoming.some(u => u.season === ts.number) && ts.aired > 0;
          const airing = ts.aired === 0 ? 'NOT_YET_RELEASED' : running || (ts.episodes && ts.aired < ts.episodes) ? 'RELEASING' : 'FINISHED';
          let x = list.find(o => o.tvmazeId === ts.tvmazeId);
          if (!x) {
            if ((it.removedSeasons || []).includes(ts.tvmazeId) || !recentDate(ts.premiere, 300)) return;
            list.push({ id: Store.uid(), tvmazeId: ts.tvmazeId, label: '', title: ts.name || '', episodes: ts.episodes, year: ts.premiere ? +ts.premiere.slice(0, 4) : null, cover: ts.cover || it.cover || '', format: 'TV', seen: 0, complete: false, newAt: now, aired: ts.aired, airing });
            news.push({ item: it, kind: 'season', text: ts.aired ? `Staffel ${ts.number} ist da` : `Staffel ${ts.number} angekündigt${ts.premiere ? ` · ab ${fmtDate(ts.premiere)}` : ''}` });
            return;
          }
          if (ts.episodes && ts.episodes > (x.episodes || 0)) x.episodes = ts.episodes;
          if (x.aired != null && ts.aired > x.aired) {
            x.newAt = now;
            const n = ts.aired - x.aired;
            news.push({ item: it, kind: 'ep', text: n > 1 ? `${n} neue Folgen · Staffel ${ts.number}` : `Neue Folge · Staffel ${ts.number}, Folge ${ts.aired}` });
          }
          x.aired = ts.aired; x.airing = airing;
          const next = s.upcoming.find(u => u.season === ts.number);
          x.nextEp = next?.ep || null; x.nextAt = next?.at || null; x.start = ts.premiere || x.start || null;
        });
      }
      const upcoming = s.upcoming.map(u => ({ at: u.at, kind: 'ep', ep: u.ep, season: `Staffel ${u.season}`, name: u.name, dateOnly: u.dateOnly }));
      s.seasons.filter(ts => ts.aired === 0 && ts.premiere && !s.upcoming.some(u => u.season === ts.number) && Date.parse(ts.premiere) > Date.now() - 86400000)
        .forEach(ts => upcoming.push({ at: ts.premiere + 'T00:00:00', dateOnly: true, kind: 'start', season: `Staffel ${ts.number}` }));
      upcoming.sort((a, b) => a.at.localeCompare(b.at));
      const extra = { upcoming: upcoming.slice(0, 12), showStatus: s.status, airCheckedAt: now };
      if (hasIds) store(it, list, extra);
      else if (JSON.stringify(it.upcoming || []) !== JSON.stringify(extra.upcoming) || it.showStatus !== s.status) Store.update(it.id, extra);
    }
  }

  async function check({ force = false, ids = null } = {}) {
    if (running) return { news: [] };
    if (!force && Date.now() - lsNum(KEY) < INTERVAL) return { news: [] };
    running = true;
    const news = []; let error = null;
    try {
      await checkAnime(ids, news).catch(() => { error = 'network'; });
      await checkSeries(ids, news).catch(() => { error = 'network'; });
      if (!ids && !error) lsNow(KEY);
      const stamp = new Date().toISOString();
      [...new Set(news.map(n => n.item.id))].forEach(id => Store.update(id, { newEpisodeAt: stamp }));
    } finally { running = false; }
    const icon = <ToastIcon icon={I.tv} color="var(--cyan)" />;
    if (news.length === 1) toast(<>{icon}<div><b>{news[0].item.title}</b><small>{news[0].text}</small></div></>);
    else if (news.length > 1) { const t = [...new Set(news.map(n => n.item.title))]; toast(<>{icon}<div><b>{news.length} Neuigkeiten</b><small>{t.slice(0, 3).join(', ')}{t.length > 3 ? ' …' : ''}</small></div></>); }
    return { news, error };
  }
  return { check };
})();

// Beide Prüfungen auf einmal (Button „Neue Folgen prüfen“ / „Jetzt prüfen“)
export async function checkAllNews() {
  const [a, m] = await Promise.all([EpisodeWatch.check({ force: true }), Store.all('manga').length ? MangaWatch.check({ force: true }) : Promise.resolve({ updated: [] })]);
  if (!a.news.length && !m.updated.length) toast(<div><b>{a.error ? 'Nicht alles erreichbar' : 'Nichts Neues'}</b><small>{a.error ? 'Später nochmal versuchen' : 'Alles auf dem neuesten Stand'}</small></div>);
}
export async function checkManga() {
  const r = await MangaWatch.check({ force: true });
  if (r.error) toast(<div><b>Prüfen hat nicht geklappt</b><small>{r.error === 'key_required' ? 'Verbinde das Gerät unter Daten mit deinem Schlüssel' : 'Server nicht erreichbar'}</small></div>);
  else if (!r.updated.length) toast(<div><b>Keine neuen Kapitel</b><small>Alles auf dem neuesten Stand</small></div>);
}

/* ---------- KI-Trophäen ---------- */
const AI_KEY = 'nightshelf.aiQuota';
export const utcDay = () => new Date().toISOString().slice(0, 10);
export const aiBlockedToday = () => { try { return localStorage.getItem(AI_KEY) === utcDay(); } catch { return false; } };
export const markAiBlocked = () => { try { localStorage.setItem(AI_KEY, utcDay()); } catch {} };
function aiResetTime() {
  const d = new Date(); d.setUTCHours(24, 0, 0, 0);
  return d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}
export const aiQuotaText = () => `Die KI-Trophäen sind für heute aufgebraucht. Ab ${aiResetTime()} Uhr geht es wieder.`;

export async function smartTrophies(title, genre, platform, size = 'normal') {
  if (aiBlockedToday()) return { trophies: null, ai: false, reason: 'ai_quota' };
  try {
    const res = await fetch(`${PSN.worker()}/achievements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...Sync.header() },
      body: JSON.stringify({ title, genre: Trophies.GENRES[genre] || '', platform: platform || '', size }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data.trophies) || !data.trophies.length) throw Object.assign(new Error(data.error || 'ai'), { code: data.error });
    const trophies = data.trophies.map(t => ({ id: Store.uid(), name: t.name, desc: t.desc || '', tier: Trophies.TIERS[t.tier] ? t.tier : 'bronze', done: false }));
    const rank = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    trophies.sort((a, b) => rank[a.tier] - rank[b.tier]);
    return { trophies, ai: true };
  } catch (e) {
    if (e.code === 'ai_quota') { markAiBlocked(); return { trophies: null, ai: false, reason: 'ai_quota' }; }
    if (e.code === 'key_required') return { trophies: null, ai: false, reason: 'key_required' };
    return { trophies: Trophies.generate(title, genre, size), ai: false, reason: e.code };
  }
}

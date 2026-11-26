/* Nightshelf – Formular: Hinzufügen / Bearbeiten */
import { useEffect, useRef, useState } from 'react';
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import { Lookup } from '../lib/lookup.js';
import { PSN } from '../lib/psn.js';
import { Steam } from '../lib/steam.js';
import { go, openModal, toast } from '../lib/bus.js';
import { COVER_V, queueCover } from '../lib/covers.js';
import { EpisodeWatch, aiBlockedToday, aiQuotaText, smartTrophies } from '../lib/watch.jsx';
import {
  MONTH_NAMES, PLATFORMS, PLATFORM_GROUPS, STATUS, TYPES, attachMovies, cropToCover, distributeSeen, findAnimeFor,
  fmtCh, fmtDate, isCoarse, mq, parseHours, psDefault, seasonTotals,
} from '../lib/util.js';
import { I, ToastIcon, typeIcon } from '../components/icons.jsx';
import { ModalFrame, Msg, StarsInput, cn } from '../components/ui.jsx';
import { TrophyPreview, collectPreview } from './trophyDialogs.jsx';

export function openItemForm(type, item = null) {
  openModal(close => <ItemForm type={type} item={item} close={close} />);
}

const ymd = (y, mo, da) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
const todayStr = () => { const t = new Date(); return ymd(t.getFullYear(), t.getMonth(), t.getDate()); };
const num = v => v === '' || v == null ? null : +v;

/* Eigener Kalender im App-Stil (Datum optional, das Jahr reicht) */
function CalPop({ released, onPick, onClear, onClose, baseYear }) {
  const ref = useRef(null);
  const [view, setView] = useState(() => {
    const base = released ? new Date(released + 'T00:00:00') : baseYear ? new Date(+baseYear, new Date().getMonth(), 1) : new Date();
    return { y: base.getFullYear(), m: base.getMonth(), mode: 'days' };
  });
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const outside = e => { if (!ref.current?.contains(e.target) && !e.target.closest('.year-cal')) onClose(); };
    const t = setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', outside, true); };
  }, []);
  const { y, m, mode } = view;
  const nav = patch => e => { e.preventDefault(); setView(v => ({ ...v, ...(typeof patch === 'function' ? patch(v) : patch) })); };
  const prevM = v => (v.m === 0 ? { m: 11, y: v.y - 1 } : { m: v.m - 1 });
  const nextM = v => (v.m === 11 ? { m: 0, y: v.y + 1 } : { m: v.m + 1 });
  const today = todayStr();
  if (mode === 'months') return (
    <div className="calpop" ref={ref}>
      <div className="cal-head"><button type="button" className="cal-nav" onClick={nav(v => ({ y: v.y - 1 }))}>‹</button><button type="button" className="cal-title" onClick={nav({ mode: 'days' })}>{y}</button><button type="button" className="cal-nav" onClick={nav(v => ({ y: v.y + 1 }))}>›</button></div>
      <div className="cal-months">{MONTH_NAMES.map((n, i) => <button key={n} type="button" className={cn('cal-month', released && +released.slice(0, 4) === y && +released.slice(5, 7) === i + 1 && 'sel')} onClick={nav({ m: i, mode: 'days' })}>{n.slice(0, 3)}</button>)}</div>
    </div>
  );
  const startDay = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => { const dt = new Date(y, m, 1 - startDay + i); return { dt, str: ymd(dt.getFullYear(), dt.getMonth(), dt.getDate()) }; });
  return (
    <div className="calpop" ref={ref}>
      <div className="cal-head"><button type="button" className="cal-nav" onClick={nav(prevM)}>‹</button><button type="button" className="cal-title" onClick={nav({ mode: 'months' })}>{MONTH_NAMES[m]} {y}</button><button type="button" className="cal-nav" onClick={nav(nextM)}>›</button></div>
      <div className="cal-grid">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => <span key={w} className="cal-wd">{w}</span>)}
        {cells.map(({ dt, str }) => <button key={str} type="button" className={cn('cal-day', dt.getMonth() !== m && 'out', str === today && 'today', str === released && 'sel')} onClick={e => { e.preventDefault(); onPick(str); }}>{dt.getDate()}</button>)}
      </div>
      <div className="cal-foot"><button type="button" className="cal-link" onClick={() => onPick(today)}>Heute</button>{released && <button type="button" className="cal-link danger" onClick={onClear}>Entfernen</button>}</div>
    </div>
  );
}

function ItemForm({ type, item, close }) {
  const isEdit = !!item;
  const d = item || { type, status: type === 'movie' ? 'done' : 'active', platform: 'PS5', genre: 'adventure' };
  const [f, setF] = useState(() => ({
    title: d.title || '', platform: d.platform || 'PS5', genre: d.genre || 'adventure', status: d.status, year: d.year || '',
    seasons: d.seasons || '', seasonSeen: d.seasonSeen || '', chapters: d.chapters ?? '', chaptersRead: d.chaptersRead ?? '',
    episodes: d.episodes || '', episodesSeen: d.episodesSeen || '', rating: d.rating || 0, notes: d.notes || '',
    playH: d.playH != null ? d.playH : '', cover: d.cover || '', tsize: 'normal',
  }));
  const set = patch => setF(s => ({ ...s, ...patch }));
  const [chaptersTouched, setChaptersTouched] = useState(false);
  const [released, setReleased] = useState(/^\d{4}-\d{2}-\d{2}/.test(d.released || '') ? d.released.slice(0, 10) : null);
  const [calOpen, setCalOpen] = useState(false);
  const [customCover, setCustomCover] = useState(null);
  const [coverErr, setCoverErr] = useState('');
  const [titleErr, setTitleErr] = useState('');
  const [trophyMode, setTrophyMode] = useState(psDefault(d.platform));
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState([]);
  const previewRef = useRef(null);
  const [fetched, setFetched] = useState(null);
  const [info, setInfo] = useState(null); // 'loading' | 'error' | null
  const [busy, setBusy] = useState(null); // Text auf dem Speichern-Knopf
  const keyHint = { movie: 'TMDB' }[type];

  /* ---------- Titelsuche ---------- */
  const [sug, setSug] = useState({ open: false, state: 'idle', hits: [], msg: '' });
  const [activeIdx, setActiveIdx] = useState(-1);
  const seqRef = useRef(0), timerRef = useRef(null), sugRef = useRef(null), titleRef = useRef(null);
  // Am Handy: Liste so hoch wie der freie Platz über der Tastatur
  const fitSug = () => {
    const el = sugRef.current;
    if (!el || !isCoarse()) return;
    const vv = window.visualViewport;
    let bottom = vv ? vv.offsetTop + vv.height : innerHeight;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') { bottom = Math.min(bottom, p.getBoundingClientRect().bottom); break; }
    }
    const top = titleRef.current.getBoundingClientRect().bottom + 6;
    el.style.maxHeight = Math.max(150, bottom - top - 10) + 'px';
  };
  useEffect(() => { if (sug.open) { sugRef.current && (sugRef.current.scrollTop = 0); fitSug(); } }, [sug]);
  useEffect(() => { const vv = window.visualViewport; vv?.addEventListener('resize', fitSug); return () => vv?.removeEventListener('resize', fitSug); }, []);
  const hideSug = () => { setSug(s => ({ ...s, open: false })); setActiveIdx(-1); };

  async function runSearch(q) {
    const my = ++seqRef.current;
    setSug({ open: true, state: 'loading', hits: [], msg: 'Suche…' });
    try {
      const hits = await Lookup.search(type, q);
      if (my !== seqRef.current) return;
      setSug(hits.length ? { open: true, state: 'hits', hits, msg: '' } : { open: true, state: 'msg', hits: [], msg: 'Nichts gefunden. Du kannst trotzdem alles selbst eintragen.' });
    } catch (err) {
      if (my !== seqRef.current) return;
      setSug({ open: true, state: 'msg', hits: [], msg: err.message === 'key' ? `Der ${keyHint}-Schlüssel wird nicht akzeptiert. Prüfe ihn unter Daten.` : 'Keine Verbindung zur Datenbank. Du kannst alles selbst eintragen.' });
    }
  }
  const onTitle = e => {
    const v = e.target.value;
    set({ title: v }); setTitleErr('');
    clearTimeout(timerRef.current);
    const q = v.trim();
    if (q.length < 2 || !Lookup.hasKey(type)) { seqRef.current++; hideSug(); return; }
    timerRef.current = setTimeout(() => runSearch(q), 350);
  };
  const onTitleKey = e => {
    if (!sug.open || sug.state !== 'hits') return;
    const n = sug.hits.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pick(activeIdx); }
    else if (e.key === 'Escape') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); hideSug(); }
  };

  async function pick(i) {
    const h = sug.hits[i]; if (!h) return;
    hideSug();
    set({ title: h.title });
    // Am Handy die Tastatur schließen, sobald etwas ausgewählt wurde
    if (isCoarse()) titleRef.current?.blur();
    setInfo('loading');
    try {
      const dt = await Lookup.detail(type, h);
      setFetched(dt);
      const patch = {};
      if (dt.year) patch.year = dt.year;
      setReleased(/^\d{4}-\d{2}-\d{2}/.test(dt.released || '') ? dt.released.slice(0, 10) : null);
      if (dt.cover) patch.cover = dt.cover;
      if (type === 'series' && dt.seasons) patch.seasons = dt.seasons;
      if (type === 'anime' && dt.episodes) patch.episodes = dt.episodes;
      if (type === 'manga' && dt.latest) patch.chapters = dt.latest;
      if (type === 'game') {
        if (dt.genre) patch.genre = dt.genre;
        if (dt.platforms?.length && !dt.platforms.includes(f.platform)) {
          const pref = ['PS5', 'Switch 2', 'Switch', 'PS4', 'Steam', 'Xbox Series', 'Xbox One', 'Wii U', 'PS3', 'Xbox 360', 'Wii', '3DS', 'Mobile'].find(p => dt.platforms.includes(p));
          if (pref) { patch.platform = pref; if (!isEdit) setTrophyMode(psDefault(pref)); }
        }
      }
      set(patch);
      setInfo(null);
    } catch { setInfo('error'); }
  }

  const onCoverFile = async e => {
    const file = e.target.files[0]; if (!file) return;
    setCoverErr('');
    try { setCustomCover(await cropToCover(file)); }
    catch { setCoverErr('Dieses Bild konnte nicht gelesen werden. Versuch ein JPG oder PNG.'); }
  };

  /* ---------- Speichern ---------- */
  async function save(e) {
    e.preventDefault();
    const title = f.title.trim();
    if (!title) { setTitleErr('Gib einen Titel ein.'); titleRef.current?.focus(); return; }
    const data = { type, title, status: f.status, year: f.year ? +f.year : null, rating: f.rating || 0, cover: f.cover.trim(), notes: f.notes.trim() };
    if (type === 'game') {
      data.platform = f.platform; data.genre = f.genre;
      const ph = parseHours(f.playH);
      data.playH = ph === undefined ? (isEdit ? item.playH ?? null : null) : ph;
    }
    if (customCover) Object.assign(data, { cover: customCover, coverCustom: true, coverV: COVER_V, coverTried: true });
    data.released = released || null; // nur was im Formular steht (Jahr allein = kein genaues Datum)
    // „Fertig am“ setzt die App selbst: beim Status „Fertig“ das heutige Datum, beim Bearbeiten bleibt das alte
    if (!isEdit) data.finishedAt = data.status === 'done' ? new Date().toISOString() : null;
    if (type === 'manga') {
      data.chapters = num(f.chapters);
      data.chaptersRead = f.chaptersRead !== '' ? +f.chaptersRead : 0;
      if (data.chapters != null && data.chaptersRead > data.chapters) data.chapters = data.chaptersRead;
      if (isEdit && (item.chapters || 0) > (data.chapters || 0) && !chaptersTouched) data.chapters = item.chapters;
    }
    const animeEp = type === 'anime' && !d.seasonList?.length, seriesS = type === 'series' && !d.seasonList?.some(x => x.episodes);
    if (animeEp) { data.episodes = f.episodes ? +f.episodes : null; data.episodesSeen = f.episodesSeen ? +f.episodesSeen : null; }
    if (seriesS) { data.seasons = f.seasons ? +f.seasons : null; data.seasonSeen = f.seasonSeen ? +f.seasonSeen : null; }
    if (fetched) ['genres', 'runtime', 'summary', 'external', 'anilistId', 'mangadexId', 'mdStatus', 'lastUpload', 'kind', 'authors'].forEach(k => { if (fetched[k] != null && fetched[k] !== '') data[k] = fetched[k]; });

    if (isEdit) { Store.update(item.id, data); close(); toast(<Msg title="Gespeichert" />); return; }
    const fail = msg => { setBusy(null); setTitleErr(msg); };

    if (type === 'game') {
      if (trophyMode === 'steam') {
        setBusy('Lade Erfolge…');
        try {
          const hit = await Steam.find(title);
          if (hit) {
            const res = await Steam.achievementsFor(hit.appid);
            if (res.achievements.length) Object.assign(data, Steam.patchFor({ ...data, coverTried: false }, hit.appid, res));
            else { data.steamAppId = hit.appid; data.trophies = Trophies.generate(title, data.genre, 'normal'); data.trophySource = 'generated'; setTimeout(() => toast(<Msg title="Keine Steam-Erfolge" sub="Dieses Spiel hat auf Steam keine Erfolge, Trophäen wurden erstellt" />), 400); }
            if (res.playerError === 'profile_private') setTimeout(() => toast(<Msg title="Steam-Profil ist privat" sub="Freigeschaltete Erfolge konnten nicht gelesen werden" />), 900);
          } else {
            data.trophies = Trophies.generate(title, data.genre, 'normal'); data.trophySource = 'generated';
            setTimeout(() => toast(<Msg title="Auf Steam nicht gefunden" sub="Trophäen wurden automatisch erstellt" />), 400);
          }
        } catch (err) {
          return fail(err.code === 'key_required' ? 'Dieses Gerät ist noch nicht mit deinem Schlüssel verbunden (Daten → Sync).' : err.code === 'key_rejected' ? 'Steam lehnt den API-Schlüssel ab. Prüfe ihn unter Daten → Steam.' : 'Steam ist gerade nicht erreichbar. Wähle eine andere Option.');
        }
      } else if (trophyMode === 'psn') {
        setBusy('Lade Trophäen…');
        try {
          const r = await PSN.trophiesFor(title);
          if (r) {
            data.trophies = r.trophies; data.trophySource = 'psn'; data.psnId = r.title.id; data.psnService = r.title.service;
            Trophies.syncPlatinum(data.trophies);
            if (data.trophies.find(t => t.tier === 'platinum')?.done) data.status = 'done';
          } else {
            data.trophies = Trophies.generate(title, data.genre, 'normal'); data.trophySource = 'generated';
            setTimeout(() => toast(<Msg title="Nicht im PlayStation-Verlauf gefunden" sub="Trophäen wurden automatisch erstellt" />), 400);
          }
        } catch (err) {
          return fail(err.code === 'expired' ? 'PlayStation-Anmeldung abgelaufen. Verbinde dich unter Daten neu.' : 'PlayStation nicht erreichbar. Wähle eine andere Option.');
        }
      } else if (trophyMode === 'auto') {
        setBusy('Analysiere Spiel…');
        const r = await smartTrophies(title, data.genre, data.platform, f.tsize);
        if (r.reason === 'key_required') return fail('Dieses Gerät ist noch nicht mit deinem Schlüssel verbunden. Verbinde es unter Daten → Sync.');
        if (r.reason === 'ai_quota') return fail('Heute nicht mehr möglich: ' + aiQuotaText() + ' Wähle „Später“, um das Spiel ohne Trophäen anzulegen.');
        data.trophies = r.trophies; data.trophySource = r.ai ? 'ai' : 'generated';
        if (!r.ai) setTimeout(() => toast(<Msg title="Genre-Vorlage verwendet" sub="Die KI war gerade nicht erreichbar" />), 400);
      } else if (trophyMode === 'paste') {
        data.trophies = collectPreview(previewRef.current, parsed);
        data.trophySource = 'imported';
        Trophies.syncPlatinum(data.trophies);
      }
    }
    if (type === 'series' && fetched?.seasonList?.length) {
      const doneUpTo = data.status === 'done' ? fetched.seasonList.length : (data.seasonSeen || 0);
      data.seasonList = fetched.seasonList.map((x, i) => ({ ...x, id: Store.uid(), seen: i < doneUpTo ? (x.episodes || 0) : 0, complete: i < doneUpTo }));
      Object.assign(data, seasonTotals(data.seasonList), { seasons: data.seasonList.length, seasonSeen: Math.min(doneUpTo, data.seasonList.length) });
    }
    if (type === 'anime' && fetched?.anilistId && fetched.format === 'MOVIE') {
      setBusy('Suche passende Reihe…');
      let related = [];
      try { related = await Lookup.animeRelatedIds(fetched.anilistId); } catch {}
      const hit = findAnimeFor({ anilistId: fetched.anilistId, relatedIds: related, title: data.title });
      if (hit) {
        if (!hit.already) {
          const seen = data.status === 'done' || (data.episodesSeen || 0) > 0;
          attachMovies(hit.item, [{ anilistId: fetched.anilistId, title: data.title, episodes: fetched.episodes || 1, seen: seen ? (fetched.episodes || 1) : 0, complete: seen, year: data.year, cover: data.cover }]);
        }
        close();
        go(`#/item/${hit.item.id}`);
        toast(hit.already ? <Msg title="Schon vorhanden" sub={`${data.title} ist bei ${hit.item.title} dabei`} /> : <Msg title="Film hinzugefügt" sub={`bei ${hit.item.title}`} />);
        return;
      }
      setBusy(null);
    }
    if (type === 'anime' && fetched?.anilistId) {
      setBusy('Lade Staffeln…');
      try {
        const list = await Lookup.animeSeasons(fetched.anilistId);
        if (list.length) {
          data.seasonList = list.map(x => ({ ...x, id: Store.uid(), seen: 0 }));
          distributeSeen(data.seasonList.filter(x => x.format !== 'MOVIE'), data.episodesSeen || 0, data.status === 'done');
          Object.assign(data, seasonTotals(data.seasonList));
          const base = data.seasonList[0];
          if (data.seasonList.length > 1 && base.anilistId !== fetched.anilistId) {
            data.title = base.title || data.title; data.year = base.year || data.year;
            if (base.cover) data.cover = base.cover;
            data.anilistId = base.anilistId; data.external = `anilist:${base.anilistId}`; delete data.released;
          }
        }
      } catch {}
    }
    const created = Store.add(data);
    // Neues Spiel: sofort nach einem Hochformat-Cover suchen (Steam-Bibliothek zuerst, dann Wikipedia)
    if (type === 'game' && (created.coverV || 0) < COVER_V) queueCover(created.id);
    close();
    if (['anime', 'series'].includes(type)) setTimeout(() => EpisodeWatch.check({ force: true, ids: [created.id] }), 400);
    go(`#/item/${created.id}`);
    toast(<><ToastIcon icon={typeIcon(type)} /><Msg title={title} sub="wurde hinzugefügt" /></>);
  }

  const st = STATUS[type];
  const releasedLabel = released && new Date(released + 'T00:00:00').toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' });
  const platformKnown = PLATFORMS.includes(f.platform);

  return (
    <ModalFrame title={`${TYPES[type].label} ${isEdit ? 'bearbeiten' : 'hinzufügen'}`} wide={type === 'game' && !isEdit} close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" disabled={!!busy} onClick={save}>{busy || (isEdit ? 'Speichern' : 'Hinzufügen')}</button></>}>
      <form className="form" noValidate onSubmit={save}>
        <div className="field"><label>Titel</label>
          <div className="suggest-wrap">
            <input ref={titleRef} className="input" value={f.title} onChange={onTitle} onKeyDown={onTitleKey} onBlur={() => setTimeout(hideSug, 150)} autoComplete="off"
              placeholder={type === 'game' ? 'Super Mario Odyssey' : type === 'series' ? 'All of Us Are Dead' : 'Dune: Part Two'} />
            <div className="suggest" ref={sugRef} hidden={!sug.open}>
              {sug.state === 'hits' ? sug.hits.map((h, i) => (
                <button key={i} type="button" className={cn('suggest-item', i === activeIdx && 'on')} onMouseDown={e => { e.preventDefault(); pick(i); }}>
                  <span className="suggest-thumb">{h.thumb && <img src={h.thumb} alt="" onError={e => e.currentTarget.remove()} />}</span>
                  <span className="suggest-text"><b>{h.title}</b><small>{h.sub}</small></span>
                </button>
              )) : <div className="suggest-msg">{sug.msg}</div>}
            </div>
          </div>
          <div className="field-error">{titleErr}</div>
          {info === 'loading' ? <div className="tiny mt-1">Lade Infos…</div>
            : info === 'error' ? <div className="tiny mt-1">Details konnten nicht geladen werden.</div>
            : fetched ? <div className="fetched">{fetched.cover && <img src={fetched.cover} alt="" />}<div><b>Infos übernommen</b><small>{[fetched.released ? fmtDate(fetched.released) : fetched.year, (fetched.genres || []).slice(0, 3).join(', '), fetched.runtime ? fetched.runtime + ' Min.' : '', fetched.seasons ? fetched.seasons + (fetched.seasons === 1 ? ' Staffel' : ' Staffeln') : '', fetched.episodes ? fetched.episodes + ' Folgen' : '', fetched.latest ? `${fetched.completed ? '' : 'laufend · '}${fmtCh(fetched.latest)} Kapitel` : ''].filter(Boolean).join(' · ')}</small></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFetched(null); set({ cover: '' }); }}>Entfernen</button></div>
            : !Lookup.hasKey(type) && <div className="tiny mt-1">Tipp: Mit einem kostenlosen {keyHint}-Schlüssel unter <a href="#/settings" onClick={close} style={{ color: 'var(--lilac)' }}>Daten</a> werden Cover und Infos automatisch ausgefüllt.</div>}
        </div>

        {type === 'game' && <div className="grid-2">
          <div className="field"><label>Plattform</label>
            <select className="input" value={f.platform} onChange={e => { set({ platform: e.target.value }); if (!isEdit) setTrophyMode(psDefault(e.target.value)); }}>
              {PLATFORM_GROUPS.map(([g, list]) => <optgroup key={g} label={g}>{list.map(p => <option key={p}>{p}</option>)}</optgroup>)}
              {f.platform && !platformKnown && <option>{f.platform}</option>}
            </select></div>
          <div className="field"><label>Genre</label>
            <select className="input" value={f.genre} onChange={e => set({ genre: e.target.value })}>{Object.entries(Trophies.GENRES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>}

        <div className="grid-2">
          <div className="field"><label>Status</label>
            <select className="input" value={f.status} onChange={e => set({ status: e.target.value })}>{Object.entries(st).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="field"><label>Jahr</label>
            <div className="year-wrap">
              <input className="input" type="number" min="1950" max="2100" value={f.year} placeholder="2024"
                onChange={e => { set({ year: e.target.value }); if (released && e.target.value !== released.slice(0, 4)) setReleased(null); }} />
              <button type="button" className="year-cal" title="Genaues Datum wählen (optional)" aria-label="Genaues Datum wählen" onClick={() => setCalOpen(o => !o)}>{I.calendar}</button>
              {calOpen && <CalPop released={released} baseYear={f.year} onClose={() => setCalOpen(false)}
                onPick={str => { setReleased(str); set({ year: str.slice(0, 4) }); setCalOpen(false); }}
                onClear={() => { setReleased(null); setCalOpen(false); }} />}
            </div>
            <div className="rel-chip">{released && <>{I.calendar}<span>{releasedLabel}</span><button type="button" title="Datum entfernen" onClick={() => setReleased(null)}>{I.x}</button></>}</div>
          </div>
        </div>

        {type === 'series' && (d.seasonList?.some(x => x.episodes)
          ? <p className="tiny m-0">Staffeln und Folgen bearbeitest du direkt auf der Seite der Serie.</p>
          : <div className="grid-2">
            <div className="field"><label>Staffeln gesamt</label><input className="input" type="number" min="0" value={f.seasons} onChange={e => set({ seasons: e.target.value })} placeholder="5" /></div>
            <div className="field"><label>Gesehen bis Staffel</label><input className="input" type="number" min="0" value={f.seasonSeen} onChange={e => set({ seasonSeen: e.target.value })} placeholder="3" /></div>
          </div>)}
        {type === 'anime' && (d.seasonList?.length
          ? <p className="tiny m-0">Folgen und Staffeln bearbeitest du direkt auf der Seite des Anime.</p>
          : <div className="grid-2">
            <div className="field"><label>Folgen gesamt</label><input className="input" type="number" min="0" value={f.episodes} onChange={e => set({ episodes: e.target.value })} placeholder="24" /></div>
            <div className="field"><label>Gesehene Folgen</label><input className="input" type="number" min="0" value={f.episodesSeen} onChange={e => set({ episodesSeen: e.target.value })} placeholder="12" /></div>
          </div>)}
        {type === 'manga' && <div className="grid-2">
          <div className="field"><label>Kapitel aktuell</label><input className="input" type="number" min="0" step="any" value={f.chapters} onChange={e => { setChaptersTouched(true); set({ chapters: e.target.value }); }} placeholder="368" /></div>
          <div className="field"><label>Gelesen bis Kapitel</label><input className="input" type="number" min="0" step="any" value={f.chaptersRead} onChange={e => set({ chaptersRead: e.target.value })} placeholder="120" /></div>
        </div>}

        <div className="field"><label>Bewertung</label><StarsInput value={f.rating} onChange={v => set({ rating: v })} /></div>

        <details className="form-more" open={(isEdit && !!d.notes) || mq('(min-width: 821px)')}>
          <summary>Weitere Angaben <span className="tiny">{type === 'game' ? 'Notizen, Spielzeit, Cover' : 'Notizen, Cover'}</span></summary>
          <div className="form-more-body">
            <div className="field"><label>Notizen</label><textarea className="input" value={f.notes} onChange={e => set({ notes: e.target.value })} placeholder="Was hat dir gefallen?" /></div>
            {type === 'game' && <div className="field"><label>Spielzeit <span className="tiny">(optional)</span></label>
              <div className="unit-wrap"><input className="input" type="text" inputMode="decimal" autoComplete="off" value={f.playH} onChange={e => set({ playH: e.target.value })}
                placeholder={d.playMin != null ? `automatisch: ${Math.round(d.playMin / 60)}` : 'z. B. 35'} /><span>Stunden</span></div></div>}
            <div className="field"><label>Cover-Bild (Link, optional)</label>
              <input className="input" value={f.cover} onChange={e => set({ cover: e.target.value })} placeholder="https://…/cover.jpg" />
              <label className="add-pick-btn cover-pick mt-1">
                <span className="add-pick-icon">{customCover ? <img src={customCover} alt="" /> : I.upload}</span>
                <span className="add-pick-text"><b>{customCover ? 'Bild ausgewählt' : 'Bild auswählen'}</b><small>{customCover ? 'Tippen, um ein anderes zu nehmen' : 'Vom Handy oder PC, wird aufs Hochformat zugeschnitten'}</small></span>
                <input type="file" accept="image/*" hidden onChange={onCoverFile} />
              </label>
              <div className="field-error">{coverErr}</div>
            </div>
          </div>
        </details>

        {type === 'game' && !isEdit && <>
          <div className="field"><label>Trophäen</label>
            <div className="seg">
              {[PSN.connected() && ['psn', 'Von PlayStation'], Steam.connected() && ['steam', 'Von Steam'], ['auto', 'Automatisch erstellen'], ['paste', 'Liste einfügen'], ['none', 'Später']].filter(Boolean)
                .map(([k, l]) => <button key={k} type="button" className={trophyMode === k ? 'on' : ''} onClick={() => setTrophyMode(k)}>{l}</button>)}
            </div>
          </div>
          <div>
            {trophyMode === 'steam' ? <div className="hint-box">{I.trophy}<div>Die Erfolge werden von Steam geladen, mit Namen, Beschreibung und wie selten sie sind. Die Stufe kommt aus der Seltenheit: unter 5 % Gold, unter 20 % Silber, sonst Bronze. Platin gibt es für alle Erfolge.{Steam.hasProfile() ? ' Schon freigeschaltete Erfolge werden direkt abgehakt.' : ''}</div></div>
              : trophyMode === 'psn' ? <div className="hint-box">{I.trophy}<div>Die echte Trophäenliste wird von deinem PlayStation-Konto geladen, mit deinen schon verdienten Trophäen. Das klappt für Spiele, die du auf PS4 oder PS5 mindestens einmal gestartet hast.</div></div>
              : trophyMode === 'auto' ? (aiBlockedToday()
                ? <div className="hint-box quota">{I.info}<div><b>Heute nicht mehr möglich.</b> {aiQuotaText()} Wähle „Später“ und erstelle die Trophäen dann auf der Spielseite.</div></div>
                : <><div className="hint-box">{I.sparkle}<div>Die KI liest sich Infos zum Spiel durch und erstellt Trophäen, die genau zu diesem Spiel passen, mit Bronze, Silber, Gold und Platin. Du kannst danach jede Trophäe umbenennen, löschen oder eigene hinzufügen.</div></div>
                  <div className="field mt-3"><label>Umfang</label><select className="input" value={f.tsize} onChange={e => set({ tsize: e.target.value })}><option value="short">Kurz (7)</option><option value="normal">Normal (12)</option><option value="long">Umfangreich (18)</option></select></div></>)
              : trophyMode === 'paste' ? <>
                <div className="hint-box">{I.paste}<div>Kopiere die Trophäenliste z. B. von PSNProfiles, Exophase oder der Steam-Erfolgsseite und füge sie hier ein. Prozentwerte werden erkannt und für die Stufe genutzt, verdiente Trophäen (mit Datum) werden direkt abgehakt. Eigenes Format geht auch: <code>Name | Beschreibung | Gold</code></div></div>
                <textarea className="input mt-3 min-h-[140px] text-[13px]" value={pasteText} placeholder={'Elden Lord\nAchieved the "Elden Lord" ending\n12.5%\n…'}
                  onChange={e => { setPasteText(e.target.value); setParsed(Trophies.parse(e.target.value)); }} />
                <div ref={previewRef}><TrophyPreview list={parsed} /></div>
              </>
              : <p className="tiny m-0">Du kannst Trophäen jederzeit auf der Spielseite erstellen oder importieren.</p>}
          </div>
        </>}
      </form>
    </ModalFrame>
  );
}

/* Nightshelf – weitere Fenster: Art wählen, LiveChart-Import, Staffel, Kapitelzahl, Sync-Fortschritt */
import { useEffect, useState } from 'react';
import { Store } from '../lib/store.js';
import { Lookup } from '../lib/lookup.js';
import { PSN } from '../lib/psn.js';
import { Steam } from '../lib/steam.js';
import { go, openModal, toast } from '../lib/bus.js';
import { ORDER_TYPES, TYPES, attachMovies, findAnimeFor, materialize, normTitle, saveSeasons, seasonDone, seasonTotals, seasonsOf } from '../lib/util.js';
import { I, typeIcon } from '../components/icons.jsx';
import { ModalFrame, Msg, Seg, StatusPill } from '../components/ui.jsx';
import { openItemForm } from './ItemForm.jsx';
import { libState, seasonTab } from '../lib/viewState.js';

/* ---------- Hinzufügen: erst Art wählen ---------- */
export function addPicker() {
  const hint = { game: 'mit Trophäen', series: 'mit Staffeln', anime: 'mit Staffeln & Filmen', manga: 'mit Kapiteln', movie: 'mit Kinostart' };
  openModal(close => (
    <ModalFrame title="Was möchtest du hinzufügen?" close={close}>
      <div className="add-pick">{ORDER_TYPES.map(t => (
        <button key={t} type="button" className="add-pick-btn" onClick={() => { close(); setTimeout(() => openItemForm(t), 60); }}>
          <span className="add-pick-icon">{typeIcon(t)}</span><span className="add-pick-text"><b>{TYPES[t].label}</b><small>{hint[t]}</small></span>
        </button>))}
      </div>
    </ModalFrame>
  ));
}

/* ---------- LiveChart-Liste einfügen ---------- */
function parseLiveChart(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const PROG = /^(\d+)\s*\/\s*(\d+|–|-|\?)$/;
  const out = [];
  lines.forEach((l, p) => {
    const m = l.match(PROG);
    if (!m || p < 4) return;
    const rating = lines[p - 1], status = lines[p - 2], format = lines[p - 3], title = lines[p - 4];
    if (!title || /^\d+([.,]\d+)?$/.test(title) || PROG.test(title)) return;
    const r = /^\d{1,2}$/.test(rating) ? +rating : null;
    out.push({
      title, format, status, movie: /^THTR\b/i.test(format),
      rating: r && r <= 10 ? r : null,
      seen: +m[1], total: /^\d+$/.test(m[2]) ? +m[2] : null,
      upcoming: /^\d{4}$/.test(status) || /\d+d\s+\d+h/.test(status),
    });
  });
  return out;
}
const entryDone = e => !!e.total && e.seen >= e.total;

function buildImport(result) {
  const anime = Store.all('anime');
  const groups = result.groups.map(g => {
    const seasons = g.seasons.map(sea => {
      const hit = g.entries.find(x => x.anilistId === sea.anilistId);
      const e = hit?.entry;
      const seen = e ? (e.total ? Math.min(e.seen, e.total) : e.seen) : 0;
      return { ...sea, episodes: sea.episodes || e?.total || null, seen, complete: !!e && entryDone(e) };
    });
    const es = g.entries.map(x => x.entry);
    const ratings = es.map(e => e.rating).filter(Boolean);
    const status = es.every(entryDone) ? 'done' : es.some(e => e.seen > 0) ? 'active' : 'planned';
    const ids = new Set(g.seasons.map(x => x.anilistId));
    const names = new Set([g.title, ...g.seasons.map(x => x.title), ...g.entries.map(x => x.entry.title)].map(normTitle).filter(Boolean));
    const existing = anime.find(a => ids.has(a.anilistId) || (a.seasonList || []).some(x => ids.has(x.anilistId)) || names.has(normTitle(a.title)) || (a.seasonList || []).some(x => names.has(normTitle(x.title))));
    const movieOnly = g.seasons.every(x => x.format === 'MOVIE');
    const attach = !existing && movieOnly ? findAnimeFor({ anilistId: g.mainId, relatedIds: g.relatedIds || [], title: g.title }) : null;
    return {
      attachTo: attach && !attach.already ? attach.item : null,
      key: 'g' + g.root, root: g.mainId || g.root, title: g.title || g.seasons[0].title, cover: g.cover || g.seasons[0].cover, year: g.year || g.seasons[0].year, genres: g.genres,
      seasons, status, rating: ratings.length ? Math.max(1, Math.min(5, Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length / 2))) : 0,
      entries: es.length, existing, include: !existing,
    };
  }).sort((a, b) => a.title.localeCompare(b.title, 'de'));
  const singles = result.unmatched.map((e, i) => ({
    key: 'u' + i, title: e.title, cover: '', seasons: [{ id: null, label: e.movie ? 'Film' : 'Staffel 1', title: e.title, episodes: e.total, seen: e.total ? Math.min(e.seen, e.total) : e.seen, complete: entryDone(e), format: e.movie ? 'MOVIE' : 'TV' }],
    status: entryDone(e) ? 'done' : e.seen > 0 ? 'active' : 'planned', rating: e.rating ? Math.max(1, Math.round(e.rating / 2)) : 0,
    entries: 1, existing: anime.find(a => normTitle(a.title) === normTitle(e.title)), unmatched: true,
  }));
  singles.forEach(r => { r.include = !r.existing; });
  return [...groups, ...singles];
}

function applyImport(rows) {
  let added = 0;
  rows.filter(r => r.include && !r.existing).forEach(r => {
    if (r.attachTo) { const cur = Store.get(r.attachTo.id); if (cur) { attachMovies(cur, r.seasons); added++; } return; }
    const list = r.seasons.map(sea => ({ ...sea, id: Store.uid() }));
    Store.add({
      type: 'anime', title: r.title, status: r.status, rating: r.rating, cover: r.cover || '', year: r.year || null,
      genres: r.genres || [], seasonList: list, ...seasonTotals(list), notes: '',
      ...(r.root ? { anilistId: r.root, external: `anilist:${r.root}` } : {}),
    });
    added++;
  });
  return { added };
}

export const animeImport = () => openModal(close => <AnimeImport close={close} />);
function AnimeImport({ close }) {
  const [text, setText] = useState(''), [err, setErr] = useState('');
  const [phase, setPhase] = useState('input'); // input | work | rows | fail
  const [prog, setProg] = useState({ pct: 3, label: '', wait: '' });
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const n = parseLiveChart(text).length;

  const run = async () => {
    const entries = parseLiveChart(text);
    if (!entries.length) { setErr('Darin habe ich keine LiveChart-Einträge gefunden. Kopiere die ganze Bibliothek-Seite.'); return; }
    setCount(entries.length);
    setPhase('work'); setProg({ pct: 3, label: `Suche ${entries.length} Anime auf AniList…`, wait: '' });
    Lookup.onRateLimit = sec => setProg(p => ({ ...p, wait: `AniList bremst gerade, kurze Pause (${sec} Sekunden)…` }));
    try {
      const result = await Lookup.matchAnimeList(entries, p => {
        if (p.phase === 'match') setProg({ pct: Math.round(p.done / p.total * 75), label: `Suche Anime auf AniList… ${p.done} von ${p.total}`, wait: '' });
        else setProg({ pct: Math.min(97, 75 + p.done * 4), label: 'Fasse Staffeln zu Reihen zusammen…', wait: '' });
      });
      setRows(buildImport(result).sort((a, b) => (!!a.existing - !!b.existing)));
      setPhase('rows');
    } catch { setPhase('fail'); }
    finally { Lookup.onRateLimit = null; }
  };
  const inc = rows.filter(r => r.include && !r.existing);
  const skipN = rows.filter(r => r.existing).length;
  const unmatchedN = rows.filter(r => r.unmatched && !r.existing).length;
  const apply = () => {
    const r = applyImport(rows);
    libState.set(s => ({ ...s, anime: { ...s.anime, q: '', status: 'all' } }));
    close();
    if (!location.hash.startsWith('#/anime')) go('#/anime');
    toast(<Msg title="LiveChart-Liste übernommen" sub={`${r.added} neue Anime hinzugefügt`} />);
  };
  const foot = phase === 'rows'
    ? <><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" disabled={!inc.length} onClick={apply}>{inc.length ? `${inc.length} hinzufügen` : 'Nichts Neues'}</button></>
    : <><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" disabled={phase === 'work'} onClick={run}>{phase === 'work' ? 'Werte aus…' : 'Auswerten'}</button></>;

  return (
    <ModalFrame title="LiveChart-Liste einfügen" wide close={close} foot={foot}>
      {phase === 'input' && <>
        <div className="hint-box">{I.paste}<div>Öffne deine Bibliothek auf LiveChart.me, markiere alles (Strg+A bzw. Cmd+A), kopiere es und füge es hier ein. Staffeln derselben Reihe werden zu einem Anime mit Staffel-Tabs zusammengefasst, Cover und Folgenzahlen kommen von AniList.</div></div>
        <textarea className="input mt-3 min-h-[200px] text-[13px]" value={text} placeholder="Hier deine LiveChart-Bibliothek einfügen" onChange={e => { setText(e.target.value); setErr(''); }} />
        <div className="tiny mt-1.5">{n ? `${n} Anime erkannt` : ' '}</div>
        <div className="field-error">{err}</div>
      </>}
      {phase === 'work' && <>
        <p className="muted mt-0 mb-3">{prog.label}</p>
        <div className="bar"><i style={{ width: `${prog.pct}%` }} /></div>
        <p className="tiny mt-2.5">{prog.wait || ' '}</p>
      </>}
      {phase === 'fail' && <p className="field-error m-0">AniList war nicht erreichbar. Versuch es gleich nochmal.</p>}
      {phase === 'rows' && <>
        <p className="muted mt-0 mb-3">{count} Einträge → {rows.length} Anime · {inc.length} {inc.length === 1 ? 'wird' : 'werden'} hinzugefügt{skipN ? ` · ${skipN} schon in deinem Regal (bleiben unverändert)` : ''}{unmatchedN ? ` · ${unmatchedN} nicht auf AniList gefunden` : ''}</p>
        <div className="import-list">{rows.map((r, i) => (
          <label key={r.key} className={`import-row ${r.existing ? 'skip' : ''}`}>
            <input type="checkbox" disabled={!!r.existing} checked={!r.existing && r.include} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, include: e.target.checked } : x))} />
            <span className="import-thumb">{r.cover && <img src={r.cover} alt="" loading="lazy" onError={e => e.currentTarget.remove()} />}</span>
            <span className="import-text"><b>{r.title}</b>
              <small>{r.unmatched ? 'Nicht auf AniList gefunden · wird ohne Cover angelegt' : `${r.seasons.length} ${r.seasons.length === 1 ? 'Teil' : 'Teile'} · ${r.seasons.filter(seasonDone).length} fertig${r.entries > 1 ? ` · aus ${r.entries} LiveChart-Einträgen` : ''}`}</small></span>
            <span className="import-tags">{r.existing ? <span className="tier-tag tt-silver">Schon da</span> : r.attachTo ? <span className="tier-tag tt-dlc">Film zu {r.attachTo.title}</span> : <StatusPill item={{ type: 'anime', status: r.status }} />}</span>
          </label>))}
        </div>
      </>}
    </ModalFrame>
  );
}

/* ---------- Staffel bearbeiten / hinzufügen ---------- */
export const seasonEdit = (item, isNew = false) => openModal(close => <SeasonEdit item={item} isNew={isNew} close={close} />);
function SeasonEdit({ item, isNew, close }) {
  const list = seasonsOf(item);
  const nMovies = list.filter(x => x.format === 'MOVIE').length, nShows = list.length - nMovies;
  const cur = isNew ? { label: `Staffel ${nShows + 1}`, title: '', episodes: null, seen: 0, year: null, format: 'TV' } : list.find(x => x.id === seasonTab[item.id]) || list[0];
  const [kind, setKind] = useState(cur.format === 'MOVIE' ? 'MOVIE' : 'TV');
  const [f, setF] = useState({ label: cur.label, year: cur.year || '', title: cur.title || '', episodes: cur.episodes || '', seen: cur.seen || 0 });
  const [err, setErr] = useState('');
  const set = p => setF(s => ({ ...s, ...p }));
  const changeKind = k => {
    setKind(k);
    if (isNew) set({ label: k === 'MOVIE' ? `Film${nMovies ? ' ' + (nMovies + 1) : ''}` : `Staffel ${nShows + 1}`, ...(k === 'MOVIE' && !f.episodes ? { episodes: 1 } : {}) });
  };
  const save = () => {
    const label = String(f.label).trim();
    if (!label) { setErr('Gib eine Bezeichnung ein.'); return; }
    const episodes = f.episodes ? +f.episodes : null;
    const seen = Math.max(0, episodes ? Math.min(episodes, +f.seen || 0) : +f.seen || 0);
    const patch = { label, title: f.title.trim() || item.title, year: f.year ? +f.year : null, episodes, seen, ...(item.type === 'anime' ? { format: kind } : {}) };
    const next = materialize(item);
    if (isNew) { const s2 = { id: Store.uid(), format: 'TV', cover: '', ...patch }; next.push(s2); seasonTab[item.id] = s2.id; }
    else { const i = list.findIndex(x => x.id === cur.id); Object.assign(next[i], patch); if (episodes && seen < episodes) next[i].complete = false; seasonTab[item.id] = next[i].id; }
    saveSeasons(item, next);
    close();
  };
  return (
    <ModalFrame title={isNew ? 'Staffel hinzufügen' : 'Staffel bearbeiten'} close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={e => { e.preventDefault(); save(); }}>
        {item.type === 'anime' && <div className="field"><label>Art</label><Seg value={kind} onChange={changeKind} options={[['TV', 'Staffel'], ['MOVIE', 'Film']]} /></div>}
        <div className="grid-2">
          <div className="field"><label>Bezeichnung</label><input className="input" value={f.label} onChange={e => { set({ label: e.target.value }); setErr(''); }} placeholder="Staffel 2" /><div className="field-error">{err}</div></div>
          <div className="field"><label>Jahr</label><input className="input" type="number" value={f.year} onChange={e => set({ year: e.target.value })} placeholder="2024" /></div>
        </div>
        <div className="field"><label>Titel (optional)</label><input className="input" value={f.title} onChange={e => set({ title: e.target.value })} placeholder={item.title} /></div>
        <div className="grid-2">
          <div className="field"><label>Folgen gesamt</label><input className="input" type="number" min="0" value={f.episodes} onChange={e => set({ episodes: e.target.value })} placeholder="12" /></div>
          <div className="field"><label>Gesehene Folgen</label><input className="input" type="number" min="0" value={f.seen} onChange={e => set({ seen: e.target.value })} /></div>
        </div>
      </form>
    </ModalFrame>
  );
}

/* ---------- Kapitelzahl ändern ---------- */
export const chapterTotal = it => openModal(close => <ChapterTotal it={it} close={close} />);
function ChapterTotal({ it, close }) {
  const [v, setV] = useState(it.chapters ?? ''), [err, setErr] = useState('');
  const save = () => {
    if (v === '' || +v < 0) { setErr('Gib eine Kapitelzahl ein.'); return; }
    Store.update(it.id, { chapters: +v, chaptersRead: Math.min(it.chaptersRead || 0, +v) });
    close();
  };
  return (
    <ModalFrame title="Kapitelzahl ändern" close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={e => { e.preventDefault(); save(); }}>
        <div className="field"><label>Aktuelles Kapitel</label><input className="input" type="number" min="0" step="any" value={v} onChange={e => { setV(e.target.value); setErr(''); }} placeholder="368" /><div className="field-error">{err}</div></div>
        <p className="tiny m-0">Die automatische Prüfung erhöht die Zahl weiter, sobald ein neueres Kapitel erscheint. Kleiner wird sie dadurch nie.</p>
      </form>
    </ModalFrame>
  );
}

/* ---------- PlayStation / Steam synchronisieren ---------- */
let psnBusy = false, steamBusy = false;
function SyncProgress({ close, title, start, firstLabel, workLabel, summary, errorText }) {
  const [st, setSt] = useState({ phase: 'run', pct: 2, label: firstLabel, name: '' });
  useEffect(() => {
    let alive = true;
    start(({ i, total, name }) => alive && setSt({ phase: 'run', pct: Math.round(i / total * 100), label: workLabel, name: `${i} von ${total}: ${name}` }))
      .then(r => { if (alive) setSt({ phase: 'done', msg: summary(r) }); else toast(<Msg title={`${title.split(' ')[0]} synchronisiert`} sub={summary(r)} />); })
      .catch(e => { if (alive) setSt({ phase: 'fail', msg: errorText(e) }); else toast(<Msg title="Sync fehlgeschlagen" sub={errorText(e)} />); });
    return () => { alive = false; };
  }, []);
  return (
    <ModalFrame title={title} close={close} foot={<button className="btn" onClick={close}>{st.phase === 'run' ? 'Im Hintergrund' : 'Schließen'}</button>}>
      {st.phase === 'run' ? <>
        <p className="muted mt-0 mb-3">{st.label}</p>
        <div className="bar"><i style={{ width: `${st.pct}%` }} /></div>
        <p className="tiny mt-2.5">{st.name || ' '}</p>
      </> : st.phase === 'done'
        ? <div className="hint-box">{I.check}<div><b style={{ color: 'var(--text)' }}>Fertig</b><br />{st.msg}</div></div>
        : <div className="hint-box quota">{I.info}<div>{st.msg}</div></div>}
    </ModalFrame>
  );
}
export function runPsnSync() {
  if (psnBusy) return;
  psnBusy = true;
  openModal(close => <SyncProgress close={close} title="PlayStation synchronisieren" firstLabel="Lade deine Spieleliste…" workLabel="Lade Trophäen…"
    start={onProgress => PSN.syncAll({ onProgress }).finally(() => { psnBusy = false; })}
    summary={r => `${r.added} neue Spiele, ${r.updated} aktualisiert, ${r.earned} verdiente Trophäen${r.failed ? `, ${r.failed} konnten nicht geladen werden` : ''}.`}
    errorText={e => e.code === 'expired' ? 'Die Anmeldung ist abgelaufen. Verbinde dich unter Daten neu.' : e.code === 'no_worker' ? 'Es ist keine Server-Adresse eingetragen.' : 'PlayStation war nicht erreichbar. Versuch es später nochmal.'} />);
}
export function runSteamSync() {
  if (steamBusy) return;
  steamBusy = true;
  openModal(close => <SyncProgress close={close} title="Steam synchronisieren" firstLabel="Lade deine Steam-Bibliothek…" workLabel="Lade Erfolge…"
    start={onProgress => Steam.syncAll({ onProgress: (i, total, name) => onProgress({ i, total, name }) }).finally(() => { steamBusy = false; })}
    summary={r => `${r.added} neue Spiele, ${r.updated} aktualisiert, ${r.earned} neu verdiente Erfolge${r.failed ? `, ${r.failed} konnten nicht geladen werden` : ''}.`}
    errorText={e => e.code === 'profile_private' ? 'Dein Steam-Profil ist privat. Stelle unter Profil → Privatsphäre „Spieldetails: Öffentlich“ ein.' : 'Steam ist gerade nicht erreichbar. Versuch es später nochmal.'} />);
}

/* Nightshelf – Detailseite eines Eintrags */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import { PSN } from '../lib/psn.js';
import { Steam } from '../lib/steam.js';
import { Lookup } from '../lib/lookup.js';
import { go, toast } from '../lib/bus.js';
import {
  PLAY_SRC, STATUS, TYPES, countsAsNew, currentSeason, distributeSeen, epTotal, fmtCh, fmtDate, fmtHours, fmtWhen, hoursOf,
  isImplicit, isPS, mangaBehind, materialize, partialAir, relTime, releaseInfo, releaseLabel, released, saveManga, saveSeasons,
  seasonDone, seasonSource, seasonTotals, seasonsOf,
} from '../lib/util.js';
import { detailFilter, seasonTab } from '../lib/viewState.js';
import { EpisodeWatch, MangaWatch } from '../lib/watch.jsx';
import { I, TrophyIcon } from '../components/icons.jsx';
import { CoverBox, SafeImg } from '../components/Cover.jsx';
import { Msg, StarsInput, StatusPill, cn, confirmDialog, joinDots, undoable } from '../components/ui.jsx';
import { openItemForm } from '../dialogs/ItemForm.jsx';
import { playtimeEditor, toggleTrophy, trophyEdit, trophyGenerate, trophyImport, trophyToast } from '../dialogs/trophyDialogs.jsx';
import { chapterTotal, seasonEdit } from '../dialogs/misc.jsx';
import { BusyButton } from './Library.jsx';

/* ---------- Trophäen ---------- */
function TrophyRow({ t, game }) {
  const isPlat = t.tier === 'platinum';
  const toggle = () => toggleTrophy(game.id, t.id);
  const del = () => undoable(game.id, 'Trophäe gelöscht', t.name, () => { const g = Store.get(game.id); const list = g.trophies.filter(x => x.id !== t.id); Trophies.syncPlatinum(list); Store.update(g.id, { trophies: list }); });
  return (
    <div className={cn('trophy', t.done && 'done')}>
      <button className={cn('check', t.done && 'on', isPlat && 'auto')} onClick={toggle} aria-label={t.done ? 'Als offen markieren' : 'Abhaken'} title={isPlat ? 'Wird automatisch verdient' : undefined}>{I.check}</button>
      <div className="tbadge"><TrophyIcon tier={t.tier} /></div>
      <div className="min-w-0">
        <div className="trophy-name">{t.name} <span className={`tier-tag tt-${t.tier}`}>{Trophies.TIERS[t.tier].label}</span>{t.dlc && <> <span className="tier-tag tt-dlc">DLC</span></>}</div>
        {t.desc && <div className="trophy-desc">{t.desc}</div>}
        {t.done && t.doneAt && <div className="tiny mt-0.5">Verdient am {fmtDate(t.doneAt)}</div>}
      </div>
      <div className="trophy-meta">
        {t.rarity != null && <span className="rarity">{String(t.rarity).replace('.', ',')} %</span>}
        <div className="row-actions">
          <button className="btn btn-ghost" aria-label="Bearbeiten" onClick={() => trophyEdit(Store.get(game.id), t)}>{I.edit}</button>
          <button className="btn btn-ghost btn-danger" aria-label="Löschen" onClick={del}>{I.trash}</button>
        </div>
      </div>
    </div>
  );
}

function PlayBox({ item }) {
  const h = hoursOf(item), manual = item.playH != null, auto = item.playMin != null;
  // Ohne Spielzeit nur eine ruhige Zeile, damit die Trophäen weiter oben stehen
  if (h == null) return (
    <div className="play-line">{I.clock}<span>Noch keine Spielzeit</span>
      <span className="tiny">{['Steam', 'PS5', 'PS4'].includes(item.platform) ? 'kommt beim nächsten Sync' : `keine automatische Angabe für ${item.platform || 'diese Plattform'}`}</span>
      <button type="button" className="link-btn" onClick={() => playtimeEditor(Store.get(item.id))}>Eintragen</button></div>
  );
  return (
    <section className="section"><div className="play-box">
      <div className="play-icon">{I.clock}</div>
      <div className="grow">{h != null ? <>
        <div className="play-big">{fmtHours(h)}</div>
        <div className="play-src">{manual
          ? <>Selbst eingetragen{auto && <> · {PLAY_SRC[item.playSrc] || 'Automatisch'}: {fmtHours(item.playMin / 60)} <button type="button" className="link-btn" onClick={() => Store.update(item.id, { playH: null })}>übernehmen</button></>}</>
          : <>Von <b>{PLAY_SRC[item.playSrc] || 'automatisch'}</b>{item.lastPlayed && ` · zuletzt gespielt ${relTime(item.lastPlayed)}`}</>}</div>
      </> : <>
        <div className="play-big muted">Noch keine Spielzeit</div>
        <div className="play-src">{['Steam', 'PS5', 'PS4'].includes(item.platform) ? 'Kommt beim nächsten Sync automatisch, oder trag sie selbst ein' : `Für ${item.platform || 'diese Plattform'} gibt es keine automatische Angabe`}</div>
      </>}</div>
      <div className="play-btns">{h != null ? <>
        <button className="btn btn-sm" onClick={() => { const it = Store.get(item.id); const base = it.playH != null ? it.playH : Math.round(hoursOf(it) || 0); Store.update(it.id, { playH: Math.round((base + 1) * 10) / 10 }); }}>+1 h</button>
        <button className="btn btn-sm" onClick={() => playtimeEditor(Store.get(item.id))}>Ändern</button>
      </> : <button className="btn btn-sm btn-primary" onClick={() => playtimeEditor(Store.get(item.id))}>Eintragen</button>}</div>
    </div></section>
  );
}

function TrophySection({ item }) {
  const filter = detailFilter.use().value;
  const list = item.trophies || [];
  const src = { generated: 'Genre-Vorlage', ai: 'Von der KI passend zum Spiel erstellt', imported: 'Importiert', custom: 'Eigene Liste', psn: 'Von PlayStation', steam: 'Von Steam · Stufe nach Seltenheit' }[item.trophySource] || '';
  const sorted = list.slice().sort((a, b) => Trophies.ORDER.indexOf(a.tier) - Trophies.ORDER.indexOf(b.tier));
  const filtered = sorted.filter(t => filter === 'all' || (filter === 'open' ? !t.done : t.done));
  const allDone = list.length && list.every(t => t.done);
  const [more, setMore] = useState(false), [editing, setEditing] = useState(false);

  const toggleAll = () => {
    const game = Store.get(item.id); const all = !allDone;
    const open = game.trophies.filter(t => t.tier !== 'platinum' && !t.done).length;
    confirmDialog(all
      ? `Alle ${open} offenen Trophäen in „${game.title}“ werden als verdient markiert${game.trophies.some(t => t.tier === 'platinum') ? ', inklusive Platin' : ''}.`
      : `Alle Trophäen in „${game.title}“ werden wieder auf offen gesetzt.`,
      all ? 'Alle abhaken' : 'Zurücksetzen', () => {
        const now = new Date().toISOString();
        const next = game.trophies.map(t => t.tier === 'platinum' ? t : all ? (t.done ? t : { ...t, done: true, doneAt: now }) : { ...t, done: false, doneAt: null });
        const platChange = Trophies.syncPlatinum(next);
        Store.update(game.id, { trophies: next, status: platChange === 'earned' ? 'done' : game.status });
        const plat = next.find(t => t.tier === 'platinum');
        if (all) { if (platChange === 'earned' && plat) trophyToast(plat, game); else toast(<Msg title={`${open} Trophäen verdient`} sub={game.title} />); }
        else toast(<Msg title="Trophäen zurückgesetzt" />);
      });
  };
  const fromPsn = async () => {
    try { const r = await PSN.syncOne(Store.get(item.id)); toast(r ? <Msg title="Trophäen aktualisiert" sub={`${r.filter(t => t.done).length} von ${r.length} verdient`} /> : <Msg title="Nicht im PlayStation-Verlauf gefunden" />); }
    catch (err) { toast(<Msg title={err.code === 'expired' ? 'PlayStation-Anmeldung abgelaufen' : 'PlayStation nicht erreichbar'} sub={err.code === 'expired' ? 'Unter Daten neu verbinden' : 'Später nochmal versuchen'} />); }
  };
  const fromSteam = async () => {
    try {
      const game = Store.get(item.id);
      const hit = game.steamAppId ? { appid: game.steamAppId } : await Steam.find(game.title);
      if (!hit) { toast(<Msg title="Auf Steam nicht gefunden" sub="Prüfe den Titel des Spiels" />); return; }
      const res = await Steam.achievementsFor(hit.appid);
      if (!res.achievements.length) { toast(<Msg title="Keine Steam-Erfolge" sub="Dieses Spiel hat auf Steam keine Erfolge" />); return; }
      Store.update(game.id, Steam.patchFor(game, hit.appid, res));
      const t = Store.get(game.id).trophies;
      toast(<Msg title="Erfolge geladen" sub={`${t.filter(x => x.done).length} von ${t.length} verdient${res.playerError === 'profile_private' ? ' · Profil privat' : ''}`} />);
    } catch (err) { toast(<Msg title={err.code === 'key_rejected' ? 'Steam lehnt den Schlüssel ab' : 'Steam nicht erreichbar'} sub={err.code === 'key_rejected' ? 'Unter Daten neu verbinden' : 'Später nochmal versuchen'} />); }
  };

  return (
    <section className="section">
      <div className="trophy-head">
        <div><h2 className="section-title m-0">Trophäen</h2>{src && <div className="tiny">{src}</div>}</div>
        {list.length > 0 && <div className="flex gap-2 items-center">
          <div className="chips">{[['all', 'Alle'], ['open', 'Offen'], ['done', 'Verdient']].map(([k, v]) =>
            <button key={k} className={cn('chip', filter === k && 'on')} onClick={() => detailFilter.set({ value: k })}>{v}</button>)}</div>
          <button type="button" className={cn('btn btn-sm btn-ghost more-btn', more && 'on')} aria-expanded={more} onClick={() => setMore(m => !m)}>Mehr {I.chevron}</button>
        </div>}
        <div className={cn('trophy-tools', (more || !list.length) && 'open')}>
          <button className="btn btn-sm" onClick={() => trophyEdit(Store.get(item.id))}>{I.plus} Eigene</button>
          <button className="btn btn-sm" onClick={() => trophyImport(Store.get(item.id))}>{I.paste} Liste einfügen</button>
          {item.psnId && PSN.connected() && <BusyButton className="btn btn-sm" busyText="Lade…" onClick={fromPsn}>{I.refresh} Von PlayStation</BusyButton>}
          {Steam.connected() && (item.steamAppId || ['Steam', 'PC', 'Steam Deck'].includes(item.platform)) && <BusyButton className="btn btn-sm" busyText="Lade…" onClick={fromSteam}>{I.refresh} Von Steam</BusyButton>}
          <button className="btn btn-sm" onClick={() => trophyGenerate(Store.get(item.id))}>{I.sparkle} Erstellen</button>
          {list.length > 0 && <button type="button" className={cn('btn btn-sm edit-toggle', editing && 'on')} aria-pressed={editing} onClick={() => setEditing(e => !e)}>{I.edit} {editing ? 'Fertig' : 'Bearbeiten'}</button>}
          {list.length > 0 && (allDone ? <button className="btn btn-sm btn-ghost" onClick={toggleAll}>Alle zurücksetzen</button> : <button className="btn btn-sm" onClick={toggleAll}>{I.check} Alle abhaken</button>)}
        </div>
      </div>
      {list.length ? <div className={cn('trophy-list', editing && 'editing')}>{filtered.length ? filtered.map(t => <TrophyRow key={t.id} t={t} game={item} />) : <div className="list-empty">Nichts in dieser Ansicht</div>}</div>
        : <div className="empty py-11 px-5">
          <div className="empty-icon">{I.trophy}</div><h3>Noch keine Trophäen</h3>
          <p>{isPS(item.platform) ? 'Füge die offizielle Liste ein oder lass eine erstellen.' : 'Für dieses Spiel gibt es keine offiziellen Trophäen? Lass dir eine Liste erstellen.'}</p>
          <div className="flex gap-2 justify-center flex-wrap"><button className="btn btn-primary" onClick={() => trophyGenerate(Store.get(item.id))}>{I.sparkle} Trophäen erstellen</button><button className="btn" onClick={() => trophyImport(Store.get(item.id))}>{I.paste} Liste einfügen</button></div>
        </div>}
    </section>
  );
}

function Ring({ list }) {
  if (!list.length) return null;
  const p = Trophies.progress(list);
  const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
  const C = 2 * Math.PI * 40;
  return (
    <div className="ring-wrap">
      <div className="ring"><svg viewBox="0 0 92 92"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B5CF6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
        <circle className="track" cx="46" cy="46" r="40" /><circle className="val" cx="46" cy="46" r="40" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} /></svg>
        <div className="ring-label"><b>{pct}%</b><span>{p.done}/{p.total}</span></div></div>
      <div className="tier-box">{Trophies.ORDER.filter(t => p.counts[t][1]).map(t => (
        <div key={t} className="tier-stat"><div className="t"><TrophyIcon tier={t} size={14} /> {Trophies.TIERS[t].label}</div><b>{p.counts[t][0]}<span className="muted text-[13px] font-medium"> / {p.counts[t][1]}</span></b></div>))}</div>
    </div>
  );
}

/* ---------- Staffeln (Anime und Serien) ---------- */
function AirInfo({ sea }) {
  const bits = [];
  if (sea.airing === 'NOT_YET_RELEASED') bits.push(sea.nextAt ? `${sea.format === 'MOVIE' ? 'Erscheint' : 'Startet'} ${fmtWhen(sea.nextAt)}` : sea.start ? `${sea.format === 'MOVIE' ? 'Erscheint' : 'Startet'} ${fmtWhen(sea.start + 'T00:00:00', true)}` : 'Noch nicht erschienen, Termin unbekannt');
  else if (sea.nextAt) bits.push(`Folge ${sea.nextEp} kommt ${fmtWhen(sea.nextAt)}`);
  if (sea.format !== 'MOVIE' && sea.aired != null && sea.episodes && sea.aired < sea.episodes && sea.aired > 0) bits.push(`${sea.aired} von ${sea.episodes} Folgen erschienen`);
  const unseen = countsAsNew(sea) ? released(sea) - (sea.seen || 0) : 0;
  if (!bits.length && unseen <= 0) return null;
  return <div className="air-info">{I.calendar}<span>{bits.join(' · ')}{unseen > 0 && <>{bits.length > 0 && ' · '}<b>{unseen} {unseen === 1 ? 'neue Folge' : 'neue Folgen'} für dich</b></>}</span></div>;
}

function SeasonSection({ item, animate }) {
  const list = seasonsOf(item);
  const [tab, setTab] = useState(() => seasonTab[item.id]);
  const activeId = list.some(x => x.id === tab) ? tab : list.some(x => x.id === seasonTab[item.id]) ? seasonTab[item.id] : currentSeason(item).id;
  seasonTab[item.id] = activeId;
  const choose = id => { seasonTab[item.id] = id; setTab(id); };
  const sea = list.find(x => x.id === activeId);
  const shows = list.filter(x => x.format !== 'MOVIE'), films = list.filter(x => x.format === 'MOVIE');
  const tot = seasonTotals(shows.length ? shows : list);
  const pct = seasonDone(sea) ? 100 : sea.episodes ? Math.min(100, Math.round((sea.seen || 0) / sea.episodes * 100)) : 0;
  const totPct = tot.episodes ? Math.min(100, Math.round(tot.episodesSeen / tot.episodes * 100)) : 0;
  const nShows = shows.length, nFilms = films.length;
  const unit = item.type === 'anime'
    ? [nShows ? `${nShows} ${nShows === 1 ? 'Staffel' : 'Staffeln'}` : '', nFilms ? `${nFilms} ${nFilms === 1 ? 'Film' : 'Filme'}` : ''].filter(Boolean).join(' · ')
    : (list.length === 1 ? 'Staffel' : 'Staffeln');
  const noEpisodes = list.every(x => !x.episodes);
  const singleMovie = sea.format === 'MOVIE' && (sea.episodes || 1) === 1;
  const [epVal, setEpVal] = useState(sea.seen || 0);
  useEffect(() => setEpVal(sea.seen || 0), [sea.seen, activeId]);

  // Änderung an der offenen Staffel speichern
  const withList = fn => {
    const it = Store.get(item.id); const orig = seasonsOf(it); const next = materialize(it);
    const idx = Math.max(0, orig.findIndex(x => x.id === seasonTab[it.id]));
    fn(next, idx); seasonTab[it.id] = next[idx].id; setTab(next[idx].id); saveSeasons(it, next);
  };
  const setSeen = v => withList((l, i) => { const x = l[i]; x.seen = Math.max(0, x.episodes ? Math.min(x.episodes, v) : v); if (!x.episodes || x.seen < x.episodes) x.complete = false; });
  const plus = () => { const next = (sea.seen || 0) + 1; setSeen(next); if (sea.episodes && next === sea.episodes) toast(<Msg title={`${sea.label} fertig`} sub={item.title} />); };
  const done = () => { withList((l, i) => { const x = l[i]; if (partialAir(x)) { x.seen = x.aired; x.complete = false; } else { if (x.episodes) x.seen = x.episodes; x.complete = true; } }); toast(<Msg title={`${sea.label} fertig`} sub={item.title} />); };
  const del = () => confirmDialog(`„${sea.label}“ wird aus ${item.title} entfernt.`, 'Entfernen', () => {
    const it = Store.get(item.id); const orig = seasonsOf(it);
    const next = materialize(it).filter((x, i) => orig[i].id !== sea.id);
    const ext = sea.anilistId || sea.tvmazeId;
    if (ext) Store.update(it.id, { removedSeasons: [...new Set([...(it.removedSeasons || []), ext])].slice(-200) });
    delete seasonTab[it.id]; setTab(undefined); saveSeasons(Store.get(it.id), next);
  });
  const load = async () => {
    const it = Store.get(item.id);
    try {
      let loaded = [], patch = {};
      if (it.type === 'anime') {
        let id = it.anilistId || (it.external?.startsWith('anilist:') ? +it.external.split(':')[1] : null);
        if (!id) { const hits = await Lookup.search('anime', it.title); id = hits[0]?.id; }
        loaded = id ? await Lookup.animeSeasons(id) : [];
        patch = { anilistId: id };
      } else {
        let id = it.external?.startsWith('tvmaze:') ? +it.external.split(':')[1] : null;
        if (!id) { const hits = await Lookup.search('series', it.title); id = hits[0]?.id; }
        loaded = id ? await Lookup.seriesSeasons(id, it.cover) : [];
        if (id && !it.external) patch = { external: `tvmaze:${id}` };
      }
      if (!loaded.length) { toast(<Msg title={`Nichts auf ${seasonSource(it)} gefunden`} />); return; }
      const old = seasonsOf(it);
      const srcKey = it.type === 'anime' ? 'anilistId' : 'tvmazeId';
      const matched = old.some(o => o[srcKey]);
      const next = loaded.map((x, i) => {
        const prev = matched ? old.find(o => o[srcKey] && o[srcKey] === x[srcKey]) : (it.type === 'series' ? old[i] : null);
        const d = prev && seasonDone(prev);
        return { ...x, id: (prev && !isImplicit(prev)) ? prev.id : Store.uid(), seen: d ? (x.episodes || prev.seen || 0) : Math.min(prev?.seen || 0, x.episodes || Infinity), complete: !!d };
      });
      if (!matched && it.type === 'anime') distributeSeen(next.filter(x => x.format !== 'MOVIE'), old.reduce((a, x) => a + (x.seen || 0), 0), it.status === 'done');
      delete seasonTab[it.id]; setTab(undefined);
      if (Object.keys(patch).length) Store.update(it.id, patch);
      saveSeasons(Store.get(it.id), next, { autoStatus: false });
      toast(<Msg title={`${next.length} ${it.type === 'anime' ? (next.length === 1 ? 'Teil' : 'Teile') : (next.length === 1 ? 'Staffel' : 'Staffeln')} geladen`} sub={it.title} />);
      EpisodeWatch.check({ force: true, ids: [it.id] });
    } catch { toast(<Msg title={`${seasonSource(it)} nicht erreichbar`} sub="Später nochmal versuchen" />); }
  };
  const tabBtn = x => (
    <button key={x.id} className={cn('season-tab', x.id === activeId && 'on', seasonDone(x) && 'done')} role="tab" aria-selected={x.id === activeId} onClick={() => choose(x.id)}>
      <span>{x.label}</span><small>{seasonDone(x) ? '✓' : x.format === 'MOVIE' ? 'offen' : `${x.seen || 0}/${epTotal(x) || '?'}`}</small></button>
  );

  return (
    <section className="section">
      <div className="trophy-head">
        <div><h2 className="section-title m-0">{nShows ? 'Staffeln' : 'Filme'}{nShows && nFilms ? ' & Filme' : ''}</h2>
          <div className="tiny">{item.type === 'anime' ? unit : `${list.length} ${unit}`}{noEpisodes ? ` · ${list.filter(seasonDone).length} fertig` : ` · ${tot.episodesSeen}/${tot.episodes || '?'} Folgen gesehen${tot.episodes ? ` · ${totPct} %` : ''}`}</div></div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-sm" onClick={() => seasonEdit(Store.get(item.id), true)}>{I.plus} Staffel</button>
          <BusyButton className={cn('btn btn-sm', noEpisodes && 'btn-primary')} busyText="Lade…" onClick={load}>{I.refresh} Von {seasonSource(item)} laden</BusyButton>
        </div>
      </div>
      {noEpisodes && <div className="hint-box mb-3.5">{I.info}<div>Lade die Staffeln von {seasonSource(item)}, dann bekommst du Folgenzahlen und Cover pro Staffel. Deine fertigen Staffeln bleiben abgehakt.</div></div>}
      {shows.length > 0 && <div className="season-tabs" role="tablist" aria-label="Staffeln">{shows.map(tabBtn)}</div>}
      {films.length > 0 && <><div className="season-row-label">Filme</div><div className="season-tabs" role="tablist" aria-label="Filme">{films.map(tabBtn)}</div></>}
      <div className={cn('season-panel', animate && 'fade-in')}>
        <div className="season-cover"><SafeImg src={sea.cover || item.cover} /></div>
        <div className="season-body">
          <div className="season-title">{sea.title || item.title}</div>
          <div className="card-meta mt-1">{joinDots([sea.label, sea.year, singleMovie ? '' : sea.episodes ? `${sea.episodes} Folgen` : sea.aired ? `${sea.aired} Folgen erschienen` : 'Folgenzahl unbekannt'])}</div>
          <AirInfo sea={sea} />
          {!singleMovie && <div className="ep-stepper">
            <button className="btn icon-btn" aria-label="Eine Folge weniger" onClick={() => setSeen((sea.seen || 0) - 1)}>−</button>
            <div className="ep-count"><input type="number" min="0" max={sea.episodes || undefined} value={epVal} aria-label="Gesehene Folgen"
              onChange={e => setEpVal(e.target.value)} onBlur={() => setSeen(Math.round(+epVal || 0))} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><span>/ {epTotal(sea) || '?'} Folgen</span></div>
            <button className="btn icon-btn btn-primary" aria-label="Eine Folge mehr" onClick={plus}>+</button>
          </div>}
          {singleMovie ? <div className={cn('movie-state', seasonDone(sea) && 'on')}>{seasonDone(sea) ? <>{I.check} Gesehen</> : 'Noch nicht gesehen'}</div>
            : <div className="bar max-w-[420px]"><i style={{ width: `${pct}%` }} /></div>}
          <div className="flex gap-2 flex-wrap mt-4">
            {seasonDone(sea) ? <button className="btn btn-sm" onClick={() => withList((l, i) => { l[i].seen = 0; l[i].complete = false; })}>{sea.format === 'MOVIE' ? 'Als ungesehen markieren' : 'Zurücksetzen'}</button>
              : partialAir(sea) && (sea.seen || 0) >= sea.aired ? <div className="movie-state on m-0">{I.check} Auf dem neuesten Stand</div>
              : <button className="btn btn-sm btn-primary" onClick={done}>{I.check} {sea.format === 'MOVIE' ? 'Gesehen' : partialAir(sea) && sea.aired > 0 ? `Bis Folge ${sea.aired} gesehen` : 'Ganz gesehen'}</button>}
            <button className="btn btn-sm" onClick={() => seasonEdit(Store.get(item.id))}>{I.edit} Bearbeiten</button>
            {list.length > 1 && <button className="btn btn-sm btn-ghost btn-danger" onClick={del}>{I.trash} Entfernen</button>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Manga ---------- */
function MangaSection({ item, animate }) {
  const read = item.chaptersRead || 0, total = item.chapters;
  const behind = mangaBehind(item);
  const pct = total ? Math.min(100, Math.round(read / total * 100)) : 0;
  const ongoing = item.mdStatus && item.mdStatus !== 'completed';
  const stale = item.lastUpload && Date.now() - Date.parse(item.lastUpload) > 180 * 86400 * 1000 && ongoing;
  const [val, setVal] = useState(read);
  useEffect(() => setVal(read), [read]);
  const set = v => saveManga(Store.get(item.id), { chaptersRead: Math.max(0, Math.round(v * 10) / 10) });
  const check = async () => {
    const r = await MangaWatch.check({ force: true, ids: [item.mangadexId] });
    if (r.error) toast(<Msg title="Prüfen hat nicht geklappt" sub={r.error === 'key_required' ? 'Verbinde das Gerät unter Daten mit deinem Schlüssel' : 'Server nicht erreichbar'} />);
    else if (!r.updated.length) toast(<Msg title="Keine neuen Kapitel" />);
  };
  return (
    <section className="section">
      <div className="trophy-head">
        <div><h2 className="section-title m-0">Kapitel</h2>
          <div className="tiny">{total ? `${fmtCh(read)} von ${fmtCh(total)} gelesen · ${pct} %` : `${fmtCh(read)} gelesen`}{behind > 0 && <> · <span style={{ color: 'var(--cyan)' }}>{fmtCh(behind)} ungelesen</span></>}</div></div>
        {item.mangadexId && <BusyButton className="btn btn-sm" onClick={check}>{I.refresh} Jetzt prüfen</BusyButton>}
      </div>
      <div className={cn('season-panel manga-panel', animate && 'fade-in')}>
        <div className="manga-count">
          <div className="ep-stepper mt-0">
            <button className="btn icon-btn" aria-label="Ein Kapitel zurück" onClick={() => set(read - 1)}>−</button>
            <div className="ep-count"><input type="number" min="0" step="any" value={val} aria-label="Gelesen bis Kapitel"
              onChange={e => setVal(e.target.value)} onBlur={() => set(+val || 0)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><span>/ {total ? fmtCh(total) : '?'} Kapitel</span></div>
            <button className="btn icon-btn btn-primary" aria-label="Ein Kapitel weiter" onClick={() => set(Math.floor(read) + 1)}>+</button>
          </div>
          <div className="bar max-w-[420px]"><i style={{ width: `${pct}%` }} /></div>
          <div className="flex gap-2 flex-wrap mt-4">
            {total && read < total ? <button className="btn btn-sm btn-primary" onClick={() => set(total)}>{I.check} Bis Kapitel {fmtCh(total)} gelesen</button> : null}
            <button className="btn btn-sm" onClick={() => chapterTotal(Store.get(item.id))}>{I.edit} Kapitelzahl ändern</button>
          </div>
        </div>
        <div className="manga-info tiny">
          {item.mangadexId ? <>
            <div><b>Neuestes Kapitel:</b> {total ? fmtCh(total) : 'unbekannt'}{ongoing ? ' · Manga läuft noch' : item.mdStatus === 'completed' ? ' · Manga abgeschlossen' : ''}</div>
            {item.lastUpload && <div>Zuletzt ein neues Kapitel: {relTime(item.lastUpload)}</div>}
            <div>Automatisch geprüft: {item.chapterCheckedAt ? relTime(item.chapterCheckedAt) : 'noch nie'}</div>
            {stale && <div className="stale">Seit über einem halben Jahr kam hier kein Kapitel mehr. Falls du weißt, dass es weitergeht, trag die Zahl selbst ein.</div>}
          </> : <div>Dieser Manga ist nicht mit MangaDex verknüpft, deshalb wird die Kapitelzahl nicht automatisch aktualisiert. Über „Bearbeiten“ und die Titelsuche kannst du ihn verknüpfen.</div>}
        </div>
      </div>
    </section>
  );
}

/* ---------- Kopf ---------- */
function Summary({ text }) {
  const ref = useRef(null);
  const [more, setMore] = useState(false), [open, setOpen] = useState(false);
  useLayoutEffect(() => { const el = ref.current; if (el && el.scrollHeight > el.clientHeight + 2) setMore(true); }, [text]);
  return <>
    <div className={cn('hero-summary', open && 'open')} ref={ref}>{text}</div>
    {more && <button className="more-btn" type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Weniger anzeigen' : 'Mehr lesen'}</button>}
  </>;
}

export function Detail({ id, animate }) {
  const item = Store.get(id);
  if (!item) return <div className="empty"><h3>Nicht gefunden</h3><p>Dieser Eintrag existiert nicht mehr.</p><a className="btn" href="#/">Zur Übersicht</a></div>;
  const T = TYPES[item.type];
  const meta = [];
  if (item.platform) meta.push(item.platform);
  if (item.genre && item.type === 'game') meta.push(Trophies.GENRES[item.genre]);
  if (item.year) meta.push(item.year);
  if (item.type === 'series' && item.seasons) meta.push(`${item.seasons} ${item.seasons === 1 ? 'Staffel' : 'Staffeln'}`);
  if (item.type === 'anime' && item.seasonList?.length > 1) {
    const nS = item.seasonList.filter(x => x.format !== 'MOVIE').length, nF = item.seasonList.length - nS;
    if (nS) meta.push(`${nS} ${nS === 1 ? 'Staffel' : 'Staffeln'}`);
    if (nF) meta.push(`${nF} ${nF === 1 ? 'Film' : 'Filme'}`);
  }
  if (item.type === 'anime' && item.episodes) meta.push(`${item.episodes} Folgen`);
  if (item.type === 'manga') { if (item.kind) meta.push(item.kind); if (item.authors?.length) meta.push(item.authors.join(', ')); if (item.mdStatus) meta.push({ ongoing: 'Laufend', completed: 'Abgeschlossen', hiatus: 'Pausiert', cancelled: 'Eingestellt' }[item.mdStatus] || item.mdStatus); }
  if (item.runtime) meta.push(`${item.runtime} Min.`);
  if (item.genres?.length && item.type !== 'game') meta.push(item.genres.slice(0, 3).join(', '));
  if (item.released) meta.push(`Erschienen ${fmtDate(item.released)}`);
  const rel = releaseInfo(item);
  const source = item.external && ({ tvmaze: 'TVmaze', tmdb: 'TMDB', wikidata: 'Wikipedia / Wikidata', rawg: 'RAWG', anilist: 'AniList', livechart: 'LiveChart', mangadex: 'MangaDex' }[item.external.split(':')[0]] || 'externer Datenbank');

  return (
    <div className={animate ? 'fade-in' : ''}>
      <a className="back" href={`#/${T.route}`}>{I.back} {T.plural}</a>
      <div className="hero">
        <div className="hero-bg">{item.cover ? <SafeImg src={item.cover} /> : <CoverBox item={item} noTitle className="contents" />}</div>
        <CoverBox item={item} />
        <div className="hero-info">
          <div className="hero-head">
            <label className={cn("status-pill status-pick", { done: "st-done", active: "st-active", planned: "st-planned", paused: "st-planned", dropped: "st-dropped" }[item.status])}>
              <select id="quickStatus" aria-label="Status" value={item.status} onChange={e => Store.update(item.id, { status: e.target.value })}>{Object.entries(STATUS[item.type]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>{I.chevron}</label>
            {rel && <span className="status-pill st-upcoming">{I.calendar} {rel.date && !rel.year ? `Erscheint am ${new Date(rel.date + 'T00:00:00').toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}` : releaseLabel(rel)}</span>}
            <h1 className="hero-title">{item.title}</h1>
            <div className="hero-meta">{joinDots(meta)}</div>
            <div className="hero-stars mt-3"><StarsInput value={item.rating || 0} onChange={v => Store.update(item.id, { rating: v })} /></div>
          </div>
          {item.notes && <div className="hero-notes">{item.notes}</div>}
          {item.summary && <Summary text={item.summary} />}
          {source && <div className="tiny mt-2">Infos von {source}</div>}
          {item.type === 'game' && <Ring list={item.trophies || []} />}
          {item.type === 'anime' && item.episodes && !item.seasonList?.length ? (
            <div className="mt-[18px] max-w-[360px]"><div className="tiny mb-1.5">Fortschritt: Folge {item.episodesSeen || 0} von {item.episodes}</div><div className="bar"><i style={{ width: `${Math.min(100, Math.round((item.episodesSeen || 0) / item.episodes * 100))}%` }} /></div></div>
          ) : null}
          <div className="hero-actions">
            <button id="editBtn" className="btn" onClick={() => openItemForm(item.type, item)}>{I.edit} Bearbeiten</button>
            <button id="delBtn" className="btn btn-ghost btn-danger" aria-label="Löschen" onClick={() => confirmDialog(`„${item.title}“ wird mit allen Trophäen gelöscht.`, 'Löschen', () => { Store.remove(item.id); go(`#/${T.route}`); })}>{I.trash} Löschen</button>
          </div>
        </div>
      </div>
      {item.type === 'game' && <><PlayBox item={item} /><TrophySection item={item} /></>}
      {['anime', 'series'].includes(item.type) && <SeasonSection key={item.id} item={item} animate={animate} />}
      {item.type === 'manga' && <MangaSection item={item} animate={animate} />}
    </div>
  );
}

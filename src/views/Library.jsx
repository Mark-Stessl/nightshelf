/* Nightshelf – Regal: Spiele, Serien, Anime, Manga, Filme */
import { useLayoutEffect, useRef, useState } from 'react';
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import { PSN } from '../lib/psn.js';
import { Steam } from '../lib/steam.js';
import { ORDER_TYPES, PLATFORMS, PLATFORM_GROUPS, STATUS, TYPES, familyOf, hoursOf, isMobileWidth } from '../lib/util.js';
import { libState, setLib, shelfTabs } from '../lib/viewState.js';
import { checkAllNews, checkManga } from '../lib/watch.jsx';
import { I, typeIcon } from '../components/icons.jsx';
import { Card, ShelfWall } from '../components/items.jsx';
import { cn } from '../components/ui.jsx';
import { openItemForm } from '../dialogs/ItemForm.jsx';
import { animeImport, runPsnSync, runSteamSync } from '../dialogs/misc.jsx';

// Knopf, der während einer Prüfung „Prüfe…“ zeigt
export function BusyButton({ onClick, children, className = 'btn', busyText = 'Prüfe…' }) {
  const [busy, setBusy] = useState(false);
  return <button className={className} disabled={busy} onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}>{busy ? busyText : children}</button>;
}

function ShelfTabs({ type }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const row = ref.current; if (!row) return;
    row.scrollLeft = shelfTabs.x;
    const on = row.querySelector('.shelf-tab.on');
    if (on) {
      const r = row.getBoundingClientRect(), o = on.getBoundingClientRect();
      if (o.left < r.left + 14 || o.right > r.right - 14) row.scrollTo({ left: row.scrollLeft + (o.left - r.left) - (r.width - o.width) / 2, behavior: 'smooth' });
    }
  }, [type]);
  return (
    <div className="shelf-tabs" role="tablist" ref={ref} onScroll={e => { shelfTabs.x = e.currentTarget.scrollLeft; }}>
      {ORDER_TYPES.map(t => <a key={t} role="tab" href={`#/${TYPES[t].route}`} className={cn('shelf-tab', t === type && 'on')} aria-selected={t === type}>{TYPES[t].plural}<span>{Store.all(t).length}</span></a>)}
    </div>
  );
}

function EmptyState({ type, animate }) {
  const txt = {
    game: ['Deine Spielesammlung wartet', 'Füge dein erstes Spiel hinzu und hake Trophäen ab.'],
    series: ['Noch keine Serien', 'Halte fest, welche Serien du gesehen hast oder gerade schaust.'],
    manga: ['Noch keine Manga', 'Füge Manga hinzu. Die aktuelle Kapitelzahl hält Nightshelf automatisch auf dem neuesten Stand.'],
    anime: ['Noch keine Anime', 'Füge Anime hinzu. Staffeln werden automatisch von AniList geladen.'],
    movie: ['Noch keine Filme', 'Sammle alle Filme, die du gesehen hast, mit Bewertung.'],
  }[type];
  return (
    <div className={cn('empty', animate && 'fade-in')}>
      <div className="empty-icon">{typeIcon(type)}</div><h3>{txt[0]}</h3><p>{txt[1]}</p>
      <div className="flex gap-2 justify-center flex-wrap">
        <button className="btn btn-primary" onClick={() => openItemForm(type)}>{I.plus} {TYPES[type].label} hinzufügen</button>
        {type === 'anime' && <button className="btn" onClick={animeImport}>{I.paste} LiveChart-Liste einfügen</button>}
      </div>
    </div>
  );
}

export function Library({ type, animate }) {
  const s = libState.use()[type];
  const set = patch => setLib(type, patch);
  const items = Store.all(type);

  const head = <>
    <ShelfTabs type={type} />
    <div className="page-head">
      <div><h1 className="page-title">{TYPES[type].plural}</h1><p className="page-sub">{items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'}</p></div>
      <div className="head-actions flex gap-2 flex-wrap">
        {type === 'game' && PSN.connected() && <button className="btn" onClick={runPsnSync}>{I.refresh} PlayStation sync</button>}
        {type === 'game' && Steam.connected() && Steam.hasProfile() && <button className="btn" onClick={runSteamSync}>{I.refresh} Steam sync</button>}
        {type === 'anime' && <button className="btn" onClick={animeImport}>{I.paste} LiveChart-Liste einfügen</button>}
        {type === 'manga' && items.length > 0 && <BusyButton onClick={checkManga}>{I.refresh} Neue Kapitel prüfen</BusyButton>}
        {['anime', 'series'].includes(type) && items.length > 0 && <BusyButton onClick={checkAllNews}>{I.refresh} Neue Folgen prüfen</BusyButton>}
        <button className="btn btn-primary fab" aria-label={`${TYPES[type].label} hinzufügen`} onClick={() => openItemForm(type)}>{I.plus}<span>{TYPES[type].label} hinzufügen</span></button>
      </div>
    </div>
  </>;
  if (!items.length) return <>{head}<EmptyState type={type} animate={animate} /></>;

  // Plattform-Filter: Stufe 1 Hersteller, Stufe 2 (nur wenn sinnvoll) einzelne Konsole
  const platforms = type === 'game' ? [...new Set(items.map(i => i.platform).filter(Boolean))] : [];
  const byOrder = (a, b) => PLATFORMS.indexOf(a) - PLATFORMS.indexOf(b);
  const fams = PLATFORM_GROUPS.map(([g]) => g).filter(g => platforms.some(p => familyOf(p) === g));
  const fam = fams.includes(s.fam) ? s.fam : 'all';
  const consoles = fam === 'all' ? [] : platforms.filter(p => familyOf(p) === fam).sort(byOrder);
  const onlyOneFam = fams.length === 1;
  const platform = onlyOneFam ? (platforms.includes(s.platform) ? s.platform : 'all') : (consoles.includes(s.platform) ? s.platform : 'all');

  const hrs = i => hoursOf(i) > 0 ? hoursOf(i) : null;
  const prog = i => { const p = Trophies.progress(i.trophies); return p.total ? p.done / p.total : -1; };
  const sorters = {
    added: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''),
    title: (a, b) => a.title.localeCompare(b.title, 'de'),
    rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    progress: (a, b) => prog(b) - prog(a),
    // Spiele ohne Spielzeit kommen immer ans Ende
    playMost: (a, b) => (hrs(a) == null) - (hrs(b) == null) || (hrs(b) || 0) - (hrs(a) || 0),
    playLeast: (a, b) => (hrs(a) == null) - (hrs(b) == null) || (hrs(a) || 0) - (hrs(b) || 0),
  };
  const list = items.filter(i => (s.status === 'all' || i.status === s.status)
    && (type !== 'game' || ((fam === 'all' || familyOf(i.platform) === fam) && (platform === 'all' || i.platform === platform)))
    && (!s.q || i.title.toLowerCase().includes(s.q.toLowerCase())))
    .sort(sorters[s.sort] || sorters.added);
  // Ohne gespeicherte Wahl: das Cover-Raster
  const view = s.view || 'grid';
  const shelf = view === 'shelf';

  return <>
    {head}
    <div className="toolbar">
      <div className="search">{I.search}<input className="input" placeholder="Suchen" value={s.q} onChange={e => set({ q: e.target.value })} /></div>
      <div className="chips">
        {[['all', 'Alle'], ...Object.entries(STATUS[type])].map(([k, v]) => <button key={k} className={cn('chip', s.status === k && 'on')} onClick={() => set({ status: k })}>{v}</button>)}
      </div>
      {platforms.length > 1 && <>
        {fams.length > 1 && <select className="input w-auto" value={fam} onChange={e => set({ fam: e.target.value, platform: 'all' })}>
          <option value="all">Alle Plattformen</option>{fams.map(g => <option key={g} value={g}>{g}</option>)}</select>}
        {consoles.length > 1 && <select className="input w-auto" value={platform} onChange={e => set({ platform: e.target.value })}>
          <option value="all">Alle {fam}</option>{consoles.map(p => <option key={p} value={p}>{p}</option>)}</select>}
        {onlyOneFam && <select className="input w-auto" value={platform} onChange={e => set({ platform: e.target.value })}>
          <option value="all">Alle Plattformen</option>{platforms.slice().sort(byOrder).map(p => <option key={p} value={p}>{p}</option>)}</select>}
      </>}
      <select className="input w-auto" value={s.sort} onChange={e => set({ sort: e.target.value })}>
        <option value="added">Zuletzt hinzugefügt</option>
        <option value="title">Titel A–Z</option>
        <option value="rating">Beste Bewertung</option>
        {type === 'game' && <>
          <option value="progress">Trophäen-Fortschritt</option>
          <option value="playMost">Meiste Spielzeit</option>
          <option value="playLeast">Wenigste Spielzeit</option>
        </>}
      </select>
      <div className="view-seg" role="group" aria-label="Ansicht">
        {[['grid', 'Cover-Raster', I.grid], ['shelf', 'Regal', I.shelfView]].map(([v, l, icon]) =>
          <button key={v} className={view === v ? 'on' : ''} title={l} aria-label={l} onClick={() => set({ view: v })}>{icon}</button>)}
      </div>
    </div>
    {!list.length ? <div className="grid"><div className="list-empty col-span-full">{s.q ? <>Nichts zu „{s.q}“ gefunden.</> : <>Hier ist gerade nichts.</>} <button className="btn btn-sm btn-ghost ml-1 text-(--lilac)" onClick={() => set({ q: "", status: "all", fam: "all", platform: "all" })}>Filter zurücksetzen</button></div></div>
      : shelf ? <ShelfWall items={list} />
      : <div className="grid">{list.map(it => <Card key={it.id} item={it} animate={animate} />)}</div>}
  </>;
}

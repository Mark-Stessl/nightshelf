/* Nightshelf – App-Gerüst: Seitenleiste, Hash-Router, Start-Abläufe */
import { useEffect, useLayoutEffect, useState } from 'react';
import { Store } from './lib/store.js';
import { Trophies } from './lib/trophies.js';
import { Sync } from './lib/sync.js';
import { Steam } from './lib/steam.js';
import { Pwa } from './lib/pwa.js';
import { modalIsOpen, refresh, toast, useDataVersion } from './lib/bus.js';
import { TYPES, allTrophyStats, lsGet, lsSet } from './lib/util.js';
import { detailFilter } from './lib/viewState.js';
import { EpisodeWatch, MangaWatch } from './lib/watch.jsx';
import { I, TrophyIcon } from './components/icons.jsx';
import { ModalHost, ToastHost, cn } from './components/ui.jsx';
import { UnlockHost } from './components/Unlock.jsx';
import { Home } from './views/Home.jsx';
import { Library } from './views/Library.jsx';
import { Detail } from './views/Detail.jsx';
import { Upcoming } from './views/Upcoming.jsx';
import { Stats } from './views/Stats.jsx';
import { TrophiesView } from './views/Trophies.jsx';
import { Settings } from './views/Settings.jsx';

const SHELF = ['games', 'series', 'anime', 'manga', 'movies'];
const LIB = { games: 'game', series: 'series', movies: 'movie', anime: 'anime', manga: 'manga' };
const Svg = ({ d, children }) => <svg viewBox="0 0 24 24">{d ? <path d={d} /> : children}</svg>;
const NAV_SUB = [
  ['games', 'Spiele', 'M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 15h-4l-1 .6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 11v3M5.5 12.5h3M16 12h.01M18 14h.01'],
  ['series', 'Serien', 'M3 7h18v12H3zM8 3l4 4 4-4'],
  ['anime', 'Anime', 'M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z'],
  ['manga', 'Manga', 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h6'],
  ['movies', 'Filme', 'M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4'],
];
const GEAR = 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';

const parseHash = () => { const [route, param] = location.hash.replace(/^#\/?/, '').split('/'); return { route: route || '', param }; };

function LevelCard() {
  const s = allTrophyStats();
  return (
    <a className="level-card block" href="#/trophies">
      <div className="level-top"><div className="level-badge">{s.level.level}</div><div><div className="level-title">Trophäen-Level</div><div className="tier-counts">{Trophies.ORDER.map(t => <span key={t} style={{ color: Trophies.TIERS[t].color }}><TrophyIcon tier={t} size={13} /> {s.counts[t]}</span>)}</div></div></div>
    </a>
  );
}

function InstallSlot() {
  const [, set] = useState(0);
  useEffect(() => Pwa.onChange(() => set(x => x + 1)), []);
  return <div className="install-slot">{Pwa.installState() === 'prompt' && <button className="btn btn-sm install-btn" onClick={() => Pwa.install()}>{I.install} App installieren</button>}</div>;
}

function Sidebar({ active }) {
  const [folded, setFolded] = useState(() => lsGet('nightshelf.shelfFold', '0') === '1');
  const fold = v => { setFolded(v); lsSet('nightshelf.shelfFold', v ? '1' : '0'); };
  const lastShelf = lsGet('nightshelf.shelf', 'games');
  const on = r => active === r || (r === 'shelf' && SHELF.includes(active));
  return (
    <aside className="sidebar">
      <a className="brand" href="#/">
        <span className="brand-mark"><svg viewBox="0 0 512 512" aria-hidden="true"><rect x="146" y="188" width="54" height="180" rx="14" fill="#8B5CF6" /><rect x="216" y="152" width="54" height="216" rx="14" fill="#A78BFA" /><rect x="292" y="206" width="54" height="162" rx="14" fill="#7C3AED" transform="rotate(12 319 368)" /><rect x="112" y="376" width="288" height="22" rx="11" fill="#5B4A86" /></svg></span>
        <span className="brand-name">Nightshelf</span>
      </a>
      <nav className={cn('nav', folded && 'shelf-folded')}>
        <a href="#/" className={cn(on('home') && 'active')}><Svg d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /><span>Übersicht</span></a>
        <a id="navShelf" href={`#/${lastShelf}`} className={cn(on('shelf') && 'active')} onClick={e => { if (!e.target.closest('.shelf-fold') && folded) fold(false); }}>
          <Svg><path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 5.2l3.8-1 3 15.6-3.8 1z" transform="translate(-1 0)" /></Svg><span>Regal</span>
          <button type="button" className="shelf-fold nav-desktop" aria-label="Regal ein-/ausklappen" aria-expanded={!folded} onClick={e => { e.preventDefault(); e.stopPropagation(); fold(!folded); }}><Svg d="M6 9l6 6 6-6" /></button>
        </a>
        {NAV_SUB.map(([r, label, d]) => <a key={r} href={`#/${r}`} className={cn('nav-sub nav-desktop', on(r) && 'active')}><Svg d={d} /><span>{label}</span></a>)}
        <a href="#/upcoming" className={cn(on('upcoming') && 'active')}><Svg d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" /><span>Demnächst</span></a>
        <a href="#/trophies" className={cn(on('trophies') && 'active', active === 'stats' && 'active-m')}><Svg d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6" /><span>Trophäen</span></a>
        <a href="#/stats" className={cn('nav-desktop', on('stats') && 'active')}><Svg d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><span>Statistik</span></a>
        <a href="#/settings" className={cn('nav-settings', on('settings') && 'active')}><Svg><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d={GEAR} /></Svg><span>Daten</span></a>
      </nav>
      <div className="sidebar-level"><LevelCard /></div>
      <InstallSlot />
    </aside>
  );
}

function View({ route, param }) {
  const animate = true; // Ansicht wird pro Seitenwechsel neu aufgebaut, die Einblendung läuft also nur einmal
  if (LIB[route]) return <Library type={LIB[route]} animate={animate} />;
  if (route === 'item') return <Detail id={param} animate={animate} />;
  if (route === 'stats') return <Stats animate={animate} />;
  if (route === 'upcoming') return <Upcoming animate={animate} />;
  if (route === 'trophies') return <TrophiesView animate={animate} />;
  if (route === 'settings') return <Settings animate={animate} />;
  return <Home animate={animate} />;
}

let lastHash = location.hash;
export function App() {
  useDataVersion();
  const [nav, setNav] = useState(() => ({ ...parseHash(), n: 0 }));

  useEffect(() => {
    const onHash = () => {
      const h = location.hash;
      if (!h.startsWith('#/item/') || h !== lastHash) detailFilter.set({ value: 'all' });
      lastHash = h;
      setNav(p => ({ ...parseHash(), n: p.n + 1 }));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useLayoutEffect(() => { if (nav.n) window.scrollTo({ top: 0, behavior: 'instant' }); }, [nav.n]);

  // Start: Sync, dann neue Kapitel und Folgen; beim Zurückkehren erneut prüfen
  useEffect(() => {
    const manga = () => MangaWatch.check().then(r => { if (r.updated.length) refresh(); }).catch(() => {});
    const air = () => EpisodeWatch.check().then(r => { if (r.news.length) refresh(); }).catch(() => {});
    Sync.syncNow().finally(() => { setTimeout(manga, 1500); setTimeout(air, 3000); });
    if (Sync.enabled()) Steam.refresh().then(refresh).catch(() => {});
    Pwa.init({ toast, render: refresh });
    Pwa.badge(0); // kein Zähler am App-Symbol, neue Folgen stehen unter Demnächst
    const vis = () => { if (document.visibilityState === 'visible') { manga(); air(); } };
    const synced = () => { if (!modalIsOpen()) refresh(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('nightshelf:synced', synced);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('nightshelf:synced', synced); };
  }, []);

  let active = nav.route || 'home';
  if (nav.route === 'item') { const it = Store.get(nav.param); active = it ? TYPES[it.type].route : 'home'; }
  if (SHELF.includes(active)) lsSet('nightshelf.shelf', active);

  return (
    <>
      <div className="app">
        <Sidebar active={active} />
        <main className="main" id="view"><View key={nav.n} route={nav.route} param={nav.param} /></main>
      </div>
      <ModalHost />
      <ToastHost />
      <UnlockHost />
    </>
  );
}

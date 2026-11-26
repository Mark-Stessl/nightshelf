/* Nightshelf – Trophäen-Seite mit Vitrine */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import { allTrophyStats, fmtDate, isTouch, recentTrophies } from '../lib/util.js';
import { I, TrophyIcon } from '../components/icons.jsx';
import { CoverBox } from '../components/Cover.jsx';
import { TrophyListRow } from '../components/items.jsx';
import { cn } from '../components/ui.jsx';

const VIT_ROWS = 2;
function Cup({ id }) {
  return (
    <svg className="vt-svg" viewBox="0 0 64 80" aria-hidden="true"><defs>
      <linearGradient id={`m${id}`} x1="0" x2="1"><stop offset="0" stopColor="#7DA6C9" /><stop offset=".28" stopColor="#F2F8FF" /><stop offset=".5" stopColor="#A9C4DD" /><stop offset=".78" stopColor="#E4F6FF" /><stop offset="1" stopColor="#6E8FB0" /></linearGradient>
      <linearGradient id={`b${id}`} x1="0" x2="1"><stop offset="0" stopColor="#2A2140" /><stop offset=".5" stopColor="#4A3B70" /><stop offset="1" stopColor="#231B37" /></linearGradient></defs>
      <path d="M15 4h34v12a17 17 0 0 1 -34 0z" fill={`url(#m${id})`} />
      <path d="M15 7H8a6.5 6.5 0 0 0 8.5 10.5M49 7h7a6.5 6.5 0 0 1 -8.5 10.5" fill="none" stroke={`url(#m${id})`} strokeWidth="3" strokeLinecap="round" />
      <path d="M28.5 32h7l2 9h-11z" fill={`url(#m${id})`} />
      <rect x="18" y="41" width="28" height="6" rx="2.5" fill={`url(#m${id})`} />
      <rect x="8" y="48" width="48" height="31" rx="4" fill={`url(#b${id})`} />
      <path d="M20 6h5v10a9 9 0 0 0 3 6.5" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Vitrine() {
  const plats = Store.all('game').flatMap(g => (g.trophies || []).filter(t => t.tier === 'platinum' && t.done).map(t => ({ t, g })))
    .sort((a, b) => (b.t.doneAt || '').localeCompare(a.t.doneAt || ''));
  const itemsRef = useRef(null);
  const [open, setOpen] = useState(false), [many, setMany] = useState(false), [clamp, setClamp] = useState(0);
  const [lit, setLit] = useState(null), [hover, setHover] = useState(null);
  const fit = () => {
    const items = itemsRef.current; const first = items?.querySelector('.vt'); if (!first) return;
    const rowH = first.offsetHeight + parseFloat(getComputedStyle(items).rowGap || 0);
    setMany(new Set([...items.children].map(x => x.offsetTop)).size > VIT_ROWS);
    setClamp(VIT_ROWS * rowH);
  };
  useLayoutEffect(fit, [plats.length]);
  useEffect(() => { const t = setTimeout(fit, 300); window.addEventListener('resize', fit); return () => { clearTimeout(t); window.removeEventListener('resize', fit); }; }, []);
  if (!plats.length) return null;
  const fresh = Date.now() - 14 * 864e5;
  const shown = hover ?? lit;
  const say = shown != null ? plats[shown] : null;
  return (
    <section className="section"><h2 className="section-title">Vitrine<span className="tiny" style={{ fontFamily: 'var(--font)' }}>{plats.length} Platin</span></h2>
      <div className={cn('vitrine', many && !open && 'clamped', open && 'open')}>
        <div className="vt-glass" />
        <div className={cn('vt-plaque', say && 'on')}>{say ? <><b>{say.g.title}</b>{say.t.doneAt && <i>Platin am {fmtDate(say.t.doneAt)}</i>}</> : isTouch() ? 'Tippe auf eine Trophäe' : 'Fahr über eine Trophäe'}</div>
        <div className="vt-items" ref={itemsRef} style={{ '--clamp': `${clamp}px` }} onMouseLeave={() => !isTouch() && setHover(null)}>
          {plats.map(({ t, g }, i) => (
            <a key={g.id} className={cn('vt', t.doneAt && new Date(t.doneAt).getTime() > fresh && 'fresh', lit === i && 'lit')} href={`#/item/${g.id}`} style={{ '--i': Math.min(i, 30) }} aria-label={g.title}
              onMouseOver={() => !isTouch() && setHover(i)} onFocus={() => setHover(i)}
              onClick={e => { if (isTouch() && lit !== i) { e.preventDefault(); setLit(i); try { navigator.vibrate?.(8); } catch {} } }}>
              <span className="vt-spot" /><span className="vt-cup"><Cup id={i} /><CoverBox item={g} noTitle className="vt-medal" as="span" /></span>
              <span className="vt-tip"><b>{g.title}</b>{t.doneAt && <i>{fmtDate(t.doneAt)}</i>}</span>
            </a>))}
        </div>
        <button type="button" className="vt-more" hidden={!many} onClick={e => { const v = e.currentTarget.closest('.vitrine'); setOpen(o => { if (o) v.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return !o; }); }}>
          {open ? 'Weniger zeigen' : `Ganze Vitrine zeigen (${plats.length})`}</button>
      </div>
    </section>
  );
}

export function TrophiesView({ animate }) {
  const s = allTrophyStats();
  const games = Store.all('game').filter(g => g.trophies?.length);
  const recent = recentTrophies(12);
  return (
    <div className={animate ? 'fade-in' : ''}>
      <div className="page-head"><div><h1 className="page-title">Trophäen</h1><p className="page-sub">{s.earned} von {s.total} verdient · {s.pts.toLocaleString('de-AT')} Punkte</p></div><a className="btn" href="#/stats">{I.chart} Statistik & Jahresrückblick</a></div>
      <div className="tally tl-tiers">
        <div className="tl-level"><div className="level-badge">{s.level.level}</div>
          <div><div className="level-title">Trophäen-Level {s.level.level}</div><div className="bar"><i style={{ width: `${s.level.pct}%` }} /></div><small>Noch {(s.level.need - s.level.into).toLocaleString("de-AT")} Punkte bis Level {s.level.level + 1}</small></div></div>
        {Trophies.ORDER.map(t => <div key={t}><b style={{ color: Trophies.TIERS[t].color }}>{s.counts[t]}</b><span className="tl-label"><TrophyIcon tier={t} size={14} /> {Trophies.TIERS[t].label}</span></div>)}
      </div>
      <Vitrine />
      <div className="two-col section">
        <div><h2 className="section-title">Spiele nach Fortschritt</h2><div className="list-card">{games.length ? games
          .map(g => ({ g, p: Trophies.progress(g.trophies) }))
          .sort((a, b) => b.p.done / b.p.total - a.p.done / a.p.total)
          .map(({ g, p }) => (
            <a key={g.id} className="list-row" href={`#/item/${g.id}`}><CoverBox item={g} noTitle className="thumb" />
              <div className="grow"><div className="title">{g.title} {g.trophies.some(t => t.tier === 'platinum' && t.done) && <TrophyIcon tier="platinum" size={15} />}</div>
                <div className="sub">{g.platform || ''} · {p.done}/{p.total}</div><div className="bar mt-1.5"><i style={{ width: `${Math.round(p.done / p.total * 100)}%` }} /></div></div>
              <b className="text-[15px] min-w-[42px] text-right" style={{ fontFamily: 'var(--display)' }}>{Math.round(p.done / p.total * 100)}%</b></a>))
          : <div className="list-empty">Noch keine Spiele mit Trophäen.</div>}</div></div>
        <div><h2 className="section-title">Zuletzt verdient</h2><div className="list-card">{recent.length ? recent.map(({ t, g }) => <TrophyListRow key={g.id + t.id} t={t} g={g} />) : <div className="list-empty">Noch nichts verdient.</div>}</div></div>
      </div>
    </div>
  );
}

/* Nightshelf – Demnächst: Kalender (Monat, Woche) und Liste */
import { Store } from '../lib/store.js';
import { MONTH_NAMES, TYPES, isMobileWidth, lsSet, newItems, upcomingEntries, upcomingText, weekStartOf, ymdOf } from '../lib/util.js';
import { calState } from '../lib/viewState.js';
import { checkAllNews } from '../lib/watch.jsx';
import { I } from '../components/icons.jsx';
import { CoverBox } from '../components/Cover.jsx';
import { NewRow, UpcomingRow } from '../components/items.jsx';
import { cn } from '../components/ui.jsx';
import { BusyButton } from './Library.jsx';

const CAL_COLOR = { anime: 'var(--violet)', series: 'var(--cyan)', game: '#E9BE58', movie: '#F472B6', manga: 'var(--lilac)' };
const timeOf = t => new Date(t).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

function CalEvent({ u }) {
  return (
    <a className="cal-ev" href={`#/item/${u.it.id}`} style={{ '--c': CAL_COLOR[u.it.type] || 'var(--lilac)' }} title={`${u.it.title} · ${upcomingText(u)}`}>
      <CoverBox item={u.it} noTitle className="cal-ev-thumb" as="span" /><b>{u.it.title}</b>
    </a>
  );
}

function UpcomingList({ entries, fresh }) {
  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayLabel = t => {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'Heute';
    if (diff === 1) return 'Morgen';
    return new Date(t).toLocaleDateString('de-AT', diff < 7 ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'long', year: new Date(t).getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };
  const limit = today.getTime() + 60 * 86400000;
  const soon = entries.filter(u => u.t < limit), later = entries.filter(u => u.t >= limit).slice(0, 40);
  const groups = [];
  soon.forEach(u => { const k = dayKey(u.t); const g = groups[groups.length - 1]; if (g && g.k === k) g.list.push(u); else groups.push({ k, label: dayLabel(u.t), list: [u] }); });
  const months = [];
  later.forEach(u => { const k = new Date(u.t).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' }); const g = months[months.length - 1]; if (g && g.k === k) g.list.push(u); else months.push({ k, list: [u] }); });
  const hasSeasons = Store.all().some(it => ['anime', 'series'].includes(it.type) && it.seasonList?.some(x => x.anilistId || x.tvmazeId));
  return <>
    {fresh.length > 0 && <section className="section mt-0"><h2 className="section-title">Neu für dich</h2><div className="list-card">{fresh.map(it => <NewRow key={it.id} it={it} />)}</div></section>}
    {groups.map(g => <section key={g.k} className="section up-day"><h2 className="section-title">{g.label}<span className="tiny font-normal">{g.list.length} {g.list.length === 1 ? 'Termin' : 'Termine'}</span></h2>
      <div className="list-card">{g.list.map((u, i) => <UpcomingRow key={i} u={u} />)}</div></section>)}
    {months.length > 0 && <section className="section"><h2 className="section-title">Später</h2>{months.map(g => <div key={g.k}>
      <div className="season-row-label">{g.k}</div>
      <div className="list-card mb-3.5">{g.list.map((u, i) => <UpcomingRow key={i} u={{ ...u, dateOnly: true }} datePrefix={`${new Date(u.t).getDate()}.`} />)}</div></div>)}</section>}
    {!entries.length && <div className="empty"><div className="empty-icon">{I.calendar}</div><h3>Gerade nichts angekündigt</h3>
      <p>{hasSeasons ? 'Sobald zu deinen Serien, Anime, Filmen oder Spielen ein Termin bekannt ist, steht er hier.' : 'Lade bei deinen Serien und Anime die Staffeln (Button „Von TVmaze laden“ bzw. „Von AniList laden“), dann erscheinen hier die nächsten Folgen.'}</p></div>}
  </>;
}

export function Upcoming({ animate }) {
  const cal = calState.use();
  const entries = upcomingEntries();
  const fresh = newItems();
  const todayStr = ymdOf(new Date());
  const byDay = new Map();
  entries.forEach(u => { const k = ymdOf(new Date(u.t)); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(u); });
  const { mode } = cal;
  const sel = cal.sel || todayStr;
  const weekStart = cal.weekStart || weekStartOf(new Date());

  const setMode = m => { lsSet('nightshelf.calMode', m); calState.set({ mode: m, ...(m === 'week' && !cal.weekStart ? { weekStart: weekStartOf(cal.sel ? new Date(cal.sel + 'T00:00:00') : new Date()) } : {}) }); };
  const nav = dir => {
    const now = new Date();
    if (dir === 0) calState.set({ y: now.getFullYear(), m: now.getMonth(), sel: ymdOf(now), weekStart: weekStartOf(now) });
    else if (mode === 'week') { const s = new Date(weekStart); s.setDate(s.getDate() + 7 * dir); calState.set({ weekStart: s.getTime() }); }
    else { let m = cal.m + dir, y = cal.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } calState.set({ m, y }); }
  };
  const pick = (k, e) => {
    if (e.target.closest('a')) return; // Klick auf einen Eintrag öffnet ihn
    const d = new Date(k + 'T00:00:00');
    calState.set({ sel: k, ...(d.getMonth() !== cal.m && mode === 'month' ? { y: d.getFullYear(), m: d.getMonth() } : {}) });
    if (isMobileWidth()) setTimeout(() => document.getElementById('calDay')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const dayProps = k => ({ role: 'button', tabIndex: 0, onClick: e => pick(k, e), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(k, e); } } });

  const titleTxt = mode === 'week'
    ? (() => { const s = new Date(weekStart); const e = new Date(s); e.setDate(e.getDate() + 6); return `${s.getDate()}. ${MONTH_NAMES[s.getMonth()].slice(0, 3)} – ${e.getDate()}. ${MONTH_NAMES[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`; })()
    : `${MONTH_NAMES[cal.m]} ${cal.y}`;
  const head = <>
    <div className="page-head"><div><h1 className="page-title">Demnächst</h1><p className="page-sub">Neue Folgen, Staffeln, Filme und Spiele aus deinem Regal</p></div>
      <BusyButton onClick={checkAllNews}>{I.refresh} Jetzt prüfen</BusyButton></div>
    <div className="cal-bar">
      {mode !== 'list' ? <>
        <div className="uc-nav"><button className="cal-navbtn" aria-label="Zurück" onClick={() => nav(-1)}>‹</button><button className="cal-navbtn" aria-label="Weiter" onClick={() => nav(1)}>›</button></div>
        <h2 className="uc-title">{titleTxt}</h2><button className="btn btn-sm" onClick={() => nav(0)}>Heute</button>
      </> : <h2 className="uc-title">Alle Termine</h2>}
      <div className="cal-seg">{[['month', 'Monat'], ['week', 'Woche'], ['list', 'Liste']].map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</div>
    </div>
  </>;

  if (mode === 'list') return <div className={cn(animate && 'fade-in', 'max-w-[900px]')}>{head}<UpcomingList entries={entries} fresh={fresh} /></div>;

  let grid;
  if (mode === 'month') {
    const first = new Date(cal.y, cal.m, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const weeks = Math.ceil((((first.getDay() + 6) % 7) + new Date(cal.y, cal.m + 1, 0).getDate()) / 7);
    grid = (
      <div className="uc-month">
        <div className="cal-wds">{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => <span key={w}>{w}</span>)}</div>
        <div className="uc-grid">{Array.from({ length: weeks * 7 }, (_, i) => {
          const d = new Date(start); d.setDate(start.getDate() + i);
          const k = ymdOf(d), list = byDay.get(k) || [];
          return (
            <div key={k} className={cn('cal-cell', d.getMonth() !== cal.m && 'out', k === todayStr && 'today', k === sel && 'sel', list.length && 'has')} {...dayProps(k)}
              aria-label={`${d.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })}${list.length ? `, ${list.length} Termine` : ''}`}>
              <span className="cal-n">{d.getDate()}</span>
              <div className="cal-evs">{list.slice(0, 3).map((u, j) => <CalEvent key={j} u={u} />)}{list.length > 3 && <span className="cal-more">+{list.length - 3} weitere</span>}</div>
              <div className="cal-dots">{list.slice(0, 4).map((u, j) => <i key={j} style={{ background: CAL_COLOR[u.it.type] || 'var(--lilac)' }} />)}</div>
            </div>);
        })}</div>
      </div>);
  } else {
    const s = new Date(weekStart);
    grid = <div className="cal-week">{Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s); d.setDate(s.getDate() + i);
      const k = ymdOf(d), list = byDay.get(k) || [];
      return (
        <div key={k} className={cn('cal-wcol', k === todayStr && 'today', k === sel && 'sel')} {...dayProps(k)}>
          <div className="cal-whead"><span>{d.toLocaleDateString('de-AT', { weekday: 'short' })}</span><b>{d.getDate()}</b></div>
          <div className="cal-wlist">{list.length ? list.map((u, j) => <span key={j} className="contents"><CalEvent u={u} />{!u.dateOnly && <span className="cal-time">{timeOf(u.t)}</span>}</span>) : <span className="cal-none">–</span>}</div>
        </div>);
    })}</div>;
  }

  const dayList = byDay.get(sel) || [];
  const dayLabel = sel === todayStr ? 'Heute' : new Date(sel + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className={animate ? 'fade-in' : ''}>{head}
      <div className="cal-layout">
        <div>
          <div className="cal-legend">{[['anime', 'Anime'], ['series', 'Serien'], ['game', 'Spiele'], ['movie', 'Filme']].map(([t, l]) => <span key={t}><i style={{ background: CAL_COLOR[t] }} />{l}</span>)}</div>
          {grid}
          {!entries.length && <p className="tiny mt-2.5">Noch keine Termine bekannt. Lade bei Serien und Anime die Staffeln („Von TVmaze/AniList laden“), dann erscheinen hier die nächsten Folgen.</p>}
        </div>
        <aside className="cal-side">
          <div id="calDay">
            <div className="cal-day-head"><h3>{dayLabel}</h3><span className="tiny">{dayList.length ? `${dayList.length} ${dayList.length === 1 ? 'Termin' : 'Termine'}` : 'Nichts geplant'}</span></div>
            {dayList.length ? <div className="list-card">{dayList.map((u, i) => <UpcomingRow key={i} u={u} />)}</div> : <div className="list-empty py-3.5 px-1">An diesem Tag kommt nichts aus deinem Regal.</div>}
          </div>
          {fresh.length > 0 && <div className="cal-new"><h3>Neu für dich</h3><div className="list-card">{fresh.slice(0, 8).map(it => <NewRow key={it.id} it={it} />)}</div></div>}
        </aside>
      </div>
    </div>
  );
}

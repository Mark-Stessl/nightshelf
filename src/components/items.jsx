/* Nightshelf – Karten, Regal-Rücken und Listenzeilen */
import { useEffect, useRef } from 'react';
import { CoverBox } from './Cover.jsx';
import { I, TrophyIcon } from './icons.jsx';
import { cn, Dot } from './ui.jsx';
import { Trophies } from '../lib/trophies.js';
import {
  TYPES, countsAsNew, currentSeason, familyOf, fmtCh, fmtHours, hash, hoursOf, isTouch, mediaProgress,
  newCount, releaseInfo, releaseLabel, released, seasonDone, statusLabel, upcomingText,
} from '../lib/util.js';

const STATE_BADGE = { done: ['check', 'Fertig'], active: ['play', 'Läuft'], paused: ['pause', 'Pausiert'], planned: ['bookmark', 'Merkliste'], dropped: ['x', 'Abgebrochen'] };

export function Card({ item, animate }) {
  const meta = [];
  if (item.type === 'game' && item.platform) meta.push(item.platform);
  if (item.type === 'series' && item.seasons) meta.push(`${item.seasonSeen || 0}/${item.seasons} ${item.seasons === 1 ? 'Staffel' : 'Staffeln'}`);
  if (['anime', 'series'].includes(item.type) && item.seasonList?.length > 1 && item.seasonList.some(x => x.episodes)) {
    const cur = currentSeason(item); meta.length = 0; meta.push(`${cur.label} · ${seasonDone(cur) ? '✓' : `${cur.seen || 0}/${cur.episodes || '?'}`}`);
  } else if (item.type === 'anime' && (item.episodes || item.episodesSeen)) meta.push(`${item.episodesSeen || 0}/${item.episodes || '?'} Folgen`);
  if (item.type === 'manga' && (item.chapters || item.chaptersRead)) meta.push(`Kap. ${fmtCh(item.chaptersRead || 0)}/${item.chapters ? fmtCh(item.chapters) : '?'}`);
  if (item.year) meta.push(item.year);

  const behind = newCount(item);
  const rel = releaseInfo(item);
  const state = rel ? 'upcoming' : item.status;
  const p = item.type === 'game' && item.trophies?.length ? Trophies.progress(item.trophies) : null;
  const plat = item.type === 'game' && item.trophies?.find(t => t.tier === 'platinum' && t.done);
  const pr = !rel && item.type !== 'game' && ['active', 'paused'].includes(item.status) ? mediaProgress(item) : null;
  const badge = STATE_BADGE[item.status];
  const h = hoursOf(item);

  return (
    <a className={cn('card', `cs-${state}`, animate && 'fade-in')} href={`#/item/${item.id}`}>
      <CoverBox item={item}>
        {item.type === 'game' && item.platform && <span className="cover-tag">{item.platform}</span>}
        {p && <div className="cover-progress"><i style={{ width: `${Math.round(p.done / p.total * 100)}%` }} /></div>}
        {plat && <div className="cover-plat" title="Platin"><TrophyIcon tier="platinum" size={15} /></div>}
        {behind > 0 && ['active', 'paused', 'done'].includes(item.status) &&
          <div className="cover-new" title={`${behind} ${item.type === 'manga' ? 'ungelesene Kapitel' : 'neue Folgen'}`}>+{behind > 99 ? '99' : fmtCh(behind)}</div>}
        {rel ? <div className="cover-release">{I.calendar}<span>{releaseLabel(rel)}</span></div> : <>
          {item.type === 'game' && h > 0 && <div className="cover-hrs" title="Spielzeit">{I.clock}{fmtHours(h)}</div>}
          {badge && <div className="cover-state" title={statusLabel(item)}>{I[badge[0]]}</div>}
          {pr != null && <div className="cover-progress"><i style={{ width: `${Math.round(Math.min(1, pr) * 100)}%` }} /></div>}
        </>}
      </CoverBox>
      <div>
        <div className="card-title">{item.title}</div>
        <div className="card-meta">
          {meta.map((m, i) => <span key={i} className="contents">{i > 0 && <Dot />}{m}</span>)}
          {item.rating > 0 && <>{meta.length > 0 && <Dot />}<span className="stars-mini">{'★'.repeat(item.rating)}</span></>}
        </div>
      </div>
    </a>
  );
}

/* ---------- Konsolen-Hüllen, Regal-Ansicht ---------- */
// Aussehen der echten Hüllen: Streifen oben (band), Schrift, Farbe der Plastikhülle (frame)
const CASES = {
  'PS5':         { band: 'linear-gradient(90deg,#0047AB,#0070D1)', text: '#fff', label: 'PS5', sheen: 1 },
  'PS4':         { band: 'linear-gradient(90deg,#00246B,#003791)', text: '#fff', label: 'PS4' },
  'PS3':         { band: 'linear-gradient(90deg,#111,#3A3A3A)', text: '#E8E8E8', label: 'PS3', frame: '#1A1A1A' },
  'PS2':         { band: 'linear-gradient(90deg,#0B0B12,#1D1D2B)', text: '#9FB4FF', label: 'PS2', frame: '#0C0C10' },
  'PS1':         { band: 'linear-gradient(90deg,#141414,#2B2B2B)', text: '#F2C230', label: 'PS', frame: '#151515' },
  'PS Vita':     { band: 'linear-gradient(90deg,#00439C,#1E6FD9)', text: '#fff', label: 'VITA' },
  'PSP':         { band: 'linear-gradient(90deg,#1A1A1A,#444)', text: '#fff', label: 'PSP', frame: '#D9DCE2' },
  'Switch 2':    { band: 'linear-gradient(90deg,#C8001A,#E60023)', text: '#fff', label: 'SWITCH 2', frame: '#E60023' },
  'Switch':      { band: 'linear-gradient(90deg,#D10016,#F0283C)', text: '#fff', label: 'SWITCH', frame: '#E2001A' },
  'Wii U':       { band: 'linear-gradient(90deg,#0089BF,#22B5E8)', text: '#fff', label: 'WII U', frame: '#1FA9DC' },
  'Wii':         { band: 'linear-gradient(90deg,#E9ECF1,#FFFFFF)', text: '#1B9AD8', label: 'Wii', frame: '#F1F3F6' },
  'GameCube':    { band: 'linear-gradient(90deg,#2B2152,#4B3C8C)', text: '#fff', label: 'GCN', frame: '#111' },
  '3DS':         { band: 'linear-gradient(90deg,#B70016,#D9001E)', text: '#fff', label: '3DS', frame: '#E9EAEE' },
  'DS':          { band: 'linear-gradient(90deg,#6B6F78,#9CA1AB)', text: '#fff', label: 'DS', frame: '#1A1A1A' },
  'N64':         { band: 'linear-gradient(90deg,#0B2A6F,#C3112B)', text: '#fff', label: 'N64' },
  'Xbox Series': { band: 'linear-gradient(90deg,#0E6B12,#19A11E)', text: '#fff', label: 'XBOX', frame: '#107C10' },
  'Xbox One':    { band: 'linear-gradient(90deg,#0E6B12,#2CA243)', text: '#fff', label: 'XB1', frame: '#107C10' },
  'Xbox 360':    { band: 'linear-gradient(90deg,#4E9A0E,#86C440)', text: '#fff', label: '360', frame: '#5DAE1B' },
  'Xbox':        { band: 'linear-gradient(90deg,#1B5E20,#4CAF50)', text: '#fff', label: 'XBOX', frame: '#2E7D32' },
  'Steam':       { band: 'linear-gradient(90deg,#121A2A,#2A3F5F)', text: '#9FD3FF', label: 'STEAM' },
};
const caseOf = item => item.type === 'game' && item.platform ? CASES[item.platform] || (familyOf(item.platform) === 'Steam' ? CASES.Steam : null) : null;
const SPINE = { game: [176, 34], movie: [184, 40], series: [178, 38], anime: [170, 32], manga: [150, 28] };

export function Spine({ item, idx = 0 }) {
  const h = hash(item.title + item.id);
  const [bh, bw] = SPINE[item.type] || [172, 34];
  const rel = releaseInfo(item);
  const state = rel ? 'upcoming' : item.status;
  const plat = item.type === 'game' && item.trophies?.some(t => t.tier === 'platinum' && t.done);
  const cs = caseOf(item);
  const meta = [];
  if (item.type === 'game' && item.platform) meta.push(item.platform);
  if (item.type === 'game' && hoursOf(item) > 0) meta.push(fmtHours(hoursOf(item)));
  if (item.type === 'game' && item.trophies?.length) { const p = Trophies.progress(item.trophies); meta.push(`${Math.round(p.done / p.total * 100)} %`); }
  if (item.type !== 'game' && item.year) meta.push(item.year);
  if (rel) meta.push(releaseLabel(rel));
  const style = {
    '--h': `${bh + (h % 5) * 6}px`, '--w': `${bw + ((h >> 4) % 4) * 3}px`, '--hue': 248 + (h % 46), '--i': Math.min(idx, 36),
    ...(cs ? { '--cap': cs.band, '--capText': cs.text, ...(cs.frame ? { '--frame': cs.frame } : {}) } : {}),
  };
  return (
    <a className={cn('spine', `sp-${state}`, plat && 'sp-plat', cs && 'has-case', cs?.frame && 'has-frame', cs?.sheen && 'has-sheen')}
      href={`#/item/${item.id}`} style={style} aria-label={item.title}>
      <span className="sp-body">
        {item.cover && <img src={item.cover} alt="" loading="lazy" decoding="async" onError={e => e.currentTarget.remove()} />}
        <span className="sp-shade" />
        {cs && <span className="sp-cap"><em>{cs.label}</em></span>}
        <span className="sp-title">{item.title}</span>
        {plat ? <span className="sp-foot"><TrophyIcon tier="platinum" size={13} /></span> : item.rating ? <span className="sp-foot sp-rate">{item.rating}★</span> : null}
      </span>
      <span className="sp-pop" aria-hidden="true">
        <CoverBox item={item} noTitle className={cn('sp-pop-cover', cs && 'case')} as="span">
          {cs && <span className="case-band"><b>{cs.label === 'PS' ? 'PlayStation' : item.platform}</b></span>}
        </CoverBox>
        <span className="sp-pop-info"><b>{item.title}</b>{meta.length > 0 && <i>{meta.join(' · ')}</i>}</span>
      </span>
    </a>
  );
}

// Rückt das herausgezogene Cover so, dass es nicht aus dem Bild ragt
function placePop(sp) {
  const pop = sp.querySelector('.sp-pop'); if (!pop) return;
  const wall = sp.closest('.shelf-wall').getBoundingClientRect(), r = sp.getBoundingClientRect();
  const w = pop.offsetWidth || 140, cx = r.left + r.width / 2;
  let dx = 0;
  if (cx - w / 2 < wall.left + 4) dx = wall.left + 4 - (cx - w / 2);
  if (cx + w / 2 > wall.right - 4) dx = wall.right - 4 - (cx + w / 2);
  sp.style.setProperty('--dx', dx + 'px');
}

export function ShelfWall({ items }) {
  const ref = useRef(null);
  useEffect(() => {
    const wall = ref.current;
    const over = e => { const sp = e.target.closest('.spine'); if (sp && !isTouch()) placePop(sp); };
    const focus = e => { const sp = e.target.closest('.spine'); if (sp) placePop(sp); };
    // Handy: erstes Antippen zieht heraus, zweites öffnet
    const click = e => {
      const sp = e.target.closest('.spine'); if (!sp || !isTouch()) return;
      if (!sp.classList.contains('pulled')) {
        e.preventDefault();
        wall.querySelectorAll('.spine.pulled').forEach(x => x.classList.remove('pulled'));
        placePop(sp); sp.classList.add('pulled');
        try { navigator.vibrate?.(8); } catch {}
      }
    };
    const outside = e => { if (!e.target.closest('.shelf-wall')) wall.querySelectorAll('.spine.pulled').forEach(x => x.classList.remove('pulled')); };
    wall.addEventListener('mouseover', over); wall.addEventListener('focusin', focus); wall.addEventListener('click', click);
    document.addEventListener('click', outside);
    return () => { wall.removeEventListener('mouseover', over); wall.removeEventListener('focusin', focus); wall.removeEventListener('click', click); document.removeEventListener('click', outside); };
  }, []);
  return <div className="shelf-wall" ref={ref}>{items.map((it, i) => <Spine key={it.id} item={it} idx={i} />)}</div>;
}

/* ---------- Listenzeilen ---------- */
export function ListRow({ item, sub, children, className }) {
  return (
    <a className={cn('list-row', className)} href={`#/item/${item.id}`}>
      <CoverBox item={item} noTitle className="thumb" />
      <div className="grow"><div className="title">{item.title}</div><div className="sub">{sub}</div></div>
      {children}
    </a>
  );
}

export function TrophyListRow({ t, g }) {
  return (
    <a className="list-row" href={`#/item/${g.id}`}>
      <div className="tbadge"><TrophyIcon tier={t.tier} /></div>
      <div className="grow"><div className="title">{t.name}</div><div className="sub">{g.title} · {new Date(t.doneAt).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
    </a>
  );
}

export function UpcomingRow({ u, prefix, datePrefix }) {
  const time = u.dateOnly ? '' : new Date(u.t).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  return (
    <a className="list-row" href={`#/item/${u.it.id}`}>
      <CoverBox item={u.it} noTitle className="thumb" />
      {datePrefix && <div className="up-date">{datePrefix}</div>}
      <div className="grow"><div className="title">{u.it.title}</div>
        <div className="sub">{prefix && <><span style={{ color: 'var(--lilac)' }}>{prefix}</span> · </>}{TYPES[u.it.type].label} · {upcomingText(u)}</div></div>
      {time && <div className="up-time">{time}</div>}
    </a>
  );
}

export function NewRow({ it }) {
  const n = newCount(it);
  let sub;
  if (it.type === 'manga') sub = `Manga · ${fmtCh(n)} ${n === 1 ? 'neues Kapitel' : 'neue Kapitel'} · bis Kapitel ${fmtCh(it.chapters)}`;
  else {
    const x = it.seasonList.find(s => countsAsNew(s) && released(s) > (s.seen || 0));
    sub = `${TYPES[it.type].label} · ${n} ${n === 1 ? 'neue Folge' : 'neue Folgen'}${x && it.seasonList.length > 1 ? ` · ${x.label}` : ''}`;
  }
  return <ListRow item={it} sub={sub}><div className="up-new">+{n > 99 ? '99' : fmtCh(n)}</div></ListRow>;
}

/* Nightshelf – Statistik und Jahresrückblick */
import { useEffect, useRef, useState } from 'react';
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import { Sync } from '../lib/sync.js';
import { PSN } from '../lib/psn.js';
import { openModal } from '../lib/bus.js';
import { MONTH_NAMES, MONTHS_SHORT, TYPES, fmtDate, fmtHours, hoursOf, initials } from '../lib/util.js';
import { statsState } from '../lib/viewState.js';
import { I, TrophyIcon } from '../components/icons.jsx';
import { CoverBox } from '../components/Cover.jsx';
import { cn, ModalFrame } from '../components/ui.jsx';

const yearOf = iso => iso ? new Date(iso).getFullYear() : null;

function collectStats(year) {
  const all = year === 'all';
  const inPeriod = iso => !!iso && (all || String(yearOf(iso)) === year);
  const items = Store.all();
  const trophies = [];
  items.filter(i => i.type === 'game').forEach(g => (g.trophies || []).forEach(t => { if (t.done && t.doneAt) trophies.push({ t, g }); }));
  trophies.sort((a, b) => a.t.doneAt.localeCompare(b.t.doneAt));
  const plats = trophies.filter(x => x.t.tier === 'platinum').map((x, i) => ({ ...x, n: i + 1 }));
  const periodTrophies = trophies.filter(x => inPeriod(x.t.doneAt));
  const years = new Set([String(new Date().getFullYear())]);
  trophies.forEach(x => years.add(String(yearOf(x.t.doneAt))));
  items.forEach(i => { if (i.finishedAt) years.add(String(yearOf(i.finishedAt))); (i.watchLog || []).forEach(w => years.add(String(yearOf(w.at)))); });

  // Balken: Monate eines Jahres oder Jahre insgesamt
  let buckets;
  if (all) {
    const ys = [...years].map(Number).sort((a, b) => a - b);
    const from = ys[0], to = ys[ys.length - 1];
    buckets = Array.from({ length: to - from + 1 }, (_, i) => ({ key: from + i, label: String(from + i), long: String(from + i), tiers: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, episodes: 0 }));
  } else {
    buckets = MONTHS_SHORT.map((m, i) => ({ key: i, label: m, long: `${MONTH_NAMES[i]} ${year}`, tiers: { platinum: 0, gold: 0, silver: 0, bronze: 0 }, episodes: 0 }));
  }
  const bucketOf = iso => { const d = new Date(iso); return all ? buckets.find(b => b.key === d.getFullYear()) : buckets[d.getMonth()]; };
  periodTrophies.forEach(x => { const b = bucketOf(x.t.doneAt); if (b) b.tiers[x.t.tier]++; });
  let episodes = 0, chapters = 0;
  items.forEach(i => (i.readLog || []).forEach(w => { if (inPeriod(w.at)) chapters += w.n; }));
  items.forEach(i => (i.watchLog || []).forEach(w => { if (inPeriod(w.at)) { episodes += w.n; const b = bucketOf(w.at); if (b) b.episodes += w.n; } }));

  const finished = items.filter(i => inPeriod(i.finishedAt)).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  const rare = periodTrophies.filter(x => x.t.rarity != null).sort((a, b) => a.t.rarity - b.t.rarity).slice(0, 5);
  const rated = (all ? items : finished).filter(i => i.rating).sort((a, b) => b.rating - a.rating || (b.finishedAt || '').localeCompare(a.finishedAt || '')).slice(0, 6);
  const tierCount = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  periodTrophies.forEach(x => tierCount[x.t.tier]++);
  const busiest = buckets.reduce((best, b) => { const n = Object.values(b.tiers).reduce((a, c) => a + c, 0); return n > best.n ? { n, b } : best; }, { n: 0, b: null });
  return {
    all, years: [...years].sort().reverse(), buckets, trophies: periodTrophies, tierCount, episodes, chapters,
    plats: plats.filter(x => inPeriod(x.t.doneAt)).reverse(), allPlats: plats.length, finished, rare, rated, busiest,
    undatedFinished: all ? items.filter(i => i.status === 'done' && !i.finishedAt).length : 0,
  };
}

function niceTicks(values) {
  const max = Math.max(1, ...values);
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  const step = max <= 4 ? 1 : max <= 10 ? 2 : [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10].map(f => f * mag).filter(Number.isInteger).find(st => max / st <= 5) || mag * 10;
  const top = Math.ceil(max / step) * step;
  const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

/* Balkendiagramm mit Tooltip beim Drüberfahren oder Antippen */
function Chart({ st, label, cols, legend }) {
  const [tip, setTip] = useState(null);
  const tipRef = useRef(null);
  const totals = cols.map(c => c.total);
  const { top, ticks } = niceTicks(totals);
  useEffect(() => { const hide = () => setTip(null); window.addEventListener('scroll', hide, { passive: true }); return () => window.removeEventListener('scroll', hide); }, []);
  useEffect(() => {
    const el = tipRef.current; if (!el || !tip) return;
    const r = el.getBoundingClientRect();
    el.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, tip.x - r.width / 2)) + 'px';
    el.style.top = Math.max(8, tip.y - r.height - 14) + 'px';
  }, [tip]);
  const show = (i, e) => {
    const col = e.currentTarget;
    const stack = col.querySelector('.stack');
    setTip({ i, x: e.clientX, y: col.getBoundingClientRect().top + col.offsetHeight - (stack?.offsetHeight || 0) });
  };
  return (
    <div className="chart" role="img" aria-label={`${label}: ${st.buckets.map((b, i) => `${b.long} ${totals[i]}`).join(', ')}`}>
      {legend}
      <div className="chart-plot">
        <div className="chart-grid">{ticks.slice().reverse().map(v => <div key={v} className="tick"><span>{v.toLocaleString('de-AT')}</span></div>)}</div>
        <div className="chart-bars" style={{ '--cols': st.buckets.length }}>{cols.map((c, i) => (
          <div key={i} className={cn('chart-col', tip?.i === i && 'hover')} onMouseEnter={e => show(i, e)} onMouseMove={e => show(i, e)} onMouseLeave={() => setTip(null)} onClick={e => show(i, e)}>
            <div className="stack" style={{ height: `${c.total / top * 100}%` }}>{c.parts}</div>
          </div>))}</div>
      </div>
      <div className="chart-x" style={{ '--cols': st.buckets.length }}>{st.buckets.map(b => <span key={b.key}>{b.label}</span>)}</div>
      {tip && <div ref={tipRef} className="chart-tip" role="tooltip" style={{ opacity: 1, position: 'fixed' }}><b>{st.buckets[tip.i].long}</b>{cols[tip.i].rows.map(r => <span key={r}>{r}</span>)}</div>}
    </div>
  );
}
function StackedChart({ st }) {
  const order = ['bronze', 'silver', 'gold', 'platinum'];
  const cols = st.buckets.map(b => {
    const total = order.reduce((a, t) => a + b.tiers[t], 0);
    return { total, parts: order.filter(t => b.tiers[t]).map(t => <i key={t} style={{ flex: b.tiers[t], background: Trophies.TIERS[t].hex }} />), rows: [...order.slice().reverse().map(t => `${Trophies.TIERS[t].label}: ${b.tiers[t]}`), `Gesamt: ${total}`] };
  });
  // Im Jahr erst kurz vor dem ersten Monat mit Trophäen anfangen (mindestens 6 Monate zeigen), sonst ist es fast nur leere Achse
  const first = cols.findIndex(c => c.total > 0);
  const from = st.all || first < 0 ? 0 : Math.max(0, Math.min(first - 1, cols.length - 6));
  return <Chart st={{ ...st, buckets: st.buckets.slice(from) }} cols={cols.slice(from)} label={`Verdiente Trophäen ${st.all ? 'pro Jahr' : 'pro Monat'}`}
    legend={<div className="chart-legend">{order.slice().reverse().map(t => <span key={t}><TrophyIcon tier={t} size={14} /> {Trophies.TIERS[t].label}</span>)}</div>} />;
}

/* ---------- Jahresrückblick als Bild (zum Teilen/Speichern, ohne Konto) ---------- */
function loadImg(src) {
  const direct = u => new Promise(res => {
    const i = new Image();
    if (!u.startsWith('data:') && !u.startsWith('blob:')) i.crossOrigin = 'anonymous';
    const t = setTimeout(() => res(null), 6000);
    i.onload = () => { clearTimeout(t); res(i); };
    i.onerror = () => { clearTimeout(t); res(null); };
    i.src = u;
  });
  return (async () => {
    if (!src) return null;
    // 1. direkt (klappt, wenn die Quelle CORS erlaubt; eigener Parameter umgeht alte Zwischenspeicher)
    const sep = src.includes('?') ? '&' : '?';
    const a = await direct(src.startsWith('data:') ? src : `${src}${sep}ns=1`);
    if (a) return a;
    // 2. über den eigenen Server (für Quellen ohne Freigabe)
    if (!Sync.enabled() || src.startsWith('data:')) return null;
    try {
      const r = await fetch(`${PSN.worker()}/img?u=${encodeURIComponent(src)}`, { headers: Sync.header() });
      if (!r.ok) return null;
      return await direct(URL.createObjectURL(await r.blob()));
    } catch { return null; }
  })();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fitText(ctx, text, max) { if (ctx.measureText(text).width <= max) return text; let t = text; while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }

async function makeYearCard(st, year) {
  await document.fonts?.ready;
  const W = 1080, H = 1920, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0E0B16'; x.fillRect(0, 0, W, H);
  const glow = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(14,11,22,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  glow(160, 120, 900, 'rgba(139,92,246,.45)'); glow(1000, 1500, 800, 'rgba(34,211,238,.18)'); glow(900, 300, 500, 'rgba(196,181,253,.12)');
  const display = '"Space Grotesk", Inter, sans-serif', body = 'Inter, system-ui, sans-serif';
  x.fillStyle = '#C4B5FD'; x.font = `600 30px ${body}`; x.letterSpacing = '8px'; x.fillText('NIGHTSHELF', 80, 140); x.letterSpacing = '0px';
  x.fillStyle = '#F4F1FA'; x.font = `700 136px ${display}`; x.fillText(st.all ? 'Mein Regal' : `Mein ${year}`, 72, 300);
  x.fillStyle = '#B8AECD'; x.font = `500 38px ${body}`; x.fillText(st.all ? 'Alles, was ich je gespielt und geschaut habe' : 'Mein Jahr in Spielen, Serien & Anime', 80, 370);
  const games = Store.all('game'), hrs = games.reduce((a, g) => a + (hoursOf(g) || 0), 0);
  const by = t => st.finished.filter(i => i.type === t).length;
  let tiles = [
    ['Platin', st.tierCount.platinum, '#22D3EE'],
    ['Trophäen', st.trophies.length, '#E9BE58'],
    ['Spiele fertig', by('game'), '#F4F1FA'],
    ['Folgen gesehen', st.episodes, '#F4F1FA'],
    ['Serien & Anime fertig', by('series') + by('anime'), '#F4F1FA'],
    ['Filme gesehen', by('movie'), '#F4F1FA'],
    ['Manga-Kapitel', Math.round(st.chapters), '#F4F1FA'],
    ...(st.all && hrs ? [['Stunden gespielt', Math.round(hrs), '#C4B5FD']] : []),
  ].filter(t => t[1] > 0).slice(0, 6);
  const tw = (W - 160 - 30) / 2, th = 190;
  const hi = st.rated.slice(0, 3);
  const cw = (W - 160 - 2 * 30) / 3, ch = cw * 1.4;
  let plat = st.plats[0];
  // Inhalt vertikal mittig zwischen Kopf und Fuß; wird es zu voll, fällt erst die Platin-Box, dann zwei Kacheln weg
  const top = 440, bottom = H - 170;
  const heights = () => [Math.ceil(tiles.length / 2) * (th + 30), hi.length ? 40 + ch + 130 : 0, plat ? 160 : 0];
  for (let guard = 0; guard < 3; guard++) {
    const [a, b, cc] = heights();
    if (a + b + cc <= bottom - top) break;
    if (plat) plat = null; else if (tiles.length > 4) tiles = tiles.slice(0, 4); else break;
  }
  const [tilesH, hiH, platH] = heights();
  let y = top + Math.max(0, (bottom - top - (tilesH + hiH + platH)) / 2);
  tiles.forEach(([label, val, col], i) => {
    const full = i === tiles.length - 1 && tiles.length % 2 === 1;
    const tx = 80 + (full ? 0 : (i % 2) * (tw + 30)), ty = y + Math.floor(i / 2) * (th + 30), w = full ? W - 160 : tw;
    const isPlat = label === 'Platin';
    rr(x, tx, ty, w, th, 36); x.fillStyle = isPlat ? 'rgba(34,211,238,.10)' : 'rgba(26,21,38,.85)'; x.fill();
    x.strokeStyle = isPlat ? 'rgba(34,211,238,.45)' : 'rgba(255,255,255,.08)'; x.lineWidth = 2; x.stroke();
    x.fillStyle = col; x.font = `700 84px ${display}`; x.fillText(val.toLocaleString('de-AT'), tx + 40, ty + 108);
    x.fillStyle = '#B8AECD'; x.font = `500 31px ${body}`; x.fillText(label, tx + 42, ty + 158);
  });
  y += tilesH + (tiles.length ? 10 : 0);
  if (hi.length) {
    y += 30;
    x.fillStyle = '#F4F1FA'; x.font = `700 48px ${display}`; x.fillText(st.all ? 'Meine Favoriten' : 'Highlights', 80, y); y += 40;
    const rowW = hi.length * cw + (hi.length - 1) * 30, ox = 80 + (W - 160 - rowW) / 2;
    const imgs = await Promise.all(hi.map(i => loadImg(i.cover)));
    hi.forEach((it, i) => {
      const cx = ox + i * (cw + 30);
      x.save(); rr(x, cx, y, cw, ch, 28); x.clip();
      const g = x.createLinearGradient(cx, y, cx + cw, y + ch); g.addColorStop(0, '#4c2c8a'); g.addColorStop(1, '#140c22'); x.fillStyle = g; x.fillRect(cx, y, cw, ch);
      const im = imgs[i];
      if (im) { const sc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight); const w = im.naturalWidth * sc, h = im.naturalHeight * sc; x.drawImage(im, cx + (cw - w) / 2, y + (ch - h) / 2, w, h); }
      else { x.fillStyle = 'rgba(255,255,255,.9)'; x.font = `700 70px ${display}`; x.fillText(initials(it.title), cx + 28, y + ch - 50); }
      x.restore();
      x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 2; rr(x, cx, y, cw, ch, 28); x.stroke();
      x.fillStyle = '#F4F1FA'; x.font = `600 30px ${body}`; x.fillText(fitText(x, it.title, cw), cx, y + ch + 46);
      x.fillStyle = '#C4B5FD'; x.font = `500 28px ${body}`; x.fillText('★'.repeat(it.rating || 0), cx, y + ch + 86);
    });
    y += ch + 120;
  }
  if (plat) {
    rr(x, 80, y, W - 160, 130, 32); x.fillStyle = 'rgba(26,21,38,.85)'; x.fill(); x.strokeStyle = 'rgba(34,211,238,.35)'; x.lineWidth = 2; x.stroke();
    x.fillStyle = '#22D3EE'; x.font = `600 28px ${body}`; x.fillText(st.all ? 'Letzte Platin' : `Platin #${plat.n}`, 120, y + 52);
    x.fillStyle = '#F4F1FA'; x.font = `600 38px ${body}`; x.fillText(fitText(x, plat.g.title, W - 240), 120, y + 100);
  }
  x.fillStyle = '#7D7296'; x.font = `500 28px ${body}`; x.fillText('mark-stessl.github.io/nightshelf', 80, H - 80);
  x.textAlign = 'right'; x.fillText(new Date().toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' }), W - 80, H - 80); x.textAlign = 'left';
  return c;
}

function ShareYear({ st, year, close }) {
  const [res, setRes] = useState(null); // { url, file, name } | 'error'
  useEffect(() => {
    let url;
    (async () => {
      const canvas = await makeYearCard(st, year);
      let blob; try { blob = await new Promise(r => canvas.toBlob(r, 'image/png')); } catch { blob = null; }
      if (!blob) { setRes('error'); return; }
      url = URL.createObjectURL(blob);
      const name = `nightshelf-${st.all ? 'rueckblick' : year}.png`;
      setRes({ url, name, file: new File([blob], name, { type: 'image/png' }) });
    })();
    return () => url && setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);
  const ok = res && res !== 'error';
  const canShare = ok && navigator.canShare && navigator.canShare({ files: [res.file] });
  const save = () => { const a = document.createElement('a'); a.href = res.url; a.download = res.name; document.body.appendChild(a); a.click(); a.remove(); };
  return (
    <ModalFrame title={st.all ? 'Rückblick teilen' : `Dein ${year} teilen`} close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Schließen</button><button className="btn" disabled={!ok} onClick={save}>{I.download} Speichern</button>
        {(!ok || canShare) && <button className="btn btn-primary" disabled={!canShare} onClick={() => navigator.share({ files: [res.file], title: 'Nightshelf' }).catch(() => {})}>{I.share} Teilen</button>}</>}>
      <div className="share-prev">{!res ? <div className="tiny">Bild wird erstellt…</div> : res === 'error' ? <div className="tiny">Das Bild konnte nicht erstellt werden.</div> : <img src={res.url} alt="Jahresrückblick" />}</div>
    </ModalFrame>
  );
}

const PLAT_SHOW = 5;

function PlayStats() {
  const games = Store.all('game').filter(g => g.status !== 'planned');
  const withH = games.filter(g => hoursOf(g) > 0).sort((a, b) => hoursOf(b) - hoursOf(a));
  if (!withH.length) return null;
  const total = withH.reduce((a, g) => a + hoursOf(g), 0), missing = games.length - withH.length;
  const src = k => withH.filter(g => g.playH == null && g.playSrc === k).reduce((a, g) => a + g.playMin / 60, 0);
  const manual = withH.filter(g => g.playH != null).reduce((a, g) => a + g.playH, 0);
  const top = withH.slice(0, 5), max = hoursOf(top[0]);
  return (
    <section className="section"><h2 className="section-title">Spielzeit<span className="tiny" style={{ fontFamily: 'var(--font)' }}>insgesamt, nicht nach Jahren</span></h2>
      <div className="panel play-stats">
        <div className="play-total"><div className="stat-value">{fmtHours(total)}</div><div className="stat-hint">in {withH.length} {withH.length === 1 ? 'Spiel' : 'Spielen'}{missing ? ` · ${missing} ${missing === 1 ? 'Spiel' : 'Spiele'} ohne Spielzeit` : ''}</div>
          <div className="play-split">{[['Steam', src('steam')], ['PlayStation', src('psn')], ['Selbst eingetragen', manual]].filter(x => x[1] > 0).map(([l, v]) => <span key={l}><b>{fmtHours(v)}</b> {l}</span>)}</div></div>
        <div className="play-bars">{top.map(g => <a key={g.id} className="play-bar" href={`#/item/${g.id}`}><span className="n">{g.title}</span><i style={{ width: `${Math.max(4, hoursOf(g) / max * 100)}%` }} /><span className="v">{fmtHours(hoursOf(g))}</span></a>)}</div>
      </div></section>
  );
}

export function Stats({ animate }) {
  const { year } = statsState.use();
  const st = collectStats(year);
  const cur = !st.all && !st.years.includes(year) ? st.years[0] : year;
  if (cur !== year) setTimeout(() => statsState.set({ year: cur }), 0);
  const period = st.all ? 'insgesamt' : `in ${cur}`;
  const byType = t => st.finished.filter(i => i.type === t).length;
  const [platOpen, setPlatOpen] = useState(false);
  const share = () => openModal(close => <ShareYear st={st} year={cur} close={close} />);
  const fin = [['game', 'Spiel', 'Spiele'], ['series', 'Serie', 'Serien'], ['anime', 'Anime', 'Anime'], ['manga', 'Manga', 'Manga'], ['movie', 'Film', 'Filme']].filter(([t]) => byType(t)).map(([t, one, many]) => `${byType(t)} ${byType(t) === 1 ? one : many}`).join(' · ');

  return (
    <div className={animate ? 'fade-in' : ''}>
      <div className="page-head"><div><h1 className="page-title">{st.all ? 'Statistik' : `Dein ${cur}`}</h1><p className="page-sub">{st.all ? 'Alles, was du je gespielt und geschaut hast' : 'Dein Jahresrückblick'}</p></div>
        <div className="head-actions flex gap-2"><button className="btn btn-primary" onClick={share}>{I.share} {st.all ? 'Rückblick teilen' : `${cur} teilen`}</button></div></div>
      <div className="chips year-chips">{st.years.map(y => <button key={y} className={cn('chip', cur === y && 'on')} onClick={() => statsState.set({ year: y })}>{y}</button>)}<button className={cn('chip', st.all && 'on')} onClick={() => statsState.set({ year: 'all' })}>Gesamt</button></div>

      <div className="tally">
        <div><b>{st.trophies.length.toLocaleString("de-AT")}</b><span className="tl-label">{I.trophy} Trophäen {period}</span><small>{["platinum", "gold", "silver", "bronze"].filter(t => st.tierCount[t]).map(t => `${st.tierCount[t]} ${Trophies.TIERS[t].label}`).join(" · ")}</small></div>
        <div><b style={{ color: "var(--platinum)" }}>{st.tierCount.platinum}</b><span className="tl-label"><TrophyIcon tier="platinum" size={14} /> Platin</span><small>{st.allPlats} insgesamt</small></div>
        <div><b>{st.finished.length}</b><span className="tl-label">{I.check} Abgeschlossen</span><small>{fin || "noch nichts mit Datum"}</small></div>
        {!st.episodes && st.chapters ? <div><b>{Math.round(st.chapters).toLocaleString("de-AT")}</b><span className="tl-label">{I.book} Kapitel gelesen</span><small>Manga</small></div>
        : <div><b>{st.episodes.toLocaleString("de-AT")}</b><span className="tl-label">{I.tv} Folgen gesehen</span><small>{st.chapters ? `dazu ${Math.round(st.chapters).toLocaleString("de-AT")} Manga-Kapitel` : st.episodes ? "Serien und Anime" : "Gezählt wird jede Folge, die du abhakst"}</small></div>}
      </div>

      <section className="section"><h2 className="section-title">Trophäen {st.all ? 'pro Jahr' : 'pro Monat'}{st.busiest.b && <span className="tiny" style={{ fontFamily: 'var(--font)' }}>Stärkster {st.all ? 'Jahrgang' : 'Monat'}: {st.busiest.b.long} mit {st.busiest.n} {st.busiest.n === 1 ? 'Trophäe' : 'Trophäen'}</span>}</h2>
        <div className="panel chart-panel">{st.trophies.length ? <StackedChart st={st} /> : <div className="list-empty">In diesem Zeitraum hast du noch keine Trophäen mit Datum.</div>}</div></section>

      <div className="two-col section">
        <div><h2 className="section-title">Platin-Chronik{st.plats.length > PLAT_SHOW && <span className="tiny" style={{ fontFamily: 'var(--font)' }}>{st.plats.length} Platin</span>}</h2>
          <div className={cn('list-card plat-chron', platOpen && 'open')}>{st.plats.length ? st.plats.map(({ t, g, n }, idx) => (
            <a key={g.id + n} className={cn('list-row', idx >= PLAT_SHOW && 'plat-extra')} href={`#/item/${g.id}`}><div className="plat-n">#{n}</div><CoverBox item={g} noTitle className="thumb" />
              <div className="grow"><div className="title">{g.title}</div><div className="sub">{t.name} · {fmtDate(t.doneAt)}</div></div></a>))
            : <div className="list-empty">Keine Platin-Trophäe in diesem Zeitraum.</div>}
            {st.plats.length > PLAT_SHOW && <button type="button" className="plat-more" onClick={() => setPlatOpen(o => !o)}>{platOpen ? 'Weniger anzeigen' : `Alle ${st.plats.length} anzeigen`}</button>}
          </div></div>
        <div><h2 className="section-title">Seltenste Trophäen</h2><div className="list-card">{st.rare.length ? st.rare.map(({ t, g }) => (
          <a key={g.id + t.id} className="list-row" href={`#/item/${g.id}`}><div className="tbadge"><TrophyIcon tier={t.tier} /></div><div className="grow"><div className="title">{t.name}</div><div className="sub">{g.title}</div></div><b className="rare-pct">{String(t.rarity).replace('.', ',')} %</b></a>))
          : <div className="list-empty">Seltenheit gibt es nur für Trophäen von PlayStation oder eingefügte Listen.</div>}</div></div>
      </div>

      <PlayStats />

      <section className="section"><h2 className="section-title">Abgeschlossen {period}</h2><div className="list-card">{st.finished.length ? st.finished.slice(0, 30).map(i => (
        <a key={i.id} className="list-row fin-row" href={`#/item/${i.id}`}><CoverBox item={i} noTitle className="thumb" />
          <div className="grow"><div className="title">{i.title}</div><div className="sub">{TYPES[i.type].label} · {fmtDate(i.finishedAt)}</div>{i.notes && <div className="fin-note">{i.notes}</div>}</div>
          {i.rating > 0 && <span className="fin-stars" title={`${i.rating} von 5`}>{'★'.repeat(i.rating)}<i>{'★'.repeat(5 - i.rating)}</i></span>}</a>))
        : <div className="list-empty">Noch nichts mit Datum. Wenn du etwas auf „Durchgespielt“, „Fertig geschaut“ oder „Gesehen“ setzt, wird das Datum gespeichert.</div>}</div>
        {st.undatedFinished > 0 && <p className="tiny mt-2">{st.undatedFinished} abgeschlossene Einträge haben kein Datum und fehlen deshalb in den Jahren.</p>}</section>
    </div>
  );
}

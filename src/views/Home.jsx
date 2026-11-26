/* Nightshelf – Übersicht: zuerst, was gerade läuft, dann Neues und die Sammlung */
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import { toast } from '../lib/bus.js';
import {
  ORDER_TYPES, TYPES, allTrophyStats, currentSeason, episodesBehind, fmtCh, fmtWhen, mangaBehind, newCount, newItems, plusOne, plusOneLabel, recentTrophies, upcomingEntries,
} from '../lib/util.js';
import { I, TrophyIcon, typeIcon } from '../components/icons.jsx';
import { CoverBox } from '../components/Cover.jsx';
import { NewRow, ShelfWall, TrophyListRow, UpcomingRow } from '../components/items.jsx';
import { Msg } from '../components/ui.jsx';
import { lsGet } from '../lib/util.js';
import { openItemForm } from '../dialogs/ItemForm.jsx';
import { addPicker } from '../dialogs/misc.jsx';

const Cyan = ({ children }) => <span style={{ color: 'var(--cyan)' }}>{children}</span>;

function activeSub(i) {
  if (i.type === 'game') { if (!i.trophies?.length) return i.platform || 'Spiel'; const p = Trophies.progress(i.trophies); return `${p.done}/${p.total} Trophäen`; }
  if (i.type === 'manga') { const b = mangaBehind(i); return <>Kapitel {fmtCh(i.chaptersRead || 0)}/{i.chapters ? fmtCh(i.chapters) : '?'}{b > 0 && <> · <Cyan>{fmtCh(b)} neu</Cyan></>}</>; }
  if (i.type === 'series' && !i.seasonList?.some(x => x.episodes)) return i.seasons ? `Staffel ${i.seasonSeen || 0}/${i.seasons}` : 'Serie';
  const cur = currentSeason(i), n = episodesBehind(i);
  return <>{i.seasonList?.length > 1 ? `${cur.label} · ` : ''}Folge {cur.seen || 0}/{cur.episodes || '?'}{n > 0 && <> · <Cyan>{n} neu</Cyan></>}</>;
}

/* Große Kachel für „Gerade dabei“: Cover, Stand und ein Tipp für die nächste Folge oder das nächste Kapitel */
function NowItem({ item }) {
  const what = plusOneLabel(item);
  const bump = () => {
    const x = plusOne(item);
    const it = Store.get(item.id);
    toast(<Msg title={what === 'Kapitel' ? `Kapitel ${fmtCh(it.chaptersRead)} gelesen` : `${x?.label ? `${x.label} · ` : ''}Folge ${x?.seen} gesehen`} sub={item.title} />);
  };
  return (
    <div className="now-item">
      <a href={`#/item/${item.id}`} aria-label={item.title}>
        <CoverBox item={item}>{newCount(item) > 0 && <div className="cover-new">+{newCount(item) > 99 ? '99' : fmtCh(newCount(item))}</div>}</CoverBox>
      </a>
      <a className="now-title" href={`#/item/${item.id}`}>{item.title}</a>
      <div className="now-sub">{activeSub(item)}</div>
      {what && <button className="btn btn-sm now-plus" onClick={bump} aria-label={`Eine ${what} weiter bei ${item.title}`}>{I.plus} {what}</button>}
    </div>
  );
}

export function Home({ animate }) {
  const all = Store.all();
  const s = allTrophyStats();
  const hour = new Date().getHours();
  const greet = `${hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend'} Mark`;
  const fade = animate ? 'fade-in' : '';

  if (!all.length) return (
    <div className={fade}>
      <div className="page-head"><div><h1 className="page-title">{greet}</h1><p className="page-sub">Dein Regal ist noch leer. Womit fangen wir an?</p></div></div>
      <div className="stats">{ORDER_TYPES.map(t => (
        <button key={t} className="stat text-left cursor-pointer text-inherit" onClick={() => openItemForm(t)}>
          <div className="stat-label"><span className="contents [&>svg]:size-[18px]">{typeIcon(t)}</span> {TYPES[t].plural}</div>
          <div className="stat-value text-xl mt-2.5">{TYPES[t].label} hinzufügen</div>
          <div className="stat-hint">{{ game: 'Mit Trophäen zum Abhaken', series: 'Mit Staffel-Fortschritt', manga: 'Kapitel zählen sich selbst hoch', anime: 'Mit allen Staffeln', movie: 'Mit Bewertung' }[t]}</div>
        </button>))}
      </div>
    </div>
  );

  // Mit neuen Folgen/Kapiteln zuerst, dann der Rest, was gerade läuft
  const running = all.filter(i => i.status === 'active' && i.type !== 'movie');
  const active = [...running.filter(i => newCount(i) > 0), ...running.filter(i => !(newCount(i) > 0))].slice(0, 12);
  const recent = recentTrophies(5);
  const fresh = newItems().slice(0, 5);
  const up = upcomingEntries().filter((u, i, list) => list.findIndex(o => o.it.id === u.it.id) === i).slice(0, 5);
  const latest = [...all].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 14);
  const counts = ORDER_TYPES.map(t => [t, Store.all(t).length]).filter(([, n]) => n);
  const one = { game: 'Spiel', series: 'Serie', anime: 'Anime', manga: 'Manga', movie: 'Film' };

  return (
    <div className={fade}>
      <div className="page-head"><div><h1 className="page-title">{greet}</h1>
        <p className="page-sub home-tally">{counts.map(([t, n], i) => <span key={t}>{i > 0 && <i aria-hidden="true">·</i>}<a href={`#/${TYPES[t].route}`}>{n} {n === 1 ? one[t] : TYPES[t].plural}</a></span>)}</p>
        <p className="home-level"><a href="#/trophies">Trophäen-Level <b>{s.level.level}</b></a><i aria-hidden="true">·</i><a href="#/trophies"><TrophyIcon tier="platinum" size={14} /> {s.counts.platinum} Platin</a><i aria-hidden="true">·</i><span>{s.earned} von {s.total} Trophäen</span></p></div>
        <div className="head-actions flex gap-2"><button className="btn btn-primary" onClick={addPicker}>{I.plus} Hinzufügen</button></div></div>

      <section className="section"><h2 className="section-title">Gerade dabei</h2>
        {active.length ? <div className="now-row">{active.map(i => <NowItem key={i.id} item={i} />)}</div>
          : <div className="list-card"><div className="list-empty">Nichts in Arbeit. Setz bei einem Spiel oder einer Serie den Status auf „Am Spielen“ oder „Am Schauen“.</div></div>}</section>

      <div className="two-col section">
        <div>
          {fresh.length > 0 && <div className="mb-8"><h2 className="section-title">Neu für dich <a href="#/upcoming">Alle</a></h2><div className="list-card">{fresh.map(it => <NewRow key={it.id} it={it} />)}</div></div>}
          <h2 className="section-title">Zuletzt verdient <a href="#/trophies">Alle</a></h2><div className="list-card">{recent.length ? recent.map(({ t, g }) => <TrophyListRow key={g.id + t.id} t={t} g={g} />)
            : <div className="list-empty">Hake Trophäen in einem Spiel ab, dann erscheinen sie hier.</div>}</div>
        </div>
        <div><h2 className="section-title">Demnächst <a href="#/upcoming">Kalender</a></h2><div className="list-card">{up.length ? up.map(u => <UpcomingRow key={u.it.id + u.at} u={u} prefix={fmtWhen(u.at, true).replace(/^am /, '')} />) : <div className="list-empty">Gerade nichts angekündigt.</div>}</div></div>
      </div>

      <section className="section"><h2 className="section-title">Zuletzt ins Regal <a href={`#/${lsGet('nightshelf.shelf', 'games')}`}>Zum Regal</a></h2>
        <ShelfWall items={latest} /></section>
    </div>
  );
}

/* Nightshelf – Übersicht */
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import {
  ORDER_TYPES, TYPES, allTrophyStats, currentSeason, episodesBehind, fmtCh, fmtWhen, mangaBehind, newCount, newItems, recentTrophies, upcomingEntries,
} from '../lib/util.js';
import { I, TrophyIcon, typeIcon } from '../components/icons.jsx';
import { Card, ListRow, NewRow, TrophyListRow, UpcomingRow } from '../components/items.jsx';
import { openItemForm } from '../dialogs/ItemForm.jsx';
import { addPicker } from '../dialogs/misc.jsx';

const Cyan = ({ children }) => <span style={{ color: 'var(--cyan)' }}>{children}</span>;

function activeSub(i) {
  let sub = TYPES[i.type].label;
  if (i.type === 'game' && i.trophies?.length) { const p = Trophies.progress(i.trophies); sub += ` · ${p.done}/${p.total} Trophäen`; }
  if (i.type === 'series' && i.seasons) sub += ` · Staffel ${i.seasonSeen || 0}/${i.seasons}`;
  if (i.type === 'manga') { const b = mangaBehind(i); return <>Manga · Kapitel {fmtCh(i.chaptersRead || 0)}/{i.chapters ? fmtCh(i.chapters) : '?'}{b > 0 && <> · <Cyan>{fmtCh(b)} neu</Cyan></>}</>; }
  if (['anime', 'series'].includes(i.type) && i.seasonList?.some(x => x.episodes)) { const cur = currentSeason(i); const n = episodesBehind(i); return <>{TYPES[i.type].label} · {cur.label} · Folge {cur.seen || 0}/{cur.episodes || '?'}{n > 0 && <> · <Cyan>{n} neu</Cyan></>}</>; }
  if (i.type === 'anime' && i.seasonList?.length > 1) { const cur = currentSeason(i); sub += ` · ${cur.label} · Folge ${cur.seen || 0}/${cur.episodes || '?'}`; }
  else if (i.type === 'anime' && i.episodes) sub += ` · Folge ${i.episodesSeen || 0}/${i.episodes}`;
  return sub;
}

export function Home({ animate }) {
  const games = Store.all('game'), series = Store.all('series'), movies = Store.all('movie'), animes = Store.all('anime'), mangas = Store.all('manga');
  const s = allTrophyStats();
  const total = games.length + series.length + movies.length + animes.length + mangas.length;
  const hour = new Date().getHours();
  const greet = `${hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend'} Mark`;
  const fade = animate ? 'fade-in' : '';

  if (!total) return (
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

  const active = [...mangas, ...series, ...animes].filter(i => i.status === 'active' && newCount(i) > 0)
    .concat([...games, ...series, ...animes, ...mangas].filter(i => i.status === 'active' && !(newCount(i) > 0))).slice(0, 6);
  const recent = recentTrophies();
  const fresh = newItems().slice(0, 5);
  const up = upcomingEntries().filter((u, i, all) => all.findIndex(o => o.it.id === u.it.id) === i).slice(0, 5);
  const activeManga = mangas.filter(m => m.status === 'active' && mangaBehind(m) > 0).length;

  return (
    <div className={fade}>
      <div className="page-head"><div><h1 className="page-title">{greet}</h1><p className="page-sub">{total} Einträge in deinem Regal</p></div>
        <div className="head-actions flex gap-2 flex-wrap"><a className="btn" href="#/upcoming">{I.calendar} Demnächst</a><a className="btn" href="#/stats">{I.chart} Statistik</a><button className="btn btn-primary" onClick={addPicker}>{I.plus} Hinzufügen</button></div></div>
      <div className="stats home-stats">
        <a className="stat feature" href="#/trophies"><div className="stat-label">{I.trophy} Trophäen-Level</div><div className="stat-value">{s.level.level}</div><div className="bar mt-2"><i style={{ width: `${s.level.pct}%` }} /></div><div className="stat-hint mt-1.5">{s.earned} von {s.total} Trophäen</div></a>
        <a className="stat" href="#/trophies"><div className="stat-label"><TrophyIcon tier="platinum" size={16} /> Platin</div><div className="stat-value" style={{ color: 'var(--platinum)' }}>{s.counts.platinum}</div><div className="stat-hint">{games.filter(g => g.status === 'done').length} Spiele durchgespielt</div></a>
        <a className="stat" href="#/games"><div className="stat-label">{I.game} Spiele</div><div className="stat-value">{games.length}</div><div className="stat-hint">{games.filter(g => g.status === 'active').length} am Spielen</div></a>
        <a className="stat" href="#/series"><div className="stat-label">{I.tv} Serien</div><div className="stat-value">{series.length}</div><div className="stat-hint">{series.filter(g => g.status === 'done').length} fertig geschaut</div></a>
        <a className="stat" href="#/manga"><div className="stat-label">{I.book} Manga</div><div className="stat-value">{mangas.length}</div><div className="stat-hint">{activeManga ? `${activeManga} mit neuen Kapiteln` : `${mangas.filter(m => m.status === 'active').length} am Lesen`}</div></a>
        <a className="stat" href="#/anime"><div className="stat-label">{I.anime} Anime</div><div className="stat-value">{animes.length}</div><div className="stat-hint">{animes.filter(g => g.status === 'done').length} fertig geschaut</div></a>
        <a className="stat" href="#/movies"><div className="stat-label">{I.film} Filme</div><div className="stat-value">{movies.length}</div><div className="stat-hint">{movies.filter(g => g.status === 'done').length} gesehen</div></a>
      </div>
      <div className="two-col section">
        <div><h2 className="section-title">Gerade dabei</h2><div className="list-card">{active.length ? active.map(i => <ListRow key={i.id} item={i} sub={activeSub(i)} />)
          : <div className="list-empty">Nichts in Arbeit. Setz bei einem Spiel oder einer Serie den Status auf „Am Spielen“ oder „Am Schauen“.</div>}</div></div>
        <div><h2 className="section-title">Zuletzt verdient <a href="#/trophies">Alle</a></h2><div className="list-card">{recent.length ? recent.map(({ t, g }) => <TrophyListRow key={g.id + t.id} t={t} g={g} />)
          : <div className="list-empty">Hake Trophäen in einem Spiel ab, dann erscheinen sie hier.</div>}</div></div>
      </div>
      {(fresh.length > 0 || up.length > 0) && <div className="two-col section">
        <div><h2 className="section-title">Neu für dich <a href="#/upcoming">Alle</a></h2><div className="list-card">{fresh.length ? fresh.map(it => <NewRow key={it.id} it={it} />) : <div className="list-empty">Du bist überall auf dem neuesten Stand.</div>}</div></div>
        <div><h2 className="section-title">Demnächst <a href="#/upcoming">Kalender</a></h2><div className="list-card">{up.length ? up.map(u => <UpcomingRow key={u.it.id + u.at} u={u} prefix={fmtWhen(u.at, true).replace(/^am /, '')} />) : <div className="list-empty">Gerade nichts angekündigt.</div>}</div></div>
      </div>}
      {ORDER_TYPES.map(t => {
        const list = Store.all(t).slice(0, 12);
        return list.length ? <section key={t} className="section"><h2 className="section-title">{TYPES[t].plural} <a href={`#/${TYPES[t].route}`}>Alle ansehen</a></h2><div className="home-row">{list.map(it => <Card key={it.id} item={it} animate={animate} />)}</div></section> : null;
      })}
    </div>
  );
}

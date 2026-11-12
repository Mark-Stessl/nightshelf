/* Nightshelf – Ausstrahlungsdaten: welche Folgen sind erschienen, was kommt als Nächstes.
   Anime über AniList (nextAiringEpisode, airingSchedule), Serien über TVmaze (Episodenliste mit Sendezeit). */
const Airing = (() => {
  const ANILIST = 'https://graphql.anilist.co';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function anilist(query, variables, attempt = 0) {
    const r = await fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 && attempt < 3) { await sleep(Math.min(70, +(r.headers.get('Retry-After') || 60)) * 1000 + 500); return anilist(query, variables, attempt + 1); }
    const j = await r.json().catch(() => null);
    if (!j || (!r.ok && !j.data)) throw new Error('anilist');
    return j.data;
  }
  const alDate = d => d?.year && d?.month && d?.day ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : null;
  const iso = sec => new Date(sec * 1000).toISOString();

  /* Status mehrerer AniList-Einträge: erschienene Folgen, nächste Termine */
  async function anime(ids) {
    const out = new Map();
    const q = `query($ids: [Int], $page: Int) { Page(page: $page, perPage: 50) { media(id_in: $ids, type: ANIME) {
      id status format episodes startDate { year month day }
      nextAiringEpisode { episode airingAt }
      airingSchedule(notYetAired: true, perPage: 6) { nodes { episode airingAt } } } } }`;
    for (let i = 0; i < ids.length; i += 50) {
      const d = await anilist(q, { ids: ids.slice(i, i + 50), page: 1 });
      (d?.Page?.media || []).forEach(m => {
        const next = m.nextAiringEpisode;
        const aired = next ? Math.max(0, next.episode - 1) : m.status === 'FINISHED' ? (m.episodes || null) : m.status === 'NOT_YET_RELEASED' ? 0 : null;
        out.set(m.id, {
          status: m.status, episodes: m.episodes || null, aired,
          start: alDate(m.startDate),
          next: next ? { ep: next.episode, at: iso(next.airingAt) } : null,
          schedule: (m.airingSchedule?.nodes || []).map(n => ({ ep: n.episode, at: iso(n.airingAt) })),
        });
      });
      if (i + 50 < ids.length) await sleep(800);
    }
    return out;
  }

  /* Nachfolger (neue Staffeln/Filme) zu den letzten Staffeln */
  async function animeSequels(ids) {
    const out = new Map();
    const q = `query($ids: [Int]) { Page(perPage: 25) { media(id_in: $ids, type: ANIME) { id relations { edges { relationType node {
      id type format status episodes title { romaji english } startDate { year month day } coverImage { extraLarge large } } } } } } }`;
    for (let i = 0; i < ids.length; i += 25) {
      const d = await anilist(q, { ids: ids.slice(i, i + 25) });
      (d?.Page?.media || []).forEach(m => {
        out.set(m.id, (m.relations?.edges || [])
          .filter(e => e.relationType === 'SEQUEL' && e.node.type === 'ANIME' && ['TV', 'TV_SHORT', 'ONA', 'MOVIE'].includes(e.node.format))
          .map(e => ({ anilistId: e.node.id, title: e.node.title?.english || e.node.title?.romaji, format: e.node.format, episodes: e.node.episodes || null,
            year: e.node.startDate?.year || null, start: alDate(e.node.startDate), airing: e.node.status, cover: e.node.coverImage?.extraLarge || e.node.coverImage?.large || '' })));
      });
      if (i + 25 < ids.length) await sleep(800);
    }
    return out;
  }

  /* Eine Serie von TVmaze: Staffeln mit erschienenen Folgen und kommende Termine */
  async function series(showId) {
    const r = await fetch(`https://api.tvmaze.com/shows/${showId}?embed[]=episodes&embed[]=seasons`);
    if (r.status === 429) { await sleep(3000); return series(showId); }
    if (!r.ok) throw new Error('tvmaze');
    const s = await r.json();
    const now = Date.now();
    const eps = (s._embedded?.episodes || []).filter(e => e.type !== 'insignificant_special');
    const stamp = e => e.airstamp ? Date.parse(e.airstamp) : e.airdate ? Date.parse(e.airdate + 'T20:00:00Z') : NaN;
    const seasons = (s._embedded?.seasons || []).filter(x => x.premiereDate || eps.some(e => e.season === x.number)).map(x => {
      const own = eps.filter(e => e.season === x.number);
      return {
        tvmazeId: x.id, number: x.number, name: x.name || '', premiere: x.premiereDate || null,
        episodes: Math.max(x.episodeOrder || 0, own.length) || null,
        aired: own.filter(e => stamp(e) <= now).length,
        cover: x.image?.original || x.image?.medium || '',
      };
    });
    const upcoming = eps.filter(e => stamp(e) > now).sort((a, b) => stamp(a) - stamp(b)).slice(0, 8)
      .map(e => ({ at: new Date(stamp(e)).toISOString(), season: e.season, ep: e.number, name: e.name || '', dateOnly: !e.airstamp }));
    return { status: s.status, seasons, upcoming };
  }

  return { anime, animeSequels, series, sleep };
})();

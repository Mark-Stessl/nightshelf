/* Nightshelf – automatische Daten: TVmaze (Serien), TMDB (Filme), Wikipedia/Wikidata (Spiele) */
const Lookup = (() => {
  const KEY = 'nightshelf.keys';
  function keys() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function setKeys(k) { try { localStorage.setItem(KEY, JSON.stringify(k)); } catch {} }
  const year = d => (d && /^\d{4}/.test(d)) ? +d.slice(0, 4) : null;
  const strip = html => (html || '').replace(/<[^>]+>/g, '').trim();

  async function getJSON(url, opts) {
    const r = await fetch(url, opts);
    if (r.status === 401 || r.status === 403) throw new Error('key');
    if (!r.ok) throw new Error('http');
    return r.json();
  }

  /* ---------- Serien: TVmaze ---------- */
  async function searchSeries(q) {
    const data = await getJSON(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
    return data.slice(0, 6).map(({ show }) => ({
      source: 'tvmaze', id: show.id, title: show.name,
      year: year(show.premiered), cover: show.image?.original || show.image?.medium || '',
      thumb: show.image?.medium || '', sub: [year(show.premiered), (show.genres || []).slice(0, 2).join(', '), show.network?.name || show.webChannel?.name].filter(Boolean).join(' · '),
    }));
  }
  async function seriesSeasons(showId, fallbackCover = '') {
    const seasons = (await getJSON(`https://api.tvmaze.com/shows/${showId}/seasons`)).filter(x => x.premiereDate);
    const out = [];
    for (const x of seasons) {
      let episodes = x.episodeOrder || null;
      if (!episodes) {
        const eps = await getJSON(`https://api.tvmaze.com/seasons/${x.id}/episodes`).catch(() => []);
        episodes = eps.filter(e => e.type !== 'insignificant_special').length || null;
      }
      out.push({ tvmazeId: x.id, label: `Staffel ${x.number}`, title: x.name || '', episodes, year: year(x.premiereDate), cover: x.image?.original || x.image?.medium || fallbackCover || '', format: 'TV' });
    }
    return out;
  }
  async function detailSeries(hit) {
    const seasonList = await seriesSeasons(hit.id, hit.cover).catch(() => []);
    const show = await getJSON(`https://api.tvmaze.com/shows/${hit.id}`).catch(() => ({}));
    return {
      title: hit.title, year: hit.year, cover: hit.cover, seasonList,
      seasons: seasonList.length || null,
      genres: show.genres || [], released: show.premiered || null,
      summary: strip(show.summary), external: `tvmaze:${hit.id}`,
    };
  }

  /* ---------- Filme: TMDB ---------- */
  function tmdbOpts() {
    const k = (keys().tmdb || '').trim();
    if (!k) return null;
    return k.length > 60
      ? { qs: '', init: { headers: { Authorization: `Bearer ${k}`, accept: 'application/json' } } }
      : { qs: `api_key=${encodeURIComponent(k)}&`, init: {} };
  }
  const tmdbImg = (p, size = 'w500') => p ? `https://image.tmdb.org/t/p/${size}${p}` : '';
  async function searchMovies(q) {
    const o = tmdbOpts(); if (!o) throw new Error('nokey');
    const data = await getJSON(`https://api.themoviedb.org/3/search/movie?${o.qs}language=de-DE&query=${encodeURIComponent(q)}`, o.init);
    return (data.results || []).slice(0, 6).map(m => ({
      source: 'tmdb', id: m.id, title: m.title, year: year(m.release_date),
      cover: tmdbImg(m.poster_path), thumb: tmdbImg(m.poster_path, 'w92'),
      sub: [year(m.release_date), m.original_title !== m.title ? m.original_title : ''].filter(Boolean).join(' · '),
    }));
  }
  async function detailMovie(hit) {
    const o = tmdbOpts();
    const m = await getJSON(`https://api.themoviedb.org/3/movie/${hit.id}?${o.qs}language=de-DE`, o.init).catch(() => ({}));
    return {
      title: hit.title, year: hit.year, cover: hit.cover,
      genres: (m.genres || []).map(g => g.name), runtime: m.runtime || null,
      released: m.release_date || null, summary: m.overview || '', external: `tmdb:${hit.id}`,
    };
  }

  /* ---------- Spiele: Wikipedia + Wikidata (ohne Schlüssel) ---------- */
  const PLATFORM_MAP = [
    [/^playstation 5$/i, 'PS5'], [/^playstation 4$/i, 'PS4'], [/^playstation 3$/i, 'PS3'], [/^playstation 2$/i, 'PS2'], [/^playstation( \(console\))?$/i, 'PS1'],
    [/playstation vita/i, 'PS Vita'], [/playstation portable/i, 'PSP'],
    [/nintendo switch 2/i, 'Switch 2'], [/^nintendo switch$/i, 'Switch'], [/^wii u$/i, 'Wii U'], [/^wii$/i, 'Wii'], [/gamecube/i, 'GameCube'],
    [/nintendo 3ds/i, '3DS'], [/^nintendo ds$/i, 'DS'], [/nintendo 64/i, 'N64'],
    [/xbox series/i, 'Xbox Series'], [/^xbox one$/i, 'Xbox One'], [/^xbox 360$/i, 'Xbox 360'], [/^xbox( \(console\))?$/i, 'Xbox'],
    [/^steam$/i, 'Steam'], [/^(microsoft windows|linux|macos)$/i, 'PC'], [/steam deck/i, 'Steam Deck'], [/^(ios|android)$/i, 'Mobile'],
  ];
  const GENRE_RULES = [
    [/role-playing/i, 'rpg'], [/platform game|platformer/i, 'platformer'], [/shooter/i, 'shooter'], [/racing|kart/i, 'racing'],
    [/sports|football|basketball|golf|tennis/i, 'sports'], [/fighting|beat 'em up/i, 'fighting'], [/strategy|tactics|4x/i, 'strategy'],
    [/puzzle/i, 'puzzle'], [/horror/i, 'horror'], [/sandbox|survival game|city-building|crafting/i, 'sandbox'], [/party/i, 'party'],
    [/simulation|life sim|farming/i, 'sim'], [/adventure|hack and slash|action game|metroidvania|soulslike|stealth/i, 'adventure'],
  ];
  const WIKI = 'https://en.wikipedia.org/w/api.php?format=json&origin=*';
  const WD = 'https://www.wikidata.org/w/api.php?format=json&origin=*';
  const cleanTitle = t => t.replace(/\s*\((?:\d{4} )?video game\)$/i, '').trim();

  async function searchGames(q) {
    const url = `${WIKI}&action=query&generator=search&gsrsearch=${encodeURIComponent(q + ' video game')}&gsrlimit=12&prop=pageimages|description|pageprops&piprop=thumbnail&pithumbsize=600&pilicense=any&ppprop=wikibase_item`;
    const data = await getJSON(url);
    const pages = Object.values(data.query?.pages || {}).sort((a, b) => a.index - b.index);
    return pages
      .filter(p => /video game|\bgame\b/i.test(p.description || '') && !/series|film|novel|character|franchise|album|soundtrack|award|show|esports|tournament|company|developer|engine/i.test(p.description || ''))
      .slice(0, 6)
      .map(p => {
        const y = (p.description || '').match(/(19|20)\d{2}/);
        const img = (p.thumbnail?.source || '').replace(/\?utm_[^]*$/, '');
        return { source: 'wikipedia', id: p.pageid, qid: p.pageprops?.wikibase_item, title: cleanTitle(p.title),
          year: y ? +y[0] : null, cover: img, thumb: img, sub: p.description || '' };
      });
  }
  async function detailGame(hit) {
    const out = { title: hit.title, year: hit.year, cover: hit.cover, platforms: [], genre: 'other', genres: [], released: null, external: `wikidata:${hit.qid || hit.id}` };
    if (!hit.qid) return out;
    const e = await getJSON(`${WD}&action=wbgetentities&ids=${hit.qid}&props=claims`).catch(() => null);
    const c = e?.entities?.[hit.qid]?.claims || {};
    const ids = arr => (arr || []).map(x => x.mainsnak?.datavalue?.value?.id).filter(Boolean);
    const dates = (c.P577 || []).map(x => x.mainsnak?.datavalue?.value?.time).filter(Boolean).sort();
    if (dates[0]) { const d = dates[0].replace(/^\+/, '').slice(0, 10); out.released = d.endsWith('-00-00') ? null : d.replace(/-00$/, '-01'); out.year = +d.slice(0, 4); }
    const pIds = ids(c.P400), gIds = ids(c.P136);
    const all = [...new Set([...pIds, ...gIds])].slice(0, 50);
    if (all.length) {
      const l = await getJSON(`${WD}&action=wbgetentities&ids=${all.join('|')}&props=labels&languages=en&languagefallback=1`).catch(() => null);
      const label = id => l?.entities?.[id]?.labels?.en?.value || '';
      pIds.map(label).forEach(n => { const hitP = PLATFORM_MAP.find(([re]) => re.test(n)); if (hitP && !out.platforms.includes(hitP[1])) out.platforms.push(hitP[1]); });
      out.genres = gIds.map(label).filter(Boolean);
      const g = GENRE_RULES.find(([re]) => out.genres.some(n => re.test(n)));
      if (g) out.genre = g[1];
    }
    return out;
  }

  /* ---------- Anime: AniList (ohne Schlüssel) ---------- */
  const ANILIST = 'https://graphql.anilist.co';
  const AL_FIELDS = 'id title { romaji english } coverImage { extraLarge large } startDate { year month day } episodes genres format description(asHtml: false)';
  let onRateLimit = null;
  async function anilist(query, variables, attempt = 0) {
    const r = await fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 && attempt < 4) {
      const wait = Math.min(90, +(r.headers.get('Retry-After') || 60));
      onRateLimit && onRateLimit(wait);
      await new Promise(res => setTimeout(res, wait * 1000 + 500));
      return anilist(query, variables, attempt + 1);
    }
    const j = await r.json().catch(() => null);
    if (!j || (!r.ok && !j.data)) throw new Error('http');
    return j.data;
  }
  const alDate = d => d?.year ? `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}` : null;
  const FORMAT = { TV: 'TV', TV_SHORT: 'TV kurz', MOVIE: 'Film', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Musik' };
  function alToDetail(m) {
    return {
      title: m.title?.english || m.title?.romaji, year: m.startDate?.year || null,
      cover: m.coverImage?.extraLarge || m.coverImage?.large || '', episodes: m.episodes || null,
      genres: m.genres || [], released: alDate(m.startDate), summary: strip(m.description).replace(/\s+/g, ' ').slice(0, 3000),
      external: `anilist:${m.id}`, anilistId: m.id, format: m.format,
    };
  }
  const REL_SKIP = ['CHARACTER', 'OTHER', 'ADAPTATION', 'SOURCE'];
  const relatedOf = m => (m?.relations?.edges || []).filter(e => e.node.type === 'ANIME' && !REL_SKIP.includes(e.relationType)).map(e => e.node.id);
  async function animeRelatedIds(id) {
    const d = await anilist(`query($id: Int) { Media(id: $id, type: ANIME) { relations { edges { relationType node { id type } } } } }`, { id });
    return relatedOf(d?.Media);
  }
  async function searchAnime(q) {
    const d = await anilist(`query($q: String) { Page(perPage: 6) { media(search: $q, type: ANIME, sort: SEARCH_MATCH) { ${AL_FIELDS} } } }`, { q });
    return (d?.Page?.media || []).map(m => ({
      source: 'anilist', id: m.id, title: m.title?.english || m.title?.romaji, year: m.startDate?.year || null,
      cover: m.coverImage?.extraLarge || '', thumb: m.coverImage?.large || '', raw: m,
      sub: [m.startDate?.year, FORMAT[m.format] || m.format, m.episodes ? `${m.episodes} Folgen` : '', m.title?.english && m.title?.romaji !== m.title.english ? m.title.romaji : ''].filter(Boolean).join(' · '),
    }));
  }
  async function detailAnime(hit) { return alToDetail(hit.raw); }
  async function animeByIds(ids) {
    const out = new Map();
    for (let i = 0; i < ids.length; i += 50) {
      const d = await anilist(`query($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ${AL_FIELDS} } } }`, { ids: ids.slice(i, i + 50) });
      (d?.Page?.media || []).forEach(m => out.set(m.id, alToDetail(m)));
      if (i + 50 < ids.length) await new Promise(r => setTimeout(r, 700));
    }
    return out;
  }

  const SEASON_FORMATS = ['TV', 'TV_SHORT', 'ONA', 'MOVIE'];
  async function animeSeasons(startId) {
    const q = `query($id: Int) { Media(id: $id, type: ANIME) { id title { romaji english } format episodes startDate { year month day } coverImage { extraLarge large }
      relations { edges { relationType node { id type format } } } } }`;
    const cache = new Map();
    const get = async id => {
      if (!cache.has(id)) { cache.set(id, (await anilist(q, { id }))?.Media || null); await new Promise(r => setTimeout(r, 250)); }
      return cache.get(id);
    };
    const link = (m, type) => (m?.relations?.edges || []).find(e => e.relationType === type && e.node.type === 'ANIME' && SEASON_FORMATS.includes(e.node.format))?.node.id;
    let first = await get(startId);
    if (!first) return [];
    for (let i = 0; i < 12; i++) { const prev = link(first, 'PREQUEL'); if (!prev || cache.has(prev)) break; const p = await get(prev); if (!p) break; first = p; }
    const chain = [first];
    for (let i = 0; i < 20; i++) { const next = link(chain[chain.length - 1], 'SEQUEL'); if (!next || chain.some(m => m.id === next)) break; const n = await get(next); if (!n) break; chain.push(n); }
    // Zusätzlich alle Filme, die AniList mit einer Staffel der Reihe verknüpft (Nebengeschichte, Vorgeschichte …)
    const inChain = new Set(chain.map(m => m.id));
    const extraIds = [...new Set(chain.flatMap(m => (m.relations?.edges || [])
      .filter(e => e.node.type === 'ANIME' && e.node.format === 'MOVIE' && !REL_SKIP.includes(e.relationType) && !inChain.has(e.node.id))
      .map(e => e.node.id)))].slice(0, 50);
    let extras = [];
    if (extraIds.length) {
      try {
        const d = await anilist(`query($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { id title { romaji english } format episodes startDate { year month day } coverImage { extraLarge large } } } }`, { ids: extraIds });
        extras = d?.Page?.media || [];
      } catch {}
    }
    const toSeason = m => ({ anilistId: m.id, title: m.title?.english || m.title?.romaji, format: m.format, episodes: m.episodes || null,
      year: m.startDate?.year || null, cover: m.coverImage?.extraLarge || m.coverImage?.large || '', _d: m.startDate });
    const dateKey = x => [x._d?.year || 9999, x._d?.month || 12, x._d?.day || 31].map(n => String(n).padStart(4, '0')).join('-');
    const shows = chain.filter(m => m.format !== 'MOVIE').map(toSeason);
    const movies = [...chain.filter(m => m.format === 'MOVIE'), ...extras].map(toSeason).sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
    shows.forEach((x, i) => { x.label = `Staffel ${i + 1}`; });
    movies.forEach((x, i) => { x.label = `Film${movies.length > 1 ? ' ' + (i + 1) : ''}`; });
    return [...shows, ...movies].map(({ _d, ...x }) => x);
  }

  /* Viele Anime auf einmal zuordnen und zu Reihen (Prequel/Sequel-Ketten) gruppieren */
  const GROUP_FIELDS = 'id title { romaji english } synonyms format episodes genres startDate { year month day } coverImage { extraLarge large } relations { edges { relationType node { id type format } } }';
  function seasonFromMedia(m, label) {
    return { anilistId: m.id, title: m.title?.english || m.title?.romaji, label, format: m.format, episodes: m.episodes || null, year: m.startDate?.year || null, cover: m.coverImage?.extraLarge || m.coverImage?.large || '' };
  }
  const normT = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  async function matchAnimeList(entries, onProgress = () => {}) {
    const media = new Map();
    const matched = new Array(entries.length).fill(null);
    const CHUNK = 8;
    const filterFor = e => e.movie ? ', format: MOVIE'
      : /\bTV\b|Streaming|\bSub\b|\bDub\b|\bEP\d/i.test(e.format || '') ? ', format_in: [TV, TV_SHORT, ONA]'
      : /\b(RLS|OVA|Event)\b/i.test(e.format || '') ? ', format_in: [OVA, SPECIAL, ONA, MOVIE]' : '';
    const searchBatch = async (idxs, withFilter) => {
      for (let i = 0; i < idxs.length; i += CHUNK) {
        const part = idxs.slice(i, i + CHUNK);
        const vars = {}, defs = [], body = [];
        part.forEach((ei, k) => {
          vars['q' + k] = entries[ei].title;
          defs.push(`$q${k}: String`);
          body.push(`a${k}: Page(perPage: 4) { media(search: $q${k}, type: ANIME, sort: SEARCH_MATCH${withFilter ? filterFor(entries[ei]) : ''}) { ${GROUP_FIELDS} } }`);
        });
        let data = null;
        try { data = await anilist(`query(${defs.join(', ')}) { ${body.join(' ')} }`, vars); } catch {}
        part.forEach((ei, k) => {
          const list = data?.['a' + k]?.media || [];
          const want = normT(entries[ei].title);
          const main = m => [m.title?.english, m.title?.romaji].map(normT);
          const names = m => [...main(m), ...(m.synonyms || []).map(normT)];
          const m = list.find(x => main(x).includes(want)) || list.find(x => names(x).includes(want))
            || list.find(x => main(x).some(n => n && (n.startsWith(want) || want.startsWith(n)))) || list[0];
          if (m) { media.set(m.id, m); matched[ei] = m.id; }
        });
        if (withFilter) onProgress({ phase: 'match', done: Math.min(idxs.length, i + CHUNK), total: idxs.length });
        await new Promise(r => setTimeout(r, 400));
      }
    };
    await searchBatch(entries.map((_, i) => i), true);
    const retry = matched.map((m, i) => m ? null : i).filter(i => i !== null);
    if (retry.length) await searchBatch(retry, false);
    const link = (m, type) => (m?.relations?.edges || []).filter(e => e.relationType === type && e.node.type === 'ANIME' && SEASON_FORMATS.includes(e.node.format)).map(e => e.node.id);
    for (let round = 0; round < 20; round++) {
      const missing = new Set();
      media.forEach(m => [...link(m, 'PREQUEL'), ...link(m, 'SEQUEL')].forEach(id => { if (!media.has(id)) missing.add(id); }));
      if (!missing.size) break;
      const ids = [...missing];
      for (let i = 0; i < ids.length; i += 50) {
        let data = null;
        try { data = await anilist(`query($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ${GROUP_FIELDS} } } }`, { ids: ids.slice(i, i + 50) }); } catch {}
        (data?.Page?.media || []).forEach(m => media.set(m.id, m));
        ids.slice(i, i + 50).forEach(id => { if (!media.has(id)) media.set(id, { id, relations: { edges: [] }, missing: true }); });
        await new Promise(r => setTimeout(r, 400));
      }
      onProgress({ phase: 'chains', done: round + 1 });
    }
    const chainOf = id => {
      let first = media.get(id);
      const seen = new Set([id]);
      for (let i = 0; i < 15; i++) { const prev = link(first, 'PREQUEL')[0]; if (!prev || seen.has(prev) || !media.get(prev) || media.get(prev).missing) break; seen.add(prev); first = media.get(prev); }
      const chain = [first];
      for (let i = 0; i < 25; i++) { const next = link(chain[chain.length - 1], 'SEQUEL')[0]; if (!next || chain.some(m => m.id === next) || !media.get(next) || media.get(next).missing) break; chain.push(media.get(next)); }
      let tv = 0, movie = 0;
      return chain.map(m => seasonFromMedia(m, m.format === 'MOVIE' ? `Film${++movie > 1 ? ' ' + movie : ''}` : `Staffel ${++tv}`));
    };
    const groups = new Map();
    matched.forEach((id, i) => {
      if (!id) return;
      const chain = chainOf(id);
      const root = chain[0].anilistId;
      if (!groups.has(root)) groups.set(root, { root, seasons: chain, genres: media.get(root)?.genres || [], entries: [] });
      groups.get(root).entries.push({ entry: entries[i], anilistId: id });
    });

    // Filme, die zu einer anderen Reihe gehören (Nebengeschichte, Fortsetzung …), in diese Reihe holen
    let list = [...groups.values()];
    list.forEach(g => { g.relatedIds = [...new Set(g.seasons.flatMap(sea => relatedOf(media.get(sea.anilistId))))]; });
    list.filter(g => g.seasons.every(x => x.format === 'MOVIE')).forEach(g => {
      const target = list.find(o => o !== g && !o.absorbed && o.seasons.some(x => x.format !== 'MOVIE') && o.seasons.some(x => g.relatedIds.includes(x.anilistId)));
      if (!target) return;
      g.seasons.forEach(sea => { if (!target.seasons.some(x => x.anilistId === sea.anilistId)) target.seasons.push(sea); });
      target.entries.push(...g.entries);
      target.relatedIds = [...new Set([...target.relatedIds, ...g.relatedIds])];
      g.absorbed = true;
    });
    list = list.filter(g => !g.absorbed);

    // Anzeigename: dein frühester Eintrag dieser Reihe (nicht ein Prolog oder Vorgängerfilm)
    const named = g => {
      const sea = g.seasons.find(x => ['TV', 'TV_SHORT'].includes(x.format)) || g.seasons.find(x => g.entries.some(e => e.anilistId === x.anilistId)) || g.seasons[0];
      const own = g.entries.find(e => e.anilistId === sea.anilistId);
      g.title = own ? own.entry.title : (sea.title || g.entries[0].entry.title);
      g.cover = sea.cover || g.seasons[0].cover; g.year = sea.year || g.seasons[0].year; g.mainId = sea.anilistId;
      return g;
    };
    list.forEach(named);

    // Reihen zusammenführen, die AniList nicht verknüpft hat (z. B. "Date A Live" und "Date A Live II")
    const segment = t => normT(String(t).split(/[:!]| - /)[0]);
    const merged = [];
    list.sort((a, b) => segment(a.title).length - segment(b.title).length).forEach(g => {
      const sg = segment(g.title);
      const into = sg.length >= 6 && merged.find(m => { const sm = segment(m.title); return sm.length >= 6 && (sg.startsWith(sm) || sm.startsWith(sg)); });
      if (!into) { merged.push(g); return; }
      g.seasons.forEach(sea => { if (!into.seasons.some(x => x.anilistId === sea.anilistId)) into.seasons.push(sea); });
      into.entries.push(...g.entries);
      into.relatedIds = [...new Set([...(into.relatedIds || []), ...(g.relatedIds || [])])];
      into.genres = [...new Set([...(into.genres || []), ...(g.genres || [])])];
    });
    merged.forEach(g => {
      if (g.seasons.length > 1) {
        g.seasons.sort((a, b) => (a.year || 9999) - (b.year || 9999));
        let tv = 0, movie = 0;
        g.seasons.forEach(sea => { sea.label = sea.format === 'MOVIE' ? `Film${++movie > 1 ? ' ' + movie : ''}` : `Staffel ${++tv}`; });
      }
      named(g);
    });
    return { groups: merged, unmatched: entries.filter((_, i) => !matched[i]) };
  }

  /* ---------- Manga: MangaDex über den eigenen Server ---------- */
  async function workerGet(path) {
    const r = await fetch(PSN.worker() + path, { headers: Sync.header() });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('key');
    if (!r.ok) throw new Error('http');
    return d;
  }
  async function searchManga(q) {
    const d = await workerGet(`/manga/search?q=${encodeURIComponent(q)}`);
    return (d.results || []).map(m => ({
      source: 'mangadex', id: m.id, title: m.title, year: m.year, cover: m.cover, thumb: m.thumb, raw: m,
      sub: [m.kind, m.year, { ongoing: 'laufend', completed: 'abgeschlossen', hiatus: 'pausiert', cancelled: 'eingestellt' }[m.status] || m.status, m.altTitle].filter(Boolean).join(' · '),
    }));
  }
  async function detailManga(hit) {
    const d = await workerGet(`/manga/series?id=${hit.id}`);
    return {
      title: d.title || hit.title, year: d.year, cover: d.cover || hit.cover, genres: d.genres || [], summary: d.summary || '',
      latest: d.latest, completed: d.completed, mdStatus: d.status, lastUpload: d.lastUpload, kind: d.kind, authors: d.authors || [],
      mangadexId: d.id || hit.id, external: `mangadex:${d.id || hit.id}`,
    };
  }

  const SEARCH = { series: searchSeries, movie: searchMovies, game: searchGames, anime: searchAnime, manga: searchManga };
  const DETAIL = { series: detailSeries, movie: detailMovie, game: detailGame, anime: detailAnime, manga: detailManga };
  const NEEDS = { movie: 'tmdb' };

  return {
    keys, setKeys,
    hasKey: type => !NEEDS[type] || !!(keys()[NEEDS[type]] || '').trim(),
    search: (type, q) => SEARCH[type](q),
    detail: (type, hit) => DETAIL[type](hit),
    async test(type) { await SEARCH[type]('star'); return true; },
    animeByIds, animeSeasons, seriesSeasons, matchAnimeList, animeRelatedIds,
    set onRateLimit(fn) { onRateLimit = fn; },
  };
})();

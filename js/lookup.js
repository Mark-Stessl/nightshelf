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
  async function detailSeries(hit) {
    const seasons = await getJSON(`https://api.tvmaze.com/shows/${hit.id}/seasons`).catch(() => []);
    const show = await getJSON(`https://api.tvmaze.com/shows/${hit.id}`).catch(() => ({}));
    return {
      title: hit.title, year: hit.year, cover: hit.cover,
      seasons: seasons.filter(s => s.premiereDate).length || seasons.length || null,
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
    [/^playstation 5$/i, 'PS5'], [/^playstation 4$/i, 'PS4'], [/nintendo switch 2/i, 'Switch 2'], [/^nintendo switch$/i, 'Switch'],
    [/^(microsoft windows|linux|macos|steam)$/i, 'PC'], [/steam deck/i, 'Steam Deck'], [/xbox (series|one)/i, 'Xbox'], [/^(ios|android)$/i, 'Mobile'],
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
  async function anilist(query, variables) {
    const r = await fetch(ANILIST, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (!r.ok) throw new Error('http');
    return (await r.json()).data;
  }
  const alDate = d => d?.year ? `${d.year}-${String(d.month || 1).padStart(2, '0')}-${String(d.day || 1).padStart(2, '0')}` : null;
  const FORMAT = { TV: 'TV', TV_SHORT: 'TV kurz', MOVIE: 'Film', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Musik' };
  function alToDetail(m) {
    return {
      title: m.title?.english || m.title?.romaji, year: m.startDate?.year || null,
      cover: m.coverImage?.extraLarge || m.coverImage?.large || '', episodes: m.episodes || null,
      genres: m.genres || [], released: alDate(m.startDate), summary: strip(m.description).replace(/\s+/g, ' ').slice(0, 900),
      external: `anilist:${m.id}`, anilistId: m.id,
    };
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

  const SEARCH = { series: searchSeries, movie: searchMovies, game: searchGames, anime: searchAnime };
  const DETAIL = { series: detailSeries, movie: detailMovie, game: detailGame, anime: detailAnime };
  const NEEDS = { movie: 'tmdb' };

  return {
    keys, setKeys,
    hasKey: type => !NEEDS[type] || !!(keys()[NEEDS[type]] || '').trim(),
    search: (type, q) => SEARCH[type](q),
    detail: (type, hit) => DETAIL[type](hit),
    async test(type) { await SEARCH[type]('star'); return true; },
    animeByIds,
  };
})();

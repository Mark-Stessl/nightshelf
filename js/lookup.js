/* Nightshelf – automatische Daten: TVmaze (Serien), TMDB (Filme), RAWG (Spiele) */
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

  /* ---------- Spiele: RAWG ---------- */
  const PLATFORM_MAP = [
    [/playstation 5/i, 'PS5'], [/playstation 4/i, 'PS4'], [/nintendo switch 2/i, 'Switch 2'], [/nintendo switch/i, 'Switch'],
    [/^pc$/i, 'PC'], [/xbox/i, 'Xbox'], [/ios|android/i, 'Mobile'],
  ];
  const GENRE_MAP = {
    'role-playing-games-rpg': 'rpg', platformer: 'platformer', shooter: 'shooter', racing: 'racing', sports: 'sports',
    fighting: 'fighting', strategy: 'strategy', puzzle: 'puzzle', simulation: 'sim', family: 'party', casual: 'sim',
    adventure: 'adventure', action: 'adventure', arcade: 'party', board_games: 'party',
  };
  function mapPlatforms(list) {
    const out = [];
    (list || []).forEach(p => { const hit = PLATFORM_MAP.find(([re]) => re.test(p.platform?.name || '')); if (hit && !out.includes(hit[1])) out.push(hit[1]); });
    return out;
  }
  function mapGenre(game) {
    const tags = (game.tags || []).map(t => t.slug);
    if (tags.some(t => /horror/.test(t))) return 'horror';
    if (tags.includes('sandbox') || tags.includes('crafting')) return 'sandbox';
    const slugs = (game.genres || []).map(g => g.slug);
    const order = ['role-playing-games-rpg', 'platformer', 'shooter', 'racing', 'sports', 'fighting', 'strategy', 'puzzle', 'simulation', 'family', 'arcade', 'casual', 'adventure', 'action'];
    const best = order.find(s => slugs.includes(s));
    return best ? GENRE_MAP[best] : 'other';
  }
  async function searchGames(q) {
    const k = (keys().rawg || '').trim(); if (!k) throw new Error('nokey');
    const data = await getJSON(`https://api.rawg.io/api/games?key=${encodeURIComponent(k)}&search=${encodeURIComponent(q)}&page_size=6&search_precise=true`);
    return (data.results || []).map(g => ({
      source: 'rawg', id: g.id, title: g.name, year: year(g.released),
      cover: g.background_image || '', thumb: g.background_image || '', raw: g,
      sub: [year(g.released), mapPlatforms(g.platforms).join(', ')].filter(Boolean).join(' · '),
    }));
  }
  async function detailGame(hit) {
    const g = hit.raw || {};
    return {
      title: hit.title, year: hit.year, cover: hit.cover,
      platforms: mapPlatforms(g.platforms), genre: mapGenre(g),
      genres: (g.genres || []).map(x => x.name), released: g.released || null, external: `rawg:${hit.id}`,
    };
  }

  const SEARCH = { series: searchSeries, movie: searchMovies, game: searchGames };
  const DETAIL = { series: detailSeries, movie: detailMovie, game: detailGame };
  const NEEDS = { movie: 'tmdb', game: 'rawg' };

  return {
    keys, setKeys,
    hasKey: type => !NEEDS[type] || !!(keys()[NEEDS[type]] || '').trim(),
    search: (type, q) => SEARCH[type](q),
    detail: (type, hit) => DETAIL[type](hit),
    async test(type) { await SEARCH[type]('star'); return true; },
  };
})();

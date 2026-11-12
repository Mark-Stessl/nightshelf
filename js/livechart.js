/* Nightshelf – LiveChart-Sync: öffentliche Anime-Liste per Benutzername, ergänzt mit AniList */
const LiveChart = (() => {
  const KEY = 'nightshelf.livechart';
  function state() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(patch) { const s = { ...state(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} return s; }
  const fail = code => { const e = new Error(code); e.code = code; return e; };

  const STATUS = {
    WATCHING: 'active', REWATCHING: 'active', COMPLETED: 'done', PAUSED: 'paused',
    PLANNING: 'planned', CONSIDERING: 'planned', DROPPED: 'dropped', SKIPPING: 'dropped',
  };
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  const anilistId = url => { const m = (url || '').match(/anilist\.co\/anime\/(\d+)/); return m ? +m[1] : null; };

  async function fetchList(username) {
    let res;
    try { res = await fetch(`${PSN.worker()}/livechart?user=${encodeURIComponent(username)}`); }
    catch { throw fail('network'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw fail(data.error || 'error');
    return data.entries || [];
  }

  async function sync({ onProgress } = {}) {
    const { username } = state();
    if (!username) throw fail('no_user');
    onProgress && onProgress(10, 'Lade Liste von LiveChart…');
    const entries = (await fetchList(username)).filter(e => e.anime);
    if (!entries.length) throw fail('empty');

    onProgress && onProgress(35, `${entries.length} Anime gefunden, lade Cover und Folgenzahl…`);
    const ids = [...new Set(entries.map(e => anilistId(e.anime.anilistUrl)).filter(Boolean))];
    let al = new Map();
    try { al = await Lookup.animeByIds(ids); } catch {}

    onProgress && onProgress(80, 'Übernehme in dein Regal…');
    const existing = Store.all('anime');
    const result = { added: 0, updated: 0, total: entries.length };

    entries.forEach(e => {
      const a = e.anime;
      const lcId = String(a.databaseId || e.animeId);
      const extra = al.get(anilistId(a.anilistUrl)) || {};
      const title = a.englishTitle || a.romajiTitle || extra.title || 'Unbekannt';
      const status = STATUS[e.status] || 'planned';
      const rating = e.rating != null ? Math.max(1, Math.min(5, Math.round(e.rating / 2))) : null;
      const episodes = extra.episodes || null;
      let seen = e.episodesWatched || 0;
      if (status === 'done' && episodes && !seen) seen = episodes;

      const item = existing.find(i => i.livechartId === lcId)
        || existing.find(i => [norm(i.title)].some(n => n && (n === norm(a.englishTitle) || n === norm(a.romajiTitle))));

      if (item) {
        const patch = { livechartId: lcId, status, episodesSeen: seen };
        if (rating) patch.rating = rating;
        if (!item.episodes && episodes) patch.episodes = episodes;
        if (!item.cover) patch.cover = extra.cover || a.poster?.url || '';
        if (!item.genres?.length && extra.genres?.length) patch.genres = extra.genres;
        Store.update(item.id, patch);
        result.updated++;
      } else {
        const year = extra.year || (a.startDate?.value ? +a.startDate.value.slice(0, 4) : null);
        const created = Store.add({
          type: 'anime', title, status, rating: rating || 0, notes: '',
          cover: extra.cover || a.poster?.url || '', year, episodes, episodesSeen: seen,
          genres: extra.genres || [], released: extra.released || (a.startDate?.value || '').slice(0, 10) || null,
          summary: extra.summary || '', external: extra.external || `livechart:${lcId}`, livechartId: lcId,
        });
        existing.push(created);
        result.added++;
      }
    });

    save({ lastSync: new Date().toISOString() });
    onProgress && onProgress(100, 'Fertig');
    return result;
  }

  return { state, save, sync };
})();

/*
 * Nightshelf – PlayStation-Zwischenserver (Cloudflare Worker)
 *
 * Leitet Anfragen der Nightshelf-App an die PlayStation-Trophäen-Schnittstelle weiter.
 * Der Worker speichert nichts: Anmelde-Token liegen nur im Browser des Nutzers.
 *
 * Endpunkte:
 *   POST /auth      { npsso }         -> Token-Paar
 *   POST /refresh   { refreshToken }  -> neues Token-Paar
 *   GET  /titles                      -> alle Spiele mit Trophäen-Fortschritt (Bearer-Token)
 *   GET  /trophies?id=&service=       -> Trophäen eines Spiels inkl. Verdient-Status (Bearer-Token)
 *   POST /claim     { keyHash }       -> Server einmalig mit einem persönlichen Schlüssel sichern
 *   GET  /data                        -> gespeicherte Nightshelf-Daten (Schlüssel nötig)
 *   PUT  /data      { items, deleted, baseVersion } -> Daten speichern (Schlüssel nötig)
 *
 * Sobald ein Schlüssel eingerichtet ist, brauchen alle Endpunkte außer / und /claim
 * den Header X-Nightshelf-Key. Gespeichert wird nur der SHA-256-Hash des Schlüssels.
 *   POST /achievements { title, platform, genre, size } -> KI-Trophäenliste (Wikipedia + Workers AI)
 *   GET  /ai-usage                    -> heute verbrauchte Neurons (Schätzung aus Token-Zahlen)
 *   GET  /manga/search?q=             -> Manga-Suche über MangaDex
 *   GET  /manga/series?id=            -> Details + höchstes Kapitel (alle Sprachen)
 *   POST /manga/latest { ids }        -> höchstes Kapitel für bis zu 40 Manga
 */

const ALLOWED_ORIGINS = [
  'https://mark-stessl.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const AUTH_BASE = 'https://ca.account.sony.com/api/authz/v3/oauth';
const CLIENT_ID = '09515159-7237-4370-9b40-3806e67c0891';
const CLIENT_BASIC = 'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=';
const REDIRECT_URI = 'com.scee.psxandroid.scecompcall://redirect';
const SCOPE = 'psn:mobile.v2.core psn:clientapp';
const TROPHY_API = 'https://m.np.playstation.com/api/trophy/v1';
const MD_API = 'https://api.mangadex.org';
const MD_HEADERS = { Accept: 'application/json', 'User-Agent': 'Nightshelf/1.0 (https://mark-stessl.github.io/nightshelf/)' };
const MD_RATINGS = 'contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica';
const mdGet = async path => {
  const r = await fetch(MD_API + path, { headers: MD_HEADERS });
  if (!r.ok) { const e = new Error('md ' + r.status); e.status = 502; e.code = 'md_error'; throw e; }
  return r.json();
};
function mdManga(m) {
  const a = m.attributes || {};
  const pick = obj => obj?.en || obj?.['ja-ro'] || Object.values(obj || {})[0] || '';
  const alt = (a.altTitles || []).map(pick).filter(Boolean);
  const title = a.title?.en || alt.find(t => /^[\x20-\x7E]+$/.test(t)) || pick(a.title);
  const coverRel = (m.relationships || []).find(r => r.type === 'cover_art');
  const file = coverRel?.attributes?.fileName;
  const authors = (m.relationships || []).filter(r => r.type === 'author' && r.attributes?.name).map(r => r.attributes.name);
  const kind = { ja: 'Manga', ko: 'Manhwa', zh: 'Manhua', 'zh-hk': 'Manhua' }[a.originalLanguage] || 'Comic';
  return {
    id: m.id, title, altTitle: alt.find(t => t !== title) || '', kind, year: a.year || null,
    status: a.status || '', completed: a.status === 'completed', lastChapter: a.lastChapter ? parseFloat(a.lastChapter) || null : null,
    cover: file ? `https://uploads.mangadex.org/covers/${m.id}/${file}.512.jpg` : '',
    thumb: file ? `https://uploads.mangadex.org/covers/${m.id}/${file}.256.jpg` : '',
    genres: (a.tags || []).filter(t => t.attributes?.group === 'genre').map(t => t.attributes.name?.en).filter(Boolean).slice(0, 6),
    summary: String(a.description?.en || pick(a.description) || '').replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/[*_#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 3000),
    authors: [...new Set(authors)].slice(0, 3),
  };
}
async function mdLatest(id) {
  const agg = await mdGet(`/manga/${id}/aggregate`);
  const nums = Object.values(agg.volumes || {}).flatMap(v => Object.keys(v.chapters || {})).map(Number).filter(n => Number.isFinite(n));
  return nums.length ? Math.max(...nums) : null;
}
const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const AI_DAILY_LIMIT = 10000;
// Cloudflare-Preisliste: Neurons pro Million Tokens für Llama 3.3 70B fp8-fast
const NEURONS_PER_M_IN = 26668, NEURONS_PER_M_OUT = 204805;
const usageKey = () => `ai:${new Date().toISOString().slice(0, 10)}`;
async function readUsage(env) {
  if (!env?.USAGE) return null;
  return (await env.USAGE.get(usageKey(), 'json')) || { neurons: 0, runs: 0 };
}
async function addUsage(env, neurons, { full = false } = {}) {
  if (!env?.USAGE) return;
  const u = await readUsage(env);
  const next = full ? { ...u, neurons: Math.max(u.neurons, AI_DAILY_LIMIT), full: true } : { ...u, neurons: u.neurons + neurons, runs: u.runs + 1 };
  await env.USAGE.put(usageKey(), JSON.stringify(next), { expirationTtl: 3 * 86400 });
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Nightshelf-Key',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    try {
      if (url.pathname === '/') return json({ ok: true, service: 'nightshelf-psn', claimed: !!(await ownerHash(env)) });

      if (url.pathname === '/claim' && request.method === 'POST') {
        if (!env?.DATA) return json({ error: 'storage_missing' }, 501);
        if (await ownerHash(env)) return json({ error: 'already_claimed' }, 409);
        const { keyHash } = await request.json().catch(() => ({}));
        if (!/^[a-f0-9]{64}$/.test(keyHash || '')) return json({ error: 'key_invalid' }, 400);
        await env.DATA.put('owner', keyHash);
        return json({ ok: true });
      }

      // Ab hier: Schlüssel prüfen, sobald der Server gesichert ist
      const owner = await ownerHash(env);
      if (owner) {
        const given = request.headers.get('X-Nightshelf-Key') || '';
        if (!given || (await sha256(given)) !== owner) return json({ error: 'key_required' }, 403);
      }

      if (url.pathname === '/manga/search') {
        const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
        if (q.length < 2) return json({ results: [] });
        const d = await mdGet(`/manga?limit=8&order[relevance]=desc&includes[]=cover_art&${MD_RATINGS}&title=${encodeURIComponent(q)}`);
        return json({ results: (d.data || []).map(mdManga) });
      }

      if (url.pathname === '/manga/series') {
        const id = url.searchParams.get('id') || '';
        if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'id_invalid' }, 400);
        const [d, latest, feed] = await Promise.all([
          mdGet(`/manga/${id}?includes[]=cover_art&includes[]=author`),
          mdLatest(id),
          mdGet(`/chapter?limit=1&order[readableAt]=desc&manga=${id}&${MD_RATINGS}`).catch(() => ({})),
        ]);
        const m = mdManga(d.data);
        return json({ ...m, latest: Math.max(latest || 0, m.lastChapter || 0) || null, lastUpload: feed.data?.[0]?.attributes?.readableAt || null });
      }

      if (url.pathname === '/manga/latest' && request.method === 'POST') {
        const { ids } = await request.json().catch(() => ({}));
        const list = (Array.isArray(ids) ? ids : []).filter(i => /^[0-9a-f-]{36}$/.test(String(i))).slice(0, 40);
        const out = {};
        let meta = {};
        try {
          const d = await mdGet(`/manga?limit=100&${MD_RATINGS}&contentRating[]=pornographic&${list.map(i => 'ids[]=' + i).join('&')}`);
          (d.data || []).forEach(m => { meta[m.id] = { status: m.attributes.status, lastChapter: parseFloat(m.attributes.lastChapter) || null }; });
        } catch {}
        for (const id of list) {
          try {
            const latest = await mdLatest(id);
            out[id] = { latest: Math.max(latest || 0, meta[id]?.lastChapter || 0) || null, status: meta[id]?.status || '', completed: meta[id]?.status === 'completed' };
          } catch {}
        }
        return json({ series: out });
      }

      if (url.pathname === '/data') {
        if (!env?.DATA) return json({ error: 'storage_missing' }, 501);
        if (!owner) return json({ error: 'not_claimed' }, 403);
        if (request.method === 'GET') {
          const stored = await env.DATA.get('library', 'json');
          return json(stored || { version: 0, items: [], deleted: [], updatedAt: null });
        }
        if (request.method === 'PUT') {
          const body = await request.json().catch(() => null);
          if (!body || !Array.isArray(body.items)) return json({ error: 'body_invalid' }, 400);
          const stored = (await env.DATA.get('library', 'json')) || { version: 0 };
          if ((body.baseVersion ?? -1) !== stored.version) return json({ error: 'conflict', version: stored.version }, 409);
          const next = { version: stored.version + 1, items: body.items, deleted: (body.deleted || []).slice(-5000), updatedAt: new Date().toISOString() };
          const text = JSON.stringify(next);
          if (text.length > 20 * 1024 * 1024) return json({ error: 'too_large' }, 413);
          await env.DATA.put('library', text);
          return json({ ok: true, version: next.version, updatedAt: next.updatedAt });
        }
      }

      if (url.pathname === '/auth' && request.method === 'POST') {
        const { npsso } = await request.json().catch(() => ({}));
        if (!npsso || typeof npsso !== 'string' || npsso.length < 20) return json({ error: 'npsso_missing' }, 400);
        const code = await exchangeNpsso(npsso.trim());
        if (!code) return json({ error: 'npsso_invalid' }, 401);
        return json(await tokenRequest({ code, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code', token_format: 'jwt' }));
      }

      if (url.pathname === '/refresh' && request.method === 'POST') {
        const { refreshToken } = await request.json().catch(() => ({}));
        if (!refreshToken) return json({ error: 'refresh_missing' }, 400);
        return json(await tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token', token_format: 'jwt', scope: SCOPE }));
      }

      if (url.pathname === '/achievements' && request.method === 'POST') {
        if (!env || !env.AI) return json({ error: 'ai_missing' }, 501);
        const body = await request.json().catch(() => ({}));
        const title = String(body.title || '').trim().slice(0, 120);
        if (!title) return json({ error: 'title_missing' }, 400);
        const size = { short: 7, normal: 13, long: 19 }[body.size] || 13;
        const info = await gameInfo(title);
        try {
          const { trophies, neurons } = await aiTrophies(env, { title, platform: String(body.platform || '').slice(0, 30), genre: String(body.genre || '').slice(0, 40), size, info });
          await addUsage(env, neurons).catch(() => {});
          return json({ trophies, source: info ? info.page : null, neurons });
        } catch (e) {
          const msg = String(e.message || e);
          const quota = /neuron|quota|limit|4006|exceeded/i.test(msg);
          if (quota) await addUsage(env, 0, { full: true }).catch(() => {});
          return json({ error: quota ? 'ai_quota' : 'ai_failed', detail: msg.slice(0, 200) }, 503);
        }
      }

      if (url.pathname === '/ai-usage') {
        const u = await readUsage(env);
        if (!u) return json({ error: 'usage_missing' }, 501);
        const reset = new Date(); reset.setUTCHours(24, 0, 0, 0);
        const used = Math.min(AI_DAILY_LIMIT, Math.round(u.neurons));
        return json({ used, limit: AI_DAILY_LIMIT, remaining: AI_DAILY_LIMIT - used, runs: u.runs, avg: u.runs ? Math.round(u.neurons / u.runs) : null, full: !!u.full, resetAt: reset.toISOString() });
      }

      const auth = request.headers.get('Authorization') || '';
      if (!/^Bearer .+/.test(auth)) return json({ error: 'token_missing' }, 401);
      const lang = url.searchParams.get('lang') || 'de-DE';
      const psn = path => psnGet(path, auth, lang);

      if (url.pathname === '/titles') {
        const titles = [];
        let offset = 0, total = Infinity;
        while (offset < total && offset < 5000) {
          const page = await psn(`/users/me/trophyTitles?limit=800&offset=${offset}`);
          (page.trophyTitles || []).forEach(t => titles.push({
            id: t.npCommunicationId,
            service: t.npServiceName,
            name: t.trophyTitleName,
            icon: t.trophyTitleIconUrl,
            platform: t.trophyTitlePlatform,
            progress: t.progress,
            defined: t.definedTrophies,
            earned: t.earnedTrophies,
            updated: t.lastUpdatedDateTime,
          }));
          total = page.totalItemCount ?? titles.length;
          offset += 800;
          if (!(page.trophyTitles || []).length) break;
        }
        return json({ titles });
      }

      if (url.pathname === '/trophies') {
        const id = url.searchParams.get('id');
        const service = url.searchParams.get('service') === 'trophy2' ? 'trophy2' : 'trophy';
        if (!id || !/^[A-Z0-9_]+$/i.test(id)) return json({ error: 'id_invalid' }, 400);
        const q = `trophyGroups/all/trophies?npServiceName=${service}`;
        const [defs, mine] = await Promise.all([
          psn(`/npCommunicationIds/${id}/${q}`),
          psn(`/users/me/npCommunicationIds/${id}/${q}`),
        ]);
        const earned = new Map((mine.trophies || []).map(t => [t.trophyId, t]));
        const trophies = (defs.trophies || []).map(t => {
          const e = earned.get(t.trophyId) || {};
          return {
            id: t.trophyId,
            name: t.trophyName,
            desc: t.trophyDetail,
            type: t.trophyType,
            group: t.trophyGroupId,
            hidden: !!t.trophyHidden,
            icon: t.trophyIconUrl,
            earned: !!e.earned,
            earnedAt: e.earnedDateTime || null,
            rate: e.trophyEarnedRate != null ? parseFloat(e.trophyEarnedRate) : null,
          };
        });
        return json({ trophies });
      }

      return json({ error: 'not_found' }, 404);
    } catch (err) {
      const status = err.status || 500;
      return json({ error: err.code || 'upstream_error', detail: String(err.message || err).slice(0, 200) }, status);
    }
  },
};

async function exchangeNpsso(npsso) {
  const params = new URLSearchParams({
    access_type: 'offline', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPE,
  });
  const res = await fetch(`${AUTH_BASE}/authorize?${params}`, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: 'manual',
  });
  const location = res.headers.get('location') || '';
  const match = location.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function tokenRequest(fields) {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: CLIENT_BASIC },
    body: new URLSearchParams(fields),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || `token ${res.status}`);
    err.status = 401; err.code = 'auth_failed';
    throw err;
  }
  const now = Date.now();
  return {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
    refreshToken: data.refresh_token,
    refreshExpiresAt: now + (data.refresh_token_expires_in || 5184000) * 1000,
  };
}

async function psnGet(path, auth, lang) {
  const res = await fetch(`${TROPHY_API}${path}`, {
    headers: { Authorization: auth, 'Accept-Language': lang, Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) {
    const err = new Error('PSN token rejected'); err.status = 401; err.code = 'token_expired'; throw err;
  }
  if (!res.ok) {
    const err = new Error(`PSN ${res.status}`); err.status = 502; err.code = 'psn_error'; throw err;
  }
  return res.json();
}

/* ---------- KI-Trophäen ---------- */

async function gameInfo(title) {
  const api = 'https://en.wikipedia.org/w/api.php?format=json&action=query&redirects=1';
  const headers = { 'User-Agent': 'Nightshelf/1.0 (https://mark-stessl.github.io/nightshelf/)' };
  try {
    const search = await (await fetch(`${api}&list=search&srlimit=5&srsearch=${encodeURIComponent(title + ' video game')}`, { headers })).json();
    const hit = (search.query?.search || []).find(h => /video game|game\b/i.test(h.snippet || '') || h.title.toLowerCase().includes(title.toLowerCase().slice(0, 8)));
    if (!hit) return null;
    const page = await (await fetch(`${api}&prop=extracts&explaintext=1&exsectionformat=wiki&titles=${encodeURIComponent(hit.title)}`, { headers })).json();
    const text = Object.values(page.query?.pages || {})[0]?.extract || '';
    if (!text) return null;
    const section = name => {
      const m = text.match(new RegExp(`\\n==\\s*${name}\\s*==\\n([\\s\\S]*?)(?=\\n==[^=])`, 'i'));
      return m ? m[1].replace(/\n{2,}/g, '\n').trim() : '';
    };
    const intro = text.split(/\n==/)[0].trim();
    const gameplay = section('Gameplay') || section('Game ?play') || section('Mechanics');
    const synopsis = section('Plot') || section('Synopsis') || section('Story');
    return {
      page: hit.title,
      text: [`INTRO: ${intro.slice(0, 900)}`, gameplay && `GAMEPLAY: ${gameplay.slice(0, 3800)}`, synopsis && `STORY: ${synopsis.slice(0, 1200)}`].filter(Boolean).join('\n\n'),
    };
  } catch { return null; }
}

async function aiTrophies(env, { title, platform, genre, size, info }) {
  const gold = Math.max(2, Math.round(size * 0.18)), silver = Math.max(2, Math.round(size * 0.3));
  const system = `Du entwirfst Trophäenlisten im Stil von PlayStation-Trophäen für Videospiele. Antworte ausschließlich mit JSON.
Regeln:
- Genau ${size} Trophäen plus eine Platin-Trophäe.
- Stufen: etwa ${gold} gold, ${silver} silver, der Rest bronze. Platin heißt "platinum".
- Sprache: Deutsch. Eigennamen aus dem Spiel (Orte, Figuren, Gegenstände, Fähigkeiten) bleiben wie im Spiel.
- Namen: kurz und einfallsreich (1 bis 4 Wörter), gern mit Wortspiel. Keine Wiederholungen.
- Beschreibungen: eine konkrete, überprüfbare Aufgabe (z. B. "Besiege X", "Sammle 50 Y", "Schließe Welt Z ab"), höchstens 12 Wörter.
- Nutze die Spielinfos: echte Mechaniken, Orte, Bosse, Sammelobjekte, Modi. Erfinde keine Inhalte, die dort nicht vorkommen. Fehlen Infos, bleib allgemein, aber passend zum Genre.
- Mische: Story-Fortschritt, Erkundung, Sammeln, Können/Herausforderung, Nebeninhalte, ein bis zwei witzige Trophäen.
- Keine großen Story-Spoiler über das Ende.
Format: {"platinum":{"name":"...","desc":"..."},"trophies":[{"name":"...","desc":"...","tier":"bronze|silver|gold"}]}`;
  const user = `Spiel: ${title}${platform ? `\nPlattform: ${platform}` : ''}${genre ? `\nGenre: ${genre}` : ''}\n\nSpielinfos (Wikipedia, Englisch):\n${info ? info.text : 'Keine Infos gefunden.'}`;
  const res = await env.AI.run(AI_MODEL, {
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: 1800, temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  const usage = res?.usage || {};
  const inTok = usage.prompt_tokens ?? Math.ceil((system.length + user.length) / 3.5);
  const outTok = usage.completion_tokens ?? Math.ceil(JSON.stringify(res?.response ?? '').length / 3.5);
  const neurons = Math.ceil(inTok * NEURONS_PER_M_IN / 1e6 + outTok * NEURONS_PER_M_OUT / 1e6);
  let out = res?.response ?? res;
  if (typeof out === 'string') {
    const m = out.match(/\{[\s\S]*\}/);
    out = JSON.parse(m ? m[0] : out);
  }
  const tiers = ['bronze', 'silver', 'gold'];
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const list = (out.trophies || [])
    .filter(t => t && t.name)
    .slice(0, size + 3)
    .map(t => ({ name: clean(t.name).slice(0, 60), desc: clean(t.desc || t.description), tier: tiers.includes(String(t.tier).toLowerCase()) ? String(t.tier).toLowerCase() : 'bronze' }));
  if (list.length < 4) throw new Error('ai_output_too_short');
  const plat = out.platinum && out.platinum.name ? { name: clean(out.platinum.name).slice(0, 60), desc: clean(out.platinum.desc || 'Erhalte alle anderen Trophäen'), tier: 'platinum' } : { name: `Meister von ${title}`, desc: 'Erhalte alle anderen Trophäen', tier: 'platinum' };
  return { trophies: [plat, ...list], neurons };
}

/* ---------- Schlüssel ---------- */

async function ownerHash(env) {
  if (!env?.DATA) return null;
  return env.DATA.get('owner');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

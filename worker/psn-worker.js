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
 *   GET  /livechart?user=             -> öffentliche Anime-Liste eines LiveChart-Nutzers (ohne Anmeldung)
 *   POST /achievements { title, platform, genre, size } -> KI-Trophäenliste (Wikipedia + Workers AI)
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
const LIVECHART_GQL = 'https://www.livechart.me/graphql';
const LC_QUERY = `query($u: String!) {
  user(username: $u) {
    username
    library {
      nodes {
        animeId status rating episodesWatched updatedAt
        anime { databaseId romajiTitle englishTitle poster { url } startDate { value } anilistUrl malUrl releaseStatus }
      }
    }
  }
}`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    try {
      if (url.pathname === '/') return json({ ok: true, service: 'nightshelf-psn' });

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
          const trophies = await aiTrophies(env, { title, platform: String(body.platform || '').slice(0, 30), genre: String(body.genre || '').slice(0, 40), size, info });
          return json({ trophies, source: info ? info.page : null });
        } catch (e) {
          const msg = String(e.message || e);
          return json({ error: /neuron|quota|limit|4006|exceeded/i.test(msg) ? 'ai_quota' : 'ai_failed', detail: msg.slice(0, 200) }, 503);
        }
      }

      if (url.pathname === '/livechart') {
        const user = (url.searchParams.get('user') || '').trim();
        if (!/^[A-Za-z0-9_.-]{2,40}$/.test(user)) return json({ error: 'user_invalid' }, 400);
        const res = await fetch(LIVECHART_GQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'me.livechart.android/6.4.8' },
          body: JSON.stringify({ query: LC_QUERY, variables: { u: user } }),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { return json({ error: 'livechart_error', status: res.status, detail: text.slice(0, 200) }, 502); }
        if (data.errors && !data.data?.user) return json({ error: 'livechart_query', detail: JSON.stringify(data.errors).slice(0, 400) }, 502);
        if (!res.ok || !data.data) return json({ error: 'livechart_blocked', status: res.status }, 502);
        const u = data.data?.user;
        if (!u) return json({ error: 'user_not_found' }, 404);
        return json({ username: u.username, entries: u.library?.nodes || [] });
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
  const res = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: 1800, temperature: 0.7,
    response_format: { type: 'json_object' },
  });
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
  return [plat, ...list];
}

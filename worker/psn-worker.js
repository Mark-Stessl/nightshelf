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

export default {
  async fetch(request) {
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

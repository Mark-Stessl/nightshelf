/* Nightshelf – Service Worker: App offline verfügbar machen und Benachrichtigungen anzeigen */
const VERSION = '72';
const SHELL = `nightshelf-shell-${VERSION}`;
const IMAGES = 'nightshelf-img';
const FONTS = 'nightshelf-fonts';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  `styles.css?v=${VERSION}`,
  ...['store', 'trophies', 'lookup', 'airing', 'psn', 'steam', 'sync', 'pwa', 'app'].map(f => `js/${f}.js?v=${VERSION}`),
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-96.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nightshelf-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Seite selbst: zuerst online (für Updates), offline aus dem Speicher
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([fetch(new URL('index.html', self.registration.scope).href, { cache: 'reload' }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
        if (res.ok) (await caches.open(SHELL)).put('./', res.clone());
        return res;
      } catch {
        return (await caches.match('./')) || (await caches.match('index.html')) || Response.error();
      }
    })());
    return;
  }

  // Eigene Dateien: versionierte Dateien ändern sich nie, also direkt aus dem Speicher
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && (url.search.includes('v=') || url.pathname.includes('/icons/'))) (await caches.open(SHELL)).put(req, res.clone());
      return res;
    })());
    return;
  }

  // Schriften: aus dem Speicher, im Hintergrund auffrischen
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(FONTS);
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }

  // Cover-Bilder: einmal laden, dann offline verfügbar
  // Bilder für den Rückblick (crossorigin) nicht aus dem Speicher bedienen, sonst sind sie für Canvas gesperrt
  if (req.destination === 'image' && req.mode !== 'cors') {
    e.respondWith((async () => {
      const c = await caches.open(IMAGES);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trim(IMAGES, 600); }
        return res;
      } catch { return Response.error(); }
    })());
  }
  // Alles andere (Schnittstellen) geht direkt ins Netz.
});

/* ---------- Benachrichtigungen ---------- */
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: 'Nightshelf', body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'Nightshelf';
  e.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || './#/upcoming' },
    });
    if (typeof data.count === 'number' && self.navigator.setAppBadge) self.navigator.setAppBadge(data.count).catch(() => {});
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) { await w.focus(); try { await w.navigate(target); } catch { w.postMessage({ type: 'open', url: target }); } return; }
    }
    await self.clients.openWindow(target);
  })());
});

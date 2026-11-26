# Nightshelf – Kontext für Claude

Persönlicher Tracker von Mark für Spiele, Serien, Anime, Manga und Filme mit PlayStation-artigem Trophäensystem.
Nur für ihn selbst, **keine Benutzerkonten**. Andere dürfen die Seite nutzen, aber es soll nichts Großes werden.
Antworten an Mark auf Deutsch, kurz und locker.

## Aufbau
- Vanilla-JS-SPA ohne Build-Schritt, Hash-Router, Daten in `localStorage` (`js/store.js`). Hosting: GitHub Pages (`https://mark-stessl.github.io/nightshelf/`).
- `js/app.js` ist die Hauptdatei (Views, Formulare, Regal, Statistik, Demnächst-Kalender, Vitrine).
- Weitere Module: `lookup.js` (TMDB, TVmaze, AniList, Wikipedia-Cover), `airing.js` (neue Folgen), `psn.js`, `steam.js`, `sync.js`, `pwa.js`, `trophies.js`.
- `worker/psn-worker.js`: Cloudflare Worker `nightshelf-psn`. Er übernimmt PSN, Steam, MangaDex, Sync, Web-Push mit VAPID, den Bild-Proxy `/img` und einen Cron alle 30 Minuten. Bindings: AI, KV `USAGE`, KV `DATA`.
  - Owner-Auth läuft über den Header `X-Nightshelf-Key`.
  - Deploy macht Mark selbst: im Cloudflare-Dashboard „Edit code“, dann den Code aus `raw.githubusercontent.com/Mark-Stessl/nightshelf/main/worker/psn-worker.js` einfügen und „Deploy“.
- PWA: `sw.js` und `manifest.webmanifest`. Icons liegen in `icons/` (Regal-Logo, iPhone-Splash in `icons/splash/`).

## Regeln
- **Nach jeder Änderung** die Cache-Version hochzählen, und zwar in `index.html` (`?v=N` bei CSS und allen Skripten) und in `sw.js` (`const VERSION = 'N'`) gleichzeitig. Sonst kommen Updates nicht an.
- Design „Midnight amethyst“: dunkles Violett, Akzent Violett `#8B5CF6`, Cyan `#22D3EE`. Schrift Space Grotesk für Überschriften, Inter für Text. Minimalistisch, nicht zu groß.
- Am Handy immer mitdenken: Bottom-Nav, Modals als Sheet, Tastatur-Verhalten.
- Lokal testen mit `python3 -m http.server 8765` und Playwright mit Chrome, auf Desktop und Handy (390 px).
- Geheimnisse gehören nie ins Repo. Das betrifft den Sync-Schlüssel, NPSSO, den Steam-API-Key und VAPID. Mark gibt sie nur in der App ein, nie im Chat.
- Keine Blockaden umgehen und kein Scraping (z. B. AniList-Block bei Cloudflare, PowerPyx).
- Vor größeren visuellen Änderungen zuerst eine Vorschau zeigen. Mark probiert gern aus und lässt Dinge auch wieder entfernen.

## Schon probiert und wieder entfernt (nicht erneut vorschlagen)
- Start-Intro-Animation (App lud langsamer)
- Sternenhimmel in der Statistik
- Wandkalender mit Umblättern bei „Demnächst“
- 3D-„Regal-Welten“ als Kategorie-Auswahl
- Konsolen-Hüllen im Cover-Raster (nur noch in der Regal-Ansicht)
- Zähler am App-Symbol, Spielzeit-Bereichsfilter, „Highlights des Jahres“, „Folgen pro Monat“, Feld „Fertig am“

## Aktueller Stand (Auswahl)
- Regal mit Tabs (am Handy die Scroll-Position merken) und Ansicht Raster/Regal. In der Regal-Ansicht stehen Buchrücken mit echten Konsolen-Hüllen (PS5, PS4, Switch …) und einem Herauszieh-Cover.
- Trophäen-Seite mit Vitrine (Platin-Pokale mit Cover-Medaille).
- „Demnächst“ als Kalender mit Monat, Woche und Liste.
- Steam-Achievements, PSN-Sync inkl. Spielzeit, Jahresrückblick zum Teilen, Push für neue Folgen.

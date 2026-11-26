# Nightshelf – Kontext für Claude

Persönlicher Tracker von Mark für Spiele, Serien, Anime, Manga und Filme mit PlayStation-artigem Trophäensystem.
Nur für ihn selbst, **keine Benutzerkonten**. Andere dürfen die Seite nutzen, aber es soll nichts Großes werden.
Antworten an Mark auf Deutsch, kurz und locker.

## Aufbau
- React 19 + Vite + Tailwind CSS v4 (reines JavaScript, kein TypeScript), Hash-Router, Daten in `localStorage` (`src/lib/store.js`). Hosting: GitHub Pages (`https://mark-stessl.github.io/nightshelf/`), gebaut per GitHub Actions (`.github/workflows/deploy.yml`, bei Push auf `main`).
- `src/App.jsx`: Seitenleiste, Router, Start-Abläufe. Seiten in `src/views/`, Fenster in `src/dialogs/`, Bausteine in `src/components/`.
- Logik in `src/lib/`: `store`, `lookup` (TMDB, TVmaze, AniList, Wikipedia-Cover), `airing` (neue Folgen), `psn`, `steam`, `sync`, `pwa`, `trophies`; dazu `util` (Hilfsfunktionen), `bus` (Neuzeichnen, Toasts, Modals), `viewState`, `watch` (Kapitel/Folgen prüfen, KI-Trophäen).
- Styling: das bewährte Komponenten-CSS liegt in `src/styles/legacy.css` (Layer `components`), Tailwind ohne Preflight für Utilities und Theme-Farben (`src/index.css`). Die Klassen `ring`, `grid` und `grow` sind für Tailwind gesperrt, weil das alte CSS sie nutzt.
- `worker/psn-worker.js`: Cloudflare Worker `nightshelf-psn`. Er übernimmt PSN, Steam, MangaDex, Sync, Web-Push mit VAPID, den Bild-Proxy `/img` und einen Cron alle 30 Minuten. Bindings: AI, KV `USAGE`, KV `DATA`.
  - Owner-Auth läuft über den Header `X-Nightshelf-Key`.
  - Deploy macht Mark selbst: im Cloudflare-Dashboard „Edit code“, dann den Code aus `raw.githubusercontent.com/Mark-Stessl/nightshelf/main/worker/psn-worker.js` einfügen und „Deploy“.
- PWA: `public/sw.js` und `public/manifest.webmanifest`. Icons liegen in `public/icons/` (Regal-Logo, iPhone-Splash in `icons/splash/`).

## Regeln
- Cache-Version läuft automatisch: jede Build bekommt eine Version (`vite.config.js`), die in `sw.js` und `version.json` landet. Nichts mehr per Hand hochzählen.
- Design „Midnight amethyst“: dunkles Violett, Akzent Violett `#8B5CF6`, Cyan `#22D3EE`. Schrift Space Grotesk für Überschriften, Inter für Text. Minimalistisch, nicht zu groß.
- Am Handy immer mitdenken: Bottom-Nav, Modals als Sheet, Tastatur-Verhalten.
- Lokal testen mit `npm run dev` oder `npm run build` + `npx vite preview` (Port 8765, Pfad `/nightshelf/`) und Playwright mit Chrome, auf Desktop und Handy (390 px).
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

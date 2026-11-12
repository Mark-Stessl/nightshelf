# Nightshelf

Persönliches Regal für Spiele, Serien und Filme – mit Trophäen-System im PlayStation-Stil.

## Funktionen

- **Spiele, Serien, Anime, Filme** mit Status, Bewertung (1–5 Sterne), Jahr, Notizen und optionalem Cover-Link
- **Trophäen** in Bronze, Silber, Gold und Platin zum Abhaken
  - Platin wird automatisch verdient, sobald alle anderen Trophäen abgehakt sind
  - **Liste einfügen:** Trophäenliste von PSNProfiles, Exophase oder Steam kopieren und einfügen. Prozentwerte bestimmen die Stufe, bereits verdiente Trophäen (mit Datum) werden direkt abgehakt. Eigenes Format: `Name | Beschreibung | Gold`
  - **Automatisch erstellen:** Für Spiele ohne Erfolge (z. B. Nintendo Switch) erstellt eine KI (Cloudflare Workers AI, Llama 3.3 70B) anhand der Wikipedia-Infos zum Spiel eine passende Liste; ohne KI greift eine Genre-Vorlage
- **Automatische Infos** beim Hinzufügen: Cover, Erscheinungsdatum, Genre usw. – Serien über TVmaze, Spiele über Wikipedia/Wikidata (beide ohne Schlüssel), Filme über TMDB (kostenloser Schlüssel unter „Daten“)
- **PlayStation-Sync:** alle PS4/PS5-Spiele mit echter Trophäenliste und verdienten Trophäen über einen eigenen Cloudflare Worker (`worker/psn-worker.js`). Anmeldung mit dem NPSSO-Code unter „Daten“; Tokens bleiben nur im Browser.
- **Anime mit Staffeln:** Beim Hinzufügen werden alle Staffeln und Filme einer Reihe von AniList geladen; pro Staffel Tabs mit eigenem Folgen-Zähler.
- **Trophäen-Level** aus gesammelten Punkten (Bronze 15, Silber 30, Gold 90, Platin 300)
- **Backup** als JSON-Datei herunterladen und wieder einlesen (Seite „Daten“)

## Daten

Alles wird lokal im Browser gespeichert (localStorage). Mit „Sync zwischen Geräten“ (unter „Daten“) werden die Daten zusätzlich im eigenen Cloudflare Worker (KV) gespeichert und zwischen Geräten zusammengeführt. Ein persönlicher Schlüssel schützt Daten und Server; der Worker speichert nur dessen SHA-256-Hash.

## Starten

Keine Installation nötig: `index.html` im Browser öffnen oder über GitHub Pages ausliefern.

## Farben

| Rolle | Farbe |
| --- | --- |
| Hintergrund | `#0E0B16` |
| Fläche | `#1A1526` |
| Rand | `#2A2140` |
| Violett | `#8B5CF6` |
| Flieder | `#C4B5FD` |
| Akzent / Platin | `#22D3EE` |

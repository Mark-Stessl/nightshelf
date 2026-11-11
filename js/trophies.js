/* Nightshelf – Trophäen: Stufen, Level, Generator und Listen-Import */
const Trophies = (() => {
  const TIERS = {
    bronze:   { label: 'Bronze', points: 15,  color: 'var(--bronze)',   hex: '#D08A5B' },
    silver:   { label: 'Silber', points: 30,  color: 'var(--silver)',   hex: '#C9CEDC' },
    gold:     { label: 'Gold',   points: 90,  color: 'var(--gold)',     hex: '#E9BE58' },
    platinum: { label: 'Platin', points: 300, color: 'var(--platinum)', hex: '#22D3EE' },
  };
  const ORDER = ['platinum', 'gold', 'silver', 'bronze'];

  function icon(tier, size = 22) {
    const c = (TIERS[tier] || TIERS.bronze).hex;
    const glow = tier === 'platinum' ? `<circle cx="12" cy="8" r="9" fill="${c}" opacity=".18"/>` : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">${glow}
      <path d="M7 3h10v5.5a5 5 0 0 1-10 0z" fill="${c}"/>
      <path d="M7 5H4.5v1.2A3 3 0 0 0 7.4 9.5M17 5h2.5v1.2a3 3 0 0 1-2.9 3.3" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 13.5V17M8.5 20.5h7l-1-3.5h-5z" fill="${c}"/>
      <path d="M9.5 4.6v3.2" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  }

  /* ---------- Platin & Fortschritt ---------- */
  function syncPlatinum(list) {
    const plat = list.find(t => t.tier === 'platinum');
    if (!plat) return null;
    const others = list.filter(t => t.tier !== 'platinum' && !t.dlc);
    const shouldBe = others.length > 0 && others.every(t => t.done);
    if (shouldBe !== !!plat.done) {
      plat.done = shouldBe;
      plat.doneAt = shouldBe ? new Date().toISOString() : null;
      return shouldBe ? 'earned' : 'lost';
    }
    return null;
  }

  function progress(list = []) {
    const counts = { bronze: [0, 0], silver: [0, 0], gold: [0, 0], platinum: [0, 0] };
    let pts = 0, max = 0;
    list.forEach(t => {
      const tier = TIERS[t.tier] ? t.tier : 'bronze';
      counts[tier][1]++;
      max += TIERS[tier].points;
      if (t.done) { counts[tier][0]++; pts += TIERS[tier].points; }
    });
    const done = list.filter(t => t.done).length;
    return { counts, done, total: list.length, pts, max, pct: max ? Math.round((pts / max) * 100) : 0 };
  }

  /* Sonys Level-System (seit 2020): Punkte pro Level steigen in 100er-Stufen */
  const LEVEL_STEPS = [60, 90, 450, 900, 1350, 1800, 2250, 2700, 3150, 3600];
  function levelFromPoints(points) {
    let level = 1, rest = points;
    while (level < 999) {
      const need = LEVEL_STEPS[Math.min(9, Math.floor(level / 100))];
      if (rest < need) return { level, into: rest, need, pct: Math.round((rest / need) * 100) };
      rest -= need; level++;
    }
    return { level: 999, into: 0, need: 1, pct: 100 };
  }

  /* ---------- Generator ---------- */
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const GENRES = {
    adventure: 'Action-Adventure', rpg: 'Rollenspiel', platformer: 'Jump ’n’ Run', shooter: 'Shooter',
    racing: 'Rennspiel', sports: 'Sport', fighting: 'Kampfspiel', strategy: 'Strategie',
    puzzle: 'Puzzle', horror: 'Horror', sandbox: 'Sandbox / Aufbau', party: 'Party / Multiplayer',
    sim: 'Simulation / Gemütlich', other: 'Sonstiges',
  };

  const BASE = [
    ['Der erste Schritt', 'Starte dein Abenteuer in {t}', 'bronze'],
    ['Abspann', 'Schließe die Hauptgeschichte ab', 'gold'],
  ];
  const EXTRA = [
    ['Halbzeit', 'Erreiche die Hälfte der Geschichte', 'bronze'],
    ['Sitzfleisch', 'Spiele insgesamt 10 Stunden', 'bronze'],
    ['Marathon', 'Spiele insgesamt 50 Stunden', 'silver'],
    ['Sammelleidenschaft', 'Finde die Hälfte aller Sammelobjekte', 'silver'],
    ['Nichts übersehen', 'Finde alle Sammelobjekte', 'gold'],
    ['Komplettist', 'Erreiche 100 % Spielfortschritt', 'gold'],
    ['Nebenbei erledigt', 'Schließe 10 Nebenaufgaben ab', 'bronze'],
    ['Hilfsbereit', 'Schließe alle Nebenaufgaben ab', 'silver'],
    ['Neugierig', 'Probiere jeden Spielmodus aus', 'bronze'],
    ['Nochmal von vorn', 'Starte einen zweiten Durchgang oder New Game+', 'silver'],
    ['Fotograf', 'Mache einen Screenshot, auf den du stolz bist', 'bronze'],
  ];
  const POOLS = {
    adventure: [
      ['Entdecker', 'Decke die komplette Weltkarte auf', 'silver'], ['Schatzsucher', 'Öffne 25 Truhen', 'bronze'],
      ['Bezwinger', 'Besiege den ersten Boss', 'bronze'], ['Unaufhaltsam', 'Besiege alle Bosse', 'gold'],
      ['Voll ausgerüstet', 'Schalte alle Fähigkeiten oder Werkzeuge frei', 'silver'], ['Rätselmeister', 'Löse alle Dungeons oder Schreine', 'gold'],
      ['Ohne Kratzer', 'Besiege einen Boss ohne Schaden', 'silver'], ['Gut gerüstet', 'Rüste deine Ausrüstung vollständig auf', 'bronze'],
    ],
    rpg: [
      ['Aufsteiger', 'Erreiche Stufe 10', 'bronze'], ['Veteran', 'Erreiche Stufe 50', 'silver'], ['Legende', 'Erreiche die Maximalstufe', 'gold'],
      ['Gefährten', 'Rekrutiere alle Gruppenmitglieder', 'silver'], ['Schmiedekunst', 'Stelle eine legendäre Waffe her', 'silver'],
      ['Reich', 'Besitze 100.000 Gold', 'bronze'], ['Bestiarium', 'Besiege jede Gegnerart einmal', 'gold'], ['Die Wahl', 'Triff eine schwere Entscheidung', 'bronze'],
    ],
    platformer: [
      ['Sprungkraft', 'Schließe die erste Welt ab', 'bronze'], ['Weltenbummler', 'Besuche jede Welt', 'silver'],
      ['Sternenjäger', 'Sammle 100 Hauptsammelobjekte', 'silver'], ['Alles eingesackt', 'Sammle alle Hauptsammelobjekte', 'gold'],
      ['Münzregen', 'Sammle 1.000 Münzen', 'bronze'], ['Geheimgang', 'Finde ein geheimes Level', 'silver'],
      ['Fehlerfrei', 'Schließe ein Level ohne Treffer ab', 'bronze'], ['Bonuswelt', 'Schließe die Bonuswelt ab', 'gold'],
    ],
    shooter: [
      ['Scharfschütze', 'Erziele 100 Kopftreffer', 'silver'], ['Arsenal', 'Benutze jede Waffe', 'bronze'],
      ['Veteran', 'Schließe die Kampagne auf schwer ab', 'gold'], ['Erster Sieg', 'Gewinne ein Online-Match', 'bronze'],
      ['Unaufhaltbar', 'Erziele eine 10er Serie', 'silver'], ['Ausgerüstet', 'Rüste eine Waffe voll auf', 'bronze'],
      ['Teamplayer', 'Schließe 25 Matches ab', 'silver'],
    ],
    racing: [
      ['Start frei', 'Gewinne dein erstes Rennen', 'bronze'], ['Pokalsammler', 'Gewinne einen Cup', 'silver'],
      ['Champion', 'Gewinne alle Cups', 'gold'], ['Bleifuß', 'Fahre eine perfekte Runde', 'bronze'],
      ['Garage', 'Schalte 25 Fahrzeuge frei', 'silver'], ['Fotofinish', 'Gewinne mit unter 0,1 Sekunden Vorsprung', 'bronze'],
      ['Höchste Klasse', 'Gewinne in der schnellsten Klasse', 'gold'],
    ],
    sports: [
      ['Anpfiff', 'Spiele dein erstes Match', 'bronze'], ['Saisonsieger', 'Gewinne eine Saison', 'gold'],
      ['Ungeschlagen', 'Gewinne 10 Spiele in Folge', 'silver'], ['Teamaufbau', 'Baue dein Wunschteam zusammen', 'bronze'],
      ['Kantersieg', 'Gewinne mit 5 Punkten oder Toren Vorsprung', 'bronze'], ['Pokalheld', 'Gewinne ein Turnier', 'silver'],
      ['Legende', 'Erreiche die höchste Liga', 'gold'],
    ],
    fighting: [
      ['Erster Treffer', 'Gewinne deinen ersten Kampf', 'bronze'], ['Kombokünstler', 'Lande eine 20er Kombo', 'silver'],
      ['Arcade-Held', 'Schließe den Arcade-Modus ab', 'silver'], ['Vielseitig', 'Gewinne mit 10 verschiedenen Kämpfern', 'silver'],
      ['Perfekt', 'Gewinne eine Runde ohne Schaden', 'bronze'], ['Kader komplett', 'Schalte alle Kämpfer frei', 'gold'],
    ],
    strategy: [
      ['Erster Sieg', 'Gewinne deine erste Partie', 'bronze'], ['Feldherr', 'Schließe die Kampagne ab', 'gold'],
      ['Baumeister', 'Errichte jedes Gebäude einmal', 'silver'], ['Blitzkrieg', 'Gewinne in unter 30 Minuten', 'silver'],
      ['Diplomat', 'Gewinne ohne Kampf', 'gold'], ['Wirtschaftswunder', 'Häufe große Reserven an', 'bronze'],
    ],
    puzzle: [
      ['Aha-Moment', 'Löse das erste Rätsel', 'bronze'], ['Kopfnuss', 'Löse 50 Rätsel', 'silver'],
      ['Ohne Hilfe', 'Löse ein Kapitel ohne Hinweise', 'silver'], ['Genie', 'Löse alle Rätsel', 'gold'],
      ['Schnelldenker', 'Löse ein Rätsel in Rekordzeit', 'bronze'], ['Perfektionist', 'Erreiche überall die Bestwertung', 'gold'],
    ],
    horror: [
      ['Mutprobe', 'Überlebe die erste Nacht', 'bronze'], ['Überlebender', 'Schließe das Spiel ab, ohne zu sterben', 'gold'],
      ['Sparsam', 'Beende ein Kapitel mit voller Munition', 'bronze'], ['Archivar', 'Finde alle Dokumente', 'silver'],
      ['Keine Angst', 'Spiele auf der höchsten Schwierigkeit', 'gold'], ['Versteckspiel', 'Entkomme 10 Verfolgungen', 'silver'],
    ],
    sandbox: [
      ['Grundstein', 'Baue dein erstes Zuhause', 'bronze'], ['Architekt', 'Errichte ein großes Bauwerk', 'silver'],
      ['Tiefgräber', 'Erreiche die tiefste Ebene', 'silver'], ['Selbstversorger', 'Baue eine funktionierende Farm', 'bronze'],
      ['Bezwinger', 'Besiege den Endgegner', 'gold'], ['Erfinder', 'Baue eine automatische Maschine', 'silver'],
    ],
    party: [
      ['Gesellig', 'Spiele mit Freunden', 'bronze'], ['Partykönig', 'Gewinne 10 Partien', 'silver'],
      ['Allrounder', 'Spiele jedes Minispiel', 'silver'], ['Glückspilz', 'Gewinne in letzter Sekunde', 'bronze'],
      ['Champion', 'Gewinne 50 Partien', 'gold'],
    ],
    sim: [
      ['Eingezogen', 'Richte dein Zuhause ein', 'bronze'], ['Nachbarschaft', 'Freunde dich mit 10 Bewohnern an', 'silver'],
      ['Gärtner', 'Ernte 100 Pflanzen', 'bronze'], ['Sammler', 'Vervollständige eine Sammlung', 'silver'],
      ['Traumhaft', 'Erreiche die beste Bewertung', 'gold'], ['Ein Jahr', 'Erlebe ein ganzes Ingame-Jahr', 'silver'],
    ],
    other: [],
  };

  function generate(title, genre = 'other', size = 'normal') {
    const rnd = seeded((title || '') + genre);
    const shuffle = arr => arr.map(v => [rnd(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
    const n = { short: 7, normal: 12, long: 18 }[size] || 12;
    const pool = shuffle(POOLS[genre] || []);
    const extra = shuffle(EXTRA);
    const picked = [...BASE];
    const fromGenre = Math.min(pool.length, Math.round((n - 2) * 0.65));
    picked.push(...pool.slice(0, fromGenre));
    let i = 0;
    while (picked.length < n && i < extra.length) picked.push(extra[i++]);
    const tierRank = { gold: 0, silver: 1, bronze: 2 };
    const list = picked
      .map(([name, desc, tier]) => ({ id: Store.uid(), name, desc: desc.replace('{t}', title), tier, done: false }))
      .sort((a, b) => tierRank[b.tier] - tierRank[a.tier]);
    list.unshift({ id: Store.uid(), name: `Meister von ${title}`, desc: 'Erhalte alle anderen Trophäen', tier: 'platinum', done: false });
    return list;
  }

  /* ---------- Import: eingefügte Liste lesen ---------- */
  const TIER_WORD = /^(platinum|platin|gold|silver|silber|bronze)(\s*(trophy|trophäe|trophae|trophäe))?$/i;
  const PCT = /^(?:[a-zäöü ]+\s)?(\d{1,3}(?:[.,]\d+)?)\s*%/i;
  const RARITY = /^(ultra rare|very rare|rare|uncommon|common|ultra selten|sehr selten|selten|ungewöhnlich|gewöhnlich|häufig)$/i;
  const NOISE = /^([\d\s.,#/:+-]+|hidden( trophy| achievement)?|versteckt(e trophäe)?|secret|geheim|dlc|base game|hauptspiel)$/i;
  const EARNED = /^(unlocked|earned|freigeschaltet|erhalten|errungen)\b.*\d/i;
  const DATE = /(\b(jan|feb|mar|mär|apr|may|mai|jun|jul|aug|sep|oct|okt|nov|dec|dez)[a-z]*\.?\b.*\b(19|20)\d{2}\b)|(\b\d{1,2}\.\d{1,2}\.(19|20)?\d{2}\b)/i;

  function wordToTier(w) {
    w = w.toLowerCase();
    if (w.startsWith('plat')) return 'platinum';
    if (w.startsWith('gold')) return 'gold';
    if (w.startsWith('sil')) return 'silver';
    return 'bronze';
  }

  function parse(text) {
    const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!lines.length) return [];
    const delimRe = /\t|\s\|\s|\s;\s|;/;
    const delimited = lines.filter(l => delimRe.test(l)).length >= lines.length * 0.6;
    let out = [];

    if (delimited) {
      lines.forEach(l => {
        const cells = l.split(/\t|\s*\|\s*|\s*;\s*/).map(c => c.trim()).filter(Boolean);
        let tier = null, rarity = null; const text = [];
        cells.forEach(c => {
          if (TIER_WORD.test(c)) tier = wordToTier(c);
          else if (PCT.test(c)) rarity = parseFloat(c.match(PCT)[1].replace(',', '.'));
          else if (!RARITY.test(c) && !NOISE.test(c)) text.push(c);
        });
        if (text.length) out.push({ name: text[0], desc: text.slice(1).join(' – '), tier, rarity, done: false });
      });
    } else {
      let cur = null, pendingTier = null;
      for (const line of lines) {
        if (TIER_WORD.test(line)) { const t = wordToTier(line); if (cur && !cur.tier) cur.tier = t; else pendingTier = t; continue; }
        const pm = line.match(PCT);
        if (pm && line.length < 40) { if (cur) cur.rarity = parseFloat(pm[1].replace(',', '.')); continue; }
        if (RARITY.test(line) || NOISE.test(line)) continue;
        if ((EARNED.test(line) && line.length < 50) || (DATE.test(line) && line.length < 40)) { if (cur) cur.done = true; continue; }
        if (!cur || cur.desc) { cur = { name: line, desc: '', tier: pendingTier, rarity: null, done: false }; pendingTier = null; out.push(cur); }
        else cur.desc = line;
      }
    }

    let hasPlat = out.some(t => t.tier === 'platinum');
    out.forEach(t => {
      if (t.tier) return;
      const all = /(all|alle|every|sämtliche)\b.*(troph|erfolg|achievement)/i.test(t.desc) || /platin/i.test(t.name);
      if (all && !hasPlat) { t.tier = 'platinum'; hasPlat = true; return; }
      if (t.rarity == null) t.tier = 'bronze';
      else t.tier = t.rarity <= 5 ? 'gold' : t.rarity <= 20 ? 'silver' : 'bronze';
    });
    return out.map(t => ({ id: Store.uid(), ...t }));
  }

  return { TIERS, ORDER, GENRES, icon, syncPlatinum, progress, levelFromPoints, generate, parse };
})();

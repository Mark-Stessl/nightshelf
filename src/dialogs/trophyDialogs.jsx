/* Nightshelf – Fenster rund um Trophäen und Spielzeit */
import { useRef, useState } from 'react';
import { Store } from '../lib/store.js';
import { Trophies } from '../lib/trophies.js';
import { openModal, toast } from '../lib/bus.js';
import { PLAY_SRC, fmtHours, hoursOf, parseHours } from '../lib/util.js';
import { aiBlockedToday, aiQuotaText, smartTrophies } from '../lib/watch.jsx';
import { I, TrophyIcon } from '../components/icons.jsx';
import { ModalFrame, Msg, Seg } from '../components/ui.jsx';

export function trophyToast(t, game) {
  toast(<><div className="tbadge"><TrophyIcon tier={t.tier} /></div><div><b>{t.name}</b><small>{Trophies.TIERS[t.tier].label}-Trophäe · {game.title}</small></div></>, t.tier === 'platinum' ? 'plat' : '');
}

/* Vorschau einer eingefügten Liste: Stufe pro Trophäe wählen oder weglassen */
export function TrophyPreview({ list }) {
  if (!list.length) return null;
  const earned = list.filter(t => t.done).length;
  return <>
    <div className="tiny mt-3">{list.length} Trophäen erkannt{earned ? ` · ${earned} davon schon verdient` : ''}. Prüfe die Stufen und entferne, was nicht dazugehört.</div>
    <div className="preview-list">{list.map((t, i) => (
      <div className="preview-row" data-i={i} key={`${i}-${t.name}`}>
        <select className="input" defaultValue={t.tier}>{Trophies.ORDER.map(k => <option key={k} value={k}>{Trophies.TIERS[k].label}</option>)}<option value="__skip">Weglassen</option></select>
        <div><div className="pn">{t.name}{t.done && <> <span className="tier-tag tt-platinum">verdient</span></>}</div>{t.desc && <div className="pd">{t.desc}</div>}</div>
      </div>
    ))}</div>
  </>;
}
export function collectPreview(el, list) {
  if (!el) return [];
  return [...el.querySelectorAll('.preview-row')].map(r => {
    const t = list[+r.dataset.i];
    const tier = r.querySelector('select').value;
    if (tier === '__skip') return null;
    return { id: t.id, name: t.name, desc: t.desc, tier, rarity: t.rarity, done: !!t.done, doneAt: t.done ? new Date().toISOString() : null };
  }).filter(Boolean);
}

/* ---------- Eigene Trophäe / bearbeiten ---------- */
export const trophyEdit = (game, trophy = null) => openModal(close => <TrophyEdit game={game} trophy={trophy} close={close} />);
function TrophyEdit({ game, trophy, close }) {
  const t = trophy || { tier: 'bronze', name: '', desc: '' };
  const [name, setName] = useState(t.name), [desc, setDesc] = useState(t.desc), [tier, setTier] = useState(t.tier), [err, setErr] = useState('');
  const save = () => {
    if (!name.trim()) { setErr('Gib einen Namen ein.'); return; }
    const list = (Store.get(game.id) || game).trophies || [];
    if (tier === 'platinum' && list.some(x => x.tier === 'platinum' && x.id !== t.id)) { setErr('Dieses Spiel hat schon eine Platin-Trophäe.'); return; }
    const next = trophy ? list.map(x => x.id === trophy.id ? { ...x, name: name.trim(), desc: desc.trim(), tier } : x)
      : [...list, { id: Store.uid(), name: name.trim(), desc: desc.trim(), tier, done: false }];
    Trophies.syncPlatinum(next);
    Store.update(game.id, { trophies: next, trophySource: game.trophySource === 'generated' ? 'custom' : (game.trophySource || 'custom') });
    close();
  };
  return (
    <ModalFrame title={trophy ? 'Trophäe bearbeiten' : 'Eigene Trophäe'} close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <form className="form" noValidate onSubmit={e => { e.preventDefault(); save(); }}>
        <div className="field"><label>Name</label><input className="input" value={name} onChange={e => { setName(e.target.value); setErr(''); }} placeholder="Glückspilz" /><div className="field-error">{err}</div></div>
        <div className="field"><label>Beschreibung</label><input className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Was musst du dafür tun?" /></div>
        <div className="field"><label>Stufe</label>
          <Seg value={tier} onChange={setTier} options={Trophies.ORDER.slice().reverse().map(k => [k, Trophies.TIERS[k].label, { color: Trophies.TIERS[k].color }])} /></div>
        {(t.tier === 'platinum' || !trophy) && <p className="tiny m-0">Platin wird automatisch verdient, sobald alle anderen Trophäen abgehakt sind.</p>}
      </form>
    </ModalFrame>
  );
}

/* ---------- Liste einfügen ---------- */
export const trophyImport = game => openModal(close => <TrophyImport game={game} close={close} />);
function TrophyImport({ game, close }) {
  const [parsed, setParsed] = useState([]), [mode, setMode] = useState('replace'), [err, setErr] = useState('');
  const ref = useRef(null);
  const apply = () => {
    const items = collectPreview(ref.current, parsed);
    if (!items.length) { setErr('Füge zuerst eine Liste ein.'); return; }
    const cur = (Store.get(game.id) || game).trophies || [];
    let list = mode === 'replace' ? items : [...cur, ...items];
    if (mode === 'append' && items.some(t => t.tier === 'platinum') && cur.some(t => t.tier === 'platinum')) {
      list = list.filter((t, i, a) => t.tier !== 'platinum' || a.findIndex(x => x.tier === 'platinum') === i);
    }
    Trophies.syncPlatinum(list);
    Store.update(game.id, { trophies: list, trophySource: 'imported' });
    close(); toast(<Msg title={`${items.length} Trophäen übernommen`} />);
  };
  return (
    <ModalFrame title="Trophäenliste einfügen" wide close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" onClick={apply}>Übernehmen</button></>}>
      <div className="hint-box">{I.paste}<div>Füge die Liste ein, z. B. von PSNProfiles, Exophase oder Steam. Eigenes Format: <code>Name | Beschreibung | Gold</code> pro Zeile.</div></div>
      <textarea className="input mt-3 min-h-[160px] text-[13px]" placeholder="Trophäenliste hier einfügen" onChange={e => { setErr(''); setParsed(Trophies.parse(e.target.value)); }} />
      <div className="field mt-3"><label>Bestehende Trophäen</label><Seg value={mode} onChange={setMode} options={[['replace', 'Ersetzen'], ['append', 'Ergänzen']]} /></div>
      <div ref={ref}><TrophyPreview list={parsed} /></div>
      <div className="field-error mt-2">{err}</div>
    </ModalFrame>
  );
}

/* ---------- Trophäen erstellen (KI oder Genre-Vorlage) ---------- */
export const trophyGenerate = game => openModal(close => <TrophyGenerate game={game} close={close} />);
function TrophyGenerate({ game, close }) {
  const blocked = aiBlockedToday();
  const [mode, setMode] = useState(blocked ? 'genre' : 'ai'), [genre, setGenre] = useState(game.genre || 'adventure'), [size, setSize] = useState('normal');
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const go = async () => {
    if (mode === 'genre') { Store.update(game.id, { genre, trophies: Trophies.generate(game.title, genre, size), trophySource: 'generated' }); close(); return; }
    setBusy(true);
    const r = await smartTrophies(game.title, genre, game.platform, size);
    if (!r.ai) {
      setBusy(false);
      setErr(r.reason === 'key_required' ? 'Dieses Gerät ist noch nicht mit deinem Schlüssel verbunden. Verbinde es unter Daten → Sync.' : r.reason === 'ai_quota' ? 'Heute nicht mehr möglich: ' + aiQuotaText() : 'Die KI war gerade nicht erreichbar. Versuch es nochmal oder nimm die Genre-Vorlage.');
      return;
    }
    Store.update(game.id, { genre, trophies: r.trophies, trophySource: 'ai' });
    close(); toast(<Msg title={`${r.trophies.length} Trophäen erstellt`} sub={`passend zu ${game.title}`} />);
  };
  return (
    <ModalFrame title="Trophäen erstellen" close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" disabled={busy} onClick={go}>{busy ? 'Analysiere Spiel…' : <>{I.sparkle} Erstellen</>}</button></>}>
      <div className="form">
        <div className="hint-box">{I.sparkle}<div>Erstellt eine neue Liste für {game.title}. Deine bisherigen Trophäen werden dabei ersetzt.</div></div>
        <div className="field"><label>Art</label><Seg value={mode} onChange={m => { setMode(m); setErr(''); }} options={[['ai', 'Passend zum Spiel (KI)'], ['genre', 'Genre-Vorlage']]} /></div>
        {blocked && <div className="hint-box quota">{I.info}<div><b>Heute nicht mehr möglich.</b> {aiQuotaText()}</div></div>}
        <div className="grid-2">
          <div className="field"><label>Genre</label><select className="input" value={genre} onChange={e => setGenre(e.target.value)}>{Object.entries(Trophies.GENRES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="field"><label>Umfang</label><select className="input" value={size} onChange={e => setSize(e.target.value)}><option value="short">Kurz</option><option value="normal">Normal</option><option value="long">Umfangreich</option></select></div>
        </div>
        <div className="field-error">{err}</div>
      </div>
    </ModalFrame>
  );
}

/* ---------- Spielzeit ---------- */
export const playtimeEditor = it => openModal(close => <PlaytimeEditor it={it} close={close} />);
function PlaytimeEditor({ it, close }) {
  const cur = hoursOf(it);
  const [v, setV] = useState(cur != null ? String(Math.round(cur * 10) / 10) : '');
  const inputRef = useRef(null);
  const save = () => { const h = parseHours(v); if (h === undefined) { inputRef.current?.focus(); return; } Store.update(it.id, { playH: h }); close(); };
  return (
    <ModalFrame title="Spielzeit" close={close}
      foot={<>{it.playH != null && <button className="btn btn-ghost btn-danger" onClick={() => { Store.update(it.id, { playH: null }); close(); }}>Entfernen</button>}<button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <div className="form"><div className="field"><label>Gespielte Stunden</label>
        <div className="unit-wrap"><input ref={inputRef} className="input" type="text" inputMode="decimal" autoComplete="off" value={v} placeholder="z. B. 35"
          onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} /><span>Stunden</span></div>
        <div className="tiny">{it.playMin != null ? `Automatisch (${PLAY_SRC[it.playSrc] || ''}): ${fmtHours(it.playMin / 60)}. Was du hier einträgst, gilt stattdessen und wird nicht überschrieben.` : 'Bei Steam- und PlayStation-Spielen kommt die Zeit automatisch. Deine Angabe wird nie überschrieben.'}</div>
      </div></div>
    </ModalFrame>
  );
}

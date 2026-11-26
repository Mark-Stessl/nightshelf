/* Nightshelf – Daten & Einstellungen */
import { useEffect, useReducer, useRef, useState } from 'react';
import { Store } from '../lib/store.js';
import { Sync } from '../lib/sync.js';
import { PSN } from '../lib/psn.js';
import { Steam } from '../lib/steam.js';
import { Lookup } from '../lib/lookup.js';
import { Pwa } from '../lib/pwa.js';
import { refresh, toast } from '../lib/bus.js';
import { fmtDate } from '../lib/util.js';
import { markAiBlocked } from '../lib/watch.jsx';
import { I } from '../components/icons.jsx';
import { confirmDialog, Msg } from '../components/ui.jsx';
import { runPsnSync, runSteamSync } from '../dialogs/misc.jsx';

const useTick = () => useReducer(x => x + 1, 0);
const Row = ({ children, className = 'mt-3' }) => <div className={`flex gap-2 flex-wrap ${className}`}>{children}</div>;
const Ext = ({ href, children }) => <a href={href} target="_blank" rel="noopener" style={{ color: 'var(--lilac)' }}>{children}</a>;
const deDT = t => new Date(t).toLocaleString('de-AT', { dateStyle: 'medium', timeStyle: 'short' });

/* ---------- Sync zwischen Geräten ---------- */
function SyncLine() {
  const [st, setSt] = useState(Sync.status());
  useEffect(() => Sync.onChange(setSt), []);
  if (st.status === 'syncing' || st.status === 'pending') return <><span className="sync-dot busy" />Synchronisiere…</>;
  if (st.status === 'error') return <><span className="sync-dot err" />{{ network: 'Server nicht erreichbar, nächster Versuch beim nächsten Speichern', key_required: 'Schlüssel ungültig, bitte neu verbinden', too_large: 'Deine Daten sind zu groß für den Speicher' }[st.error] || 'Sync fehlgeschlagen'}</>;
  return <><span className="sync-dot" />{st.lastSync ? `Zuletzt synchronisiert: ${deDT(st.lastSync)}` : 'Verbunden'}</>;
}
function SyncPanel() {
  const [, tick] = useTick();
  const [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(''), [keyIn, setKeyIn] = useState('');
  const keyRef = useRef(null);
  if (Sync.enabled()) {
    const st = Sync.status();
    return (<>
      <p>Dieses Gerät ist verbunden. Änderungen werden automatisch gespeichert und auf deinen anderen Geräten übernommen.</p>
      <div className="tiny sync-line"><SyncLine /></div>
      <div className="field mt-3.5"><label>Dein Schlüssel</label>
        <div className="key-row"><input ref={keyRef} className="input mono" type={show ? 'text' : 'password'} value={st.key} readOnly /><button className="btn" onClick={() => setShow(s => !s)}>{show ? 'Verbergen' : 'Anzeigen'}</button>
          <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(st.key); toast(<Msg title="Schlüssel kopiert" />); } catch { setShow(true); setTimeout(() => keyRef.current?.select()); } }}>{I.copy}Kopieren</button></div>
        <div className="tiny">Gib diesen Schlüssel auf deinen anderen Geräten ein. Bewahre ihn gut auf, ohne ihn kommst du nicht an deine Daten.</div></div>
      <Row><button className="btn btn-primary" onClick={() => Sync.syncNow()}>{I.refresh} Jetzt synchronisieren</button>
        <button className="btn btn-ghost btn-danger" onClick={() => confirmDialog('Dieses Gerät synchronisiert dann nicht mehr. Deine Daten bleiben hier und auf dem Server erhalten.', 'Trennen', () => { Sync.disconnect(); setShow(false); tick(); })}>Auf diesem Gerät trennen</button></Row>
    </>);
  }
  const setup = async () => {
    setBusy('setup'); setErr('');
    try { await Sync.setup(); setShow(true); setBusy(''); toast(<Msg title="Sync eingerichtet" sub="Notiere dir deinen Schlüssel" />); refresh(); tick(); }
    catch (e) { setBusy(''); setErr(e.code === 'already_claimed' ? 'Dieser Server gehört schon jemandem. Ist es deiner, gib deinen Schlüssel bei „Weiteres Gerät“ ein. Sonst brauchst du für Sync einen eigenen Server (Adresse unter PlayStation → Server-Adresse). Ohne Sync funktioniert die App ganz normal, deine Daten bleiben in diesem Browser.' : e.code === 'network' ? 'Server nicht erreichbar. Versuch es gleich nochmal.' : 'Einrichten hat nicht geklappt.'); }
  };
  const join = async () => {
    const v = keyIn.trim();
    if (!v) { setErr('Gib deinen Schlüssel ein.'); return; }
    setBusy('join');
    try { await Sync.connect(v); setBusy(''); toast(<Msg title="Gerät verbunden" sub="Deine Daten wurden zusammengeführt" />); refresh(); tick(); }
    catch (e) { setBusy(''); setErr(e.code === 'key_wrong' ? 'Dieser Schlüssel passt nicht. Prüfe ihn auf deinem ersten Gerät.' : e.code === 'not_claimed' ? 'Auf dem Server ist noch kein Sync eingerichtet. Nimm „Sync einrichten“.' : 'Verbinden hat nicht geklappt. Versuch es gleich nochmal.'); }
  };
  return (<>
    <p>Speichere deine Spiele, Serien, Anime, Filme und Trophäen auf deinem Cloudflare-Server, dann sind sie auf PC und Handy gleich. Ein persönlicher Schlüssel schützt deine Daten und deinen Server.</p>
    <div className="sync-options">
      <div className="sync-opt"><b>Erstes Gerät</b><span className="tiny">Richte den Sync auf dem Gerät mit deinen meisten Daten ein. Du bekommst einen Schlüssel.</span><button className="btn btn-primary" disabled={!!busy} onClick={setup}>{busy === 'setup' ? 'Richte ein…' : 'Sync einrichten'}</button></div>
      <div className="sync-opt"><b>Weiteres Gerät</b><span className="tiny">Gib den Schlüssel ein, den du auf deinem ersten Gerät bekommen hast.</span>
        <div className="key-row"><input className="input mono" placeholder="ABCD-EFGH-…" autoComplete="off" spellCheck="false" value={keyIn} onChange={e => { setKeyIn(e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && join()} /><button className="btn" disabled={!!busy} onClick={join}>{busy === 'join' ? 'Verbinde…' : 'Verbinden'}</button></div></div>
    </div>
    <div className="field-error mt-2.5">{err}</div>
  </>);
}

/* ---------- App installieren & Benachrichtigungen ---------- */
const INSTALL = {
  installed: () => <div className="key-ok">{I.check} Nightshelf läuft hier als App</div>,
  ios: () => <ol className="app-steps"><li>Tippe in Safari unten auf <b>Teilen</b> (Quadrat mit Pfeil).</li><li>Wähle <b>Zum Home-Bildschirm</b>.</li><li>Öffne Nightshelf ab jetzt über das neue Symbol.</li></ol>,
  'mac-safari': () => <><ol className="app-steps"><li>Klicke in Safari in der Menüleiste auf <b>Ablage</b>.</li><li>Wähle <b>Zum Dock hinzufügen</b>.</li></ol><div className="tiny">In Chrome oder Edge geht es mit einem Klick auf das Installieren-Symbol in der Adressleiste.</div></>,
  firefox: () => <div className="tiny">Firefox kann Web-Apps am Desktop nicht installieren. Öffne Nightshelf in <b>Chrome</b> oder <b>Edge</b> und klick in der Adressleiste auf das Installieren-Symbol.</div>,
  'android-firefox': () => <ol className="app-steps"><li>Tippe oben rechts auf das Menü (⋮).</li><li>Wähle <b>Installieren</b> bzw. <b>Zum Startbildschirm hinzufügen</b>.</li></ol>,
  manual: () => <ol className="app-steps"><li>Klicke in der Adressleiste rechts auf das <b>Installieren</b>-Symbol, oder öffne das Browser-Menü.</li><li>Wähle <b>App installieren</b> bzw. <b>Nightshelf installieren</b>.</li></ol>,
};
function AppPanel() {
  const [n, tick] = useTick();
  const [sub, setSub] = useState(undefined), [err, setErr] = useState(''), [busy, setBusy] = useState('');
  useEffect(() => Pwa.onChange(tick), []);
  useEffect(() => { let on = true; Pwa.subscription().catch(() => null).then(s => on && setSub(s)); return () => { on = false; }; }, [n]);
  const st = Pwa.installState();
  const pushOn = async () => {
    setBusy('on'); setErr('');
    try { await Pwa.enablePush(); toast(<Msg title="Benachrichtigungen an" sub="Du hörst von uns, sobald etwas Neues erscheint" />); tick(); }
    catch (e) { setErr({ denied: 'Du hast Benachrichtigungen nicht erlaubt. Erlaube sie in den Browser-Einstellungen und versuch es nochmal.', sync_required: 'Verbinde dieses Gerät zuerst mit deinem Sync.', key_required: 'Dein Schlüssel passt nicht mehr. Verbinde das Gerät neu.', ios_install: 'Füge Nightshelf zuerst zum Home-Bildschirm hinzu.' }[e.code] || 'Einschalten hat nicht geklappt. Prüf deine Verbindung und versuch es nochmal.'); }
    setBusy('');
  };
  const pushTest = async () => {
    setBusy('test'); setErr('');
    try { const r = await Pwa.testPush(); if (!r.sent) setErr('Der Server kennt dieses Gerät nicht mehr. Schalte die Benachrichtigungen aus und wieder ein.'); }
    catch { setErr('Test hat nicht geklappt. Versuch es gleich nochmal.'); }
    setBusy('');
  };
  let push;
  if (sub === undefined) push = null;
  else if (!Pwa.pushSupported()) push = <div className="tiny">{Pwa.isIOS && !Pwa.standalone() ? 'Auf iPhone und iPad gehen Benachrichtigungen nur, wenn Nightshelf zum Home-Bildschirm hinzugefügt ist (Anleitung oben). Öffne danach die App und schalte sie hier ein.' : 'Dieser Browser kann keine Benachrichtigungen empfangen.'}</div>;
  else if (!Sync.enabled()) push = <div className="tiny">Dafür muss dieses Gerät mit deinem Sync verbunden sein (oben), weil dein Server deine Liste kennen muss, um nach Neuem zu suchen.</div>;
  else if (sub && Notification.permission === 'granted') push = <><div className="key-ok">{I.bell} An auf diesem Gerät</div>
    <Row><button className="btn" disabled={busy === 'test'} onClick={pushTest}>{busy === 'test' ? 'Sende…' : 'Test senden'}</button>
      <button className="btn btn-ghost btn-danger" onClick={async () => { await Pwa.disablePush(); toast(<Msg title="Benachrichtigungen aus" sub="auf diesem Gerät" />); tick(); }}>Ausschalten</button></Row></>;
  else if (Notification.permission === 'denied') push = <div className="tiny" style={{ color: 'var(--danger)' }}>Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Browser-Einstellungen (Schloss-Symbol in der Adressleiste) und lade die Seite neu.</div>;
  else push = <button className="btn btn-primary" disabled={busy === 'on'} onClick={pushOn}>{busy === 'on' ? 'Schalte ein…' : <>{I.bell} Benachrichtigungen einschalten</>}</button>;
  return (<>
    <p>Installiere Nightshelf als App auf dem Handy und am PC oder Mac. Sie startet wie ein eigenes Programm und funktioniert auch offline mit deinen gespeicherten Daten.</p>
    <div className="field"><label>Als App installieren</label>{st === 'prompt'
      ? <><button className="btn btn-primary" onClick={async () => { await Pwa.install(); tick(); }}>{I.install} Nightshelf installieren</button><div className="tiny mt-2">{Pwa.isMobile ? 'Die App landet auf deinem Startbildschirm.' : 'Die App bekommt ein eigenes Fenster, einen Eintrag im Startmenü bzw. Dock und ein Symbol in der Taskleiste.'}</div></>
      : INSTALL[st]?.()}</div>
    <div className="field mt-4"><label>Benachrichtigungen</label>
      <div className="tiny mb-2.5">Dein Server schaut alle 30 Minuten nach neuen Folgen und Kapiteln und meldet sich, auch wenn Nightshelf geschlossen ist. <details className="inline-more"><summary>Was wird gemeldet?</summary>Gemeldet wird alles mit Status „Am Schauen“, „Am Lesen“, „Pausiert“ oder „Fertig“, nicht Merkliste und Abgebrochen. Für Anime nutzt der Server die Sendetermine, die Nightshelf beim Öffnen lädt; sie reichen etwa sechs Wochen im Voraus.</details></div>
      {push}<div className="field-error mt-2">{err}</div></div>
  </>);
}

/* ---------- KI-Kontingent ---------- */
function AiPanel() {
  const [u, setU] = useState(null), [n, retry] = useTick();
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const r = await fetch(`${PSN.worker()}/ai-usage`, { headers: Sync.header() });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        if (j.full) markAiBlocked();
        on && setU(j);
      } catch { on && setU('error'); }
    })();
    return () => { on = false; };
  }, [n]);
  if (!u) return <p className="m-0">Lade dein Kontingent für heute…</p>;
  if (u === 'error') return <p className="m-0">Das Kontingent konnte gerade nicht geladen werden. <button type="button" className="link-btn" onClick={() => { setU(null); retry(); }}>Nochmal</button></p>;
  const pct = Math.min(100, Math.round(u.used / u.limit * 100));
  const avg = u.avg || 250;
  const games = u.full ? 0 : Math.max(0, Math.floor(u.remaining / avg));
  const reset = new Date(u.resetAt).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  return (<>
    <p>Gratis-Kontingent bei Cloudflare für heute. Es wird jeden Tag um {reset} Uhr wieder aufgefüllt.</p>
    <div className="quota-row">
      <div><div className="quota-big">{u.full ? 0 : u.remaining.toLocaleString('de-AT')}</div><div className="tiny">von {u.limit.toLocaleString('de-AT')} Neurons übrig</div></div>
      <div className="text-right"><div className="quota-big" style={{ color: games ? 'var(--cyan)' : 'var(--danger)' }}>≈ {games}</div><div className="tiny">Spiele heute noch möglich</div></div>
    </div>
    <div className={`bar quota-bar mt-3 ${pct >= 90 ? 'low' : ''}`}><i style={{ width: `${u.full ? 100 : pct}%` }} /></div>
    <div className="tiny mt-2">{u.full ? 'Heute aufgebraucht.' : `Heute ${u.runs} ${u.runs === 1 ? 'Liste' : 'Listen'} erstellt, im Schnitt ${avg} Neurons pro Spiel.`} Die Zahlen sind aus den Token-Mengen berechnet und können leicht von Cloudflares Abrechnung abweichen.</div>
  </>);
}

/* ---------- PlayStation ---------- */
function PsnPanel() {
  const [, tick] = useTick();
  const [npsso, setNpsso] = useState(''), [worker, setWorker] = useState(PSN.worker()), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const st = PSN.state(), on = PSN.connected();
  const connect = async () => {
    setErr('');
    const val = npsso.trim();
    if (!val) { setErr('Füge zuerst den NPSSO-Code ein.'); return; }
    if (!worker.trim()) { setErr('Es ist noch keine Server-Adresse eingetragen.'); return; }
    setBusy(true);
    try { await PSN.connect(val, worker); setNpsso(''); setBusy(false); tick(); toast(<Msg title="Mit PlayStation verbunden" />); runPsnSync(); }
    catch (e) { setBusy(false); setErr(e.code === 'npsso_invalid' || e.code === 'auth_failed' ? 'Der Code wird nicht akzeptiert. Hol dir einen neuen (Schritt 2).' : e.code === 'network' ? 'Server nicht erreichbar. Prüfe die Server-Adresse.' : e.code === 'key_required' ? 'Verbinde dieses Gerät zuerst oben unter „Sync zwischen Geräten“ mit deinem Schlüssel.' : 'Verbinden hat nicht geklappt: ' + e.message); }
  };
  return (<>
    {on ? <>
      <p>Verbunden. Die Anmeldung gilt bis {fmtDate(new Date(st.refreshExpiresAt).toISOString())}.{st.lastSync ? ` Zuletzt synchronisiert: ${deDT(st.lastSync)}.` : ''}</p>
      <Row className=""><button className="btn btn-primary" onClick={runPsnSync}>{I.refresh} Jetzt synchronisieren</button>
        <button className="btn btn-ghost btn-danger" onClick={() => { PSN.disconnect(); tick(); toast(<Msg title="PlayStation getrennt" />); }}>Trennen</button></Row>
    </> : <>
      <p>Hol dir alle Spiele, die du auf PS4 und PS5 gespielt hast, mit der echten Trophäenliste und deinen schon verdienten Trophäen.</p>
      <ol className="steps">
        <li>Melde dich auf <a href="https://www.playstation.com" target="_blank" rel="noopener">playstation.com</a> an.</li>
        <li>Öffne danach im selben Browser <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noopener">ca.account.sony.com/api/v1/ssocookie</a>.</li>
        <li>Kopiere den angezeigten Text (oder nur den Wert hinter „npsso“) und füge ihn hier ein.</li>
      </ol>
      <div className="field"><label>NPSSO-Code</label><div className="key-row"><input className="input" type="password" placeholder="64 Zeichen" autoComplete="off" spellCheck="false" value={npsso} onChange={e => setNpsso(e.target.value)} /><button className="btn btn-primary" disabled={busy} onClick={connect}>{busy ? 'Verbinde…' : 'Verbinden'}</button></div>
        <div className="tiny">Behandle den Code wie ein Passwort und gib ihn niemandem. Er wird nur einmal zum Anmelden verwendet und nicht gespeichert.</div><div className="field-error">{err}</div></div>
    </>}
    <details className="adv"><summary>Erweitert</summary>
      <div className="field mt-2.5"><label>Server-Adresse</label><input className="input" value={worker} placeholder="https://nightshelf-psn.….workers.dev" spellCheck="false" onChange={e => setWorker(e.target.value)} onBlur={e => PSN.save({ worker: e.target.value.trim() })} /></div>
    </details>
  </>);
}

/* ---------- Steam ---------- */
function SteamPanel() {
  const [, tick] = useTick();
  const [key, setKey] = useState(''), [prof, setProf] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const connect = async () => {
    setErr('');
    if (!/^[0-9A-Fa-f]{32}$/.test(key.trim())) { setErr('Der Schlüssel hat 32 Zeichen (Ziffern und A–F).'); return; }
    if (!Sync.enabled()) { setErr('Verbinde dieses Gerät zuerst oben unter „Sync zwischen Geräten“.'); return; }
    setBusy(true);
    try { const r = await Steam.connect(key.trim(), prof.trim()); setKey(''); setBusy(false); tick(); toast(<Msg title="Mit Steam verbunden" sub={r.name} />); }
    catch (e) { setBusy(false); setErr({ key_invalid: 'Der Schlüssel hat nicht das richtige Format.', key_rejected: 'Steam akzeptiert den Schlüssel nicht. Kopiere ihn nochmal von der Steam-Seite.', profile_not_found: 'Dieses Steam-Profil wurde nicht gefunden. Nimm den Link zu deinem Profil.', key_required: 'Verbinde dieses Gerät zuerst unter „Sync zwischen Geräten“.' }[e.code] || 'Steam ist gerade nicht erreichbar. Versuch es gleich nochmal.'); }
  };
  if (Steam.connected()) return (<>
    <p>Verbunden{Steam.profile() && <> als <b>{Steam.profile()}</b></>}. Beim Hinzufügen von Steam-Spielen werden die Erfolge automatisch geladen{Steam.hasProfile() ? ', schon freigeschaltete werden abgehakt' : ''}.</p>
    <Row className="">{Steam.hasProfile() && <button className="btn btn-primary" onClick={runSteamSync}>{I.refresh} Steam-Spiele synchronisieren</button>}
      <button className="btn btn-ghost btn-danger" onClick={async () => { await Steam.disconnect(); tick(); toast(<Msg title="Steam getrennt" />); }}>Trennen</button></Row>
  </>);
  return (<>
    <p>Lade die echten Steam-Erfolge deiner Spiele, mit Seltenheit. Die Stufe richtet sich danach, wie selten ein Erfolg ist.</p>
    <ol className="steps">
      <li>Melde dich auf <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener">steamcommunity.com/dev/apikey</a> an und erstelle einen Schlüssel. Als Domain kannst du z. B. <code>nightshelf</code> eintragen.</li>
      <li>Füge den Schlüssel hier ein. Optional dein Steam-Profil-Link, dann werden freigeschaltete Erfolge abgehakt.</li>
      <li>Für freigeschaltete Erfolge muss in Steam unter Profil → Privatsphäre „Spieldetails: Öffentlich“ eingestellt sein.</li>
    </ol>
    <div className="field"><label>Steam-API-Schlüssel</label><input className="input" type="password" placeholder="32 Zeichen" autoComplete="off" spellCheck="false" value={key} onChange={e => setKey(e.target.value)} /></div>
    <div className="field mt-2.5"><label>Steam-Profil <span className="tiny">(optional: Link, Name oder ID)</span></label><div className="key-row"><input className="input" placeholder="steamcommunity.com/id/…" autoComplete="off" spellCheck="false" value={prof} onChange={e => setProf(e.target.value)} /><button className="btn btn-primary" disabled={busy} onClick={connect}>{busy ? 'Verbinde…' : 'Verbinden'}</button></div>
      <div className="tiny">Der Schlüssel wird nur auf deinem eigenen Server gespeichert, geschützt durch deinen Sync-Schlüssel.</div><div className="field-error">{err}</div></div>
  </>);
}

/* ---------- Automatische Infos (TMDB) ---------- */
function LookupPanel() {
  const [tmdb, setTmdb] = useState(Lookup.keys().tmdb || ''), [out, setOut] = useState(null);
  const save = v => Lookup.setKeys({ ...Lookup.keys(), tmdb: v.trim() });
  const test = async () => {
    save(tmdb);
    if (!Lookup.hasKey('movie')) { setOut(<span style={{ color: 'var(--danger)' }}>Trag zuerst einen Schlüssel ein.</span>); return; }
    setOut('Teste…');
    try { await Lookup.test('movie'); setOut(<span style={{ color: 'var(--cyan)' }}>Funktioniert</span>); }
    catch (e) { setOut(<span style={{ color: 'var(--danger)' }}>{e.message === 'key' ? 'Schlüssel wird nicht akzeptiert.' : 'Keine Verbindung.'}</span>); }
  };
  return (<>
    <p>Beim Hinzufügen werden Cover, Erscheinungsdatum und Genre automatisch gesucht. Serien und Spiele funktionieren ohne Schlüssel. Für Filme brauchst du einen kostenlosen TMDB-Schlüssel. Er bleibt nur in diesem Browser gespeichert.</p>
    <div className="form">
      <div className="field"><label>Serien · TVmaze</label><div className="key-ok">Aktiv, kein Schlüssel nötig</div></div>
      <div className="field"><label>Filme · TMDB-Schlüssel</label><div className="key-row"><input className="input" placeholder="API-Schlüssel oder Lesezugriffs-Token" autoComplete="off" spellCheck="false" value={tmdb} onChange={e => { setTmdb(e.target.value); save(e.target.value); }} /><button className="btn" onClick={test}>Testen</button></div>
        <div className="tiny">Kostenlos auf <Ext href="https://www.themoviedb.org/settings/api">themoviedb.org/settings/api</Ext></div><div className="tiny">{out}</div></div>
      <div className="field"><label>Spiele · Wikipedia</label><div className="key-ok">Aktiv, kein Schlüssel nötig</div></div>
    </div>
  </>);
}

function BackupPanels() {
  const [err, setErr] = useState('');
  const exp = () => {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nightshelf-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const doImport = mode => e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    file.text().then(txt => {
      try { const c = Store.importJSON(txt, mode); setErr(''); toast(<Msg title={`${c} Einträge eingelesen`} />); refresh(); }
      catch { setErr('Das ist keine gültige Nightshelf-Datei.'); }
    });
  };
  return (<>
    <p>Lade alle Spiele, Serien, Filme und Trophäen als Datei herunter, oder lies eine Backupdatei ein. Beim Zusammenführen bleiben deine aktuellen Einträge erhalten.</p>
    <Row className=""><button className="btn btn-primary" onClick={exp}>{I.download} Backup herunterladen</button>
      <label className="btn">{I.upload} Datei zusammenführen<input type="file" accept=".json,application/json" hidden onChange={doImport('merge')} /></label>
      <label className="btn btn-ghost">Datei ersetzt alles<input type="file" accept=".json,application/json" hidden onChange={doImport('replace')} /></label></Row>
    <div className="field-error mt-2">{err}</div>
  </>);
}

/* Eine einklappbare Zeile: Titel, Status rechts, Inhalt beim Aufklappen */
function Fold({ title, status, on, open, children }) {
  return (
    <details className="set-row" open={open}>
      <summary><span className="set-title">{title}</span>{status && <span className={on ? 'set-status on' : 'set-status'}>{status}</span>}{I.chevron}</summary>
      <div className="set-body">{children}</div>
    </details>
  );
}

export function Settings({ animate }) {
  const n = Store.all().length;
  const steam = Steam.connected(), psn = PSN.connected(), sync = Sync.enabled(), app = Pwa.installState() === 'installed';
  return (
    <div className={animate ? 'fade-in' : ''} style={{ maxWidth: 720 }}>
      <div className="page-head"><div><h1 className="page-title">Daten</h1><p className="page-sub">{n} Einträge sind in diesem Browser gespeichert.</p></div></div>
      <h2 className="set-group">Sync & App</h2>
      <div className="set-list">
        <Fold title="Sync zwischen Geräten" status={sync ? 'Verbunden' : 'Aus'} on={sync} open={!sync}><SyncPanel /></Fold>
        <Fold title="App & Benachrichtigungen" status={app ? 'Installiert' : null} on={app}><AppPanel /></Fold>
      </div>
      <h2 className="set-group">Quellen</h2>
      <div className="set-list">
        <Fold title="PlayStation" status={psn ? 'Verbunden' : 'Nicht verbunden'} on={psn}><PsnPanel /></Fold>
        <Fold title="Steam" status={steam ? 'Verbunden' : 'Nicht verbunden'} on={steam}><SteamPanel /></Fold>
        <Fold title="Automatische Infos" status={Lookup.hasKey('movie') ? 'Alles aktiv' : 'Filme ohne Schlüssel'} on={Lookup.hasKey('movie')}><LookupPanel /></Fold>
        <Fold title="KI-Trophäen"><AiPanel /></Fold>
      </div>
      <h2 className="set-group">Sichern</h2>
      <div className="set-list">
        <Fold title="Backup & Wiederherstellen" open><BackupPanels /></Fold>
        <Fold title="Alles löschen"><p>Löscht alle Einträge in diesem Browser. Lade vorher ein Backup herunter.</p>
          <button className="btn btn-danger" onClick={() => confirmDialog('Alle Spiele, Serien, Filme und Trophäen in diesem Browser werden gelöscht.', 'Alles löschen', () => { Store.clear(); refresh(); })}>{I.trash} Alles löschen</button></Fold>
      </div>
      <p className="tiny set-credits">Serien-Infos von <Ext href="https://www.tvmaze.com">TVmaze</Ext> (CC BY-SA), Film-Infos von <Ext href="https://www.themoviedb.org">TMDB</Ext>, Spiele-Infos von <Ext href="https://www.wikipedia.org">Wikipedia</Ext> und <Ext href="https://www.wikidata.org">Wikidata</Ext>. Dieses Produkt nutzt die TMDB-API, ist aber nicht von TMDB unterstützt oder zertifiziert.</p>
    </div>
  );
}

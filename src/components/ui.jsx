/* Nightshelf – kleine Bausteine: Sterne, Status, Fenster, Toasts */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { I } from './icons.jsx';
import { STATUS, isCoarse, isMobileWidth } from '../lib/util.js';
import { modal, closeModal, openModal, toasts } from '../lib/bus.js';

export const cn = (...c) => c.filter(Boolean).join(' ');

/* ---------- Sterne ---------- */
export function StarsInput({ value = 0, onChange }) {
  return (
    <div className="stars" data-value={value}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} aria-label={`${n} Sterne`}
          onClick={() => onChange(value === n ? 0 : n)}>{I.star}</button>
      ))}
    </div>
  );
}

export function StatusPill({ item }) {
  const label = (STATUS[item.type] || {})[item.status];
  if (!label) return null;
  const cls = { done: 'st-done', active: 'st-active', planned: 'st-planned', paused: 'st-planned', dropped: 'st-dropped' }[item.status];
  return <span className={`status-pill ${cls}`}>{label}</span>;
}

/* Umschalter mit mehreren Knöpfen (z. B. Stufe, Art) */
export function Seg({ value, options, onChange, className = 'seg', render }) {
  return (
    <div className={className}>
      {options.map(([k, label, style]) => (
        <button key={k} type="button" className={value === k ? 'on' : ''} style={style} onClick={() => onChange(k)}>{render ? render(k, label) : label}</button>
      ))}
    </div>
  );
}

export function Chips({ value, options, onChange, className = '' }) {
  return (
    <div className={cn('chips', className)}>
      {options.map(([k, label]) => <button key={k} type="button" className={cn('chip', value === k && 'on')} onClick={() => onChange(k)}>{label}</button>)}
    </div>
  );
}

export const Dot = () => <span className="dot" />;
export const joinDots = parts => parts.filter(Boolean).flatMap((p, i) => i ? [<Dot key={`d${i}`} />, <span key={i}>{p}</span>] : [<span key={i}>{p}</span>]);

/* ---------- Fenster ---------- */
export function ModalFrame({ title, wide = false, foot, children, close }) {
  return (
    <div className={cn('modal', wide && 'wide')} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><button className="btn btn-ghost icon-btn" aria-label="Schließen" onClick={close}>{I.x}</button></div>
      <div className="modal-body">{children}</div>
      {foot && <div className="modal-foot">{foot}</div>}
    </div>
  );
}

// Seite im Hintergrund sperren, solange ein Fenster offen ist
let lockedY = null;
function lockScroll() {
  const html = document.documentElement;
  if (html.classList.contains('modal-open')) return;
  const gap = window.innerWidth - html.clientWidth;
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  if (isMobileWidth()) {
    // Handy: Seite festnageln, sonst lässt iOS sie trotzdem mitwischen
    lockedY = window.scrollY;
    Object.assign(document.body.style, { position: 'fixed', top: `-${lockedY}px`, left: '0', right: '0', width: '100%' });
  }
  html.classList.add('modal-open');
}
function unlockScroll() {
  const html = document.documentElement;
  if (!html.classList.contains('modal-open')) return;
  html.classList.remove('modal-open');
  Object.assign(document.body.style, { paddingRight: '', position: '', top: '', left: '', right: '', width: '' });
  if (lockedY != null) { window.scrollTo(0, lockedY); lockedY = null; }
}

export function ModalHost() {
  const { seq, render, open } = modal.use();
  const root = useRef(null);
  const close = () => closeModal(seq);

  useEffect(() => { if (render) lockScroll(); else unlockScroll(); }, [render]);

  // Einblenden: erst ohne „open“ zeichnen, dann im nächsten Frame „open“ setzen, damit die Animation läuft
  useLayoutEffect(() => {
    const r = root.current; if (!r) return;
    if (!open) { r.classList.remove('open'); return; }
    r.classList.remove('open'); void r.offsetWidth; r.classList.add('open');
  }, [open, seq]);

  useEffect(() => {
    if (!open) return;
    const r = root.current;
    const onKey = e => { if (e.key === 'Escape') closeModal(seq); };
    document.addEventListener('keydown', onKey);
    // Handy: Fenster am sichtbaren Bereich ausrichten (iOS schiebt die Ansicht sonst bei Tastatur/Fokus hoch).
    // Tastatur offen: Buttons ausblenden, damit das Formular den Platz bekommt.
    const vv = window.visualViewport;
    const touch = isMobileWidth();
    let maxH = vv ? vv.height : 0, sawShrink = false;
    const typing = () => { const f = document.activeElement; return !!f && r.contains(f) && f.matches('textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button])'); };
    const setKb = () => {
      const shrunk = vv ? maxH - vv.height > 120 : false;
      if (shrunk) sawShrink = true;
      const kb = touch && (shrunk || (typing() && !sawShrink));
      if (kb === r.classList.contains('kb-open')) return;
      r.classList.toggle('kb-open', kb);
      if (kb) { const f = document.activeElement; f && r.contains(f) && setTimeout(() => f.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250); }
    };
    const fit = () => {
      if (!vv) return;
      maxH = Math.max(maxH, vv.height);
      r.style.top = `${vv.offsetTop}px`; r.style.height = `${vv.height}px`; r.style.bottom = 'auto';
      setKb();
    };
    const onFocusIn = () => { sawShrink = false; setKb(); };
    const onFocusOut = () => setTimeout(setKb, 80);
    if (touch) { r.addEventListener('focusin', onFocusIn); r.addEventListener('focusout', onFocusOut); }
    if (vv && touch) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit(); }
    // Am Handy nicht automatisch ins erste Feld springen: das öffnet die Tastatur und verschiebt die Ansicht
    const first = r.querySelector('.modal input, .modal textarea, .modal select');
    const t = first && !isCoarse() ? setTimeout(() => first.focus(), 120) : null;
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      if (touch) { r.removeEventListener('focusin', onFocusIn); r.removeEventListener('focusout', onFocusOut); }
      if (vv && touch) { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit); }
      r.style.top = r.style.height = r.style.bottom = '';
      r.classList.remove('kb-open');
    };
  }, [open, seq]);

  return (
    <div className="modal-root" ref={root}>
      {render && <>
        <div className="modal-backdrop" onClick={close} />
        {render(close)}
      </>}
    </div>
  );
}

export function confirmDialog(text, okLabel, onOk) {
  openModal(close => (
    <ModalFrame title="Bist du sicher?" close={close}
      foot={<><button className="btn btn-ghost" onClick={close}>Abbrechen</button><button className="btn btn-primary" onClick={() => { close(); onOk(); }}>{okLabel}</button></>}>
      <p className="muted m-0">{text}</p>
    </ModalFrame>
  ));
}

/* ---------- Toasts ---------- */
export function ToastHost() {
  const list = toasts.use();
  return (
    <div className="toast-root">
      {list.map(t => typeof t.content === 'string'
        ? <div key={t.id} className={cn('toast', t.cls, t.out && 'out')} dangerouslySetInnerHTML={{ __html: t.content }} />
        : <div key={t.id} className={cn('toast', t.cls, t.out && 'out')}>{t.content}</div>)}
    </div>
  );
}

// Standard-Inhalt eines Toasts: fette Zeile plus kleine Zeile darunter
export const Msg = ({ title, sub }) => <div><b>{title}</b>{sub && <small>{sub}</small>}</div>;

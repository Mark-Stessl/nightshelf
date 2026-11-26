/* Nightshelf – Cover mit erzeugtem Farbverlauf als Grundlage */
import { useEffect, useState } from 'react';
import { hash, initials } from '../lib/util.js';
import { COVER_V, queueCover } from '../lib/covers.js';
import { cn } from './ui.jsx';

function Generated({ item, noTitle }) {
  const h = hash(item.title);
  const hue = 248 + (h % 46);
  const hue2 = (h >> 3) % 3 === 0 ? 188 : hue + 30;
  return (
    <div className="cover-gen" style={{ background: `radial-gradient(120% 80% at 100% 0%, hsla(${hue2},85%,60%,.45), transparent 55%), linear-gradient(160deg, hsl(${hue},60%,34%), hsl(${hue + 10},45%,12%))` }}>
      <div className="initials">{initials(item.title)}</div>
      {!noTitle && <div className="ctitle">{item.title}</div>}
    </div>
  );
}

/*
 * Rahmen mit Cover. Querformat-Bilder werden ganz gezeigt (unscharfer Hintergrund),
 * Logos auf dem Farbverlauf; für Spiele wird dann einmalig ein Hochformat-Cover gesucht.
 */
export function CoverBox({ item, className = 'cover', noTitle = false, as: Tag = 'div', children, style }) {
  const [shape, setShape] = useState(null); // null | { kind: 'wide', src } | { kind: 'logo' }
  const [failed, setFailed] = useState(false);
  const src = item.cover;
  useEffect(() => { setShape(null); setFailed(false); }, [src]);
  useEffect(() => {
    if (!src && item.type === 'game' && item.id && (item.coverV || 0) < COVER_V) queueCover(item.id);
  }, [src, item.id, item.type, item.coverV]);

  const onLoad = e => {
    const img = e.currentTarget;
    if (!img.naturalWidth || img.naturalWidth / img.naturalHeight <= 0.85) return;
    const s = img.currentSrc || img.src;
    setShape(/\.(png|svg)(\?|$)|logo/i.test(s) ? { kind: 'logo' } : { kind: 'wide', src: s });
    if (item.id) queueCover(item.id);
  };
  const onError = () => { setFailed(true); if (item.id) queueCover(item.id); };

  return (
    <Tag className={cn(className, shape?.kind === 'wide' && 'cover-wide', shape?.kind === 'logo' && 'cover-logo')}
      style={{ ...style, ...(shape?.kind === 'wide' ? { '--cover-bg': `url("${shape.src}")` } : null) }}>
      <Generated item={item} noTitle={noTitle} />
      {src && !failed && <img src={src} alt="" loading="lazy" onLoad={onLoad} onError={onError} />}
      {children}
    </Tag>
  );
}

// Einfaches Bild, das bei Fehlern verschwindet
export function SafeImg({ src, alt = '', ...rest }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  if (!src || bad) return null;
  return <img src={src} alt={alt} onError={() => setBad(true)} {...rest} />;
}

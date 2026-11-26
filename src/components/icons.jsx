/* Nightshelf – Symbole */
import { Trophies } from '../lib/trophies.js';

const S = ({ children, ...p }) => <svg viewBox="0 0 24 24" {...p}>{children}</svg>;

export const I = {
  plus: <S><path d="M12 5v14M5 12h14" /></S>,
  search: <S><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></S>,
  back: <S><path d="M15 18l-6-6 6-6" /></S>,
  edit: <S><path d="M4 20h4L19 9l-4-4L4 16z" /></S>,
  trash: <S><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></S>,
  x: <S><path d="M6 6l12 12M18 6L6 18" /></S>,
  check: <S><path d="M5 12.5l4.5 4.5L19 7.5" /></S>,
  sparkle: <S><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></S>,
  paste: <S><path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4" /></S>,
  info: <S><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></S>,
  star: <S><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" /></S>,
  trophy: <S><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /></S>,
  game: <S><path d="M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 15h-4l-1 .6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 11v3M5.5 12.5h3M16 12h.01M18 14h.01" /></S>,
  tv: <S><path d="M3 7h18v12H3zM8 3l4 4 4-4" /></S>,
  image: <S><path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5" /><circle cx="15.5" cy="9" r="1.5" /></S>,
  clock: <S><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>,
  share: <S><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" /></S>,
  download: <S><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></S>,
  upload: <S><path d="M12 20V9M7 14l5-5 5 5M5 4h14" /></S>,
  pause: <S><path d="M9 5v14M15 5v14" /></S>,
  play: <S><path d="M8 5l11 7-11 7z" /></S>,
  bookmark: <S><path d="M6 3h12v18l-6-4-6 4z" /></S>,
  calendar: <S><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" /></S>,
  bell: <S><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" /></S>,
  install: <S><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></S>,
  book: <S><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h6" /></S>,
  anime: <S><path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" /></S>,
  film: <S><path d="M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4" /></S>,
  chart: <S><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></S>,
  refresh: <S><path d="M20 11a8 8 0 0 0-14.9-3.9M4 5v4h4M4 13a8 8 0 0 0 14.9 3.9M20 19v-4h-4" /></S>,
  home: <S><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /></S>,
  shelf: <S><path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 5.2l3.8-1 3 15.6-3.8 1z" transform="translate(-1 0)" /></S>,
  gear: <S><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>,
  chevron: <S><path d="M6 9l6 6 6-6" /></S>,
  grid: <S><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></S>,
  shelfView: <S><path d="M5 5v13M9 7v11M13 4v14M17.5 7.5l2.5 10" /><path d="M3 20h18" /></S>,
};
export const typeIcon = t => ({ game: I.game, series: I.tv, anime: I.anime, manga: I.book, movie: I.film }[t]);

// Symbol in einem Toast (kräftigere Linie, feste Größe)
export const ToastIcon = ({ icon, color = 'var(--lilac)' }) => (
  <div className="tbadge" style={{ color }}>
    <span className="contents [&>svg]:size-5 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:[stroke-width:1.8]">{icon}</span>
  </div>
);

/* Pokal in Bronze, Silber, Gold oder Platin */
export function TrophyIcon({ tier, size = 22 }) {
  const c = (Trophies.TIERS[tier] || Trophies.TIERS.bronze).hex;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {tier === 'platinum' && <circle cx="12" cy="8" r="9" fill={c} opacity=".18" />}
      <path d="M7 3h10v5.5a5 5 0 0 1-10 0z" fill={c} />
      <path d="M7 5H4.5v1.2A3 3 0 0 0 7.4 9.5M17 5h2.5v1.2a3 3 0 0 1-2.9 3.3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13.5V17M8.5 20.5h7l-1-3.5h-5z" fill={c} />
      <path d="M9.5 4.6v3.2" stroke="#fff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

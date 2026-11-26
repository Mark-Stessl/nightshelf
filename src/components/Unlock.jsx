/* Nightshelf – Trophäen-Meldung wie auf der Konsole: oben, Stufe, Name, Spiel, Punkte */
import { Trophies } from '../lib/trophies.js';
import { unlocks } from '../lib/bus.js';
import { TrophyIcon } from './icons.jsx';
import { CoverBox } from './Cover.jsx';
import { cn } from './ui.jsx';

function Unlock({ u }) {
  const { t, game } = u;
  const tier = Trophies.TIERS[t.tier] || Trophies.TIERS.bronze;
  const plat = t.tier === 'platinum';
  return (
    <a className={cn('unlock', `ul-${t.tier}`, u.out && 'out')} href={`#/item/${game.id}`} style={{ '--tier': tier.hex }}>
      {plat ? <CoverBox item={game} noTitle className="ul-cover" as="span" /> : <span className="ul-icon"><TrophyIcon tier={t.tier} size={24} /></span>}
      <span className="ul-text">
        <b>{plat ? game.title : t.name}</b>
        <small><i>{plat ? "Platin" : tier.label}</i> · {plat ? "alle Trophäen gesammelt" : game.title}{t.rarity != null && ` · ${String(t.rarity).replace(".", ",")} %`} · +{tier.points}</small>
      </span>
    </a>
  );
}

export function UnlockHost() {
  const list = unlocks.use();
  return <div className="unlock-root" aria-live="polite">{list.map(u => <Unlock key={u.id} u={u} />)}</div>;
}

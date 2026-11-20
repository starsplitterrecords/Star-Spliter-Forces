'use client';
import { character } from '@/cards/characters';
import type { CardGame } from '@/cards/types';
import { animalGlyph } from '../Emblem';

/** Procedurally drawn character portraits: flat shapes, one prop, a lot of attitude. */
export function Portrait({ who, game, size = 180 }: { who: string; game: CardGame; size?: number }) {
  const c = character(who);
  const coat = who === 'self' ? game.movement.banner.primary : c.coat;
  const mouth = {
    smile: 'M84 128 Q100 142 116 128',
    flat: 'M86 132 L114 132',
    worried: 'M86 136 Q100 126 114 136',
    smug: 'M86 132 Q104 140 116 126',
  }[c.mood ?? 'flat'];
  if (who === 'animal') {
    return (
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Portrait of the ${game.movement.animal}`}>
        <circle cx="100" cy="100" r="92" fill={game.movement.banner.secondary} opacity="0.25" />
        <text x="100" y="135" textAnchor="middle" fontSize="110">
          {animalGlyph(game.movement.animal)}
        </text>
      </svg>
    );
  }
  if (who === 'dream') {
    return (
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="A dream">
        <circle cx="100" cy="100" r="92" fill="#2c3e50" />
        {[30, 60, 140, 160, 80].map((x, i) => (
          <circle key={i} cx={x} cy={30 + ((i * 37) % 120)} r="2.5" fill="#f4eedf" />
        ))}
        <path d="M120 50a45 45 0 1 0 30 80 38 38 0 1 1-30-80z" fill="#e8cf8a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Portrait of ${c.name(game)}`}>
      <circle cx="100" cy="100" r="92" fill={game.movement.banner.secondary} opacity="0.22" />
      {/* body */}
      <path d="M38 200 Q40 150 100 146 Q160 150 162 200 Z" fill={coat} />
      <path d="M88 150 L100 170 L112 150" fill="none" stroke="#11141b" strokeOpacity="0.25" strokeWidth="4" />
      {/* neck + head */}
      <rect x="88" y="128" width="24" height="24" fill={c.skin} />
      {c.hat === 'hood' && <path d="M50 120 Q50 40 100 38 Q150 40 150 120 L150 150 L50 150 Z" fill={coat} />}
      <ellipse cx="100" cy="100" rx="40" ry="46" fill={c.skin} />
      {/* hair */}
      {c.hat !== 'hood' && c.hat !== 'helmet' && <path d="M60 96 Q58 52 100 52 Q142 52 140 96 Q130 70 100 70 Q72 70 60 96 Z" fill={c.hair} />}
      {c.hat === 'bun' && <circle cx="100" cy="50" r="16" fill={c.hair} />}
      {/* eyes */}
      <circle cx="85" cy="100" r="4.5" fill="#11141b" />
      <circle cx="115" cy="100" r="4.5" fill="#11141b" />
      {c.mood === 'worried' && <path d="M76 88 L92 92 M124 88 L108 92" stroke="#11141b" strokeWidth="3" strokeLinecap="round" />}
      {c.mood === 'smug' && <path d="M76 92 L94 90 M106 90 L124 92" stroke="#11141b" strokeWidth="3" strokeLinecap="round" />}
      {c.glasses && (
        <g fill="none" stroke="#11141b" strokeWidth="3">
          <circle cx="85" cy="100" r="11" />
          <circle cx="115" cy="100" r="11" />
          <path d="M96 100 L104 100" />
        </g>
      )}
      {c.mustache && <path d="M82 120 Q92 112 100 118 Q108 112 118 120 Q108 126 100 122 Q92 126 82 120 Z" fill={c.hair} />}
      <path d={mouth} fill="none" stroke="#11141b" strokeWidth="3.5" strokeLinecap="round" />
      {/* hats */}
      {c.hat === 'top' && (
        <g fill="#1c212c">
          <rect x="68" y="56" width="64" height="8" rx="2" />
          <rect x="78" y="14" width="44" height="44" />
          <rect x="78" y="46" width="44" height="6" fill={game.movement.banner.primary} />
        </g>
      )}
      {c.hat === 'beret' && <ellipse cx="94" cy="58" rx="40" ry="14" fill={coat} />}
      {c.hat === 'cap' && <path d="M60 66 Q62 40 100 40 Q138 40 140 66 Z M120 64 L160 70 L140 66 Z" fill={coat} />}
      {c.hat === 'crown' && <path d="M66 62 L70 30 L86 48 L100 24 L114 48 L130 30 L134 62 Z" fill="#d8b55e" />}
      {c.hat === 'chef' && <path d="M72 64 L72 40 Q60 30 76 20 Q86 6 100 16 Q116 4 126 20 Q142 30 128 40 L128 64 Z" fill="#ffffff" stroke="#d0d5df" strokeWidth="2" />}
      {c.hat === 'helmet' && <path d="M58 82 Q58 44 100 44 Q142 44 142 82 L150 84 L50 84 Z" fill="#f1c40f" />}
      {/* prop */}
      {c.prop && (
        <text x="160" y="186" textAnchor="middle" fontSize="36">
          {c.prop}
        </text>
      )}
    </svg>
  );
}

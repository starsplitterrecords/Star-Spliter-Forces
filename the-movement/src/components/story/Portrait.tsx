'use client';
import type { PortraitSpec } from '@/story/types';

const SKIN = ['#f2c9a0', '#e0b090', '#c68a62', '#a8704a', '#8d5a3b', '#f0d0b8'];
const HAIR = ['#1a1a1a', '#4a3a2a', '#a87a4a', '#b8b8c0', '#7a2a1a', '#d4a72c'];
const COAT = ['#3d5a80', '#9b2226', '#2e8b57', '#7a8399', '#e67e22', '#8e44ad', '#16a085'];
const HATS: PortraitSpec['hat'][] = ['none', 'none', 'cap', 'beret', 'bun', 'none'];

/** A deterministic portrait for anonymous members and outsiders. */
export function anonSpec(seed: number, partial?: Partial<PortraitSpec>): PortraitSpec {
  const p = (arr: unknown[], k: number) => arr[Math.floor(seed / k) % arr.length];
  return {
    skin: p(SKIN, 1) as string, hair: p(HAIR, 7) as string, coat: p(COAT, 13) as string, hat: p(HATS, 29) as PortraitSpec['hat'],
    glasses: Math.floor(seed / 31) % 3 === 0, mustache: Math.floor(seed / 37) % 5 === 0, mood: (['smile', 'flat', 'worried', 'smug'] as const)[Math.floor(seed / 41) % 4], ...partial,
  };
}

export function Portrait({ spec, size = 180, label, accent = '#d4a72c' }: { spec: PortraitSpec; size?: number; label: string; accent?: string }) {
  const c = spec;
  const mouth = { smile: 'M84 128 Q100 142 116 128', flat: 'M86 132 L114 132', worried: 'M86 136 Q100 126 114 136', smug: 'M86 132 Q104 140 116 126' }[c.mood ?? 'flat'];
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label}>
      <circle cx="100" cy="100" r="92" fill={accent} opacity="0.2" />
      <path d="M38 200 Q40 150 100 146 Q160 150 162 200 Z" fill={c.coat} />
      <path d="M88 150 L100 170 L112 150" fill="none" stroke="#11141b" strokeOpacity="0.25" strokeWidth="4" />
      <rect x="88" y="128" width="24" height="24" fill={c.skin} />
      {c.hat === 'hood' && <path d="M50 120 Q50 40 100 38 Q150 40 150 120 L150 150 L50 150 Z" fill={c.coat} />}
      <ellipse cx="100" cy="100" rx="40" ry="46" fill={c.skin} />
      {c.hat !== 'hood' && c.hat !== 'helmet' && <path d="M60 96 Q58 52 100 52 Q142 52 140 96 Q130 70 100 70 Q72 70 60 96 Z" fill={c.hair} />}
      {c.hat === 'bun' && <circle cx="100" cy="50" r="16" fill={c.hair} />}
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
      {c.hat === 'top' && <g fill="#1c212c"><rect x="68" y="56" width="64" height="8" rx="2" /><rect x="78" y="14" width="44" height="44" /></g>}
      {c.hat === 'beret' && <ellipse cx="94" cy="58" rx="40" ry="14" fill={c.coat} />}
      {c.hat === 'cap' && <path d="M60 66 Q62 40 100 40 Q138 40 140 66 Z M120 64 L160 70 L140 66 Z" fill={c.coat} />}
      {c.hat === 'crown' && <path d="M66 62 L70 30 L86 48 L100 24 L114 48 L130 30 L134 62 Z" fill="#d8b55e" />}
      {c.hat === 'chef' && <path d="M72 64 L72 40 Q60 30 76 20 Q86 6 100 16 Q116 4 126 20 Q142 30 128 40 L128 64 Z" fill="#ffffff" stroke="#d0d5df" strokeWidth="2" />}
      {c.hat === 'helmet' && <path d="M58 82 Q58 44 100 44 Q142 44 142 82 L150 84 L50 84 Z" fill="#f1c40f" />}
      {c.prop && <text x="160" y="186" textAnchor="middle" fontSize="36">{c.prop}</text>}
    </svg>
  );
}

'use client';
import { SPIRIT_ANIMALS } from '@/content/presets';
import type { Banner } from '@/engine/types';

export function animalGlyph(name: string): string {
  return SPIRIT_ANIMALS.find((a) => a.name.toLowerCase() === name.toLowerCase())?.glyph ?? name.charAt(0).toUpperCase();
}

const SHAPES: Record<Banner['shape'], string> = {
  shield: 'M10 6h80v46c0 22-18 34-40 42C28 86 10 74 10 52z',
  circle: 'M50 4a46 46 0 1 0 0.01 0z',
  diamond: 'M50 4 96 50 50 96 4 50z',
  pennant: 'M8 6h84v60L50 96 8 66z',
  hexagon: 'M50 4 92 27v46L50 96 8 73V27z',
};

function Symbol({ symbol, animal, color }: { symbol: string; animal: string; color: string }) {
  switch (symbol) {
    case 'sun':
      return (
        <g fill={color}>
          <circle cx="50" cy="48" r="13" />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x="48.5" y="22" width="3" height="9" transform={`rotate(${i * 30} 50 48)`} />
          ))}
        </g>
      );
    case 'star':
      return <path fill={color} d="M50 24l7 16 17 1-13 11 4 17-15-9-15 9 4-17-13-11 17-1z" />;
    case 'eye':
      return (
        <g>
          <path d="M24 48c14-18 38-18 52 0-14 18-38 18-52 0z" fill={color} />
          <circle cx="50" cy="48" r="7" fill="#111" />
        </g>
      );
    case 'spiral':
      return <path d="M50 48m0-3a3 3 0 1 1-3 3 7 7 0 0 1 7-7 11 11 0 0 1 11 11 15 15 0 0 1-15 15 19 19 0 0 1-19-19 23 23 0 0 1 23-23" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case 'crown':
      return <path fill={color} d="M28 60l-4-24 14 10 12-16 12 16 14-10-4 24z" />;
    case 'circle':
      return <circle cx="50" cy="48" r="16" fill="none" stroke={color} strokeWidth="6" />;
    default:
      return (
        <text x="50" y="58" textAnchor="middle" fontSize="30" aria-hidden>
          {animalGlyph(animal)}
        </text>
      );
  }
}

export function Emblem({ banner, animal, size = 64, title }: { banner: Banner; animal: string; size?: number; title?: string }) {
  const id = `clip-${banner.shape}-${banner.primary.slice(1)}-${banner.secondary.slice(1)}-${banner.pattern}`;
  const d = SHAPES[banner.shape];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title ?? 'Movement emblem'}>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="100" height="100" fill={banner.primary} />
        {banner.pattern === 'stripe' && <rect x="0" y="38" width="100" height="22" fill={banner.secondary} />}
        {banner.pattern === 'chevron' && <path d="M0 20 50 60 100 20v26L50 86 0 46z" fill={banner.secondary} />}
        {banner.pattern === 'quartered' && (
          <>
            <rect x="50" y="0" width="50" height="50" fill={banner.secondary} />
            <rect x="0" y="50" width="50" height="50" fill={banner.secondary} />
          </>
        )}
        {banner.pattern === 'border' && <path d={d} fill="none" stroke={banner.secondary} strokeWidth="14" />}
        <Symbol symbol={banner.symbol} animal={animal} color={banner.pattern === 'solid' || banner.pattern === 'border' ? banner.secondary : banner.accent} />
      </g>
      <path d={d} fill="none" stroke={banner.accent} strokeWidth="3" />
    </svg>
  );
}

/** A flag on a pole, used on the map legend and HQ. */
export function Flag({ banner, width = 120 }: { banner: Banner; width?: number }) {
  return (
    <svg viewBox="0 0 120 80" width={width} height={(width * 80) / 120} aria-hidden>
      <rect x="4" y="2" width="3" height="78" fill="#a8afc0" />
      <path d="M7 4h100l-10 20 10 20H7z" fill={banner.primary} />
      {banner.pattern !== 'solid' && <path d="M7 18h92l-4 6 4 6H7z" fill={banner.secondary} />}
      <circle cx="40" cy="24" r="7" fill={banner.accent} />
    </svg>
  );
}

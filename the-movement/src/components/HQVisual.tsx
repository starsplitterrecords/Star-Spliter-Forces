'use client';
import type { Banner } from '@/engine/types';

/** Procedural headquarters that grows grander (and more bureaucratic) over time. */
export function HQVisual({ type, banner, level, bureaucracy = 0, width = 220 }: { type: string; banner: Banner; level: number; bureaucracy?: number; width?: number }) {
  const t = type.toLowerCase();
  const base = banner.primary;
  const trim = banner.secondary;
  const unit = (x: number, scale: number, key: string) => {
    const s = scale;
    if (/yurt|dome|castle/.test(t))
      return (
        <g key={key} transform={`translate(${x} ${100 - 30 * s}) scale(${s})`}>
          <rect x="0" y="12" width="40" height="18" fill={base} />
          <path d="M-2 13 20 0 42 13z" fill={trim} />
          <rect x="16" y="18" width="8" height="12" fill="#1c212c" />
        </g>
      );
    if (/tent/.test(t))
      return (
        <g key={key} transform={`translate(${x} ${100 - 30 * s}) scale(${s})`}>
          <path d="M0 30 20 0 40 30z" fill={base} />
          <path d="M16 30 20 18 24 30z" fill="#1c212c" />
        </g>
      );
    if (/tree/.test(t))
      return (
        <g key={key} transform={`translate(${x} ${100 - 40 * s}) scale(${s})`}>
          <rect x="17" y="18" width="6" height="22" fill="#6b4f2a" />
          <circle cx="20" cy="12" r="14" fill="#2e7d4f" />
          <rect x="10" y="8" width="20" height="10" fill={base} />
        </g>
      );
    if (/cave|bunker|underground|basement/.test(t))
      return (
        <g key={key} transform={`translate(${x} ${100 - 22 * s}) scale(${s})`}>
          <path d="M0 22a20 20 0 0 1 40 0z" fill="#4b5468" />
          <path d="M12 22a8 8 0 0 1 16 0z" fill="#11141b" />
          <rect x="18" y="0" width="2" height="10" fill={trim} />
        </g>
      );
    return (
      <g key={key} transform={`translate(${x} ${100 - 30 * s}) scale(${s})`}>
        <rect x="0" y="8" width="40" height="22" fill={base} />
        <path d="M-2 9 20 0 42 9z" fill={trim} />
        <rect x="6" y="14" width="6" height="6" fill="#e8cf8a" />
        <rect x="28" y="14" width="6" height="6" fill="#e8cf8a" />
        <rect x="17" y="18" width="7" height="12" fill="#1c212c" />
      </g>
    );
  };
  const units = [unit(90, 1.3, 'main')];
  const positions = [40, 140, 0, 180, 60, 120];
  for (let i = 0; i < Math.min(6, level); i++) units.push(unit(positions[i], 0.8 + (i % 2) * 0.15, `w${i}`));
  return (
    <svg viewBox="0 0 220 110" width={width} height={(width * 110) / 220} role="img" aria-label={`Headquarters: ${type}, level ${level + 1}`}>
      <rect x="0" y="100" width="220" height="10" fill="#262c3a" />
      {level >= 3 && <rect x="20" y="40" width="10" height="60" fill="#7a8399" aria-hidden />}
      {level >= 4 && <path d="M80 30h60v8H80z" fill={trim} />}
      {units}
      <g transform="translate(112 20)">
        <rect x="0" y="0" width="2" height={30 - Math.min(20, level * 3)} fill="#a8afc0" />
        <path d="M2 0h18l-4 5 4 5H2z" fill={base} />
      </g>
      {bureaucracy > 40 && (
        <g aria-hidden>
          {Array.from({ length: Math.min(8, Math.floor(bureaucracy / 12)) }).map((_, i) => (
            <rect key={i} x={190 - i * 3} y={92 - i * 4} width="22" height="4" fill="#f4eedf" stroke="#a8afc0" strokeWidth="0.5" />
          ))}
        </g>
      )}
    </svg>
  );
}

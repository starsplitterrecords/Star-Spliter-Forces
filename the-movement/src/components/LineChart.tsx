'use client';
import { useMemo, useState } from 'react';
import { duration, fmt } from '@/engine/text';

export interface Series {
  label: string;
  color: string;
  values: { t: number; v: number }[];
  dash?: string;
}

/** Lightweight, dependency-free SVG line chart with hover readout. */
export function LineChart({ series, height = 180, unit = '', yFormat = fmt, title }: { series: Series[]; height?: number; unit?: string; yFormat?: (n: number) => string; title: string }) {
  const W = 600;
  const H = height;
  const P = { l: 52, r: 10, t: 10, b: 24 };
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values);
  const { tMin, tMax, vMax } = useMemo(() => {
    const ts = all.map((p) => p.t);
    return { tMin: Math.min(...ts, 0), tMax: Math.max(...ts, 1), vMax: Math.max(1e-9, ...all.map((p) => p.v)) };
  }, [all]);
  if (all.length < 2) return <p className="text-sm text-ink-400">Not enough history yet. Data is recorded every few seconds.</p>;
  const x = (t: number) => P.l + ((t - tMin) / Math.max(1e-9, tMax - tMin)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / vMax) * (H - P.t - P.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * vMax);
  const hoverT = hover != null ? tMin + ((hover - P.l) / (W - P.l - P.r)) * (tMax - tMin) : null;
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${title}. Latest: ${series.map((s) => `${s.label} ${yFormat(s.values[s.values.length - 1]?.v ?? 0)}${unit}`).join(', ')}`}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(((e.clientX - r.left) / r.width) * W);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#262c3a" />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#7a8399">
              {yFormat(v)}
              {unit}
            </text>
          </g>
        ))}
        <text x={P.l} y={H - 6} fontSize="10" fill="#7a8399">
          {duration(tMin)}
        </text>
        <text x={W - P.r} y={H - 6} fontSize="10" fill="#7a8399" textAnchor="end">
          {duration(tMax)} (game time)
        </text>
        {series.map((s) => (
          <polyline key={s.label} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} points={s.values.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} />
        ))}
        {hoverT != null && hover! >= P.l && (
          <g>
            <line x1={hover!} x2={hover!} y1={P.t} y2={H - P.b} stroke="#7a8399" strokeDasharray="3 3" />
            {series.map((s, i) => {
              const pt = s.values.reduce((a, b) => (Math.abs(b.t - hoverT) < Math.abs(a.t - hoverT) ? b : a), s.values[0]);
              return (
                <text key={s.label} x={Math.min(hover! + 6, W - 140)} y={P.t + 12 + i * 13} fontSize="11" fill={s.color}>
                  {s.label}: {yFormat(pt.v)}
                  {unit}
                </text>
              );
            })}
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-xs">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <svg width="16" height="6" aria-hidden>
              <line x1="0" x2="16" y1="3" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

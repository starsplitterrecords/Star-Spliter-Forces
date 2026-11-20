'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fmt } from '@/engine/text';
import { useStore } from '@/store/game';

export function useReducedMotion(): boolean {
  const anim = useStore((s) => s.globalSettings.animation);
  const [sys, setSys] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSys(m.matches);
    const f = () => setSys(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return sys || anim !== 'full';
}

/** Counts toward a value smoothly; exact value available in the title attribute. */
export function AnimatedNumber({ value, className, exact }: { value: number; className?: string; exact?: boolean }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const b = value;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 450);
      const v = a + (b - a) * (1 - Math.pow(1 - k, 3));
      setShown(v);
      from.current = v;
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, reduced]);
  return (
    <span className={`tabular ${className ?? ''}`} title={Math.round(value).toLocaleString('en-US')}>
      {exact ? Math.round(shown).toLocaleString('en-US') : fmt(shown)}
    </span>
  );
}

export function Progress({ value, max = 1, color, label, marker }: { value: number; max?: number; color?: string; label?: string; marker?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink-700" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color ?? 'var(--mv-primary)' }} />
      {marker != null && <div className="absolute top-0 h-full w-0.5 bg-brass-300" style={{ left: `${marker * 100}%` }} aria-hidden />}
    </div>
  );
}

export function Modal({ title, onClose, children, wide, doc, labelledBy }: { title: ReactNode; onClose?: () => void; children: ReactNode; wide?: boolean; doc?: boolean; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? 'modal-title'}
        className={`fadeup max-h-[92vh] w-full overflow-y-auto scroll-thin outline-none ${wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'} ${doc ? 'doc' : 'card'} rounded-b-none sm:rounded-lg`}
      >
        <div className={`sticky top-0 z-10 flex items-center justify-between gap-2 border-b px-4 py-3 ${doc ? 'border-parchment-300 bg-parchment-50' : 'border-ink-700 bg-ink-900'}`}>
          <h2 id={labelledBy ?? 'modal-title'} className="font-serif text-lg font-bold">
            {title}
          </h2>
          {onClose && (
            <button className={doc ? 'btn btn-sm border border-ink-300 text-ink-800 hover:bg-parchment-200' : 'btn-ghost btn-sm'} onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children, side = 'right', width = 'sm:w-[440px]' }: { title: ReactNode; onClose: () => void; children: ReactNode; side?: 'right' | 'left'; width?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <aside
      className={`fadeup absolute inset-x-0 bottom-0 z-30 flex max-h-[78%] flex-col border-ink-700 bg-ink-900/97 shadow-2xl backdrop-blur sm:inset-y-0 sm:max-h-none ${width} ${side === 'right' ? 'sm:left-auto sm:right-0 sm:border-l' : 'sm:right-auto sm:left-0 sm:border-r'} rounded-t-xl border-t sm:rounded-none sm:border-t-0`}
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-4 py-3">
        <h2 className="font-serif text-lg font-bold">{title}</h2>
        <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 scroll-thin">{children}</div>
    </aside>
  );
}

export function StatBlock({ label, children, title }: { label: string; children: ReactNode; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <div className="label truncate">{label}</div>
      <div className="truncate font-serif text-base font-semibold sm:text-lg">{children}</div>
    </div>
  );
}

export function Slider({ label, left, right, value, onChange }: { label: string; left: string; right: string; value: number; onChange: (v: number) => void }) {
  const id = `sl-${label.replace(/\s/g, '')}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-3">
        <span className="w-20 text-right text-sm text-ink-200">{left}</span>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-[#d8b55e]"
          aria-valuetext={value < 35 ? left : value > 65 ? right : 'balanced'}
        />
        <span className="w-20 text-sm text-ink-200">{right}</span>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-ink-600 p-4 text-center text-sm text-ink-400">{children}</p>;
}

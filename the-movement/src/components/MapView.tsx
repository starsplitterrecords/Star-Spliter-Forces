'use client';
import { geoGraticule10, geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import worldTopo from 'world-atlas/countries-110m.json';
import { getCountryShares } from '@/engine/core';
import { CITIES, CITY_BY_ID, COUNTRIES, countryName, populationTier } from '@/engine/geo';
import { liveFactions } from '@/engine/factions';
import { fmt, pct } from '@/engine/text';
import type { GameState } from '@/engine/types';
import { type Overlay, useStore } from '@/store/game';
import { useReducedMotion } from './ui';

type Feat = { id: string; properties: { name: string }; geometry: unknown };
const topo = worldTopo as unknown as Topology;
const countriesGeo = (feature(topo, topo.objects.countries) as unknown as { features: Feat[] }).features;
const MAPID_TO_CC: Record<string, string> = {};
for (const c of COUNTRIES) if (c.mapId) MAPID_TO_CC[c.mapId] = c.code;

function hexToRgb(h: string): [number, number, number] {
  const m = h.replace('#', '');
  const v = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function mix(a: [number, number, number], b: [number, number, number], t: number) {
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}
/** Ensure the movement color is visible against the dark map (lighten very dark colors). */
function visible(rgb: [number, number, number]): [number, number, number] {
  const l = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  if (l > 90) return rgb;
  const k = (90 - l) / 255;
  return [rgb[0] + (255 - rgb[0]) * k, rgb[1] + (255 - rgb[1]) * k, rgb[2] + (255 - rgb[2]) * k] as [number, number, number];
}

interface Marker {
  x: number;
  y: number;
  r: number;
  id?: number;
  count?: number;
  ids?: number[];
}

const LAND: [number, number, number] = [38, 44, 58];
const RED: [number, number, number] = [214, 84, 84];

export default function MapView({ game, version }: { game: GameState; version: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500, dpr: 1 });
  const view = useRef({ k: 1, x: 0, y: 0 });
  const [viewVersion, setViewVersion] = useState(0);
  const markers = useRef<Marker[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number; id: number } | null>(null);
  const [search, setSearch] = useState('');
  const reduced = useReducedMotion();
  const { selectedCity, selectCity, overlay, setOverlay, dispatchFx } = useStore();
  const primary = useMemo(() => visible(hexToRgb(game.movement.banner.primary)), [game.movement.banner.primary]);
  const secondary = useMemo(() => hexToRgb(game.movement.banner.secondary), [game.movement.banner.secondary]);

  // projection + cached paths
  const geo = useMemo(() => {
    const proj = geoNaturalEarth1().fitExtent(
      [
        [8, 8],
        [size.w - 8, size.h - 8],
      ],
      { type: 'Sphere' } as GeoPermissibleObjects,
    );
    const path = geoPath(proj);
    const paths = countriesGeo.map((f) => ({ id: String(f.id), cc: MAPID_TO_CC[String(f.id)], name: f.properties.name, p: new Path2D(path(f as unknown as GeoPermissibleObjects) ?? '') }));
    const sphere = new Path2D(path({ type: 'Sphere' } as GeoPermissibleObjects) ?? '');
    const grat = new Path2D(path(geoGraticule10()) ?? '');
    const xy = new Float32Array(CITIES.length * 2);
    for (const c of CITIES) {
      const p = proj([c.lon, c.lat]) ?? [0, 0];
      xy[c.idx * 2] = p[0];
      xy[c.idx * 2 + 1] = p[1];
    }
    return { proj, paths, sphere, grat, xy };
  }, [size.w, size.h]);

  // initial view: focus on HQ region
  const centered = useRef('');
  useEffect(() => {
    // (re)center on the headquarters on first render and whenever the viewport size changes
    const key = `${size.w}x${size.h}`;
    if (centered.current === key) return;
    centered.current = key;
    const hq = CITY_BY_ID.get(game.movement.headquarters.cityId)!;
    const k = Math.max(4, view.current.k);
    view.current = { k, x: size.w / 2 - geo.xy[hq.idx * 2] * k, y: size.h / 2 - geo.xy[hq.idx * 2 + 1] * k };
    setViewVersion((v) => v + 1);
  }, [geo, size, game.movement.headquarters.cityId]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(200, r.width), h: Math.max(200, r.height), dpr: Math.min(2, window.devicePixelRatio || 1) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const centerOn = useCallback(
    (id: number, k = Math.max(view.current.k, 6)) => {
      const c = CITY_BY_ID.get(id);
      if (!c) return;
      view.current = { k, x: size.w / 2 - geo.xy[c.idx * 2] * k, y: size.h / 2 - geo.xy[c.idx * 2 + 1] * k };
      setViewVersion((v) => v + 1);
    },
    [geo, size],
  );

  // expose centering for other components
  useEffect(() => {
    (window as unknown as { __centerCity?: (id: number) => void }).__centerCity = (id: number) => centerOn(id);
  }, [centerOn]);

  const draw = useCallback(
    (now: number) => {
      const cv = canvas.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const { w, h, dpr } = size;
      const { k, x, y } = view.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0b0d12';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.fillStyle = '#0f1520';
      ctx.fill(geo.sphere);
      ctx.strokeStyle = 'rgba(122,131,153,0.08)';
      ctx.lineWidth = 0.6 / k;
      ctx.stroke(geo.grat);
      const shares = getCountryShares(game);
      // country resistance & rival presence for overlays
      let countryRes: Record<string, number> = {};
      let countryRival: Record<string, number> = {};
      if (overlay === 'resistance' || overlay === 'rivals') {
        const acc: Record<string, { s: number; n: number; r: number }> = {};
        for (const id of game.touched) {
          const d = game.cities[id];
          const cc = CITY_BY_ID.get(id)!.cc;
          const a = (acc[cc] ??= { s: 0, n: 0, r: 0 });
          a.s += d.resistance;
          a.n++;
          for (const kk in d.others) a.r += d.others[kk];
        }
        countryRes = Object.fromEntries(Object.entries(acc).map(([cc, a]) => [cc, a.s / a.n]));
        countryRival = Object.fromEntries(Object.entries(acc).map(([cc, a]) => [cc, a.r]));
      }
      for (const c of geo.paths) {
        const share = c.cc ? shares[c.cc] ?? 0 : 0;
        let fill: string;
        if (overlay === 'resistance') fill = countryRes[c.cc] != null ? mix(LAND, RED, countryRes[c.cc] * 2) : `rgb(${LAND.join(',')})`;
        else if (overlay === 'rivals') fill = countryRival[c.cc] ? mix(LAND, [200, 120, 60], 0.25 + Math.min(0.6, Math.log10(1 + countryRival[c.cc]) / 12)) : `rgb(${LAND.join(',')})`;
        else fill = share > 0 ? mix(LAND, primary, 0.12 + Math.sqrt(share) * 0.85) : `rgb(${LAND.join(',')})`;
        ctx.fillStyle = fill;
        ctx.fill(c.p);
        ctx.strokeStyle = 'rgba(11,13,18,0.9)';
        ctx.lineWidth = 0.5 / k;
        ctx.stroke(c.p);
      }
      ctx.restore();

      // routes for active campaigns
      const active = Object.values(game.campaigns).filter((c) => c.status === 'active');
      const hq = CITY_BY_ID.get(game.movement.headquarters.cityId)!;
      const sx = (idx: number) => geo.xy[idx * 2] * k + x;
      const sy = (idx: number) => geo.xy[idx * 2 + 1] * k + y;
      const t = now / 1000;
      ctx.lineWidth = 1.5;
      for (const c of active) {
        const to = CITY_BY_ID.get(c.cityId)!;
        let from = hq;
        let best = Infinity;
        for (const id of game.touched) {
          const d = game.cities[id];
          if (!d.controlled || id === c.cityId) continue;
          const o = CITY_BY_ID.get(id)!;
          const dd = (o.lat - to.lat) ** 2 + (o.lon - to.lon) ** 2;
          if (dd < best) {
            best = dd;
            from = o;
          }
        }
        const x0 = sx(from.idx), y0 = sy(from.idx), x1 = sx(to.idx), y1 = sy(to.idx);
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.hypot(x1 - x0, y1 - y0) * 0.2;
        ctx.strokeStyle = `rgba(${secondary.join(',')},0.8)`;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = reduced ? 0 : -t * 20;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx, my, x1, y1);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // markers
      const ids = new Set<number>(game.discovered);
      for (const id of game.touched) if (game.cities[id].followers > 0) ids.add(id);
      const list: Marker[] = [];
      const cluster = k < 3 && ids.size > 250;
      const bins = new Map<string, Marker>();
      const rivalsSet = new Set(liveFactions(game).map((f) => f.id));
      for (const id of ids) {
        const c = CITY_BY_ID.get(id)!;
        const px = sx(c.idx), py = sy(c.idx);
        if (px < -20 || py < -20 || px > w + 20 || py > h + 20) continue;
        const tier = populationTier(c.pop).tier;
        const r = 1.6 + tier * 0.7 * Math.min(1.6, Math.sqrt(k) / 1.4);
        if (cluster && id !== selectedCity && !game.cities[id].campaignId) {
          const key = `${Math.floor(px / 24)}:${Math.floor(py / 24)}`;
          const b = bins.get(key);
          if (b) {
            b.count! += 1;
            b.ids!.push(id);
          } else bins.set(key, { x: px, y: py, r, count: 1, ids: [id] });
          continue;
        }
        list.push({ x: px, y: py, r, id });
      }
      for (const b of bins.values()) {
        if (b.count === 1) list.push({ x: b.x, y: b.y, r: b.r, id: b.ids![0] });
        else {
          let f = 0, p = 0;
          for (const id of b.ids!) {
            f += game.cities[id]?.followers ?? 0;
            p += CITY_BY_ID.get(id)!.pop;
          }
          const conv = f / p;
          ctx.fillStyle = mix([90, 98, 118], primary, conv);
          ctx.beginPath();
          ctx.arc(b.x, b.y, 6 + Math.min(10, Math.sqrt(b.count!) * 1.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(236,238,243,0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#0b0d12';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(b.count), b.x, b.y);
          list.push({ x: b.x, y: b.y, r: 12, count: b.count, ids: b.ids });
        }
      }
      const labels: { x: number; y: number; text: string; strong?: boolean }[] = [];
      for (const m of list) {
        if (m.id == null) continue;
        const d = game.cities[m.id];
        const c = CITY_BY_ID.get(m.id)!;
        const conv = d ? d.followers / c.pop : 0;
        let color = mix([110, 118, 138], primary, conv * 1.1);
        if (overlay === 'resistance') color = mix([110, 118, 138], RED, (d?.resistance ?? 0) * 2);
        if (overlay === 'passive') color = mix([110, 118, 138], [94, 200, 160], Math.min(1, (d?.passiveGained ?? 0) / Math.max(1, d?.followers ?? 1)));
        if (overlay === 'stability') color = d?.controlled ? '#5ec8a0' : conv > 0.6 ? '#e8cf8a' : 'rgb(110,118,138)';
        if (overlay === 'rivals') color = d && Object.keys(d.others).some((x) => rivalsSet.has(x)) ? 'rgb(214,140,70)' : 'rgb(80,86,100)';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        if (d?.controlled) {
          ctx.strokeStyle = '#e8cf8a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (!d?.followers) {
          ctx.strokeStyle = 'rgba(236,238,243,0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // campaign ring
        if (d?.campaignId) {
          const pulse = reduced ? 0 : (Math.sin(t * 4) + 1) * 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r + 4 + pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          labels.push({ x: m.x, y: m.y - m.r - 8, text: `${c.name} ${Math.floor(conv * 100)}%`, strong: true });
        }
        if (d?.outpostId && (overlay === 'outposts' || overlay === 'followers' || overlay === 'zealots')) {
          ctx.fillStyle = `rgb(${secondary.join(',')})`;
          ctx.fillRect(m.x + m.r - 1, m.y - m.r - 5, 6, 6);
          ctx.strokeStyle = '#0b0d12';
          ctx.strokeRect(m.x + m.r - 1, m.y - m.r - 5, 6, 6);
        }
        if (d && Object.keys(d.others).length && overlay !== 'resistance') {
          ctx.fillStyle = 'rgb(214,140,70)';
          ctx.beginPath();
          ctx.moveTo(m.x - m.r - 5, m.y - m.r + 1);
          ctx.lineTo(m.x - m.r - 1, m.y - m.r - 5);
          ctx.lineTo(m.x - m.r + 3, m.y - m.r + 1);
          ctx.fill();
        }
        if (game.candidates.includes(m.id) && !d?.followers && !d?.campaignId) {
          labels.push({ x: m.x, y: m.y - m.r - 6, text: c.name });
        } else if (m.id === selectedCity) labels.push({ x: m.x, y: m.y - m.r - 8, text: c.name, strong: true });
        else if (k > 5 && c.pop > 800_000 && !d?.campaignId) labels.push({ x: m.x, y: m.y - m.r - 4, text: c.name });
      }
      // HQ
      const hx = sx(hq.idx), hy = sy(hq.idx);
      ctx.fillStyle = `rgb(${secondary.join(',')})`;
      ctx.strokeStyle = '#0b0d12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 ? 4 : 9;
        ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // selection
      if (selectedCity != null) {
        const c = CITY_BY_ID.get(selectedCity);
        if (c) {
          ctx.strokeStyle = '#e8cf8a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx(c.idx), sy(c.idx), 14, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // dispatch effects
      for (const fx of dispatchFx) {
        const age = (Date.now() - fx.at) / 1500;
        if (age > 1) continue;
        const c = CITY_BY_ID.get(fx.cityId)!;
        ctx.strokeStyle = `rgba(232,207,138,${1 - age})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx(c.idx), sy(c.idx), 8 + age * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
      // labels (bounded)
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const l of labels.slice(0, 60)) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(11,13,18,0.9)';
        ctx.strokeText(l.text, l.x, l.y);
        ctx.fillStyle = l.strong ? '#e8cf8a' : '#d0d5df';
        ctx.fillText(l.text, l.x, l.y);
      }
      markers.current = list;
    },
    [size, geo, game, overlay, primary, secondary, selectedCity, dispatchFx, reduced],
  );

  // render loop: animate only when something moves; otherwise redraw on state change
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const animated = !reduced && (Object.values(game.campaigns).some((c) => c.status === 'active') || dispatchFx.length > 0);
    const loop = (now: number) => {
      if (now - last > 66) {
        draw(now);
        last = now;
      }
      if (animated) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, version, viewVersion, reduced, game, dispatchFx]);

  // interaction
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const v = view.current;
    const k = Math.max(0.9, Math.min(80, v.k * factor));
    const f = k / v.k;
    view.current = { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
    setViewVersion((n) => n + 1);
  };

  const pick = (px: number, py: number): Marker | undefined => {
    let best: Marker | undefined;
    let bd = 16 * 16;
    for (const m of markers.current) {
      const dd = (m.x - px) ** 2 + (m.y - py) ** 2;
      if (dd < Math.max(bd, 0) && dd <= (m.r + 10) ** 2) {
        bd = dd;
        best = m;
      }
    }
    return best;
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const known = CITIES.filter((c) => c.name.toLowerCase().startsWith(q));
    return known
      .sort((a, b) => Number(!!game.cities[b.id]?.discovered) - Number(!!game.cities[a.id]?.discovered) || b.pop - a.pop)
      .slice(0, 8);
  }, [search, game]);

  const hoverCity = hover ? CITY_BY_ID.get(hover.id) : undefined;
  const hoverDyn = hover ? game.cities[hover.id] : undefined;
  const shares = getCountryShares(game);
  const overlays: Overlay[] = ['followers', 'conversion', 'campaigns', 'passive', 'resistance', 'zealots', 'outposts', 'rivals', 'stability'];

  return (
    <div ref={wrap} className="relative h-full w-full overflow-hidden bg-ink-950">
      <canvas
        ref={canvas}
        width={size.w * size.dpr}
        height={size.h * size.dpr}
        style={{ width: size.w, height: size.h, touchAction: 'none', cursor: hover ? 'pointer' : 'grab' }}
        tabIndex={0}
        role="img"
        aria-label={`World map. ${game.discovered.length} discovered cities, ${game.totals.citiesControlled} strategically converted. Use plus and minus to zoom, arrow keys to pan. A searchable list of cities is available in the Campaigns panel.`}
        onWheel={(e) => {
          const p = local(e);
          zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y);
        }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          const p = local(e);
          pointers.current.set(e.pointerId, p);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.current.k };
          }
          drag.current = { x: p.x, y: p.y, vx: view.current.x, vy: view.current.y, moved: false };
        }}
        onPointerMove={(e) => {
          const p = local(e);
          if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
          if (pinch.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            const target = pinch.current.k * (d / pinch.current.d);
            zoomAt(target / view.current.k, (a.x + b.x) / 2, (a.y + b.y) / 2);
            if (drag.current) drag.current.moved = true;
            return;
          }
          if (drag.current && e.buttons) {
            const dx = p.x - drag.current.x, dy = p.y - drag.current.y;
            if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
            view.current = { ...view.current, x: drag.current.vx + dx, y: drag.current.vy + dy };
            setViewVersion((n) => n + 1);
            return;
          }
          const m = pick(p.x, p.y);
          setHover(m?.id != null ? { x: p.x, y: p.y, id: m.id } : null);
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          const p = local(e);
          if (drag.current && !drag.current.moved) {
            const m = pick(p.x, p.y);
            if (m?.count) zoomAt(2.5, m.x, m.y);
            else if (m?.id != null) selectCity(m.id);
          }
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const step = 60;
          if (e.key === '+' || e.key === '=') zoomAt(1.3, size.w / 2, size.h / 2);
          else if (e.key === '-') zoomAt(1 / 1.3, size.w / 2, size.h / 2);
          else if (e.key.startsWith('Arrow')) {
            const v = view.current;
            view.current = { ...v, x: v.x + (e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0), y: v.y + (e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0) };
            setViewVersion((n) => n + 1);
          } else return;
          e.preventDefault();
        }}
      />
      {hoverCity && hover && (
        <div className="pointer-events-none absolute z-10 rounded-md border border-ink-600 bg-ink-900/95 px-3 py-2 text-xs shadow-lg" style={{ left: Math.min(hover.x + 14, size.w - 200), top: Math.max(4, hover.y - 10) }}>
          <div className="font-serif text-sm font-bold">{hoverCity.name}</div>
          <div className="text-ink-300">
            {hoverCity.admin.replace(/ Region$/, '')}, {countryName(hoverCity.cc)}
          </div>
          <div>
            {fmt(hoverCity.pop)} people · {populationTier(hoverCity.pop).label}
          </div>
          <div>
            {fmt(hoverDyn?.followers ?? 0)} followers ({pct((hoverDyn?.followers ?? 0) / hoverCity.pop)}){hoverDyn?.controlled ? ' · converted ✓' : ''}
            {hoverDyn?.campaignId ? ' · campaign ◌' : ''}
          </div>
          <div className="text-ink-400">Country: {pct(shares[hoverCity.cc] ?? 0, 2)} converted</div>
        </div>
      )}
      <div className="absolute left-2 top-2 z-10 w-56 sm:w-64">
        <label htmlFor="map-search" className="sr-only">
          Search cities
        </label>
        <input id="map-search" className="input bg-ink-900/90 py-1.5 text-xs" placeholder="Search cities…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {searchResults.length > 0 && (
          <ul className="mt-1 overflow-hidden rounded-md border border-ink-600 bg-ink-900">
            {searchResults.map((c) => (
              <li key={c.id}>
                <button
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-ink-700"
                  onClick={() => {
                    centerOn(c.id);
                    if (game.cities[c.id]?.discovered) selectCity(c.id);
                    setSearch('');
                  }}
                >
                  {c.name}, {countryName(c.cc)} <span className="text-ink-400">{game.cities[c.id]?.discovered ? '· discovered' : '· not yet reached'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
        <button className="btn-ghost btn-sm w-8" aria-label="Zoom in" onClick={() => zoomAt(1.4, size.w / 2, size.h / 2)}>
          +
        </button>
        <button className="btn-ghost btn-sm w-8" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4, size.w / 2, size.h / 2)}>
          −
        </button>
        <button className="btn-ghost btn-sm w-8" aria-label="Center on headquarters" onClick={() => centerOn(game.movement.headquarters.cityId, 4)}>
          ⌂
        </button>
        <button
          className="btn-ghost btn-sm w-8"
          aria-label="Show whole world"
          onClick={() => {
            view.current = { k: 1, x: 0, y: 0 };
            setViewVersion((n) => n + 1);
          }}
        >
          ◯
        </button>
      </div>
      <div className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)]">
        <label className="sr-only" htmlFor="overlay">
          Map overlay
        </label>
        <select id="overlay" className="input w-auto bg-ink-900/90 py-1 text-xs capitalize" value={overlay} onChange={(e) => setOverlay(e.target.value as Overlay)}>
          {overlays.map((o) => (
            <option key={o} value={o}>
              Overlay: {o}
            </option>
          ))}
        </select>
        <div className="mt-1 hidden gap-3 rounded bg-ink-900/80 px-2 py-1 text-[10px] text-ink-300 sm:flex" aria-hidden>
          <span>● city</span>
          <span>◌ campaign</span>
          <span className="text-brass-300">○ converted</span>
          <span>■ outpost</span>
          <span className="text-[#d68c46]">▲ rival/splinter</span>
          <span>★ HQ</span>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { fmt } from '@/engine/text';
import type { HistoricalSnapshot } from '@/engine/types';
import { useStore } from '@/store/game';
import { LineChart } from '../LineChart';

const RANGES: { label: string; s: number }[] = [
  { label: 'Last 5 min', s: 300 },
  { label: 'Last hour', s: 3600 },
  { label: 'Last 24 hours', s: 86400 },
  { label: 'Last 7 days', s: 604800 },
  { label: 'Entire campaign', s: Infinity },
];

export default function ChartsPanel() {
  const game = useStore((s) => s.game)!;
  const [range, setRange] = useState(RANGES[4].s);
  const snaps = game.snapshots.filter((s) => game.time - s.t <= range);
  const ser = (k: keyof HistoricalSnapshot) => snaps.map((s) => ({ t: s.t, v: s[k] as number }));
  const primary = game.movement.banner.primary;
  const secondary = game.movement.banner.secondary;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Time range">
        {RANGES.map((r) => (
          <button key={r.label} role="radio" aria-checked={range === r.s} className={`chip text-xs ${range === r.s ? 'chip-on' : 'chip-off'}`} onClick={() => setRange(r.s)}>
            {r.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-500">Times are game time (real time × game speed). Older history is progressively thinned.</p>
      <Chart title="Total followers (people)">
        <LineChart title="Total followers" series={[{ label: 'Followers', color: primary, values: ser('followers') }]} />
      </Chart>
      <Chart title="New followers per minute">
        <LineChart title="New followers per minute" series={[{ label: 'New / min', color: secondary, values: ser('newPerMin') }]} />
      </Chart>
      <Chart title="Cumulative conversions: active vs passive (people)">
        <LineChart
          title="Active vs passive conversions"
          series={[
            { label: 'Active (campaigns)', color: primary, values: ser('active') },
            { label: 'Passive (word of mouth)', color: '#5ec8a0', values: ser('passive'), dash: '5 3' },
          ]}
        />
      </Chart>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Chart title="Cities strategically converted">
          <LineChart title="Cities converted" series={[{ label: 'Cities', color: primary, values: ser('cities') }]} height={150} yFormat={(n) => String(Math.round(n))} />
        </Chart>
        <Chart title="Zealots & outposts (count)">
          <LineChart
            title="Zealots and outposts"
            height={150}
            yFormat={(n) => String(Math.round(n))}
            series={[
              { label: 'Zealots', color: secondary, values: ser('zealots') },
              { label: 'Outposts', color: '#a8afc0', values: ser('outposts'), dash: '4 3' },
            ]}
          />
        </Chart>
        <Chart title="Countries reached">
          <LineChart title="Countries reached" height={150} yFormat={(n) => String(Math.round(n))} series={[{ label: 'Countries', color: '#3d8fd8', values: ser('countries') }]} />
        </Chart>
        <Chart title="Cohesion & average resistance (0–100)">
          <LineChart
            title="Cohesion and resistance"
            height={150}
            yFormat={(n) => n.toFixed(0)}
            series={[
              { label: 'Cohesion', color: '#5ec8a0', values: ser('cohesion') },
              { label: 'Resistance', color: '#d65454', values: ser('resistance'), dash: '4 3' },
            ]}
          />
        </Chart>
        <Chart title="Rival & splinter followers (people)">
          <LineChart title="Rival influence" height={150} series={[{ label: 'Other movements', color: '#d68c46', values: ser('rivals') }]} />
        </Chart>
        {game.fundsUnlocked && (
          <Chart title="Movement Funds">
            <LineChart title="Movement funds" height={150} yFormat={fmt} series={[{ label: 'Funds', color: '#d8b55e', values: ser('funds') }]} />
          </Chart>
        )}
      </div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="label mb-1">{title}</h3>
      {children}
    </section>
  );
}

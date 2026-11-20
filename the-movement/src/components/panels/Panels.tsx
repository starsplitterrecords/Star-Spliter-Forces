'use client';
import { useStore } from '@/store/game';
import { Drawer } from '../ui';
import { AchievementsPanel, ChroniclePanel, HelpPanel, NewsPanel } from './MiscPanels';
import CampaignsPanel from './CampaignsPanel';
import ChartsPanel from './ChartsPanel';
import DebugPanel from './DebugPanel';
import DoctrinePanel from './DoctrinePanel';
import FactionsPanel from './FactionsPanel';
import OutpostsPanel from './OutpostsPanel';
import SavesPanel from './SavesPanel';
import SettingsPanel from './SettingsPanel';
import StatsPanel from './StatsPanel';
import UpgradesPanel from './UpgradesPanel';
import VictoryPanel from './VictoryPanel';

const TITLES: Record<string, string> = {
  campaigns: 'Campaigns',
  outposts: 'Outposts',
  upgrades: 'Institutional Development',
  doctrine: 'Doctrine & Proclamations',
  news: 'News & Events',
  factions: 'Factions, Rivals & Opposition',
  stats: 'Worldwide Membership Statistics',
  charts: 'Historical Growth',
  achievements: 'Achievements',
  chronicle: 'The Official Chronicle',
  settings: 'Settings',
  saves: 'Save / Load',
  help: 'Help & Reference',
  debug: 'Debug Tools',
};

export default function Panels() {
  const panel = useStore((s) => s.panel);
  const setPanel = useStore((s) => s.setPanel);
  useStore((s) => s.version);
  if (!panel) return null;
  if (panel === 'victory') return <VictoryPanel onClose={() => setPanel(null)} />;
  const wide = panel === 'stats' || panel === 'charts' || panel === 'upgrades' || panel === 'chronicle';
  const body = {
    campaigns: <CampaignsPanel />,
    outposts: <OutpostsPanel />,
    upgrades: <UpgradesPanel />,
    doctrine: <DoctrinePanel />,
    news: <NewsPanel />,
    factions: <FactionsPanel />,
    stats: <StatsPanel />,
    charts: <ChartsPanel />,
    achievements: <AchievementsPanel />,
    chronicle: <ChroniclePanel />,
    settings: <SettingsPanel />,
    saves: <SavesPanel />,
    help: <HelpPanel />,
    debug: <DebugPanel />,
  }[panel];
  const title = panel === 'outposts' ? useStore.getState().game!.movement.outpostName : TITLES[panel];
  return (
    <Drawer title={title} onClose={() => setPanel(null)} width={wide ? 'sm:w-[min(820px,100%)]' : 'sm:w-[460px]'}>
      {body}
    </Drawer>
  );
}

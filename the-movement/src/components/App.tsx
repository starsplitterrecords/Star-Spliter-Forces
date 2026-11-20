'use client';
import { useEffect, useState } from 'react';
import { setMusic, setSound } from '@/lib/audio';
import { loadGlobalSettings } from '@/lib/storage';
import { useStore } from '@/store/game';
import StoryGame from './story/StoryGame';
import GameScreen from './GameScreen';
import MainMenu from './MainMenu';
import Wizard from './Wizard';

export default function App() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const settings = useStore((s) => s.globalSettings);
  const setGlobalSettings = useStore((s) => s.setGlobalSettings);
  const [slot, setSlot] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadGlobalSettings().then((s) => {
      if (s) setGlobalSettings(s);
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === '1') setGlobalSettings({ debug: true });
      setReady(true);
    });
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_STANDALONE) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, [setGlobalSettings]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
    document.documentElement.classList.toggle('hc', settings.highContrast);
    document.documentElement.classList.toggle('reduced', settings.animation !== 'full');
    setSound(settings.sound);
  }, [settings]);

  useEffect(() => {
    if (!settings.music) setMusic(false);
  }, [settings.music]);

  if (!ready) return <div className="flex h-full items-center justify-center font-serif text-ink-300">Consulting the founding documents…</div>;
  if (screen === 'wizard') return <Wizard slot={slot} onCancel={() => setScreen('menu')} />;
  if (screen === 'game') return <GameScreen />;
  if (screen === 'story') return <StoryGame onExit={() => setScreen('menu')} />;
  return (
    <MainMenu
      onNew={(s) => {
        setSlot(s);
        setScreen('wizard');
      }}
    />
  );
}

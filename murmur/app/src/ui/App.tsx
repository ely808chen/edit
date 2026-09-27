import { useEffect, useRef, useState } from 'react';
import { game } from '../game/controller';
import { useUI } from '../game/store';
import { synth } from '../audio/synth';
import { TopBar } from './TopBar';
import { CommandBar } from './CommandBar';
import { CityPulse } from './CityPulse';
import { CitizenCard } from './CitizenCard';
import { ChallengesMenu, ChallengeHud } from './Challenges';
import { ShareDialog } from './ShareDialog';
import { Onboarding } from './Onboarding';
import { Settings } from './Settings';
import { DebugOverlay } from './DebugOverlay';
import { Banners } from './Banners';
import { ReplayBar } from './ReplayBar';

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const lang = useUI((s) => s.lang);
  const sound = useUI((s) => s.settings.sound);
  const reduced = useUI((s) => s.settings.reducedMotion);

  useEffect(() => {
    let cancelled = false;
    const el = host.current;
    if (!el) return;
    const start = async () => {
      try {
        await Promise.race([document.fonts?.load('20px "Dela Gothic One"'), new Promise((r) => setTimeout(r, 1200))]);
      } catch {
        // fonts are a nicety
      }
      if (cancelled) return;
      await game.init(el);
      if (!cancelled) setReady(true);
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    synth.setEnabled(sound);
  }, [sound]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reduced);
  }, [reduced]);

  useEffect(() => {
    const unlock = () => synth.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        document.getElementById('command-input')?.focus();
      }
      if (e.key === 'Escape') {
        const s = useUI.getState();
        if (s.shareOpen) useUI.setState({ shareOpen: false });
        else if (s.settingsOpen) useUI.setState({ settingsOpen: false });
        else if (s.challengesOpen) useUI.setState({ challengesOpen: false });
        else if (s.selectedId !== null) game.select(null);
        else if (s.clickedPlace) useUI.setState({ clickedPlace: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${kb}px`);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <div className="app">
      <div className="stage" ref={host} />
      {!ready && <div className="loading" aria-live="polite"><span className="wordmark">murmur</span></div>}
      {ready && (
        <>
          <TopBar />
          <Banners />
          <CityPulse />
          <ChallengeHud />
          <CommandBar />
          <CitizenCard />
          <ReplayBar />
          <Onboarding />
          <ChallengesMenu />
          <Settings />
          <ShareDialog />
          <DebugOverlay />
        </>
      )}
    </div>
  );
}

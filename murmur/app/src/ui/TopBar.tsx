import { useUI, setLang, setSettings } from '../game/store';
import { synth } from '../audio/synth';
import { useT } from './useT';
import { FlagIcon, GearIcon, PauseIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from './icons';

export function TopBar() {
  const t = useT();
  const lang = useUI((s) => s.lang);
  const sound = useUI((s) => s.settings.sound);
  const speed = useUI((s) => s.settings.speed);
  const clock = useUI((s) => s.clock);
  const replay = useUI((s) => s.replay);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="wordmark" aria-label="murmur">
          murmur<span className="wordmark-dot" aria-hidden="true" />
        </span>
      </div>
      <div className="top-actions">
        <div className="clock-pill" role="group" aria-label={t.top.speed}>
          <span className="clock" aria-live="off">{speed === 0 && !replay ? t.clock.paused : clock}</span>
          {!replay && (
            <>
              <button
                className="icon-btn small"
                aria-label={speed === 0 ? t.top.play : t.top.pause}
                title={speed === 0 ? t.top.play : t.top.pause}
                onClick={() => setSettings({ speed: speed === 0 ? 1 : 0 })}
              >
                {speed === 0 ? <PlayIcon /> : <PauseIcon />}
              </button>
              <button
                className={`speed-btn ${speed === 3 ? 'on' : ''}`}
                aria-pressed={speed === 3}
                onClick={() => setSettings({ speed: speed === 3 ? 1 : 3 })}
              >
                {t.speed.x3}
              </button>
            </>
          )}
        </div>
        {!replay && (
          <button className="pill-btn" onClick={() => useUI.setState({ challengesOpen: true, settingsOpen: false })}>
            <FlagIcon />
            <span className="hide-narrow">{t.top.challenges}</span>
          </button>
        )}
        <div className="seg" role="group" aria-label={t.settings.language}>
          <button aria-pressed={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
            EN
          </button>
          <button aria-pressed={lang === 'ja'} className={lang === 'ja' ? 'on' : ''} onClick={() => setLang('ja')} lang="ja">
            JA
          </button>
        </div>
        <button
          className="icon-btn"
          aria-label={sound ? t.top.soundOff : t.top.soundOn}
          title={sound ? t.top.soundOff : t.top.soundOn}
          onClick={() => {
            synth.unlock();
            setSettings({ sound: !sound });
          }}
        >
          {sound ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <button className="icon-btn" aria-label={t.top.settings} title={t.top.settings} onClick={() => useUI.setState({ settingsOpen: true, challengesOpen: false })}>
          <GearIcon />
        </button>
      </div>
    </header>
  );
}

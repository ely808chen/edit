import type { ReactNode } from 'react';
import { game } from '../game/controller';
import { useUI, setLang, setSettings } from '../game/store';
import { synth } from '../audio/synth';
import { useT } from './useT';
import { Dialog } from './Dialog';

function Row({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-label">
        <span>{label}</span>
        {help && <small>{help}</small>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  );
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: Array<{ v: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} className={o.v === value ? 'on' : ''} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const t = useT();
  const open = useUI((s) => s.settingsOpen);
  const s = useUI((st) => st.settings);
  const lang = useUI((st) => st.lang);
  const autoReduced = useUI((st) => st.autoReduced);
  if (!open) return null;
  return (
    <Dialog title={t.settings.title} onClose={() => useUI.setState({ settingsOpen: false })}>
      <Row label={t.settings.citizens} help={autoReduced ? t.settings.citizensNote : t.settings.citizensReset}>
        <Seg
          label={t.settings.citizens}
          value={s.citizenCount}
          options={[
            { v: 300, label: '300' },
            { v: 600, label: '600' },
            { v: 1000, label: '1,000' },
          ]}
          onChange={(v) => game.setCitizenCount(v as 300 | 600 | 1000)}
        />
      </Row>
      <Row label={t.settings.speed}>
        <Seg
          label={t.settings.speed}
          value={s.speed}
          options={[
            { v: 0, label: t.speed.pause },
            { v: 1, label: t.speed.x1 },
            { v: 3, label: t.speed.x3 },
          ]}
          onChange={(v) => setSettings({ speed: v as 0 | 1 | 3 })}
        />
      </Row>
      <Row label={t.settings.language}>
        <Seg
          label={t.settings.language}
          value={lang}
          options={[
            { v: 'en', label: 'English' },
            { v: 'ja', label: '日本語' },
          ]}
          onChange={(v) => setLang(v as 'en' | 'ja')}
        />
      </Row>
      <Row label={t.settings.sound}>
        <Toggle
          label={t.settings.sound}
          on={s.sound}
          onChange={(v) => {
            synth.unlock();
            setSettings({ sound: v });
          }}
        />
      </Row>
      <Row label={t.settings.reducedMotion}>
        <Toggle label={t.settings.reducedMotion} on={s.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
      </Row>
      <Row label={t.settings.director} help={t.settings.directorHelp}>
        <Toggle label={t.settings.director} on={s.director} onChange={(v) => setSettings({ director: v })} />
      </Row>
      <Row label={t.settings.fullCity} help={t.settings.fullCityHelp}>
        <Toggle label={t.settings.fullCity} on={s.fullCity} onChange={(v) => setSettings({ fullCity: v })} />
      </Row>
      <Row label={t.settings.debug}>
        <Toggle label={t.settings.debug} on={s.debug} onChange={(v) => setSettings({ debug: v })} />
      </Row>
      <div className="privacy">
        <h3>{t.settings.privacyTitle}</h3>
        <p>{t.settings.privacy}</p>
      </div>
      <button className="ghost" onClick={() => game.startOnboarding()}>
        {t.settings.restartOnboarding}
      </button>
    </Dialog>
  );
}

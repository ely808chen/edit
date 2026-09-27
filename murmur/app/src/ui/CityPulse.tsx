import { ACTION_KEYS, type ActionKey } from '../../../shared/types';
import { ACTIONS } from '../../../shared/actions';
import { useUI } from '../game/store';
import { fmt } from '../i18n';
import { useT } from './useT';

function StackedBar({ counts, deciding, label }: { counts: Record<ActionKey, number>; deciding?: number; label: string }) {
  const lang = useUI((s) => s.lang);
  const total = ACTION_KEYS.reduce((s, k) => s + counts[k], 0) + (deciding ?? 0);
  const sorted = [...ACTION_KEYS].sort((a, b) => counts[b] - counts[a]);
  return (
    <div className="stack" role="img" aria-label={label}>
      {total > 0 &&
        sorted.map((k) =>
          counts[k] > 0 ? (
            <span
              key={k}
              className="seg-bar"
              style={{ width: `${(counts[k] / total) * 100}%`, background: ACTIONS[k].color }}
              title={`${ACTIONS[k].label[lang]} ${Math.round((counts[k] / total) * 100)}%`}
            />
          ) : null,
        )}
      {deciding ? <span className="seg-bar deciding" style={{ width: `${(deciding / total) * 100}%` }} /> : null}
    </div>
  );
}

function Legend({ counts }: { counts: Record<ActionKey, number> }) {
  const lang = useUI((s) => s.lang);
  const total = ACTION_KEYS.reduce((s, k) => s + counts[k], 0);
  if (!total) return null;
  const top = [...ACTION_KEYS].filter((k) => counts[k] > 0).sort((a, b) => counts[b] - counts[a]).slice(0, 4);
  return (
    <ul className="legend">
      {top.map((k) => (
        <li key={k}>
          <span className="swatch" style={{ background: ACTIONS[k].color }} />
          {ACTIONS[k].label[lang]} <b>{Math.round((counts[k] / total) * 100)}%</b>
        </li>
      ))}
    </ul>
  );
}

export function CityPulse() {
  const t = useT();
  const lang = useUI((s) => s.lang);
  const pulse = useUI((s) => s.pulse);
  const leaning = useUI((s) => s.leaning);
  const collapsed = useUI((s) => s.pulseCollapsed);
  const replay = useUI((s) => s.replay);
  const challenge = useUI((s) => s.challenge);

  const leanCounts = leaning ? (Object.fromEntries(ACTION_KEYS.map((k) => [k, Math.round(leaning[k] * 1000)])) as Record<ActionKey, number>) : null;
  const nf = (n: number) => n.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US');

  return (
    <section className={`pulse ${collapsed ? 'collapsed' : ''} ${challenge ? 'with-hud' : ''}`} aria-label={t.pulse.title}>
      <button
        className="pulse-head"
        aria-expanded={!collapsed}
        aria-label={collapsed ? t.pulse.expand : t.pulse.collapse}
        onClick={() => useUI.setState({ pulseCollapsed: !collapsed })}
      >
        <span className="pulse-title">{t.pulse.title}</span>
        {collapsed && pulse?.headline && <span className="pulse-peek">{pulse.headline}</span>}
        <span className="chev" aria-hidden="true" />
      </button>
      {!collapsed && (
        <div className="pulse-body">
          {leanCounts && (
            <div className="leaning">
              <div className="label">{t.pulse.leaning}</div>
              <StackedBar counts={leanCounts} label={t.pulse.leaning} />
              <Legend counts={leanCounts} />
            </div>
          )}
          {!leanCounts && !pulse && <p className="idle">{t.pulse.idle}</p>}
          {!leanCounts && pulse && (
            <>
              <StackedBar counts={pulse.counts} deciding={pulse.deciding} label={t.pulse.title} />
              <Legend counts={pulse.counts} />
              <div className="stats">
                <span>{fmt(t.pulse.aware, { n: nf(pulse.aware) })}</span>
                {pulse.decisions > 0 && (
                  <span>
                    {fmt(t.pulse.decisionsFor, {
                      n: nf(pulse.decisions),
                      s: pulse.seconds.toFixed(1),
                      c: nf(pulse.decidedCitizens),
                    })}
                  </span>
                )}
                {pulse.events.length > 0 && <span>{fmt(t.pulse.wave, { n: pulse.wave })}</span>}
              </div>
            </>
          )}
          {pulse?.headline && !leanCounts && (
            <div className="headline" aria-live="polite">
              <p className="hl">{pulse.headline}</p>
              {pulse.subline && <p className="sub">{pulse.subline}</p>}
            </div>
          )}
          {pulse && pulse.events.length > 0 && !leanCounts && (
            <div className="timeline" aria-label={t.pulse.events}>
              {pulse.events.map((e) => (
                <span key={e.idx} className="event-chip" title={e.text}>
                  {e.text.length > 26 ? e.text.slice(0, 25) + '…' : e.text}
                </span>
              ))}
            </div>
          )}
          {pulse?.settled && !replay && (
            <button className="secondary share-btn" onClick={() => useUI.setState({ shareOpen: true })}>
              {t.share.button}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

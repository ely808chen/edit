import { CHALLENGES, CHALLENGE_BY_ID, type ChallengeId } from '../game/challenges';
import { game } from '../game/controller';
import { useUI } from '../game/store';
import { fmt } from '../i18n';
import { useT } from './useT';
import { CloseIcon, StarIcon } from './icons';
import { Dialog } from './Dialog';

function Stars({ n, label }: { n: number; label: string }) {
  return (
    <span className="stars" role="img" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} filled={i < n} />
      ))}
    </span>
  );
}

function limits(id: ChallengeId, t: ReturnType<typeof useT>): string[] {
  const def = CHALLENGE_BY_ID[id];
  const out: string[] = [];
  if (def.whispersOnly) out.push(t.challenges.limitWhisper);
  else if (def.maxEvents) out.push(fmt(t.challenges.limitEvents, { n: def.maxEvents }));
  out.push(def.timeLimitS ? fmt(t.challenges.limitTime, { s: def.timeLimitS }) : t.challenges.noLimit);
  return out;
}

export function ChallengesMenu() {
  const t = useT();
  const open = useUI((s) => s.challengesOpen);
  const best = useUI((s) => s.bestStars);
  if (!open) return null;
  return (
    <Dialog title={t.challenges.title} onClose={() => useUI.setState({ challengesOpen: false })} wide>
      <p className="dialog-intro">{t.challenges.intro}</p>
      <ol className="challenge-list">
        {CHALLENGES.map((c, i) => (
          <li key={c.id} className="challenge-item">
            <div className="ci-num" aria-hidden="true">{i + 1}</div>
            <div className="ci-main">
              <h3>{t.challenges.items[c.id].name}</h3>
              <p>{t.challenges.items[c.id].goal}</p>
              <p className="ci-limits">
                {limits(c.id, t).map((l) => (
                  <span key={l} className="limit-tag">
                    {l}
                  </span>
                ))}
              </p>
            </div>
            <div className="ci-side">
              <Stars n={best[c.id] ?? 0} label={fmt(t.challenges.stars, { n: best[c.id] ?? 0 })} />
              <button className="primary small" onClick={() => game.startChallenge(c.id)}>
                {t.challenges.start}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}

export function ChallengeHud() {
  const t = useT();
  const ch = useUI((s) => s.challenge);
  if (!ch) return null;
  const item = t.challenges.items[ch.id];
  const def = CHALLENGE_BY_ID[ch.id];
  const label = fmt(t.challenges.progress[ch.id], { n: ch.n, p: ch.p });
  const next = CHALLENGES[(CHALLENGES.findIndex((c) => c.id === ch.id) + 1) % CHALLENGES.length];
  return (
    <>
      <section className="challenge-hud" aria-label={item.name}>
        <div className="hud-top">
          <h2>{item.name}</h2>
          <button className="icon-btn small" aria-label={t.challenges.quit} title={t.challenges.quit} onClick={() => game.leaveChallenge()}>
            <CloseIcon />
          </button>
        </div>
        <p className="hud-goal">{item.goal}</p>
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ch.value * 100)} aria-label={label}>
          <span style={{ width: `${Math.round(ch.value * 100)}%` }} />
        </div>
        <p className="hud-stats">
          <span>{label}</span>
          {def.maxEvents !== null && <span>{fmt(t.challenges.eventsUsed, { used: ch.eventsUsed, max: def.maxEvents })}</span>}
          {ch.timeLeft !== null && <span className={ch.timeLeft <= 10 ? 'urgent' : ''}>{fmt(t.challenges.timeLeft, { s: ch.timeLeft })}</span>}
        </p>
        {ch.notice === 'notNotable' && <p className="hud-note">{t.challenges.notNotable}</p>}
      </section>
      {ch.status !== 'running' && (
        <div className="result-wrap">
          <div className={`result-card ${ch.status}`} role="dialog" aria-label={item.name}>
            <p className="eyebrow">{item.name}</p>
            <h2>{ch.status === 'success' ? t.challenges.success : ch.failReason === 'time' ? t.challenges.failTime : t.challenges.failEvents}</h2>
            {ch.status === 'success' && <Stars n={ch.stars} label={fmt(t.challenges.stars, { n: ch.stars })} />}
            <p className="result-stat">{label}</p>
            <div className="result-actions">
              <button className="secondary" onClick={() => game.startChallenge(ch.id)}>
                {t.challenges.retry}
              </button>
              {ch.status === 'success' && (
                <button className="primary" onClick={() => game.startChallenge(next.id)}>
                  {t.challenges.next}
                </button>
              )}
              {ch.status === 'success' && (
                <button className="secondary" onClick={() => useUI.setState({ shareOpen: true })}>
                  {t.share.button}
                </button>
              )}
              <button className="ghost" onClick={() => game.leaveChallenge()}>
                {t.challenges.freePlay}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

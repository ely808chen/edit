import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ACTION_KEYS } from '../../../shared/types';
import { ACTIONS } from '../../../shared/actions';
import { GROUPS } from '../../../shared/archetypes';
import { game } from '../game/controller';
import { useUI } from '../game/store';
import { fmt } from '../i18n';
import { useT } from './useT';
import { CloseIcon } from './icons';

export function CitizenCard() {
  const t = useT();
  const lang = useUI((s) => s.lang);
  const id = useUI((s) => s.selectedId);
  const following = useUI((s) => s.following);
  const challenge = useUI((s) => s.challenge);
  const replay = useUI((s) => s.replay);
  useUI((s) => s.clock);
  const ref = useRef<HTMLDivElement>(null);
  const [whispering, setWhispering] = useState(false);
  const [draft, setDraft] = useState('');
  const [, force] = useState(0);

  useEffect(() => {
    setWhispering(false);
    setDraft('');
  }, [id]);

  useEffect(() => {
    if (id === null) return;
    const iv = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(iv);
  }, [id]);

  useLayoutEffect(() => {
    if (id === null) return;
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      const pos = game.citizenScreenPos(id);
      if (el && pos && !window.matchMedia('(max-width: 720px)').matches) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        let x = pos.x + 18;
        let y = pos.y - h / 2 - 10;
        if (x + w > window.innerWidth - 12) x = pos.x - w - 18;
        y = Math.max(64, Math.min(window.innerHeight - h - 150, y));
        x = Math.max(12, x);
        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      } else if (el) {
        el.style.transform = '';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id, whispering]);

  if (id === null || !game.world) return null;
  const c = game.world.citizens[id];
  if (!c) return null;
  const last = c.last;
  const lastEv = last ? game.world.events[last.eventIdx] : null;
  const name = c.name[lang];

  let foundOut: string | null = null;
  if (last) {
    if (last.source === 'saw') foundOut = t.card.sawIt;
    else if (last.source === 'online') foundOut = t.card.online;
    else if (last.source === 'announcement') foundOut = t.card.announcement;
    else if (last.tellerId >= 0) {
      const teller = game.world.citizens[last.tellerId];
      foundOut = fmt(t.card.heardFrom, { name: teller.name[lang], role: teller.archetype.short[lang] });
    } else foundOut = t.card.heardStranger;
  } else if (c.pending > 0) {
    foundOut = null;
  }

  const current = game.world.currentAction(c);
  const doing = c.pending > 0 ? t.card.pending : current ? ACTIONS[current].doing[lang] : c.inside ? t.card.inside : t.card.routine;
  const probs = last ? [...ACTION_KEYS].sort((a, b) => last.probs[b] - last.probs[a]).slice(0, 5) : [];
  const canWhisper = !replay && (!challenge || (challenge.id === 'whisper' && challenge.whispersUsed < 1) || (challenge.id !== 'whisper' && challenge.status === 'running'));

  return (
    <div className="card-layer">
      <div className="citizen-card" ref={ref} role="dialog" aria-label={name}>
        <div className="card-top">
          <span className="avatar" style={{ background: game.renderer.bodyColor(c) }} aria-hidden="true" />
          <div className="who">
            <h2>{name}</h2>
            <p className="role">{lang === 'ja' ? c.archetype.oneLinerJa : c.archetype.oneLiner}</p>
          </div>
          <button className="icon-btn small" aria-label={t.card.close} onClick={() => game.select(null)}>
            <CloseIcon />
          </button>
        </div>
        <div className="card-body">
          <p className="found">{foundOut ?? (c.pending > 0 ? '' : t.card.notAware)}</p>
          <p className="doing">
            <span className="dot" style={{ background: current ? ACTIONS[current].color : 'rgba(58,46,92,0.25)' }} />
            {doing}
          </p>
          {lastEv && current && <p className="about">“{lastEv.text.length > 40 ? lastEv.text.slice(0, 39) + '…' : lastEv.text}”</p>}
          {last && (
            <div className="probs">
              <p className="probs-title">{t.card.probsTitle}</p>
              {probs.map((k) => (
                <div key={k} className={`prob-row ${k === last.action ? 'chosen' : ''}`}>
                  <span className="prob-label">{ACTIONS[k].label[lang]}</span>
                  <span className="prob-track">
                    <span className="prob-fill" style={{ width: `${Math.max(2, last.probs[k] * 100)}%`, background: ACTIONS[k].color }} />
                  </span>
                  <span className="prob-val">{Math.round(last.probs[k] * 100)}%</span>
                </div>
              ))}
              <p className="latency">
                {last.mock ? t.card.simulated : last.cached ? t.card.remembered : fmt(t.card.decidedIn, { ms: Math.round(last.latencyMs) })}
              </p>
            </div>
          )}
          <p className="group-note">{GROUPS[c.group].name[lang]}</p>
        </div>
        {whispering ? (
          <form
            className="whisper-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              const ok = await game.whisper(id, draft);
              if (ok) {
                setWhispering(false);
                setDraft('');
              }
            }}
          >
            <input
              autoFocus
              value={draft}
              maxLength={140}
              placeholder={fmt(t.card.whisperPlaceholder, { name })}
              aria-label={fmt(t.card.whisperPlaceholder, { name })}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="card-actions">
              <button type="button" className="ghost" onClick={() => setWhispering(false)}>
                {t.card.cancel}
              </button>
              <button type="submit" className="primary" disabled={!draft.trim()}>
                {t.card.whisperSend}
              </button>
            </div>
          </form>
        ) : (
          <div className="card-actions">
            <button className="secondary" aria-pressed={following} onClick={() => game.toggleFollow(id)}>
              {following ? t.card.unfollow : t.card.follow}
            </button>
            {canWhisper && (
              <button className={challenge?.id === 'whisper' ? 'primary' : 'secondary'} onClick={() => setWhispering(true)}>
                {fmt(t.card.whisper, { name })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

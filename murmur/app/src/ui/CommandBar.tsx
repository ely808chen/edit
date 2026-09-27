import { useEffect, useRef, useState } from 'react';
import { game } from '../game/controller';
import { useUI } from '../game/store';
import { PLACES } from '../../../shared/places';
import { fmt } from '../i18n';
import { useT } from './useT';
import { CloseIcon, PinIcon } from './icons';

export function CommandBar() {
  const t = useT();
  const lang = useUI((s) => s.lang);
  const text = useUI((s) => s.commandText);
  const busy = useUI((s) => s.busy);
  const message = useUI((s) => s.commandMessage);
  const clicked = useUI((s) => s.clickedPlace);
  const replay = useUI((s) => s.replay);
  const challenge = useUI((s) => s.challenge);
  const onboarding = useUI((s) => s.onboarding);
  const [ph, setPh] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setPh((p) => (p + 1) % t.examples.length), 4000);
    return () => window.clearInterval(id);
  }, [t.examples.length]);

  if (replay) return null;

  const submit = async (value = text) => {
    if (busy || !value.trim()) return;
    const ok = await game.release(value);
    if (ok && window.matchMedia('(max-width: 720px)').matches) input.current?.blur();
  };

  const whisperOnly = challenge?.id === 'whisper';
  const msg =
    message === 'blocked'
      ? t.command.blocked
      : message === 'error'
        ? t.command.error
        : message === 'tooMany'
          ? t.command.tooMany
          : message === 'whisperOnly'
            ? t.card.whisperOnly
            : message === 'whisperUsed'
              ? t.card.whisperUsed
              : message === 'outOfEvents'
                ? t.challenges.failEvents
                : null;
  const chips = t.examples.slice(0, 3);

  return (
    <div className="command-dock">
      {(clicked || msg) && (
        <div className="command-notes">
          {clicked && (
            <span className="place-chip">
              <PinIcon />
              {fmt(t.command.atPlace, { place: PLACES[clicked].name[lang] })}
              <button className="chip-x" aria-label={t.command.clearPlace} onClick={() => useUI.setState({ clickedPlace: null })}>
                <CloseIcon />
              </button>
            </span>
          )}
          {msg && (
            <span className={`command-msg ${message === 'blocked' ? 'blocked' : ''}`} role="alert">
              {msg}
            </span>
          )}
        </div>
      )}
      <form
        className={`command-bar ${busy ? 'busy' : ''} ${message === 'blocked' ? 'shake' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="command-input" className="sr-only">
          {t.command.label}
        </label>
        <input
          id="command-input"
          ref={input}
          value={text}
          maxLength={140}
          autoComplete="off"
          enterKeyHint="send"
          spellCheck={false}
          disabled={whisperOnly}
          placeholder={whisperOnly ? t.card.whisperOnly : t.examples[ph]}
          onChange={(e) => {
            if (onboarding) game.skipOnboarding();
            game.setCommandText(e.target.value);
          }}
        />
        {text.length > 100 && <span className="count" aria-hidden="true">{140 - text.length}</span>}
        <button type="submit" className="primary" disabled={busy || !text.trim() || whisperOnly}>
          {busy ? <span className="dots" aria-label={t.command.reading} /> : t.command.submit}
        </button>
      </form>
      {!whisperOnly && (
        <div className="chips" aria-label="examples">
          {chips.map((c) => (
            <button
              key={c}
              className="chip"
              onClick={() => {
                if (onboarding) game.skipOnboarding();
                game.setCommandText(c);
                void submit(c);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

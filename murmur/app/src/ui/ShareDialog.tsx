import { useState } from 'react';
import { game } from '../game/controller';
import { useUI } from '../game/store';
import { useT } from './useT';
import { Dialog } from './Dialog';

export function ShareDialog() {
  const t = useT();
  const open = useUI((s) => s.shareOpen);
  const pulse = useUI((s) => s.pulse);
  const [link, setLink] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'saving' | 'recording' | 'failed'>('idle');
  if (!open) return null;
  const close = () => {
    useUI.setState({ shareOpen: false });
    setLink(null);
    setState('idle');
  };
  const copy = async () => {
    setState('copying');
    try {
      const url = link ?? (await game.shareLink());
      setLink(url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard can be blocked; the link is shown for manual copying
      }
      setState('copied');
    } catch {
      setState('failed');
    }
  };
  const save = async () => {
    setState('saving');
    try {
      await game.saveImage();
      setState('idle');
    } catch {
      setState('failed');
    }
  };
  return (
    <Dialog title={t.share.title} onClose={close}>
      {pulse?.headline && (
        <figure className="share-preview">
          <p className="hl">{pulse.headline}</p>
          {pulse.subline && <p className="sub">{pulse.subline}</p>}
        </figure>
      )}
      <p className="dialog-intro">{t.share.caption}</p>
      <div className="share-actions">
        <button className="primary" onClick={copy} disabled={state === 'copying'}>
          {state === 'copying' ? t.share.copying : state === 'copied' ? t.share.copied : t.share.copy}
        </button>
        <button className="secondary" onClick={save} disabled={state === 'saving'}>
          {state === 'saving' ? t.share.saving : t.share.image}
        </button>
      </div>
      {game.canRecordClip() && (
        <button
          className="ghost clip-btn"
          disabled={state === 'recording'}
          onClick={async () => {
            setState('recording');
            useUI.setState({ shareOpen: false });
            try {
              await game.recordClip(10);
              setState('idle');
            } catch {
              setState('failed');
            }
          }}
        >
          {state === 'recording' ? t.share.recording : t.share.clip}
        </button>
      )}
      {link && (
        <input className="share-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t.share.copy} />
      )}
      {state === 'failed' && (
        <p className="command-msg" role="alert">
          {t.share.failed}
        </p>
      )}
    </Dialog>
  );
}

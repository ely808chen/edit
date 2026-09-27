import { game } from '../game/controller';
import { useUI } from '../game/store';
import { useT } from './useT';

export function ReplayBar() {
  const t = useT();
  const replay = useUI((s) => s.replay);
  if (!replay) return null;
  return (
    <div className={`replay-bar ${replay.state}`}>
      <span className="replay-tag">{replay.state === 'loading' ? t.replay.loading : replay.state === 'missing' ? t.replay.missing : t.replay.watching}</span>
      {replay.headline && replay.state !== 'loading' && <p className="replay-hl">{replay.headline.line}</p>}
      {replay.state === 'ended' && <p className="replay-end">{t.replay.ended}</p>}
      {replay.state !== 'loading' && (
        <button className="primary" onClick={() => game.exitReplay()}>
          {t.replay.tryOwn}
        </button>
      )}
    </div>
  );
}

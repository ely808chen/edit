import { useUI } from '../game/store';
import { useT } from './useT';

export function Banners() {
  const t = useT();
  const fallback = useUI((s) => s.fallback);
  const mock = useUI((s) => s.mockSeen);
  const recording = useUI((s) => s.recording);
  return (
    <>
      {recording && (
        <span className="rec-pill" role="status">
          <span className="rec-dot" aria-hidden="true" />
          {t.share.recording}
        </span>
      )}
      {fallback && (
        <div className="banner" role="status">
          {t.banner.fallback}
        </div>
      )}
      {mock && !fallback && (
        <span className="mock-label" title={t.banner.mockTitle}>
          {t.banner.mock}
        </span>
      )}
    </>
  );
}

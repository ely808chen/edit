import { useUI } from '../game/store';
import { useT } from './useT';

export function Banners() {
  const t = useT();
  const fallback = useUI((s) => s.fallback);
  const mock = useUI((s) => s.mockSeen);
  return (
    <>
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

import { useUI } from '../game/store';
import { useT } from './useT';

export function DebugOverlay() {
  const t = useT();
  const on = useUI((s) => s.settings.debug);
  const d = useUI((s) => s.debug);
  if (!on || !d) return null;
  const rows: Array<[string, string]> = [
    [t.debug.fps, String(d.fps)],
    [t.debug.citizens, d.citizens.toLocaleString()],
    [t.debug.pending, String(d.pending)],
    [t.debug.latency, `${d.latency} ms`],
    [t.debug.provider, d.provider],
    [t.debug.cache, `${Math.round(d.cacheRate * 100)}%`],
    [t.debug.tick, String(d.tick)],
  ];
  return (
    <aside className="debug" aria-label="debug">
      {rows.map(([k, v]) => (
        <div key={k} className="debug-row">
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </aside>
  );
}

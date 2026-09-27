import { game } from '../game/controller';
import { useUI } from '../game/store';
import { useT } from './useT';

export function Onboarding() {
  const t = useT();
  const ob = useUI((s) => s.onboarding);
  if (!ob) return null;
  return (
    <>
      <button className="skip-btn" onClick={() => game.skipOnboarding()}>
        {t.onboarding.skip}
      </button>
      {ob.phase === 'welcome' && <p className="ob-welcome">{t.onboarding.welcome}</p>}
      {ob.phase === 'caption' && (
        <p className="ob-caption" role="status">
          {t.onboarding.caption}
        </p>
      )}
    </>
  );
}

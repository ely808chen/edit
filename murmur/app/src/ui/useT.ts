import { useUI } from '../game/store';
import { DICTS } from '../i18n';

export function useT() {
  const lang = useUI((s) => s.lang);
  return DICTS[lang];
}

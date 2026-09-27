import type { Lang } from '../../../shared/types';
import { en, type Dict } from './en';
import { ja } from './ja';

export const DICTS: Record<Lang, Dict> = { en, ja };

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('murmur.lang');
    if (saved === 'en' || saved === 'ja') return saved;
  } catch {
    // storage may be unavailable
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l?.toLowerCase().startsWith('ja')) ? 'ja' : 'en';
}

export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

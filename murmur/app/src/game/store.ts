import { create } from 'zustand';
import type { ActionKey, ActionProbs, Category, Lang, PlaceId } from '../../../shared/types';
import { detectLang } from '../i18n';
import type { ChallengeId } from './challenges';

export interface Settings {
  citizenCount: 300 | 600 | 1000;
  fullCity: boolean;
  speed: 0 | 1 | 3;
  sound: boolean;
  reducedMotion: boolean;
  director: boolean;
  debug: boolean;
}

export interface PulseState {
  hasEvent: boolean;
  counts: Record<ActionKey, number>;
  deciding: number;
  aware: number;
  decisions: number;
  decidedCitizens: number;
  seconds: number;
  wave: number;
  headline: string | null;
  subline: string | null;
  events: Array<{ idx: number; text: string; category: Category; active: boolean }>;
  settled: boolean;
}

export interface ChallengeUI {
  id: ChallengeId;
  status: 'running' | 'success' | 'failed';
  failReason: 'time' | 'events' | null;
  value: number;
  n: number;
  p: number;
  eventsUsed: number;
  maxEvents: number | null;
  whispersUsed: number;
  timeLeft: number | null;
  stars: number;
  notice: 'notNotable' | null;
}

export interface DebugInfo {
  fps: number;
  citizens: number;
  pending: number;
  latency: number;
  provider: string;
  cacheRate: number;
  tick: number;
}

export interface UIState {
  lang: Lang;
  settings: Settings;
  autoReduced: boolean;
  clock: string;
  commandText: string;
  commandMessage: 'blocked' | 'error' | 'tooMany' | 'replayLocked' | 'whisperOnly' | 'whisperUsed' | 'outOfEvents' | null;
  busy: boolean;
  clickedPlace: PlaceId | null;
  leaning: ActionProbs | null;
  pulse: PulseState | null;
  pulseCollapsed: boolean;
  selectedId: number | null;
  following: boolean;
  mockSeen: boolean;
  fallback: boolean;
  challengesOpen: boolean;
  settingsOpen: boolean;
  shareOpen: boolean;
  challenge: ChallengeUI | null;
  replay: { state: 'loading' | 'playing' | 'ended' | 'missing'; headline: { line: string; subline: string | null } | null } | null;
  onboarding: { phase: 'welcome' | 'typing' | 'caption' } | null;
  debug: DebugInfo | null;
  bestStars: Partial<Record<ChallengeId, number>>;
  recording: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  citizenCount: 1000,
  fullCity: false,
  speed: 1,
  sound: true,
  reducedMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  director: true,
  debug: false,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('murmur.settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>), speed: 1 };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export const useUI = create<UIState>(() => ({
  lang: detectLang(),
  settings: loadSettings(),
  autoReduced: false,
  clock: '11:30',
  commandText: '',
  commandMessage: null,
  busy: false,
  clickedPlace: null,
  leaning: null,
  pulse: null,
  pulseCollapsed: typeof window !== 'undefined' && window.innerWidth < 720,
  selectedId: null,
  following: false,
  mockSeen: false,
  fallback: false,
  challengesOpen: false,
  settingsOpen: false,
  shareOpen: false,
  challenge: null,
  replay: null,
  onboarding: null,
  debug: null,
  bestStars: {},
  recording: false,
}));

export function setSettings(patch: Partial<Settings>) {
  const settings = { ...useUI.getState().settings, ...patch };
  useUI.setState({ settings });
  try {
    localStorage.setItem('murmur.settings', JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function setLang(lang: Lang) {
  useUI.setState({ lang });
  document.documentElement.lang = lang;
  try {
    localStorage.setItem('murmur.lang', lang);
  } catch {
    // ignore
  }
}

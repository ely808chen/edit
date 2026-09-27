import { ACTION_KEYS, type ActionKey, type ActionProbs } from './types';

export type EmoteId =
  | 'bang'
  | 'question'
  | 'heart'
  | 'sweat'
  | 'sparkle'
  | 'dots'
  | 'flash'
  | 'hands'
  | 'grumble'
  | 'ellipsis'
  | 'umbrella'
  | 'house'
  | 'zzz'
  | 'sweatbang'
  | 'shimmer';

export type Movement = 'toward' | 'toward_brisk' | 'toward_run' | 'circle' | 'stay' | 'routine' | 'home' | 'away' | 'jitter';

export interface ActionMeta {
  key: ActionKey;
  color: string;
  emote: EmoteId;
  movement: Movement;
  /** How many unaware citizens this action tells, and how. */
  spreads: null | { mode: 'nearest'; min: number; max: number } | { mode: 'online' };
  /** Pitch family for emote pops. */
  family: 'up' | 'curious' | 'warm' | 'low' | 'tense';
  label: { en: string; ja: string };
  doing: { en: string; ja: string };
  /** Used in headline second lines: "Even the baker {past}". */
  past: { en: string; ja: string };
}

export const ACTIONS: Record<ActionKey, ActionMeta> = {
  rush_toward: {
    key: 'rush_toward',
    color: '#F29E4C',
    emote: 'bang',
    movement: 'toward_run',
    spreads: null,
    family: 'up',
    label: { en: 'Rush over', ja: '駆けつける' },
    doing: { en: 'Rushing over', ja: '駆けつけ中' },
    past: { en: 'rushed over', ja: '駆けつけた' },
  },
  stroll_toward: {
    key: 'stroll_toward',
    color: '#F6C87A',
    emote: 'sparkle',
    movement: 'toward',
    spreads: null,
    family: 'warm',
    label: { en: 'Stroll over', ja: 'のんびり向かう' },
    doing: { en: 'Strolling over', ja: 'のんびり向かい中' },
    past: { en: 'wandered over', ja: 'ふらっと見に行った' },
  },
  investigate: {
    key: 'investigate',
    color: '#8E7CC3',
    emote: 'question',
    movement: 'circle',
    spreads: null,
    family: 'curious',
    label: { en: 'Check it out', ja: '確かめに行く' },
    doing: { en: 'Checking it out', ja: '様子を確認中' },
    past: { en: 'went to check it out', ja: '確かめに行った' },
  },
  film_it: {
    key: 'film_it',
    color: '#6FB7D6',
    emote: 'flash',
    movement: 'stay',
    spreads: { mode: 'online' },
    family: 'up',
    label: { en: 'Film it', ja: '撮影する' },
    doing: { en: 'Filming it', ja: '撮影中' },
    past: { en: 'filmed the whole thing', ja: '一部始終を撮影した' },
  },
  spread_word: {
    key: 'spread_word',
    color: '#D98BC8',
    emote: 'dots',
    movement: 'stay',
    spreads: { mode: 'nearest', min: 2, max: 4 },
    family: 'warm',
    label: { en: 'Tell everyone', ja: 'みんなに話す' },
    doing: { en: 'Telling everyone', ja: 'みんなに話し中' },
    past: { en: 'told the neighbors', ja: 'ご近所に言いふらした' },
  },
  celebrate: {
    key: 'celebrate',
    color: '#FFD36E',
    emote: 'heart',
    movement: 'stay',
    spreads: { mode: 'nearest', min: 1, max: 1 },
    family: 'up',
    label: { en: 'Celebrate', ja: 'お祝いする' },
    doing: { en: 'Celebrating', ja: 'お祝い中' },
    past: { en: 'danced in the street', ja: '道で踊りだした' },
  },
  help_out: {
    key: 'help_out',
    color: '#7CC49A',
    emote: 'hands',
    movement: 'toward_brisk',
    spreads: null,
    family: 'warm',
    label: { en: 'Help out', ja: '手伝いに行く' },
    doing: { en: 'Going to help', ja: '手伝いに向かい中' },
    past: { en: 'showed up to help', ja: '手伝いに来た' },
  },
  complain: {
    key: 'complain',
    color: '#B48A6A',
    emote: 'grumble',
    movement: 'stay',
    spreads: null,
    family: 'low',
    label: { en: 'Grumble', ja: '文句を言う' },
    doing: { en: 'Grumbling', ja: 'ぶつぶつ文句中' },
    past: { en: 'grumbled about it', ja: 'ぶつぶつ文句を言った' },
  },
  ignore: {
    key: 'ignore',
    color: '#C9C3D6',
    emote: 'ellipsis',
    movement: 'routine',
    spreads: null,
    family: 'low',
    label: { en: 'Carry on', ja: '気にしない' },
    doing: { en: 'Carrying on as usual', ja: 'いつも通り過ごし中' },
    past: { en: 'carried on', ja: '気にも留めなかった' },
  },
  head_home: {
    key: 'head_home',
    color: '#7D93C9',
    emote: 'house',
    movement: 'home',
    spreads: null,
    family: 'low',
    label: { en: 'Head home', ja: '家に帰る' },
    doing: { en: 'Heading home', ja: '帰宅中' },
    past: { en: 'stayed home', ja: '家にこもった' },
  },
  flee: {
    key: 'flee',
    color: '#E0675A',
    emote: 'sweat',
    movement: 'away',
    spreads: null,
    family: 'tense',
    label: { en: 'Run away', ja: '逃げる' },
    doing: { en: 'Running away', ja: '逃走中' },
    past: { en: 'ran for it', ja: '一目散に逃げた' },
  },
  panic: {
    key: 'panic',
    color: '#C04E6E',
    emote: 'sweatbang',
    movement: 'jitter',
    spreads: { mode: 'nearest', min: 1, max: 1 },
    family: 'tense',
    label: { en: 'Panic', ja: 'パニック' },
    doing: { en: 'Panicking', ja: 'パニック中' },
    past: { en: 'panicked', ja: 'パニックになった' },
  },
};

export const ACTION_INDEX: Record<ActionKey, number> = Object.fromEntries(
  ACTION_KEYS.map((k, i) => [k, i]),
) as Record<ActionKey, number>;

export function emptyProbs(): ActionProbs {
  return Object.fromEntries(ACTION_KEYS.map((k) => [k, 0])) as ActionProbs;
}

export function normalizeProbs(p: Partial<Record<string, number>>): ActionProbs {
  const out = emptyProbs();
  let sum = 0;
  for (const k of ACTION_KEYS) {
    const v = Number(p[k] ?? 0);
    const safe = Number.isFinite(v) && v > 0 ? v : 0;
    out[k] = safe;
    sum += safe;
  }
  if (sum <= 0) {
    out.ignore = 1;
    return out;
  }
  for (const k of ACTION_KEYS) out[k] /= sum;
  return out;
}

export function topAction(p: ActionProbs): ActionKey {
  let best: ActionKey = 'ignore';
  let bv = -1;
  for (const k of ACTION_KEYS) {
    if (p[k] > bv) {
      bv = p[k];
      best = k;
    }
  }
  return best;
}

/** Sharpen (power 1.3) then sample using a uniform number in [0,1). */
export function sampleAction(p: ActionProbs, u: number, power = 1.3): ActionKey {
  let sum = 0;
  const w = new Array<number>(ACTION_KEYS.length);
  for (let i = 0; i < ACTION_KEYS.length; i++) {
    const v = Math.pow(Math.max(0, p[ACTION_KEYS[i]]), power);
    w[i] = v;
    sum += v;
  }
  if (sum <= 0) return 'ignore';
  let r = u * sum;
  for (let i = 0; i < ACTION_KEYS.length; i++) {
    r -= w[i];
    if (r < 0) return ACTION_KEYS[i];
  }
  return ACTION_KEYS[ACTION_KEYS.length - 1];
}

export const TOWARD_ACTIONS: ReadonlySet<ActionKey> = new Set(['rush_toward', 'stroll_toward', 'help_out', 'investigate']);

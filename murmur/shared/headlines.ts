import { ACTION_KEYS, type ActionKey, type Lang, type PlaceId } from './types';
import { ACTIONS } from './actions';
import { ARCHETYPE_BY_ID } from './archetypes';
import { PLACES } from './places';
import { hashString } from './hash';

type Templates = Record<ActionKey, { en: string[]; ja: string[] }>;

export const HEADLINES: Templates = {
  rush_toward: {
    en: ['{event}: {n} citizens stampede to {place}', 'Stampede! {n} locals sprint for {place}', '{place} mobbed as {pct}% of town breaks into a run'],
    ja: ['{event}:{n}人が{place}へ猛ダッシュ', '大騒ぎ!{place}に{n}人が殺到', '町の{pct}%が走り出す、{place}は大混雑'],
  },
  stroll_toward: {
    en: ['{event}: {n} curious citizens wander over to {place}', 'A leisurely crowd of {n} drifts toward {place}', 'No rush, but {pct}% of the town is heading to {place}'],
    ja: ['{event}:{n}人がのんびり{place}へ', 'ふらりと{n}人、{place}に集まる', '急がず、でも気になる。{pct}%が{place}へ'],
  },
  investigate: {
    en: ['{event}? {n} skeptics go to see for themselves', 'Town turns detective: {n} citizens investigate {place}', '"Is it real?" {pct}% of those who heard check it out'],
    ja: ['{event}?{n}人が真相を確かめに', '町じゅうが探偵に:{n}人が{place}を調査', '「本当なの?」{pct}%が現場を確認'],
  },
  film_it: {
    en: ['Phones out: {n} citizens film {event}', '{event} goes viral as {n} amateur reporters hit record', '{place} lit up by {n} camera flashes'],
    ja: ['スマホ一斉:{n}人が{event}を撮影', '{event}、{n}人の撮影でバズる', '{place}にフラッシュの嵐、{n}人が撮影'],
  },
  spread_word: {
    en: ['Word spreads fast: {aware} people heard about it within {secs} seconds', 'Gossip alert: {n} citizens cannot stop talking about {event}', 'The whole block is buzzing: {pct}% pass it on'],
    ja: ['噂は一瞬:{secs}秒で{aware}人の耳に', '話題沸騰:{n}人が{event}の話でもちきり', '町内が大騒ぎ、{pct}%が人に話す'],
  },
  celebrate: {
    en: ['Joy on the streets: {n} citizens celebrate {event}', '{event}! The town throws an impromptu party', 'Dancing breaks out as {pct}% of town cheers'],
    ja: ['町に歓声:{n}人が{event}をお祝い', '{event}!町は即席パーティーに', '{pct}%が大喜び、道で踊りだす人も'],
  },
  help_out: {
    en: ['Neighbors to the rescue: {n} citizens hurry to help at {place}', '{event}: {n} helping hands arrive at {place}', 'Community spirit: {pct}% of those who heard pitch in'],
    ja: ['助け合いの町:{n}人が{place}へ手伝いに', '{event}:{place}に{n}人の助っ人', '{pct}%が手を貸す、あたたかい町'],
  },
  complain: {
    en: ['Grumbles all round: {n} citizens complain about {event}', '{event}. The town is not amused, {pct}% grumble', 'Letters to the editor pile up as {n} residents fume'],
    ja: ['不満噴出:{n}人が{event}に文句', '{event}。町は不機嫌、{pct}%がぶつぶつ', '投書が殺到、{n}人がぷんぷん'],
  },
  ignore: {
    en: ['{event}. The town shrugs, {pct}% carry on', 'Nothing to see here: {n} citizens barely look up', '{event}? Most locals ({pct}%) have better things to do'],
    ja: ['{event}。町は無反応、{pct}%がいつも通り', '特に何も:{n}人がちらりとも見ず', '{event}?{pct}%はそれどころではない様子'],
  },
  head_home: {
    en: ['{event}: {n} citizens head for home', 'Streets empty as {pct}% of town retreats indoors', 'Doors shut across town: {n} residents call it a day'],
    ja: ['{event}:{n}人が家路へ', '通りから人が消える、{pct}%が屋内へ', '町じゅうの扉が閉まる、{n}人が早じまい'],
  },
  flee: {
    en: ['{event}: {n} citizens flee {place}', 'Run for it! {pct}% scatter from {place}', '{place} abandoned as {n} locals make a hasty exit'],
    ja: ['{event}:{n}人が{place}から逃走', '逃げろ!{pct}%が{place}から散り散りに', '{place}は無人に、{n}人がそそくさと退散'],
  },
  panic: {
    en: ['Chaos! {n} citizens panic over {event}', '{event} sends {pct}% of town into a tizzy', 'Nobody knows what to do: {n} panic near {place}'],
    ja: ['大混乱!{n}人が{event}でパニック', '{event}で町の{pct}%があたふた', 'どうしよう:{place}付近で{n}人がパニック'],
  },
};

export interface HeadlineInput {
  lang: Lang;
  eventText: string;
  place: PlaceId;
  counts: Record<ActionKey, number>;
  aware: number;
  seconds: number;
  /** Archetype id of one citizen per action, for the second line. */
  exemplars: Partial<Record<ActionKey, string>>;
}

export interface Headline {
  dominant: ActionKey;
  line: string;
  subline: string | null;
}

function shortText(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 42 ? t.slice(0, 41).trimEnd() + '…' : t;
}

/** At the start of an English headline the event reads as a kicker; mid-sentence it is quoted. */
function fill(tpl: string, vars: Record<string, string | number>, eventText: string, lang: Lang): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string, offset: number) => {
    if (k !== 'event') return String(vars[k] ?? '');
    const t = shortText(eventText);
    if (lang === 'ja') return `「${t}」`;
    return offset === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : `“${t}”`;
  });
}

export function buildHeadline(input: HeadlineInput): Headline | null {
  let total = 0;
  let dominant: ActionKey = 'ignore';
  let best = -1;
  for (const k of ACTION_KEYS) {
    total += input.counts[k];
    if (input.counts[k] > best) {
      best = input.counts[k];
      dominant = k;
    }
  }
  if (total === 0) return null;
  const n = input.counts[dominant];
  const pct = Math.round((n / total) * 100);
  const list = HEADLINES[dominant][input.lang];
  const tpl = list[hashString(input.eventText) % list.length];
  const vars = {
    n: n.toLocaleString(input.lang === 'ja' ? 'ja-JP' : 'en-US'),
    pct,
    place: input.lang === 'ja' ? PLACES[input.place].name.ja : PLACES[input.place].headline,
    aware: input.aware.toLocaleString(input.lang === 'ja' ? 'ja-JP' : 'en-US'),
    secs: Math.max(1, Math.round(input.seconds)),
  };
  let line = fill(tpl, vars, input.eventText, input.lang);
  if (input.lang === 'en') line = line.charAt(0).toUpperCase() + line.slice(1);

  // Second line: the rarest decision that still happened, from an archetype we can name.
  let rare: ActionKey | null = null;
  let rareCount = Infinity;
  for (const k of ACTION_KEYS) {
    const c = input.counts[k];
    if (k === dominant || c === 0 || !input.exemplars[k]) continue;
    if (c < rareCount) {
      rare = k;
      rareCount = c;
    }
  }
  let subline: string | null = null;
  if (rare) {
    const arch = ARCHETYPE_BY_ID[input.exemplars[rare]!];
    if (arch) {
      subline = input.lang === 'ja' ? `${arch.short.ja}でさえ${ACTIONS[rare].past.ja}` : `Even the ${arch.short.en} ${ACTIONS[rare].past.en}`;
    }
  }
  return { dominant, line, subline };
}

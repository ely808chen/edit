import { ACTION_KEYS, CATEGORY_KEYS, GROUP_IDS } from './types';
import type {
  ActionKey,
  ActionProbs,
  Analysis,
  Category,
  DecideContext,
  DistanceBucket,
  GroupLean,
  Mood,
  PlaceId,
  Severity,
  Source,
  Traits,
  Weather,
} from './types';
import { ARCHETYPE_BY_ID, archetypesInGroup, type Quirk } from './archetypes';
import { hashString, hrand, normalizeEventText } from './hash';
import { isNight } from './time';
import { normalizeProbs } from './actions';

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

const CATEGORY_WORDS: Record<Exclude<Category, 'other'>, string[]> = {
  free_food: [
    'ramen', 'noodle', 'free', 'food', 'pizza', 'sushi', 'cake', 'snack', 'lunch', 'dinner', 'bbq', 'barbecue',
    'ice cream', 'candy', 'giveaway', 'giving away', 'give away', 'buffet', 'donut', 'bread', 'coffee', 'tea', 'takoyaki',
    'ラーメン', '無料', 'タダ', 'ただで', '食べ', 'ご飯', 'ごはん', '寿司', 'ケーキ', 'お菓子', '配布', '配って', 'パン', 'たこ焼き', 'アイス',
  ],
  weather: [
    'rain', 'pour', 'storm', 'snow', 'thunder', 'typhoon', 'heatwave', 'heat wave', 'fog', 'mist', 'wind', 'hail', 'drizzle',
    'rainbow', 'sunny', 'scorching', 'blizzard', 'starry', 'meteor', 'shooting star',
    '雨', '雪', '台風', '嵐', '雷', '霧', '強風', '猛暑', '暑', '虹', '流れ星', '星空', '土砂降り',
  ],
  danger: [
    'fire', 'monster', 'shark', 'earthquake', 'flood', 'explosion', 'robbery', 'thief', 'accident', 'crash', 'giant',
    'attack', 'bear', 'gas leak', 'emergency', 'tsunami', 'zombie', 'kaiju', 'godzilla', 'escaped', 'loose', 'collapse', 'danger',
    '火事', '地震', '事故', '泥棒', '怪獣', 'サメ', '熊', 'クマ', '爆発', '危険', '津波', 'ゾンビ', '巨大', '脱走',
  ],
  rumor: [
    'rumor', 'rumour', 'haunted', 'ghost', 'secret', 'mystery', 'mysterious', 'ufo', 'alien', 'cursed', 'curse', 'legend',
    'they say', 'apparently', 'spooky', 'treasure', 'hidden', 'strange light', 'whisper',
    '噂', 'うわさ', '幽霊', 'お化け', 'おばけ', '秘密', '謎', '呪', '宇宙人', '都市伝説', '宝',
  ],
  celebration: [
    'festival', 'party', 'concert', 'parade', 'fireworks', 'firework', 'wedding', 'birthday', 'dance', 'celebrat', 'show',
    'performance', 'carnival', 'karaoke', 'match', 'game', 'won', 'wins', 'victory',
    '祭', 'パーティ', 'コンサート', 'パレード', '花火', '結婚', '誕生日', 'ライブ', '優勝', 'ダンス',
  ],
  spectacle: [
    'famous', 'celebrity', 'idol', 'movie', 'filming', 'singer', 'pop star', 'popstar', 'royal', 'prince', 'princess',
    'balloon', 'airship', 'spaceship', 'rocket', 'astronaut', 'robot', 'magician', 'superstar', 'actor',
    '有名', '芸能人', 'アイドル', '撮影', '歌手', '王子', '姫', '気球', 'ロケット', 'ロボット', '俳優',
  ],
  animal: [
    'cat', 'kitten', 'dog', 'puppy', 'panda', 'penguin', 'duck', 'whale', 'dolphin', 'horse', 'capybara', 'deer', 'monkey',
    'crab', 'owl', 'bird', 'goat', 'llama', 'alpaca', 'otter', 'turtle', 'fox', 'raccoon', 'tanuki', 'seal',
    '猫', 'ねこ', 'ネコ', '犬', 'いぬ', 'パンダ', 'ペンギン', '鳥', 'クジラ', 'イルカ', 'カピバラ', '鹿', '猿', 'カニ', 'たぬき', 'キツネ',
  ],
  silly: [
    'banana', 'spaghetti', 'floating', 'upside down', 'pudding', 'jelly', 'rubber duck', 'dancing', 'talking', 'invisible',
    'backwards', 'giant pancake', 'bubbles', 'clown', 'pie',
    'プリン', 'バナナ', '逆立ち', 'しゃべる', '透明', 'シャボン玉', 'ピエロ',
  ],
  announcement: [
    'closed', 'announce', 'new rule', 'law', 'mayor', 'elected', 'cancel', 'holiday', 'tax', 'banned', 'ban ', 'official',
    'notice', 'strike', 'delayed', 'shut', 'curfew', 'election', 'today is', 'from now on',
    '閉鎖', '休み', '休業', '発表', '市長', '町長', '選挙', '禁止', '運休', 'お知らせ', '中止', '遅延', '休校', 'ルール',
  ],
};

const PRIORITY: Category[] = ['weather', 'danger', 'free_food', 'announcement', 'rumor', 'celebration', 'spectacle', 'animal', 'silly'];

const PLACE_WORDS: Record<PlaceId, string[]> = {
  park: ['park', 'fountain', 'picnic', 'lawn', '公園', '噴水'],
  ramen: ['ramen stall', 'stall', 'noodle stand', '屋台'],
  shopping: ['shopping', 'shop', 'store', 'market', 'mall', 'arcade', 'boutique', '商店街', '店', '買い物', '市場'],
  cafe: ['cafe', 'café', 'coffee', 'espresso', 'latte', 'カフェ', '喫茶', 'コーヒー'],
  station: ['station', 'train', 'platform', 'commuter', 'rail', '駅', '電車', 'ホーム'],
  office: ['office', 'tower', 'company', 'skyscraper', 'meeting', 'オフィス', '会社', 'タワー', 'ビル'],
  school: ['school', 'class', 'teacher', 'exam', 'student', 'playground', '学校', '授業', '校庭', '先生', '生徒'],
  hospital: ['hospital', 'doctor', 'clinic', 'nurse', 'ambulance', '病院', '医者', '救急'],
  bridge: ['bridge', 'river', '橋', '川'],
  beach: ['beach', 'sea', 'ocean', 'shore', 'surf', 'waves', 'seaside', 'coast', '浜', '海', 'ビーチ'],
  shrine: ['shrine', 'temple', 'hill', 'torii', 'steps', '神社', '寺', '丘', '鳥居'],
  stadium: ['stadium', 'baseball', 'soccer', 'football', 'arena', 'スタジアム', '試合', '野球', 'サッカー', '球場'],
};

const DEFAULT_PLACES: Record<Category, PlaceId[]> = {
  free_food: ['ramen', 'shopping'],
  weather: ['park'],
  danger: ['station', 'shopping', 'park'],
  rumor: ['bridge', 'shrine'],
  celebration: ['park', 'stadium'],
  spectacle: ['station', 'shopping', 'park'],
  animal: ['park', 'shopping'],
  silly: ['park', 'shopping', 'station'],
  announcement: ['station'],
  other: ['park', 'shopping'],
};

const BASE_SEVERITY: Record<Category, number> = {
  free_food: 1,
  weather: 2,
  danger: 2,
  rumor: 1,
  celebration: 1,
  spectacle: 2,
  animal: 1,
  silly: 1,
  announcement: 1,
  other: 0,
};

const INTENSIFIERS = [
  'giant', 'huge', 'massive', 'enormous', 'everyone', 'whole town', 'entire', 'all day', 'free for all', 'biggest',
  'urgent', 'emergency', 'incredible', 'unbelievable', 'thousands', 'million', 'epic', 'free',
  '巨大', '大量', 'みんな', '全員', '町中', '超', '史上', '緊急', '全部', '無料', 'タダ',
];
const DIMINISHERS = [
  'tiny', 'small', 'little', 'a bit', 'slightly', 'a few', 'minor', 'quiet', 'ordinary', 'boring', 'nothing', 'usual', 'normal',
  '小さな', 'ちょっと', '少し', '普通', 'いつも通り', '静か',
];
const MUNDANE = ['boring', 'ordinary', 'nothing', 'usual', 'normal', 'mundane', 'regular', 'same as', 'as always', '普通', 'いつも通り', '平凡', '何もない'];
const BROADCAST_WORDS = ['announce', 'siren', 'everyone', 'whole town', 'all residents', 'broadcast', 'loudspeaker', 'official', 'mayor', '放送', '全員', '町中', '発表', 'サイレン', '市長', '町長'];

const WEATHER_WORDS: Array<[Weather, string[]]> = [
  ['fireworks', ['firework', '花火']],
  ['rainbow', ['rainbow', '虹']],
  ['downpour', ['pour', 'downpour', 'storm', 'typhoon', 'thunder', 'monsoon', '土砂降り', '大雨', '台風', '嵐', '雷']],
  ['light_rain', ['rain', 'drizzle', 'shower', 'sprinkl', '雨']],
  ['snow', ['snow', 'blizzard', 'flurr', '雪']],
  ['heatwave', ['heatwave', 'heat wave', 'scorching', 'hottest', 'so hot', 'heat', '猛暑', '暑']],
  ['fog', ['fog', 'mist', 'haze', '霧']],
  ['wind', ['wind', 'gust', 'gale', 'breezy', '強風', '風']],
  ['starry', ['starry', 'meteor', 'shooting star', 'milky way', 'stars', '流れ星', '星空', '天の川']],
];

function hasWord(text: string, w: string): boolean {
  // ASCII words need a word boundary so "cat" doesn't match "category"; CJK matches substrings.
  if (/^[\x00-\x7f]+$/.test(w)) {
    const re = new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    return re.test(text);
  }
  return text.includes(w);
}

function hits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) if (hasWord(text, w)) n++;
  return n;
}

export function mockCategory(text: string): Category {
  const t = normalizeEventText(text);
  const scores: Partial<Record<Category, number>> = {};
  for (const c of PRIORITY) scores[c] = hits(t, CATEGORY_WORDS[c as Exclude<Category, 'other'>]);
  // An animal doing something official is absurd, not bureaucratic.
  if ((scores.animal ?? 0) > 0 && ((scores.announcement ?? 0) > 0 || (scores.spectacle ?? 0) > 0)) return 'silly';
  let best: Category = 'silly';
  let bestScore = 0;
  for (const c of PRIORITY) {
    const s = scores[c] ?? 0;
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  if (bestScore === 0) return hits(t, MUNDANE) > 0 ? 'other' : 'silly';
  return best;
}

export function mockPlace(text: string, category: Category): PlaceId {
  const t = normalizeEventText(text);
  let best: PlaceId | null = null;
  let bestIdx = Infinity;
  for (const [place, words] of Object.entries(PLACE_WORDS) as Array<[PlaceId, string[]]>) {
    for (const w of words) {
      const re = /^[\x00-\x7f]+$/.test(w) ? new RegExp(`(^|[^a-z])${w}`) : null;
      const m = re ? re.exec(t) : null;
      const idx = re ? (m ? m.index : -1) : t.indexOf(w);
      if (idx >= 0 && idx < bestIdx) {
        bestIdx = idx;
        best = place;
      }
    }
  }
  if (best) return best;
  const opts = DEFAULT_PLACES[category];
  return opts[hashString(t) % opts.length];
}

export function mockSeverity(text: string, category: Category): Severity {
  const t = normalizeEventText(text);
  let s = BASE_SEVERITY[category];
  if (hits(t, INTENSIFIERS) > 0) s += 1;
  if (hits(t, DIMINISHERS) > 0) s -= 1;
  const bangs = (text.match(/[!！]/g) ?? []).length;
  if (bangs >= 1) s += 1;
  if (bangs >= 3) s += 1;
  s = Math.max(0, Math.min(3, s));
  return (['trivial', 'notable', 'big_deal', 'city_wide'] as const)[s];
}

export function mockWeather(text: string): Weather {
  const t = normalizeEventText(text);
  for (const [w, words] of WEATHER_WORDS) {
    for (const word of words) {
      if (hasWord(t, word)) {
        if (w === 'wind' && /window/.test(t) && !/\bwind\b/.test(t)) continue;
        return w;
      }
    }
  }
  return 'none';
}

export function mockAnalysis(text: string, clickedPlace?: PlaceId | null): Analysis {
  const category = mockCategory(text);
  const place = clickedPlace ?? mockPlace(text, category);
  const severity = mockSeverity(text, category);
  const t = normalizeEventText(text);
  const weather = category === 'weather' || category === 'celebration' || category === 'silly' ? mockWeather(text) : 'none';
  const broadcast = category === 'weather' || category === 'announcement' || hits(t, BROADCAST_WORDS) > 0;
  return { blocked: false, category, place, severity, broadcast, weather, mock: true };
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

type Row = [number, number, number, number, number, number, number, number, number, number, number, number];
//                 rush stroll invst film spread celeb help cmpln ignore home flee panic
const BASE: Record<Category, Row> = {
  free_food:    [5.0, 3.0, 0.6, 0.8, 2.0, 0.8, 0.2, 0.2, 1.2, 0.1, 0.05, 0.05],
  weather:      [0.1, 0.2, 0.2, 0.4, 0.4, 0.4, 0.2, 1.3, 1.2, 4.5, 0.2, 0.3],
  danger:       [0.5, 0.2, 1.4, 1.2, 1.2, 0.05, 1.2, 0.3, 0.3, 1.5, 2.5, 1.8],
  rumor:        [0.2, 0.8, 3.2, 0.6, 3.0, 0.1, 0.1, 0.2, 1.0, 0.5, 0.4, 0.2],
  celebration:  [2.2, 2.6, 0.3, 1.4, 1.0, 2.2, 0.1, 0.4, 1.0, 0.2, 0.02, 0.02],
  spectacle:    [2.4, 1.8, 0.8, 2.6, 1.4, 1.0, 0.05, 0.2, 0.8, 0.1, 0.05, 0.1],
  animal:       [1.0, 1.8, 1.4, 2.0, 1.2, 1.2, 0.5, 0.2, 1.0, 0.2, 0.3, 0.2],
  silly:        [0.6, 1.2, 1.0, 2.2, 2.2, 2.4, 0.1, 0.3, 1.1, 0.1, 0.1, 0.2],
  announcement: [0.2, 0.4, 0.4, 0.2, 1.6, 0.4, 0.2, 2.4, 2.0, 0.6, 0.05, 0.2],
  other:        [0.2, 0.6, 0.8, 0.4, 0.6, 0.3, 0.2, 0.4, 4.0, 0.3, 0.05, 0.05],
};

const WEATHER_BASE: Partial<Record<Weather, Row>> = {
  light_rain: [0.1, 0.3, 0.2, 0.3, 0.4, 0.3, 0.2, 1.2, 2.2, 3.2, 0.1, 0.1],
  downpour:   [0.1, 0.1, 0.1, 0.3, 0.3, 0.2, 0.3, 1.2, 0.8, 6.0, 0.4, 0.4],
  snow:       [0.6, 1.2, 0.5, 2.0, 1.2, 2.4, 0.2, 0.8, 1.0, 1.6, 0.05, 0.1],
  heatwave:   [0.3, 0.4, 0.2, 0.3, 0.5, 0.2, 0.4, 2.2, 1.4, 2.4, 0.1, 0.2],
  fog:        [0.1, 0.4, 1.4, 0.6, 0.6, 0.2, 0.2, 0.8, 2.2, 1.6, 0.2, 0.3],
  wind:       [0.1, 0.2, 0.3, 0.5, 0.4, 0.3, 0.3, 1.8, 1.8, 2.2, 0.2, 0.3],
  fireworks:  [2.2, 2.8, 0.3, 2.4, 1.0, 2.2, 0.05, 0.3, 0.8, 0.3, 0.02, 0.05],
  starry:     [0.6, 2.4, 0.3, 2.2, 0.8, 1.6, 0.05, 0.2, 1.4, 0.6, 0.02, 0.02],
  rainbow:    [0.6, 1.8, 0.3, 3.0, 1.2, 2.0, 0.05, 0.1, 1.2, 0.2, 0.02, 0.02],
};

type TraitKey = keyof Traits;
const AFFINITY: Record<ActionKey, Partial<Record<TraitKey, number>>> = {
  rush_toward: { energy: 1.6, curiosity: 0.6, homebody: -1.0, skepticism: -0.6 },
  stroll_toward: { curiosity: 1.2, energy: 0.4 },
  investigate: { curiosity: 1.6, skepticism: 1.6, fear: -1.0 },
  film_it: { curiosity: 0.6, sociability: 0.8, energy: 0.6 },
  spread_word: { sociability: 2.4, skepticism: -0.6 },
  celebrate: { energy: 1.6, sociability: 0.8, skepticism: -0.6, fear: -0.4 },
  help_out: { care: 2.6, fear: -0.6 },
  complain: { skepticism: 0.8, energy: -0.4, care: -0.4, homebody: 0.5 },
  ignore: { skepticism: 1.2, curiosity: -1.6, sociability: -0.6 },
  head_home: { homebody: 2.0, fear: 1.4, energy: -0.6 },
  flee: { fear: 2.4, energy: 0.4, curiosity: -0.6 },
  panic: { fear: 2.4, skepticism: -0.8, care: -0.4 },
};

const DISTANCE_MULT: Record<DistanceBucket, Partial<Record<ActionKey, number>>> = {
  here: { film_it: 1.5, panic: 1.5, flee: 1.5, investigate: 1.1, help_out: 1.3, ignore: 0.6 },
  near: { stroll_toward: 1.1 },
  far: { ignore: 2.0, rush_toward: 0.7, stroll_toward: 0.8, film_it: 0.6, flee: 0.5, panic: 0.6, help_out: 0.7, spread_word: 1.1 },
};

const SOURCE_MULT: Record<Source, Partial<Record<ActionKey, number>>> = {
  saw: { film_it: 1.2 },
  heard: { investigate: 1.4, ignore: 1.3, film_it: 0.6 },
  online: { film_it: 1.3, spread_word: 1.3, investigate: 1.2 },
  announcement: { spread_word: 0.6, investigate: 0.8, ignore: 1.1, film_it: 0.6 },
};

const MOOD_MULT: Record<Mood, Partial<Record<ActionKey, number>>> = {
  calm: {},
  on_edge: { panic: 1.5, flee: 1.3, complain: 1.3, celebrate: 0.6 },
  cheerful: { celebrate: 1.4, complain: 0.6, panic: 0.7 },
};

export interface MockDecisionInput {
  eventText: string;
  category: Category;
  weather: Weather;
  minute: number;
  traits: Traits;
  quirks: Quirk[];
  source: Source;
  distance: DistanceBucket;
  mood: Mood;
  activity: string;
  /** Deterministic noise seed, for example the context key. */
  noiseKey: string;
}

function applyMult(w: number[], m: Partial<Record<ActionKey, number>>) {
  for (let i = 0; i < ACTION_KEYS.length; i++) {
    const v = m[ACTION_KEYS[i]];
    if (v !== undefined) w[i] *= v;
  }
}

export function mockDistribution(input: MockDecisionInput): ActionProbs {
  const row = (input.category === 'weather' && WEATHER_BASE[input.weather]) || BASE[input.category] || BASE.other;
  const w = row.slice();
  const text = normalizeEventText(input.eventText);
  const food = input.category === 'free_food';
  for (let i = 0; i < ACTION_KEYS.length; i++) {
    const aff = AFFINITY[ACTION_KEYS[i]];
    let e = 0;
    for (const [trait, k] of Object.entries(aff) as Array<[TraitKey, number]>) e += k * (input.traits[trait] - 0.5);
    if (ACTION_KEYS[i] === 'rush_toward' && food) e += 2.4 * (input.traits.hunger - 0.5);
    if (ACTION_KEYS[i] === 'rush_toward' && input.category === 'danger') e -= 2.0 * (input.traits.fear - 0.5);
    w[i] *= Math.exp(e);
  }
  applyMult(w, DISTANCE_MULT[input.distance]);
  applyMult(w, SOURCE_MULT[input.source]);
  applyMult(w, MOOD_MULT[input.mood]);
  if (input.activity !== 'routine') {
    applyMult(w, { ignore: 1.2 });
    const current = input.activity.split(':')[0];
    if (current === 'flee' || current === 'panic') applyMult(w, { flee: 1.3, panic: 1.3 });
    if (current === 'celebrate') applyMult(w, { celebrate: 1.3 });
  }
  if (isNight(input.minute)) applyMult(w, { head_home: 1.4, ignore: 1.2 });
  if (hits(text, MUNDANE) > 0) applyMult(w, { ignore: 4 });
  for (const q of input.quirks) {
    if (q.category && q.category !== input.category) continue;
    if (q.match && !new RegExp(q.match, 'i').test(text)) continue;
    applyMult(w, q.boosts);
  }
  const seed = hashString(input.noiseKey + '|' + text);
  const out: Record<string, number> = {};
  for (let i = 0; i < ACTION_KEYS.length; i++) {
    const noise = 0.85 + 0.3 * hrand(seed, i);
    out[ACTION_KEYS[i]] = w[i] * noise;
  }
  return normalizeProbs(out);
}

export function mockDecideContext(
  ctx: DecideContext,
  event: { text: string; category: Category },
  world: { minute: number; weather: Weather },
): ActionProbs {
  const arch = ARCHETYPE_BY_ID[ctx.archetypeId];
  const traits = arch?.traits ?? { curiosity: 0.5, fear: 0.5, sociability: 0.5, hunger: 0.5, care: 0.5, skepticism: 0.5, energy: 0.5, homebody: 0.5 };
  return mockDistribution({
    eventText: event.text,
    category: event.category,
    weather: world.weather,
    minute: world.minute,
    traits,
    quirks: arch?.quirks ?? [],
    source: ctx.source,
    distance: ctx.distance,
    mood: ctx.mood,
    activity: ctx.activity,
    noiseKey: ctx.key,
  });
}

export function mockGroupLeans(text: string, analysis: Pick<Analysis, 'category' | 'weather'>, minute: number): GroupLean[] {
  return GROUP_IDS.map((group) => {
    const members = archetypesInGroup(group);
    const traits = { curiosity: 0, fear: 0, sociability: 0, hunger: 0, care: 0, skepticism: 0, energy: 0, homebody: 0 };
    for (const m of members) for (const k of Object.keys(traits) as TraitKey[]) traits[k] += m.traits[k] / members.length;
    const probs = mockDistribution({
      eventText: text,
      category: analysis.category,
      weather: analysis.weather,
      minute,
      traits,
      quirks: members.flatMap((m) => m.quirks.map((q) => ({ ...q, boosts: softenBoosts(q.boosts, members.length) }))),
      source: 'saw',
      distance: 'near',
      mood: 'calm',
      activity: 'routine',
      noiseKey: 'group:' + group,
    });
    return { group, probs };
  });
}

function softenBoosts(b: Partial<Record<ActionKey, number>>, n: number): Partial<Record<ActionKey, number>> {
  const out: Partial<Record<ActionKey, number>> = {};
  for (const [k, v] of Object.entries(b) as Array<[ActionKey, number]>) out[k] = Math.pow(v, 1 / n);
  return out;
}

export function isCategory(x: unknown): x is Category {
  return typeof x === 'string' && (CATEGORY_KEYS as readonly string[]).includes(x);
}

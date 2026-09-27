import type { ActionKey, Category, GroupId, Traits } from './types';

export interface GroupMeta {
  id: GroupId;
  /** Used verbatim in Jev questions: "a {description} told them". */
  description: string;
  name: { en: string; ja: string };
  /** Palette family index range for body colors. */
  colors: number[];
  accessory: AccessoryId;
}

export type AccessoryId = 'backpack' | 'tie' | 'nursecap' | 'scarf' | 'apron' | 'headphones' | 'cap' | 'beret';

export type Boosts = Partial<Record<ActionKey, number>>;

export interface Quirk {
  /** Case-insensitive regex source matched against the event text. */
  match?: string;
  category?: Category;
  boosts: Boosts;
}

export interface Archetype {
  id: string;
  group: GroupId;
  /** Used verbatim in Jev questions. */
  oneLiner: string;
  oneLinerJa: string;
  short: { en: string; ja: string };
  traits: Traits;
  schedule: string;
  weight: number;
  quirks: Quirk[];
}

export const GROUPS: Record<GroupId, GroupMeta> = {
  students: { id: 'students', description: 'a student', name: { en: 'Kids and students', ja: '子どもと学生' }, colors: [0, 1], accessory: 'backpack' },
  workers: { id: 'workers', description: 'a working adult', name: { en: 'Workers', ja: '働く人' }, colors: [2, 3], accessory: 'tie' },
  night: { id: 'night', description: 'someone who works odd hours', name: { en: 'Night and service', ja: '夜勤とサービス' }, colors: [4], accessory: 'nursecap' },
  elders: { id: 'elders', description: 'an older neighbor', name: { en: 'Elders', ja: 'ご年配' }, colors: [5, 6], accessory: 'scarf' },
  shops: { id: 'shops', description: 'a local shop owner', name: { en: 'Food and shops', ja: 'お店の人' }, colors: [7], accessory: 'apron' },
  creatives: { id: 'creatives', description: 'a creative type', name: { en: 'Creatives', ja: 'クリエイター' }, colors: [8, 9], accessory: 'headphones' },
  outdoorsy: { id: 'outdoorsy', description: 'an outdoorsy local', name: { en: 'Outdoorsy', ja: 'アウトドア派' }, colors: [10], accessory: 'cap' },
  oddballs: { id: 'oddballs', description: "one of the town's characters", name: { en: 'Oddballs', ja: '町の名物' }, colors: [11], accessory: 'beret' },
};

function t(
  curiosity: number,
  fear: number,
  sociability: number,
  hunger: number,
  care: number,
  skepticism: number,
  energy: number,
  homebody: number,
): Traits {
  return { curiosity, fear, sociability, hunger, care, skepticism, energy, homebody };
}

const FOOD = 'ramen|noodle|food|free|snack|pizza|sushi|cake|lunch|dinner|ラーメン|無料|タダ|食|ご飯|寿司|ケーキ';
const CAT = 'cat|kitten|neko|猫|ねこ|ネコ';
const DOG = 'dog|puppy|犬|いぬ|イヌ';
const TRAIN = 'station|train|commute|rail|駅|電車|列車';
const CLOSED = 'closed|cancel|shut|delay|strike|閉|運休|中止|遅延';

export const ARCHETYPES: Archetype[] = [
  // Kids and students
  {
    id: 'curious_kid', group: 'students', schedule: 'kid', weight: 1.3,
    oneLiner: 'A curious kid who asks everyone questions', oneLinerJa: 'みんなに質問してまわる好奇心いっぱいの子ども',
    short: { en: 'curious kid', ja: '好奇心旺盛な子ども' }, traits: t(0.95, 0.35, 0.8, 0.6, 0.4, 0.1, 0.9, 0.2),
    quirks: [{ category: 'animal', boosts: { rush_toward: 1.8, celebrate: 1.4 } }],
  },
  {
    id: 'anxious_student', group: 'students', schedule: 'student', weight: 1.4,
    oneLiner: 'An anxious student in the middle of exam season', oneLinerJa: '試験期間まっただ中の心配性な学生',
    short: { en: 'anxious student', ja: '心配性の学生' }, traits: t(0.4, 0.8, 0.4, 0.4, 0.4, 0.4, 0.4, 0.7),
    quirks: [{ category: 'celebration', boosts: { ignore: 1.6 } }],
  },
  {
    id: 'skater_teen', group: 'students', schedule: 'teen', weight: 1.2,
    oneLiner: 'A skateboarding teenager who films everything', oneLinerJa: '何でも動画に撮るスケボー好きの高校生',
    short: { en: 'skater kid', ja: 'スケボー少年' }, traits: t(0.7, 0.2, 0.6, 0.6, 0.2, 0.3, 0.95, 0.1),
    quirks: [{ boosts: { film_it: 2.2 } }],
  },
  {
    id: 'bookish_student', group: 'students', schedule: 'uni', weight: 1.1,
    oneLiner: 'A bookish university student who fact-checks every rumor', oneLinerJa: 'どんな噂もファクトチェックする本好きの大学生',
    short: { en: 'fact-checker', ja: 'ファクトチェック大学生' }, traits: t(0.8, 0.3, 0.4, 0.4, 0.4, 0.95, 0.4, 0.5),
    quirks: [{ category: 'rumor', boosts: { investigate: 2.2, spread_word: 0.6, flee: 0.4 } }],
  },
  // Workers
  {
    id: 'office_worker', group: 'workers', schedule: 'office', weight: 2.2,
    oneLiner: 'An overworked office worker who is always running late', oneLinerJa: 'いつも遅刻しそうな働きすぎの会社員',
    short: { en: 'office worker', ja: '会社員' }, traits: t(0.3, 0.4, 0.3, 0.6, 0.3, 0.5, 0.3, 0.5),
    quirks: [
      { match: TRAIN, boosts: { complain: 3.2, ignore: 0.8 } },
      { match: CLOSED, boosts: { complain: 2.4 } },
      { category: 'announcement', boosts: { complain: 1.8 } },
    ],
  },
  {
    id: 'chatty_salesperson', group: 'workers', schedule: 'sales', weight: 1.3,
    oneLiner: 'A chatty salesperson who talks to everyone', oneLinerJa: '誰とでも話すおしゃべりな営業マン',
    short: { en: 'salesperson', ja: '営業マン' }, traits: t(0.6, 0.3, 0.95, 0.6, 0.4, 0.3, 0.7, 0.2),
    quirks: [{ match: TRAIN, boosts: { complain: 2.2 } }],
  },
  {
    id: 'construction_worker', group: 'workers', schedule: 'construction', weight: 1.0,
    oneLiner: 'A construction worker on a lunch break', oneLinerJa: '昼休み中の建設作業員',
    short: { en: 'construction worker', ja: '建設作業員' }, traits: t(0.5, 0.2, 0.5, 0.8, 0.6, 0.3, 0.8, 0.2),
    quirks: [{ category: 'danger', boosts: { help_out: 1.8 } }],
  },
  {
    id: 'delivery_rider', group: 'workers', schedule: 'delivery', weight: 1.0,
    oneLiner: 'A delivery rider who is always in a hurry', oneLinerJa: 'いつも急いでいる配達ライダー',
    short: { en: 'delivery rider', ja: '配達ライダー' }, traits: t(0.3, 0.3, 0.4, 0.5, 0.3, 0.4, 0.8, 0.1),
    quirks: [{ boosts: { ignore: 1.5 } }, { match: CLOSED, boosts: { complain: 2 } }],
  },
  // Night and service
  {
    id: 'night_nurse', group: 'night', schedule: 'nurse', weight: 0.8,
    oneLiner: 'A night-shift nurse who stays calm in any crisis', oneLinerJa: 'どんな危機にも動じない夜勤の看護師',
    short: { en: 'night nurse', ja: '夜勤の看護師' }, traits: t(0.4, 0.1, 0.4, 0.4, 0.95, 0.5, 0.5, 0.5),
    quirks: [{ category: 'danger', boosts: { help_out: 3, panic: 0.2, flee: 0.3 } }],
  },
  {
    id: 'store_clerk', group: 'night', schedule: 'clerk', weight: 0.8,
    oneLiner: 'A convenience store clerk who has seen it all', oneLinerJa: '何でも見てきたコンビニ店員',
    short: { en: 'store clerk', ja: 'コンビニ店員' }, traits: t(0.2, 0.2, 0.4, 0.5, 0.4, 0.8, 0.3, 0.5),
    quirks: [{ boosts: { ignore: 1.8, panic: 0.4 } }],
  },
  {
    id: 'police_officer', group: 'night', schedule: 'police', weight: 0.7,
    oneLiner: 'A police officer on patrol who checks out anything unusual', oneLinerJa: '変わったことは何でも確かめる巡回中の警察官',
    short: { en: 'police officer', ja: 'おまわりさん' }, traits: t(0.8, 0.1, 0.5, 0.3, 0.9, 0.7, 0.7, 0.1),
    quirks: [{ boosts: { investigate: 1.8, panic: 0.2, flee: 0.2 } }, { category: 'danger', boosts: { help_out: 2 } }],
  },
  {
    id: 'taxi_driver', group: 'night', schedule: 'taxi', weight: 0.7,
    oneLiner: 'A taxi driver who hears every rumor in town', oneLinerJa: '町の噂は全部耳に入るタクシー運転手',
    short: { en: 'taxi driver', ja: 'タクシー運転手' }, traits: t(0.6, 0.3, 0.9, 0.4, 0.3, 0.4, 0.5, 0.2),
    quirks: [{ category: 'rumor', boosts: { spread_word: 1.8 } }],
  },
  // Elders
  {
    id: 'nosy_retiree', group: 'elders', schedule: 'retiree', weight: 1.1,
    oneLiner: 'A nosy retiree who spreads gossip within minutes', oneLinerJa: '噂を数分で広めるおせっかいな年金生活者',
    short: { en: 'nosy retiree', ja: 'おせっかいなご隠居' }, traits: t(0.8, 0.4, 0.95, 0.4, 0.4, 0.2, 0.4, 0.5),
    quirks: [{ boosts: { spread_word: 1.8 } }],
  },
  {
    id: 'cautious_grandma', group: 'elders', schedule: 'grandma', weight: 1.0,
    oneLiner: 'A cautious grandmother who worries about everyone', oneLinerJa: 'みんなの心配ばかりしている慎重なおばあちゃん',
    short: { en: 'cautious grandmother', ja: '慎重なおばあちゃん' }, traits: t(0.3, 0.9, 0.5, 0.4, 0.8, 0.5, 0.2, 0.9),
    quirks: [
      { category: 'rumor', boosts: { head_home: 3.2, flee: 2.2, investigate: 0.35, spread_word: 0.5 } },
      { category: 'danger', boosts: { head_home: 2 } },
    ],
  },
  {
    id: 'retired_teacher', group: 'elders', schedule: 'retiree', weight: 0.8,
    oneLiner: 'A retired teacher who loves to explain things', oneLinerJa: '説明するのが大好きな元先生',
    short: { en: 'retired teacher', ja: '元先生' }, traits: t(0.7, 0.3, 0.7, 0.4, 0.6, 0.6, 0.4, 0.5),
    quirks: [{ boosts: { spread_word: 1.4 } }],
  },
  {
    id: 'old_fisherman', group: 'elders', schedule: 'fisher', weight: 0.8,
    oneLiner: 'An old fisherman who distrusts anything new', oneLinerJa: '新しいものは信用しない年老いた漁師',
    short: { en: 'old fisherman', ja: '老漁師' }, traits: t(0.2, 0.3, 0.3, 0.5, 0.3, 0.95, 0.3, 0.6),
    quirks: [{ boosts: { complain: 1.6, ignore: 1.4 } }],
  },
  // Food and shops
  {
    id: 'ramen_chef', group: 'shops', schedule: 'chef', weight: 0.5,
    oneLiner: 'A proud ramen chef who thinks their broth is the best in town', oneLinerJa: '自分のスープが町一番だと信じる誇り高いラーメン職人',
    short: { en: 'ramen chef', ja: 'ラーメン職人' }, traits: t(0.4, 0.3, 0.6, 0.5, 0.5, 0.5, 0.6, 0.4),
    quirks: [{ match: 'ramen|noodle|ラーメン|麺', boosts: { investigate: 2.2, complain: 2.2, rush_toward: 0.4 } }],
  },
  {
    id: 'cafe_owner', group: 'shops', schedule: 'cafe_owner', weight: 0.6,
    oneLiner: 'A café owner who knows every regular by name', oneLinerJa: '常連の名前を全員覚えているカフェの店主',
    short: { en: 'café owner', ja: 'カフェの店主' }, traits: t(0.5, 0.3, 0.8, 0.4, 0.6, 0.4, 0.5, 0.5),
    quirks: [{ boosts: { spread_word: 1.4 } }],
  },
  {
    id: 'street_foodie', group: 'shops', schedule: 'foodie', weight: 0.8,
    oneLiner: 'A street food fanatic who never skips a free meal', oneLinerJa: 'タダ飯は絶対に逃さない屋台グルメマニア',
    short: { en: 'street food fanatic', ja: '屋台グルメマニア' }, traits: t(0.6, 0.2, 0.5, 1.0, 0.2, 0.2, 0.8, 0.1),
    quirks: [{ match: FOOD, boosts: { rush_toward: 3.2 } }, { category: 'free_food', boosts: { rush_toward: 2.5 } }],
  },
  {
    id: 'early_baker', group: 'shops', schedule: 'baker', weight: 0.6,
    oneLiner: 'A baker who has been up since 4am', oneLinerJa: '朝4時から起きているパン職人',
    short: { en: 'baker', ja: 'パン職人' }, traits: t(0.3, 0.3, 0.5, 0.5, 0.5, 0.4, 0.2, 0.7),
    quirks: [{ boosts: { head_home: 1.4 } }],
  },
  // Creatives
  {
    id: 'influencer', group: 'creatives', schedule: 'creative', weight: 0.9,
    oneLiner: 'An influencer who must post everything', oneLinerJa: '何でも投稿せずにいられないインフルエンサー',
    short: { en: 'influencer', ja: 'インフルエンサー' }, traits: t(0.7, 0.3, 0.9, 0.5, 0.2, 0.2, 0.8, 0.1),
    quirks: [{ boosts: { film_it: 3 } }],
  },
  {
    id: 'street_musician', group: 'creatives', schedule: 'creative', weight: 0.7,
    oneLiner: 'A street musician who plays for any crowd', oneLinerJa: '人が集まればどこでも演奏するストリートミュージシャン',
    short: { en: 'street musician', ja: 'ストリートミュージシャン' }, traits: t(0.5, 0.2, 0.8, 0.5, 0.3, 0.3, 0.7, 0.2),
    quirks: [{ boosts: { celebrate: 1.8 } }, { category: 'celebration', boosts: { rush_toward: 1.6 } }],
  },
  {
    id: 'novelist', group: 'creatives', schedule: 'creative', weight: 0.6,
    oneLiner: 'An aspiring novelist hungry for drama', oneLinerJa: 'ドラマに飢えている小説家志望',
    short: { en: 'aspiring novelist', ja: '小説家志望' }, traits: t(0.9, 0.4, 0.4, 0.4, 0.3, 0.5, 0.4, 0.6),
    quirks: [{ category: 'rumor', boosts: { investigate: 2 } }, { category: 'danger', boosts: { investigate: 1.6 } }],
  },
  {
    id: 'photographer', group: 'creatives', schedule: 'creative', weight: 0.7,
    oneLiner: 'A photographer chasing the perfect shot', oneLinerJa: '最高の一枚を追いかける写真家',
    short: { en: 'photographer', ja: '写真家' }, traits: t(0.8, 0.2, 0.4, 0.4, 0.2, 0.4, 0.6, 0.2),
    quirks: [{ boosts: { film_it: 2.6 } }, { match: 'rainbow|firework|sunset|虹|花火', boosts: { film_it: 2 } }],
  },
  // Outdoorsy
  {
    id: 'morning_jogger', group: 'outdoorsy', schedule: 'jogger', weight: 0.9,
    oneLiner: 'A morning jogger who never misses a run', oneLinerJa: '毎朝のランニングを欠かさないジョガー',
    short: { en: 'morning jogger', ja: '朝ランナー' }, traits: t(0.4, 0.2, 0.4, 0.3, 0.4, 0.4, 0.95, 0.1),
    quirks: [{ boosts: { ignore: 1.3 } }],
  },
  {
    id: 'dog_walker', group: 'outdoorsy', schedule: 'dogwalker', weight: 0.9,
    oneLiner: 'A dog walker whose dog makes the decisions', oneLinerJa: '行き先は犬が決める犬の散歩中の人',
    short: { en: 'dog walker', ja: '犬の散歩の人' }, traits: t(0.6, 0.4, 0.6, 0.4, 0.5, 0.3, 0.6, 0.3),
    quirks: [{ category: 'animal', boosts: { rush_toward: 2 } }, { match: DOG, boosts: { rush_toward: 2, celebrate: 1.5 } }, { match: CAT, boosts: { rush_toward: 1.6, investigate: 1.4 } }],
  },
  {
    id: 'cyclist', group: 'outdoorsy', schedule: 'cyclist', weight: 0.8,
    oneLiner: 'A cyclist who knows every shortcut', oneLinerJa: 'あらゆる近道を知っているサイクリスト',
    short: { en: 'cyclist', ja: 'サイクリスト' }, traits: t(0.5, 0.2, 0.4, 0.4, 0.3, 0.4, 0.8, 0.2),
    quirks: [{ boosts: { rush_toward: 1.3 } }],
  },
  {
    id: 'gardener', group: 'outdoorsy', schedule: 'gardener', weight: 0.7,
    oneLiner: 'A gardener who is happiest among plants', oneLinerJa: '植物に囲まれているのが一番幸せな庭師',
    short: { en: 'gardener', ja: '庭師' }, traits: t(0.3, 0.4, 0.4, 0.4, 0.7, 0.4, 0.3, 0.7),
    quirks: [{ match: 'rain|雨', boosts: { celebrate: 1.8, head_home: 0.6 } }],
  },
  // Oddballs
  {
    id: 'conspiracy_theorist', group: 'oddballs', schedule: 'roamer', weight: 0.6,
    oneLiner: 'A conspiracy theorist who believes every rumor', oneLinerJa: 'どんな噂も信じる陰謀論者',
    short: { en: 'conspiracy theorist', ja: '陰謀論者' }, traits: t(0.9, 0.5, 0.8, 0.3, 0.2, 0.05, 0.6, 0.4),
    quirks: [{ category: 'rumor', boosts: { spread_word: 4.5, investigate: 0.6, head_home: 0.4, flee: 0.5 } }, { boosts: { spread_word: 1.8 } }],
  },
  {
    id: 'thrill_seeker', group: 'oddballs', schedule: 'thrill', weight: 0.6,
    oneLiner: 'A thrill-seeker who runs toward danger', oneLinerJa: '危険に向かって走っていくスリル好き',
    short: { en: 'thrill-seeker', ja: 'スリル好き' }, traits: t(0.8, 0.0, 0.5, 0.4, 0.3, 0.3, 1.0, 0.0),
    quirks: [{ category: 'danger', boosts: { rush_toward: 3.5, flee: 0.1, panic: 0.1 } }, { category: 'rumor', boosts: { investigate: 1.8 } }],
  },
  {
    id: 'cat_lover', group: 'oddballs', schedule: 'catlover', weight: 0.6,
    oneLiner: 'A cat lover who talks to every stray', oneLinerJa: '野良猫みんなに話しかける猫好き',
    short: { en: 'cat lover', ja: '猫好き' }, traits: t(0.5, 0.4, 0.5, 0.3, 0.8, 0.3, 0.4, 0.6),
    quirks: [{ match: CAT, boosts: { celebrate: 5, rush_toward: 1.6, ignore: 0.3, complain: 0.3 } }],
  },
  {
    id: 'lost_tourist', group: 'oddballs', schedule: 'tourist', weight: 0.7,
    oneLiner: 'A lost tourist who is delighted by everything', oneLinerJa: '何を見ても大喜びの迷子の観光客',
    short: { en: 'lost tourist', ja: '迷子の観光客' }, traits: t(0.95, 0.3, 0.6, 0.7, 0.3, 0.1, 0.7, 0.1),
    quirks: [{ boosts: { celebrate: 1.6, film_it: 1.6, complain: 0.4 } }],
  },
];

export const ARCHETYPE_BY_ID: Record<string, Archetype> = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));

export function archetypesInGroup(group: GroupId): Archetype[] {
  return ARCHETYPES.filter((a) => a.group === group);
}

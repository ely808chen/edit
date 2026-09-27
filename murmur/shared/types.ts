export const ACTION_KEYS = [
  'rush_toward',
  'stroll_toward',
  'investigate',
  'film_it',
  'spread_word',
  'celebrate',
  'help_out',
  'complain',
  'ignore',
  'head_home',
  'flee',
  'panic',
] as const;
export type ActionKey = (typeof ACTION_KEYS)[number];

export const PLACE_IDS = [
  'park',
  'ramen',
  'shopping',
  'cafe',
  'station',
  'office',
  'school',
  'hospital',
  'bridge',
  'beach',
  'shrine',
  'stadium',
] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

export const CATEGORY_KEYS = [
  'free_food',
  'weather',
  'danger',
  'rumor',
  'celebration',
  'spectacle',
  'animal',
  'silly',
  'announcement',
  'other',
] as const;
export type Category = (typeof CATEGORY_KEYS)[number];

export const SEVERITIES = ['trivial', 'notable', 'big_deal', 'city_wide'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const WEATHER_KEYS = [
  'none',
  'light_rain',
  'downpour',
  'snow',
  'heatwave',
  'fog',
  'wind',
  'fireworks',
  'starry',
  'rainbow',
] as const;
export type Weather = (typeof WEATHER_KEYS)[number];

export const GROUP_IDS = [
  'students',
  'workers',
  'night',
  'elders',
  'shops',
  'creatives',
  'outdoorsy',
  'oddballs',
] as const;
export type GroupId = (typeof GROUP_IDS)[number];

export type Source = 'saw' | 'heard' | 'online' | 'announcement';
export type TellerGroup = GroupId | 'stranger' | 'none';
export type Mood = 'calm' | 'on_edge' | 'cheerful';
export type DistanceBucket = 'here' | 'near' | 'far';
export type Lang = 'en' | 'ja';

/** A probability for every action key. */
export type ActionProbs = Record<ActionKey, number>;

/**
 * Structured, enum-only description of one citizen's situation. The server turns
 * this into a question using fixed templates; the browser never sends question text.
 */
export interface DecideContext {
  key: string;
  archetypeId: string;
  source: Source;
  tellerGroup: TellerGroup;
  distance: DistanceBucket;
  mood: Mood;
  /** 'routine' or `${ActionKey}:${index into world.otherEvents}` */
  activity: string;
  /** Full city mode only: exact distance in tiles. */
  distanceTiles?: number;
}

export interface DecideRequest {
  event: { text: string; place: PlaceId; category: Category };
  world: { minute: number; weather: Weather; otherEvents: string[] };
  contexts: DecideContext[];
}

export interface DecideLine {
  key: string;
  probs: ActionProbs;
  latencyMs: number;
  cached: boolean;
  mock: boolean;
}

export interface Analysis {
  blocked: boolean;
  category: Category;
  place: PlaceId;
  severity: Severity;
  broadcast: boolean;
  weather: Weather;
  /** Raw probabilities from the analysis questions, for the debug overlay. */
  probs?: {
    blocked: number;
    broadcast: number;
    category?: Partial<Record<Category, number>>;
    place?: Partial<Record<PlaceId, number>>;
    severity?: number[];
  };
  mock: boolean;
}

export interface AnalyzeResponse extends Analysis {
  eventId: string;
}

export interface GroupLean {
  group: GroupId;
  probs: ActionProbs;
}

export interface PreviewResponse {
  blocked: boolean;
  category: Category;
  place: PlaceId;
  severity: Severity;
  groupLeans: GroupLean[];
  /** Included so a release can reuse the preview's analysis without another request. */
  broadcast?: boolean;
  weather?: Weather;
  mock: boolean;
}

export interface Traits {
  curiosity: number;
  fear: number;
  sociability: number;
  hunger: number;
  care: number;
  skepticism: number;
  energy: number;
  homebody: number;
}

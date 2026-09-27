import type { PlaceId } from './types';

export interface PlaceMeta {
  id: PlaceId;
  name: { en: string; ja: string };
  /** English name as it reads inside a sentence. */
  headline: string;
  /** Plain-language description used verbatim in Jev questions and state. */
  description: string;
}

export const PLACES: Record<PlaceId, PlaceMeta> = {
  park: {
    id: 'park',
    name: { en: 'Central Park', ja: '中央公園' },
    headline: 'Central Park',
    description: 'Central Park: big green park with a fountain, picnics, and street performers',
  },
  ramen: {
    id: 'ramen',
    name: { en: 'Ramen Stall', ja: 'ラーメン屋台' },
    headline: 'the Ramen Stall',
    description: 'Ramen Stall: a tiny beloved ramen stall at the end of the shopping street',
  },
  shopping: {
    id: 'shopping',
    name: { en: 'Shopping Street', ja: '商店街' },
    headline: 'the Shopping Street',
    description: 'Shopping Street: a lively covered street of small shops',
  },
  cafe: {
    id: 'cafe',
    name: { en: 'Café Corner', ja: 'カフェ・コーナー' },
    headline: 'Café Corner',
    description: 'Café Corner: a cozy café with outdoor tables',
  },
  station: {
    id: 'station',
    name: { en: 'Station', ja: '駅' },
    headline: 'the Station',
    description: 'Station: the train station where commuters rush in and out',
  },
  office: {
    id: 'office',
    name: { en: 'Office Tower', ja: 'オフィスタワー' },
    headline: 'the Office Tower',
    description: 'Office Tower: the tallest building, full of office workers',
  },
  school: {
    id: 'school',
    name: { en: 'School', ja: '学校' },
    headline: 'the School',
    description: 'School: a school with a sports ground',
  },
  hospital: {
    id: 'hospital',
    name: { en: 'Hospital', ja: '病院' },
    headline: 'the Hospital',
    description: 'Hospital: a small hospital that never sleeps',
  },
  bridge: {
    id: 'bridge',
    name: { en: 'Old Bridge', ja: '古い石橋' },
    headline: 'the Old Bridge',
    description: 'Old Bridge: an old stone bridge over the river, slightly spooky at night',
  },
  beach: {
    id: 'beach',
    name: { en: 'Beach', ja: '浜辺' },
    headline: 'the Beach',
    description: 'Beach: a sandy beach on the south edge of town',
  },
  shrine: {
    id: 'shrine',
    name: { en: 'Hilltop Shrine', ja: '丘の上の神社' },
    headline: 'the Hilltop Shrine',
    description: 'Hilltop Shrine: a quiet shrine on a hill with stone steps',
  },
  stadium: {
    id: 'stadium',
    name: { en: 'Stadium', ja: 'スタジアム' },
    headline: 'the Stadium',
    description: 'Stadium: a small stadium used for games and concerts',
  },
};

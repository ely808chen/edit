export const TILE = 20;
export const TEX_RES = 2;

export const PAL = {
  meadow: '#A7D7A0',
  meadowDark: '#94C98D',
  lawn: '#9DD196',
  lagoon: '#7CC6D9',
  sea: '#6AB5CE',
  seaDeep: '#5AA5C2',
  plum: '#3A2E5C',
  blush: '#FF7A9C',
  lantern: '#FFD36E',
  sand: '#E8D5B5',
  road: '#EBDCC0',
  roadEdge: '#D9C6A5',
  plaza: '#F1E6D2',
  plazaLine: '#E2D3B8',
  wall: '#FFF7EA',
  wallShade: '#EFE2CF',
  stone: '#CFC6BD',
  stoneDark: '#B3A89D',
  wood: '#B9875F',
  woodDark: '#946A49',
  tree: '#6DBE7A',
  treeDark: '#58A866',
  treeLight: '#92D59A',
  pine: '#4F9C6B',
  dirt: '#E5BD91',
  vermilion: '#E3775F',
  night: '#2F3A78',
};

export const ROOFS = ['#F4A6A6', '#A6C8F4', '#F4D6A6', '#BFA6F4', '#A6E3C8'];

export const BODY_COLORS = [
  '#FFB4A2', '#FFC98B', // students
  '#9DB8E8', '#B5C7F2', // workers
  '#9ED8C8', // night and service
  '#D8B4E2', '#C9A7D8', // elders
  '#F7D08A', // shops
  '#F59EB5', '#E8A0D0', // creatives
  '#6FB8C9', // outdoorsy
  '#B7A3F0', // oddballs
];

export const hex = (s: string) => parseInt(s.slice(1), 16);

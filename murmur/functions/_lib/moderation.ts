/**
 * A small server-side blocklist, checked before any event text reaches Jev. Jev's own
 * `blocked` question catches everything this list misses.
 */
const WORD_PATTERNS: RegExp[] = [
  // slurs
  /\bn[i1!]gg(?:a|er|ah|az|ers)\b/i,
  /\bf[a4]gg?(?:ot|ots|y)?\b/i,
  /\bk[iy]kes?\b/i,
  /\bch[i1]nks?\b/i,
  /\bsp[i1]cs?\b/i,
  /\bwetbacks?\b/i,
  /\btrann(?:y|ies)\b/i,
  /\bretard(?:s|ed)?\b/i,
  /\bgooks?\b/i,
  /\bdykes?\b/i,
  // sexual content
  /\bporn\w*/i,
  /\brap(?:e|ed|es|ing|ist)\b/i,
  /\bblow ?jobs?\b/i,
  /\bhand ?jobs?\b/i,
  /\bnudes?\b/i,
  /\bnaked\b/i,
  /\bsex(?:y|ual)?\b/i,
  /\bcum(?:shot|ming)?\b/i,
  /\bdildos?\b/i,
  /\borgy\b/i,
  /\bhentai\b/i,
  // hate, threats, self-harm, mockery of tragedies
  /\bkill (?:all|every)\b/i,
  /\bgas the\b/i,
  /\bheil\b/i,
  /\bwhite power\b/i,
  /\bethnic cleansing\b/i,
  /\bgenocide\b/i,
  /\bschool shoot(?:ing|er)\b/i,
  /\bmass shooting\b/i,
  /\bsuicide\b/i,
  /\bkill (?:my|your|him|her|them)sel(?:f|ves)\b/i,
  /\bself[- ]harm\b/i,
  /\b9\/11\b/,
  /\bholocaust\b/i,
  /\bbehead\w*/i,
  /\bdismember\w*/i,
];

const SUBSTRINGS: string[] = [
  '死ね', 'しね', '殺す', '殺せ', 'ころす', 'レイプ', 'セックス', 'ちんこ', 'ちんぽ', 'まんこ', 'チョン', 'ガイジ', 'キチガイ', 'きちがい',
  '穢多', '部落民', '自殺', 'ホロコースト', 'エロ動画', 'ポルノ', '虐殺', '全裸',
];

export function isBlockedText(text: string): boolean {
  const t = text.normalize('NFKC');
  if (WORD_PATTERNS.some((re) => re.test(t))) return true;
  return SUBSTRINGS.some((s) => t.includes(s));
}

export type TimeBucket = 'late_night' | 'early_morning' | 'morning' | 'lunchtime' | 'afternoon' | 'evening' | 'night';

export function timeBucket(minuteOfDay: number): TimeBucket {
  const h = (((minuteOfDay % 1440) + 1440) % 1440) / 60;
  if (h < 5) return 'late_night';
  if (h < 8) return 'early_morning';
  if (h < 11.5) return 'morning';
  if (h < 14) return 'lunchtime';
  if (h < 17) return 'afternoon';
  if (h < 20.5) return 'evening';
  if (h < 23.5) return 'night';
  return 'late_night';
}

const BUCKET_PHRASE: Record<TimeBucket, string> = {
  late_night: 'the middle of the night',
  early_morning: 'early morning',
  morning: 'morning',
  lunchtime: 'lunchtime',
  afternoon: 'afternoon',
  evening: 'evening',
  night: 'night',
};

export function clockString(minuteOfDay: number): string {
  const m = Math.floor((((minuteOfDay % 1440) + 1440) % 1440));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function timePhrase(minuteOfDay: number): string {
  return `${clockString(minuteOfDay)}, ${BUCKET_PHRASE[timeBucket(minuteOfDay)]}`;
}

export function isNight(minuteOfDay: number): boolean {
  const b = timeBucket(minuteOfDay);
  return b === 'late_night' || b === 'night';
}

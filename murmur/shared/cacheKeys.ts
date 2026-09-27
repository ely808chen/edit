import { digest, normalizeEventText } from './hash';
import { timeBucket } from './time';

/** Shared by the browser session cache and the server KV cache. */
export function decideCacheKey(
  eventText: string,
  place: string,
  category: string,
  weather: string,
  minute: number,
  otherEvents: string[],
  contextKey: string,
): string {
  return digest(
    [normalizeEventText(eventText), place, category, weather, timeBucket(minute), otherEvents.map(normalizeEventText).join('\u0002'), contextKey].join('\u0001'),
  );
}

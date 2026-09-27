const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Day and night grade for a simulated minute of the day. */
export function lighting(minute: number): { night: number; golden: number; dawn: number } {
  const h = ((((minute % 1440) + 1440) % 1440) / 60);
  let night: number;
  if (h >= 19.5 || h < 4.5) night = 1;
  else if (h >= 17.5) night = smooth(17.5, 19.5, h);
  else if (h < 6.5) night = 1 - smooth(4.5, 6.5, h);
  else night = 0;
  const golden = h >= 16.3 && h < 19.8 ? smooth(16.3, 17, h) * (1 - smooth(18.5, 19.8, h)) : 0;
  const dawn = h >= 4.8 && h < 7.5 ? smooth(4.8, 5.8, h) * (1 - smooth(6.3, 7.5, h)) : 0;
  return { night, golden, dawn };
}

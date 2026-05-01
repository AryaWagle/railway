/** Approximate country centroids for supplier CSV `country` labels (matches Python `COUNTRIES`). */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  USA: [-98, 39],
  Germany: [10.5, 51],
  China: [104, 35],
  India: [78, 22],
  Mexico: [-102, 23],
  Vietnam: [108, 14],
  Brazil: [-51, -14],
  Japan: [138, 36],
  Turkey: [35, 39],
  Poland: [19.5, 52],
};

export function jitterLngLat(id: string, base: [number, number]): [number, number] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u1 = ((h >>> 0) % 10000) / 10000;
  const u2 = ((h >>> 16) % 10000) / 10000;
  const lng = base[0] + (u1 - 0.5) * 5;
  const lat = base[1] + (u2 - 0.5) * 4;
  return [lng, lat];
}

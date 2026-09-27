import type { GeoPoint, TravelMode } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Rough door-to-door travel time estimate for the Netherlands, used when no routing provider is
 * configured: straight line × detour factor at an effective speed + fixed overhead (walking,
 * waiting, parking). Roughly calibrated on typical NL commutes (Amsterdam–Utrecht by train ≈ 55 min).
 */
const MODES: Record<TravelMode, { detour: number; kmh: number; overheadMin: number }> = {
  public_transport: { detour: 1.2, kmh: 75, overheadMin: 20 },
  car: { detour: 1.3, kmh: 70, overheadMin: 8 },
  bike: { detour: 1.25, kmh: 16, overheadMin: 3 },
};

export function estimateTravelMinutes(
  from: GeoPoint,
  to: GeoPoint,
  mode: TravelMode = "public_transport",
): number {
  const straight = haversineKm(from, to);
  if (straight < 0.5) return 5;
  const { detour, kmh, overheadMin } = MODES[mode];
  return Math.round(((straight * detour) / kmh) * 60 + overheadMin);
}

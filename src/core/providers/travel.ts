import { estimateTravelMinutes } from "../matching/geo";
import type { GeoPoint, TravelMode } from "../matching/types";

/** Travel time provider – MVP estimates from coordinates; a routing API can be plugged in later. */
export interface TravelTimeProvider {
  minutes(from: GeoPoint, to: GeoPoint, mode: TravelMode): Promise<number | null>;
}

export class EstimatedTravelTimeProvider implements TravelTimeProvider {
  async minutes(from: GeoPoint, to: GeoPoint, mode: TravelMode) {
    return estimateTravelMinutes(from, to, mode);
  }
}

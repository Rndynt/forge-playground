import { createApp } from "../src/index";
import { buildSeats } from "../src/inventory";
import type { Trip } from "../src/types";

/** Fixed clock used by every test. */
export const NOW = new Date("2030-01-10T00:00:00.000Z");

/** Five days after NOW. */
export const FAR_DEPARTURE = "2030-01-15T06:00:00.000Z";

export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    departureAt: FAR_DEPARTURE,
    seats: buildSeats(10),
    baseFare: 125000,
    ...overrides,
  };
}

export function makeApp(trips: Trip[] = [makeTrip()]) {
  return createApp(trips);
}

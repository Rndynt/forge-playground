import type { SeatStatus, Trip } from "./types";

/** Removes repeated labels while keeping the order of first appearance. */
export function uniqueSeats(seats: readonly string[]): string[] {
  return [...new Set(seats)];
}

/**
 * Builds seat labels row by row, for example rows=2 and columns=["A", "B"]
 * gives ["1A", "1B", "2A", "2B"].
 */
export function buildSeats(rows: number, columns: readonly string[] = ["A", "B"]): string[] {
  const seats: string[] = [];
  for (let row = 1; row <= rows; row += 1) {
    for (const column of columns) {
      seats.push(`${row}${column}`);
    }
  }
  return seats;
}

/** Tracks which seats of each trip are currently reserved. */
export class Inventory {
  private readonly reservedByTrip = new Map<string, Set<string>>();

  reservedSeats(tripId: string): ReadonlySet<string> {
    return this.reservedByTrip.get(tripId) ?? new Set<string>();
  }

  /** Free seats of the trip, in the order of the trip's seat map. */
  availableSeats(trip: Trip): string[] {
    const reserved = this.reservedSeats(trip.id);
    return uniqueSeats(trip.seats).filter((seat) => !reserved.has(seat));
  }

  /** Every seat of the trip with its current state, in seat-map order. */
  seatMap(trip: Trip): SeatStatus[] {
    const reserved = this.reservedSeats(trip.id);
    return uniqueSeats(trip.seats).map((seat) => ({
      seat,
      state: reserved.has(seat) ? "TAKEN" : "AVAILABLE",
    }));
  }

  reserve(tripId: string, seats: readonly string[]): void {
    const reserved = this.reservedByTrip.get(tripId) ?? new Set<string>();
    for (const seat of seats) {
      reserved.add(seat);
    }
    this.reservedByTrip.set(tripId, reserved);
  }

  release(tripId: string, seats: readonly string[]): void {
    const reserved = this.reservedByTrip.get(tripId);
    if (!reserved) {
      return;
    }
    for (const seat of seats) {
      reserved.delete(seat);
    }
  }
}

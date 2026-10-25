import type { AuditEntry, Booking, Trip } from "./types";

/** Yields to the event loop once, the way a call to a database would. */
async function roundTrip(): Promise<void> {
  await Promise.resolve();
}

/**
 * In-memory stand-in for a database. Every method is asynchronous and works
 * on copies, so callers never share object identity with stored rows.
 */
export class MemoryStore {
  private readonly trips = new Map<string, Trip>();
  private readonly bookings = new Map<string, Booking>();
  private readonly auditLog: AuditEntry[] = [];
  private sequence = 0;

  constructor(trips: readonly Trip[] = []) {
    for (const trip of trips) {
      this.trips.set(trip.id, structuredClone(trip));
    }
  }

  async getTrip(tripId: string): Promise<Trip | undefined> {
    await roundTrip();
    const trip = this.trips.get(tripId);
    return trip ? structuredClone(trip) : undefined;
  }

    async nextSequence(): Promise<number> {
    await roundTrip();
    this.sequence += 1;
    return this.sequence;
  }

  async saveBooking(booking: Booking): Promise<void> {
    await roundTrip();
    this.bookings.set(booking.id, structuredClone(booking));
  }

  async getBooking(bookingId: string): Promise<Booking | undefined> {
    await roundTrip();
    const booking = this.bookings.get(bookingId);
    return booking ? structuredClone(booking) : undefined;
  }

  async listBookings(tripId?: string): Promise<Booking[]> {
    await roundTrip();
    return [...this.bookings.values()]
      .filter((booking) => tripId === undefined || booking.tripId === tripId)
      .map((booking) => structuredClone(booking));
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    await roundTrip();
    this.auditLog.push({ ...entry });
  }

  async listAudit(bookingId?: string): Promise<AuditEntry[]> {
    await roundTrip();
    return this.auditLog
      .filter((entry) => bookingId === undefined || entry.bookingId === bookingId)
      .map((entry) => ({ ...entry }));
  }
}

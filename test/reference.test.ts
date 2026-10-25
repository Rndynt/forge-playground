import { describe, expect, it } from "vitest";
import { formatReference } from "../src/booking";
import { NOW, makeApp, makeTrip } from "./helpers";

describe("booking references", () => {
  it("formats a sequence number with a BK- prefix and six digits", () => {
    expect(formatReference(1)).toBe("BK-000001");
    expect(formatReference(42)).toBe("BK-000042");
    expect(formatReference(123456)).toBe("BK-123456");
  });

  it("gives the first booking BK-000001 and the next one BK-000002", async () => {
    const app = makeApp();
    const first = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
    const second = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
    expect(first.reference).toBe("BK-000001");
    expect(second.reference).toBe("BK-000002");
  });

  it("keeps references unique across many bookings", async () => {
    const app = makeApp();
    const references = new Set<string>();
    for (let index = 0; index < 20; index += 1) {
      const booking = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
      expect(booking.reference).toMatch(/^BK-\d{6}$/);
      references.add(booking.reference);
    }
    expect(references.size).toBe(20);
  });

  it("keeps references unique across trips booked at the same time", async () => {
    const trips = ["trip-a", "trip-b", "trip-c", "trip-d"].map((id) => makeTrip({ id }));
    const app = makeApp(trips);
    const bookings = await Promise.all(
      trips.map((trip) => app.bookings.createBooking({ tripId: trip.id, passengerCount: 2 }, NOW)),
    );
    const references = bookings.map((booking) => booking.reference);
    expect(new Set(references).size).toBe(trips.length);
    for (const reference of references) {
      expect(reference).toMatch(/^BK-\d{6}$/);
    }
  });
});

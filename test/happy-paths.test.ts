import { describe, expect, it } from "vitest";
import { calculatePrice } from "../src/pricing";
import { NOW, makeApp } from "./helpers";

describe("pricing", () => {
  it.each([
    [1, 138750],
    [4, 555000],
  ])("charges %i passenger(s) on a 125000 fare including 11%% VAT", async (count, expected) => {
    const app = makeApp();
    const booking = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: count }, NOW);
    expect(booking.totalPrice).toBe(expected);
    expect(Number.isInteger(booking.totalPrice)).toBe(true);
    expect(calculatePrice(125000, count)).toBe(expected);
  });
});

describe("passenger count", () => {
  it("books one passenger on the first seat", async () => {
    const app = makeApp();
    const booking = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
    expect(booking.seats).toEqual(["1A"]);
    expect(booking.passengerCount).toBe(1);
  });

  it("books six passengers on the six lowest-ordered seats", async () => {
    const app = makeApp();
    const booking = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 6 }, NOW);
    expect(booking.seats).toEqual(["1A", "1B", "2A", "2B", "3A", "3B"]);
  });

  it("continues with the next free seats for a later booking", async () => {
    const app = makeApp();
    await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 2 }, NOW);
    const second = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 3 }, NOW);
    expect(second.seats).toEqual(["2A", "2B", "3A"]);
  });
});

describe("cancelling well before departure", () => {
  it("returns the full amount and marks the booking cancelled", async () => {
    const app = makeApp();
    const booking = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 2 }, NOW);
    const result = await app.bookings.cancelBooking({ bookingId: booking.id }, NOW);

    expect(result.booking.status).toBe("CANCELLED");
    expect(result.refund.percent).toBe(100);
    expect(result.refund.amount).toBe(booking.totalPrice);
    expect(result.refund.hoursBeforeDeparture).toBe(126);
  });

  it("is available through the API handlers", async () => {
    const app = makeApp();
    const created = await app.api.createBookingHandler({ tripId: "trip-1", passengerCount: 1 }, NOW);
    expect(created.status).toBe(201);
    const { booking } = created.body as { booking: { id: string; totalPrice: number } };

    const cancelled = await app.api.cancelBookingHandler({ bookingId: booking.id }, NOW);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ refund: { percent: 100, amount: booking.totalPrice } });
  });
});

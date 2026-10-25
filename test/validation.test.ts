import { describe, expect, it } from "vitest";
import {
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  InvalidIdempotencyKeyError,
  TripNotFoundError,
} from "../src/errors";
import { NOW, makeApp } from "./helpers";

describe("input validation", () => {
  it("rejects an unknown trip with a typed error", async () => {
    const app = makeApp();
    const attempt = app.bookings.createBooking({ tripId: "trip-missing", passengerCount: 1 }, NOW);
    await expect(attempt).rejects.toBeInstanceOf(TripNotFoundError);
    await expect(attempt).rejects.toMatchObject({ code: "TRIP_NOT_FOUND" });
  });

  it.each(["", "has space", "a".repeat(65)])(
    "rejects the malformed idempotency key %j",
    async (key) => {
      const app = makeApp();
      const attempt = app.bookings.createBooking(
        { tripId: "trip-1", passengerCount: 1, idempotencyKey: key },
        NOW,
      );
      await expect(attempt).rejects.toBeInstanceOf(InvalidIdempotencyKeyError);
    },
  );

  it.each(["Order_2030-01-10", "A".repeat(64)])(
    "accepts the idempotency key %j",
    async (key) => {
      const app = makeApp();
      const booking = await app.bookings.createBooking(
        { tripId: "trip-1", passengerCount: 1, idempotencyKey: key },
        NOW,
      );
      expect(booking.status).toBe("ACTIVE");
    },
  );

  it("rejects cancelling an unknown booking", async () => {
    const app = makeApp();
    const attempt = app.bookings.cancelBooking({ bookingId: "booking-404" }, NOW);
    await expect(attempt).rejects.toBeInstanceOf(BookingNotFoundError);
    await expect(attempt).rejects.toMatchObject({ code: "BOOKING_NOT_FOUND" });
  });

  it("rejects cancelling a booking that is already cancelled", async () => {
    const app = makeApp();
    const booking = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
    await app.bookings.cancelBooking({ bookingId: booking.id }, NOW);
    const attempt = app.bookings.cancelBooking({ bookingId: booking.id }, NOW);
    await expect(attempt).rejects.toBeInstanceOf(BookingAlreadyCancelledError);
    await expect(attempt).rejects.toMatchObject({ code: "BOOKING_ALREADY_CANCELLED" });
  });

  it("maps validation failures to HTTP-style statuses in the API", async () => {
    const app = makeApp();
    const { api } = app;

    const unknownTrip = await api.createBookingHandler({ tripId: "nope", passengerCount: 1 }, NOW);
    expect(unknownTrip.status).toBe(404);

    const badKey = await api.createBookingHandler(
      { tripId: "trip-1", passengerCount: 1, idempotencyKey: "no spaces" },
      NOW,
    );
    expect(badKey.status).toBe(400);

    const unknownBooking = await api.cancelBookingHandler({ bookingId: "booking-404" }, NOW);
    expect(unknownBooking.status).toBe(404);

    const malformed = await api.createBookingHandler("not an object", NOW);
    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  });

  it("answers 409 when the API is asked to cancel twice", async () => {
    const app = makeApp();
    const created = await app.api.createBookingHandler({ tripId: "trip-1", passengerCount: 1 }, NOW);
    expect(created.status).toBe(201);
    const { booking } = created.body as { booking: { id: string } };

    const first = await app.api.cancelBookingHandler({ bookingId: booking.id }, NOW);
    const second = await app.api.cancelBookingHandler({ bookingId: booking.id }, NOW);
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });
});

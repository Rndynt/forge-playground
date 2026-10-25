import { describe, expect, it } from "vitest";
import { TripDepartedError } from "../src/errors";
import { NOW, makeApp, makeTrip } from "./helpers";

describe("departed trips", () => {
  it("cannot be booked after the departure time", async () => {
    const app = makeApp([makeTrip({ departureAt: "2030-01-09T23:00:00.000Z" })]);
    const attempt = app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
    await expect(attempt).rejects.toBeInstanceOf(TripDepartedError);
    await expect(attempt).rejects.toMatchObject({ code: "TRIP_DEPARTED" });
  });

  it("cannot be booked at the departure instant", async () => {
    const app = makeApp([makeTrip({ departureAt: NOW.toISOString() })]);
    const attempt = app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
    await expect(attempt).rejects.toBeInstanceOf(TripDepartedError);
  });

  it("can still be booked one second before departure", async () => {
    const app = makeApp([makeTrip({ departureAt: "2030-01-10T00:00:01.000Z" })]);
    const booking = await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 1 }, NOW);
    expect(booking.status).toBe("ACTIVE");
  });

  it("answers 409 through the API", async () => {
    const app = makeApp([makeTrip({ departureAt: "2030-01-09T23:00:00.000Z" })]);
    const response = await app.api.createBookingHandler({ tripId: "trip-1", passengerCount: 1 }, NOW);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: { code: "TRIP_DEPARTED" } });
  });
});

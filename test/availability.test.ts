import { describe, expect, it } from "vitest";
import { TripNotFoundError } from "../src/errors";
import { buildSeats } from "../src/inventory";
import { NOW, makeApp, makeTrip } from "./helpers";

describe("availability", () => {
  it("lists every seat of a fresh trip in seat-map order", async () => {
    const app = makeApp();
    const { seats } = await app.bookings.getAvailability("trip-1");
    expect(seats.map((entry) => entry.seat)).toEqual(buildSeats(10));
    expect(seats.every((entry) => entry.state === "AVAILABLE")).toBe(true);
    expect(seats[0]?.seat).toBe("1A");
    expect(seats[19]?.seat).toBe("10B");
  });

  it("lists each seat once even if the seat map repeats a label", async () => {
    const app = makeApp([makeTrip({ seats: ["1A", "1B", "1A", "2A", "1B"] })]);
    const { seats } = await app.bookings.getAvailability("trip-1");
    expect(seats.map((entry) => entry.seat)).toEqual(["1A", "1B", "2A"]);
  });

  it("marks booked seats as taken without reordering the list", async () => {
    const app = makeApp();
    await app.bookings.createBooking({ tripId: "trip-1", passengerCount: 3 }, NOW);
    const { seats } = await app.bookings.getAvailability("trip-1");

    expect(seats.map((entry) => entry.seat)).toEqual(buildSeats(10));
    expect(seats.filter((entry) => entry.state === "TAKEN").map((entry) => entry.seat)).toEqual([
      "1A",
      "1B",
      "2A",
    ]);
    expect(seats.filter((entry) => entry.state === "AVAILABLE")).toHaveLength(17);
  });

  it("rejects an unknown trip", async () => {
    const app = makeApp();
    await expect(app.bookings.getAvailability("trip-missing")).rejects.toBeInstanceOf(
      TripNotFoundError,
    );
  });

  it("is exposed through the API handler", async () => {
    const app = makeApp();
    const ok = await app.api.getAvailabilityHandler({ tripId: "trip-1" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ tripId: "trip-1" });

    const missing = await app.api.getAvailabilityHandler({ tripId: "trip-missing" });
    expect(missing.status).toBe(404);
  });
});

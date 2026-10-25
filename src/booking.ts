import {
  BookingAlreadyCancelledError,
  BookingNotFoundError,
  InvalidIdempotencyKeyError,
  InvalidPassengerCountError,
  SeatsUnavailableError,
  TripDepartedError,
  TripNotFoundError,
} from "./errors";
import type { Inventory } from "./inventory";
import { calculatePrice } from "./pricing";
import { calculateRefund } from "./refund";
import type { MemoryStore } from "./store";
import type {
  Availability,
  Booking,
  CancelBookingInput,
  CancellationResult,
  CreateBookingInput,
  Trip,
} from "./types";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface BookingDeps {
  store: MemoryStore;
  inventory: Inventory;
}

export interface BookingService {
  createBooking(input: CreateBookingInput, now: Date): Promise<Booking>;
  cancelBooking(input: CancelBookingInput, now: Date): Promise<CancellationResult>;
  getAvailability(tripId: string): Promise<Availability>;
}

/** Formats a sequence number as a booking reference such as "BK-000042". */
export function formatReference(sequence: number): string {
  return `BK-${String(sequence).padStart(6, "0")}`;
}

/** Throws unless the key is absent or 1-64 characters from A-Z, a-z, 0-9, "_" and "-". */
function assertIdempotencyKey(key: unknown): void {
  if (key === undefined) {
    return;
  }
  if (typeof key !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new InvalidIdempotencyKeyError();
  }
}

function assertPassengerCount(count: unknown): asserts count is number {
  if (typeof count !== "number" || Number.isNaN(count)) {
    throw new InvalidPassengerCountError(count);
  }
}

function hasDeparted(trip: Trip, now: Date): boolean {
  return Date.parse(trip.departureAt) <= now.getTime();
}

export function createBookingService(deps: BookingDeps): BookingService {
  const { store, inventory } = deps;

  async function requireTrip(tripId: string): Promise<Trip> {
    const trip = await store.getTrip(tripId);
    if (!trip) {
      throw new TripNotFoundError(tripId);
    }
    return trip;
  }

  async function createBooking(input: CreateBookingInput, now: Date): Promise<Booking> {
    assertIdempotencyKey(input.idempotencyKey);
    const trip = await requireTrip(input.tripId);
    if (hasDeparted(trip, now)) {
      throw new TripDepartedError(trip.id);
    }
    assertPassengerCount(input.passengerCount);

    const free = inventory.availableSeats(trip);
    if (free.length < input.passengerCount) {
      throw new SeatsUnavailableError(trip.id, input.passengerCount, free.length);
    }
    const seats = free.slice(0, input.passengerCount);

    const sequence = await store.nextSequence();
    const booking: Booking = {
      id: `booking-${sequence}`,
      reference: formatReference(sequence),
      tripId: trip.id,
      seats,
      passengerCount: input.passengerCount,
      totalPrice: calculatePrice(trip.baseFare, input.passengerCount),
      status: "ACTIVE",
      createdAt: now.toISOString(),
      ...(input.idempotencyKey !== undefined && { idempotencyKey: input.idempotencyKey }),
    };
    await store.saveBooking(booking);
    inventory.reserve(trip.id, seats);
    return booking;
  }

  async function cancelBooking(input: CancelBookingInput, now: Date): Promise<CancellationResult> {
    const booking = await store.getBooking(input.bookingId);
    if (!booking) {
      throw new BookingNotFoundError(input.bookingId);
    }
    if (booking.status === "CANCELLED") {
      throw new BookingAlreadyCancelledError(booking.id);
    }
    const trip = await requireTrip(booking.tripId);

    const refund = calculateRefund(booking.totalPrice, trip.departureAt, now);
    const cancelled: Booking = { ...booking, status: "CANCELLED" };
    await store.saveBooking(cancelled);
    return { booking: cancelled, refund };
  }

  async function getAvailability(tripId: string): Promise<Availability> {
    const trip = await requireTrip(tripId);
    return { tripId: trip.id, seats: inventory.seatMap(trip) };
  }

  return { createBooking, cancelBooking, getAvailability };
}

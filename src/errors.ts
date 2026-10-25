export type ErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_IDEMPOTENCY_KEY"
  | "INVALID_PASSENGER_COUNT"
  | "TRIP_NOT_FOUND"
  | "TRIP_DEPARTED"
  | "SEATS_UNAVAILABLE"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_ALREADY_CANCELLED";

/** Base class for every error the booking domain raises on purpose. */
export class BookingError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class InvalidRequestError extends BookingError {
  constructor(message: string) {
    super("INVALID_REQUEST", message);
  }
}

export class InvalidIdempotencyKeyError extends BookingError {
  constructor() {
    super(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency key must be 1-64 characters from A-Z, a-z, 0-9, underscore or hyphen",
    );
  }
}

export class InvalidPassengerCountError extends BookingError {
  constructor(value: unknown) {
    super("INVALID_PASSENGER_COUNT", `Invalid passenger count: ${String(value)}`);
  }
}

export class TripNotFoundError extends BookingError {
  constructor(tripId: string) {
    super("TRIP_NOT_FOUND", `Trip not found: ${tripId}`);
  }
}

export class TripDepartedError extends BookingError {
  constructor(tripId: string) {
    super("TRIP_DEPARTED", `Trip has already departed: ${tripId}`);
  }
}

export class SeatsUnavailableError extends BookingError {
  constructor(tripId: string, requested: number, available: number) {
    super(
      "SEATS_UNAVAILABLE",
      `Trip ${tripId} has ${available} seat(s) left, ${requested} requested`,
    );
  }
}

export class BookingNotFoundError extends BookingError {
  constructor(bookingId: string) {
    super("BOOKING_NOT_FOUND", `Booking not found: ${bookingId}`);
  }
}

export class BookingAlreadyCancelledError extends BookingError {
  constructor(bookingId: string) {
    super("BOOKING_ALREADY_CANCELLED", `Booking already cancelled: ${bookingId}`);
  }
}

export function isBookingError(error: unknown): error is BookingError {
  return error instanceof BookingError;
}

import { isBookingError, InvalidRequestError } from "./errors";
import type { ErrorCode } from "./errors";
import type { BookingService } from "./booking";
import type { MemoryStore } from "./store";
import type {
  ApiResponse,
  Availability,
  AuditEntry,
  Booking,
  CancellationResult,
} from "./types";

export interface ApiDeps {
  bookings: BookingService;
  store: MemoryStore;
}

export interface ErrorBody {
  error: { code: ErrorCode | "INTERNAL_ERROR"; message: string };
}

export interface Api {
  createBookingHandler(request: unknown, now: Date): Promise<ApiResponse<{ booking: Booking } | ErrorBody>>;
  cancelBookingHandler(request: unknown, now: Date): Promise<ApiResponse<CancellationResult | ErrorBody>>;
  getAvailabilityHandler(request: unknown): Promise<ApiResponse<Availability | ErrorBody>>;
  getAuditTrailHandler(request: unknown): Promise<ApiResponse<{ entries: AuditEntry[] } | ErrorBody>>;
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  INVALID_IDEMPOTENCY_KEY: 400,
  INVALID_PASSENGER_COUNT: 400,
  TRIP_NOT_FOUND: 404,
  BOOKING_NOT_FOUND: 404,
  TRIP_DEPARTED: 409,
  SEATS_UNAVAILABLE: 409,
  BOOKING_ALREADY_CANCELLED: 409,
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidRequestError("Request must be an object");
  }
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new InvalidRequestError(`${field} must be a non-empty string`);
  }
  return value;
}

function optionalStringList(record: Record<string, unknown>, field: string): string[] | undefined {
  const value = record[field];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new InvalidRequestError(`${field} must be a list of strings`);
  }
  return value as string[];
}

function failure(error: unknown): ApiResponse<ErrorBody> {
  if (isBookingError(error)) {
    return {
      status: STATUS_BY_CODE[error.code],
      body: { error: { code: error.code, message: error.message } },
    };
  }
  return {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "Unexpected error" } },
  };
}

export function createApi(deps: ApiDeps): Api {
  const { bookings, store } = deps;

  async function createBookingHandler(request: unknown, now: Date) {
    try {
      const body = asRecord(request);
      const booking = await bookings.createBooking(
        {
          tripId: requireString(body, "tripId"),
          passengerCount: body.passengerCount as number,
          idempotencyKey: body.idempotencyKey as string | undefined,
        },
        now,
      );
      return { status: 201, body: { booking } };
    } catch (error) {
      return failure(error);
    }
  }

  async function cancelBookingHandler(request: unknown, now: Date) {
    try {
      const body = asRecord(request);
      const result = await bookings.cancelBooking(
        {
          bookingId: requireString(body, "bookingId"),
          seats: optionalStringList(body, "seats"),
        },
        now,
      );
      return { status: 200, body: result };
    } catch (error) {
      return failure(error);
    }
  }

  async function getAvailabilityHandler(request: unknown) {
    try {
      const body = asRecord(request);
      const availability = await bookings.getAvailability(requireString(body, "tripId"));
      return { status: 200, body: availability };
    } catch (error) {
      return failure(error);
    }
  }

  async function getAuditTrailHandler(request: unknown) {
    try {
      const body = request === undefined ? {} : asRecord(request);
      const bookingId = body.bookingId === undefined ? undefined : requireString(body, "bookingId");
      return { status: 200, body: { entries: await store.listAudit(bookingId) } };
    } catch (error) {
      return failure(error);
    }
  }

  return { createBookingHandler, cancelBookingHandler, getAvailabilityHandler, getAuditTrailHandler };
}

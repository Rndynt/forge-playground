/** A scheduled departure with a fixed seat map. */
export interface Trip {
  id: string;
  /** ISO-8601 instant in UTC, for example "2026-03-01T08:00:00.000Z". */
  departureAt: string;
  /** Seat labels in boarding order, for example "1A", "1B", "2A". */
  seats: string[];
  /** Fare per passenger in whole rupiah, before VAT. */
  baseFare: number;
}

export type BookingStatus = "ACTIVE" | "CANCELLED";

export interface Booking {
  id: string;
  reference: string;
  tripId: string;
  seats: string[];
  passengerCount: number;
  /** Amount charged in whole rupiah, VAT included. */
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  idempotencyKey?: string;
}

export type AuditAction = "BOOKING_CREATED" | "BOOKING_CANCELLED";

export interface AuditEntry {
  at: string;
  action: AuditAction;
  bookingId: string;
}

export interface CreateBookingInput {
  tripId: string;
  passengerCount: number;
  idempotencyKey?: string;
}

export interface CancelBookingInput {
  bookingId: string;
  /** Seats to cancel; when present they name a subset of the booking's seats. */
  seats?: string[];
}

export type SeatState = "AVAILABLE" | "TAKEN";

export interface SeatStatus {
  seat: string;
  state: SeatState;
}

export interface Availability {
  tripId: string;
  seats: SeatStatus[];
}

export interface RefundQuote {
  /** Share of the amount paid that is returned, from 0 to 100. */
  percent: number;
  /** Refund in whole rupiah. */
  amount: number;
  /** Hours between the cancellation and the departure; negative after departure. */
  hoursBeforeDeparture: number;
}

export interface CancellationResult {
  booking: Booking;
  refund: RefundQuote;
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

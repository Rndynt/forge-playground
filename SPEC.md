# Mini Trip Booking — Specification

This document states what the booking library MUST do. Each requirement can be checked on its own.

## Terms

- **Trip**: a departure with an id, a departure time (ISO-8601, UTC), an ordered list of seat labels and a base fare per passenger in whole rupiah.
- **Booking**: a reservation of one or more seats on one trip, with a status of `ACTIVE` or `CANCELLED`.
- **Active booking**: a booking whose status is `ACTIVE`. A seat is *taken* while an active booking holds it and *available* otherwise.
- **Now**: the instant passed to the operation as its `now` argument.
- **Typed error**: an error that carries a stable `code` string, for example `TRIP_NOT_FOUND`.

## Requirements

**R1 — Seat uniqueness.** A seat on a trip MUST belong to at most one active booking at any time. This MUST hold when several booking requests for the same trip are in flight at once: for any two such requests, at most one MAY receive a given seat, and the other MUST either receive different seats or be rejected with `SEATS_UNAVAILABLE`.

**R2 — Price.** The total price of a booking MUST be a whole number of rupiah. It MUST equal `baseFare × passengerCount × 1.11`, computed with integer arithmetic and rounded half up once, on the booking total. For example, a base fare of 150001 and one passenger MUST give 166501, and a base fare of 100000 and one passenger MUST give 111000.

**R3 — Passenger count.** The passenger count of a booking MUST be an integer from 1 to 6 inclusive. Any other value, including 0, negative numbers, fractions and values above 6, MUST be rejected with `INVALID_PASSENGER_COUNT` and MUST NOT create a booking.

**R4 — Cancellation releases seats.** When a booking is cancelled, or some of its seats are cancelled, the released seats MUST become available again and MUST be bookable by a later request on the same trip.

**R5 — Refund tiers.** The refund for a cancellation MUST be based on the time between *now* and the trip's departure time:

| Time before departure | Refund of the amount paid for the cancelled seats |
|---|---|
| 24 hours or more | 100% |
| Less than 24 hours, departure not yet reached | 50% |
| Departure time reached or passed | 0% |

Refund amounts MUST be whole rupiah, rounded half up.

**R6 — Partial cancellation.** A booking MUST support partial cancellation by naming a subset of its seats. The named seats MUST be cancelled and the other seats MUST stay booked. The refund MUST cover only the cancelled seats, using a price per seat of `totalPrice / passengerCount` rounded half up to whole rupiah, and then the tier from R5. The booking MUST stay `ACTIVE` while at least one of its seats remains booked and MUST become `CANCELLED` when none remain. When no seats are named, the whole booking MUST be cancelled.

**R7 — Idempotent creation.** Creating a booking with an idempotency key that was already used MUST return the original booking and MUST NOT create a new booking, reserve more seats, or consume a new booking reference.

**R8 — Input validation.** The following MUST be rejected with typed errors, and MUST NOT change any state:

- a booking request for an unknown trip: `TRIP_NOT_FOUND`;
- an idempotency key that is not 1 to 64 characters from `A-Z`, `a-z`, `0-9`, `_` and `-`: `INVALID_IDEMPOTENCY_KEY`;
- a cancellation of an unknown booking: `BOOKING_NOT_FOUND`;
- a cancellation of a booking that is already cancelled: `BOOKING_ALREADY_CANCELLED`.

**R9 — Audit log.** Every successful booking creation MUST append an audit entry `{ at, action, bookingId }` with `action` set to `BOOKING_CREATED`, and every successful cancellation, whole or partial, MUST append one with `action` set to `BOOKING_CANCELLED`. `at` MUST be the ISO-8601 UTC representation of *now*. Entries MUST be returned in the order they were appended.

**R10 — Availability.** `getAvailability` for a trip MUST list every seat of the trip exactly once, in the order of the trip's seat list, and MUST mark each seat as `AVAILABLE` or `TAKEN`.

**R11 — Departed trips.** A trip whose departure time is at or before *now* MUST NOT be bookable; the request MUST be rejected with `TRIP_DEPARTED`.

**R12 — Booking references.** A booking reference MUST be `BK-` followed by a zero-padded 6-digit sequence number, for example `BK-000042`. Two bookings MUST NOT share a reference.

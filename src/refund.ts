import type { RefundQuote } from "./types";

const HOUR_MS = 60 * 60 * 1000;

export function hoursUntilDeparture(departureAt: string, now: Date): number {
  return (Date.parse(departureAt) - now.getTime()) / HOUR_MS;
}

/** Quotes what is returned to the passenger when a booking is cancelled. */
export function calculateRefund(amountPaid: number, departureAt: string, now: Date): RefundQuote {
  const hoursBeforeDeparture = hoursUntilDeparture(departureAt, now);
  return {
    percent: 100,
    amount: amountPaid,
    hoursBeforeDeparture,
  };
}

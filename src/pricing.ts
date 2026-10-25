/** Multiplier that adds the 11% value-added tax to a net amount. */
export const VAT_MULTIPLIER = 1.11;

/** Total price for a booking, VAT included. */
export function calculatePrice(baseFare: number, passengerCount: number): number {
  return baseFare * passengerCount * VAT_MULTIPLIER;
}

import { createApi } from "./api";
import type { Api } from "./api";
import { createBookingService } from "./booking";
import type { BookingService } from "./booking";
import { Inventory } from "./inventory";
import { MemoryStore } from "./store";
import type { Trip } from "./types";

export interface App {
  store: MemoryStore;
  inventory: Inventory;
  bookings: BookingService;
  api: Api;
}

/** Wires a store, an inventory, the booking service and the API handlers together. */
export function createApp(trips: readonly Trip[] = []): App {
  const store = new MemoryStore(trips);
  const inventory = new Inventory();
  const bookings = createBookingService({ store, inventory });
  const api = createApi({ bookings, store });
  return { store, inventory, bookings, api };
}

export { createApi } from "./api";
export { createBookingService, formatReference } from "./booking";
export * from "./errors";
export { Inventory, buildSeats, uniqueSeats } from "./inventory";
export { calculatePrice } from "./pricing";
export { calculateRefund, hoursUntilDeparture } from "./refund";
export { MemoryStore } from "./store";
export type * from "./types";

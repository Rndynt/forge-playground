# forge-playground

A small in-memory trip booking library written in TypeScript. It models trips with a seat map, bookings, pricing, cancellations and refunds, with thin handler functions on top. There is no HTTP server and no external service.

The requirements live in [`SPEC.md`](SPEC.md).

## Running the tests

Use Node 22 and pnpm 12.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
```

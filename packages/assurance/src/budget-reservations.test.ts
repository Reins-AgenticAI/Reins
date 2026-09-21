import { describe, expect, it } from "vitest";
import {
  commitReservation,
  expireReservations,
  InMemoryBudgetReservationStore,
  releaseReservation,
  reserveBudget,
} from "./budget-reservations";

describe("atomic budget reservations", () => {
  it("prevents two parallel requests from overspending one shared budget", async () => {
    const store = new InMemoryBudgetReservationStore([
      { id: "budget-q4", availableMinor: 2_500_000 },
    ]);

    const [first, second] = await Promise.all([
      reserveBudget(store, {
        reservationId: "res-a",
        budgetId: "budget-q4",
        idempotencyKey: "request-a",
        amountMinor: 2_000_000,
        expiresAt: new Date("2026-09-20T13:00:00Z"),
      }),
      reserveBudget(store, {
        reservationId: "res-b",
        budgetId: "budget-q4",
        idempotencyKey: "request-b",
        amountMinor: 2_000_000,
        expiresAt: new Date("2026-09-20T13:00:00Z"),
      }),
    ]);

    expect([first.outcome, second.outcome].sort()).toEqual(["HELD", "INSUFFICIENT_BUDGET"]);
    expect(store.availableMinor("budget-q4")).toBe(500_000);
  });

  it("returns the original reservation for a duplicate idempotency key", async () => {
    const store = new InMemoryBudgetReservationStore([
      { id: "budget-q4", availableMinor: 5_000_000 },
    ]);
    const input = {
      reservationId: "res-original",
      budgetId: "budget-q4",
      idempotencyKey: "request-2048",
      amountMinor: 1_200_000,
      expiresAt: new Date("2026-09-20T13:00:00Z"),
    };

    const first = await reserveBudget(store, input);
    const duplicate = await reserveBudget(store, { ...input, reservationId: "res-retry" });

    expect(first).toEqual(duplicate);
    expect(store.availableMinor("budget-q4")).toBe(3_800_000);
    await expect(
      reserveBudget(store, {
        ...input,
        reservationId: "res-mutated",
        amountMinor: 1_300_000,
      }),
    ).rejects.toThrow("Idempotency key reused with different request");
    expect(store.availableMinor("budget-q4")).toBe(3_800_000);

    const concurrentStore = new InMemoryBudgetReservationStore([
      { id: "budget-a", availableMinor: 100_000 },
      { id: "budget-b", availableMinor: 100_000 },
    ]);
    const concurrentRetries = await Promise.allSettled([
      reserveBudget(concurrentStore, {
        ...input,
        reservationId: "res-budget-a",
        budgetId: "budget-a",
        amountMinor: 10_000,
      }),
      reserveBudget(concurrentStore, {
        ...input,
        reservationId: "res-budget-b",
        budgetId: "budget-b",
        amountMinor: 20_000,
      }),
    ]);
    expect(concurrentRetries.map((result) => result.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
  });

  it("fails closed for invalid amounts and missing budgets", async () => {
    const store = new InMemoryBudgetReservationStore([
      { id: "budget-q4", availableMinor: 100_000 },
    ]);
    const base = {
      reservationId: "res-invalid",
      budgetId: "budget-q4",
      idempotencyKey: "request-invalid",
      expiresAt: new Date("2026-09-20T13:00:00Z"),
    };

    await expect(reserveBudget(store, { ...base, amountMinor: 0 })).rejects.toThrow(
      "positive integer minor units",
    );
    await expect(
      reserveBudget(store, { ...base, budgetId: "missing", amountMinor: 100 }),
    ).resolves.toMatchObject({ outcome: "BUDGET_NOT_FOUND" });
    await expect(
      reserveBudget(store, { ...base, reservationId: "", amountMinor: 100 }),
    ).rejects.toThrow("identifiers are required");
    await expect(commitReservation(store, "missing")).rejects.toThrow("Reservation not found");
  });

  it("releases or expires held funds but keeps committed funds consumed", async () => {
    const store = new InMemoryBudgetReservationStore([
      { id: "released", availableMinor: 100_000 },
      { id: "committed", availableMinor: 100_000 },
      { id: "expired", availableMinor: 100_000 },
    ]);
    const input = {
      idempotencyKey: "request",
      amountMinor: 40_000,
      expiresAt: new Date("2026-09-20T13:00:00Z"),
    };
    await reserveBudget(store, { ...input, reservationId: "res-release", budgetId: "released" });
    await reserveBudget(store, {
      ...input,
      idempotencyKey: "commit-request",
      reservationId: "res-commit",
      budgetId: "committed",
    });
    await reserveBudget(store, {
      ...input,
      idempotencyKey: "expire-request",
      reservationId: "res-expire",
      budgetId: "expired",
    });

    expect(await releaseReservation(store, "res-release")).toMatchObject({ state: "RELEASED" });
    expect(await commitReservation(store, "res-commit")).toMatchObject({ state: "COMMITTED" });
    expect(await expireReservations(store, new Date("2026-09-20T13:01:00Z"))).toHaveLength(1);
    expect(store.availableMinor("released")).toBe(100_000);
    expect(store.availableMinor("committed")).toBe(60_000);
    expect(store.availableMinor("expired")).toBe(100_000);
    expect(await expireReservations(store, new Date("2025-01-01T00:00:00Z"))).toEqual([]);
    await expect(releaseReservation(store, "res-commit")).rejects.toThrow(
      "Only held reservations can transition",
    );
  });
});

export type ReservationState = "HELD" | "COMMITTED" | "RELEASED" | "EXPIRED";

export type Reservation = {
  id: string;
  budgetId: string;
  idempotencyKey: string;
  amountMinor: number;
  expiresAt: Date;
  state: ReservationState;
};

export type ReserveBudgetInput = {
  reservationId: string;
  budgetId: string;
  idempotencyKey: string;
  amountMinor: number;
  expiresAt: Date;
};

export type ReserveBudgetResult =
  | { outcome: "HELD"; reservation: Reservation }
  | { outcome: "INSUFFICIENT_BUDGET" | "BUDGET_NOT_FOUND" };

export interface BudgetReservationStore {
  reserve(input: ReserveBudgetInput): Promise<ReserveBudgetResult>;
  transition(reservationId: string, state: Exclude<ReservationState, "HELD">): Promise<Reservation>;
  expire(now: Date): Promise<Reservation[]>;
}

export async function reserveBudget(
  store: BudgetReservationStore,
  input: ReserveBudgetInput,
): Promise<ReserveBudgetResult> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Reservation amount must use positive integer minor units");
  }
  if (!input.reservationId.trim() || !input.budgetId.trim() || !input.idempotencyKey.trim()) {
    throw new Error("Reservation, budget, and idempotency identifiers are required");
  }
  if (Number.isNaN(input.expiresAt.getTime())) {
    throw new Error("Reservation expiry must be a valid date");
  }
  return await store.reserve(input);
}

export function commitReservation(store: BudgetReservationStore, reservationId: string) {
  return store.transition(reservationId, "COMMITTED");
}

export function releaseReservation(store: BudgetReservationStore, reservationId: string) {
  return store.transition(reservationId, "RELEASED");
}

export function expireReservations(store: BudgetReservationStore, now: Date) {
  return store.expire(now);
}

export class InMemoryBudgetReservationStore implements BudgetReservationStore {
  readonly #budgets = new Map<string, number>();
  readonly #reservations = new Map<string, ReserveBudgetResult>();
  readonly #reservationsById = new Map<string, Reservation>();
  readonly #locks = new Map<string, Promise<void>>();

  constructor(budgets: Array<{ id: string; availableMinor: number }>) {
    for (const budget of budgets) this.#budgets.set(budget.id, budget.availableMinor);
  }

  availableMinor(budgetId: string): number | undefined {
    return this.#budgets.get(budgetId);
  }

  async reserve(input: ReserveBudgetInput): Promise<ReserveBudgetResult> {
    const previous = this.#locks.get(input.budgetId) ?? Promise.resolve();
    let unlock = () => {};
    const current = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    this.#locks.set(
      input.budgetId,
      previous.then(() => current),
    );
    await previous;
    try {
      const duplicate = this.#reservations.get(input.idempotencyKey);
      if (duplicate) {
        if (
          duplicate.outcome !== "HELD" ||
          duplicate.reservation.budgetId !== input.budgetId ||
          duplicate.reservation.amountMinor !== input.amountMinor ||
          duplicate.reservation.expiresAt.getTime() !== input.expiresAt.getTime()
        ) {
          throw new Error("Idempotency key reused with different request");
        }
        return duplicate;
      }
      const availableMinor = this.#budgets.get(input.budgetId);
      if (availableMinor === undefined) return { outcome: "BUDGET_NOT_FOUND" };
      if (availableMinor < input.amountMinor) return { outcome: "INSUFFICIENT_BUDGET" };
      const result: ReserveBudgetResult = {
        outcome: "HELD",
        reservation: {
          id: input.reservationId,
          budgetId: input.budgetId,
          idempotencyKey: input.idempotencyKey,
          amountMinor: input.amountMinor,
          expiresAt: input.expiresAt,
          state: "HELD",
        },
      };
      this.#budgets.set(input.budgetId, availableMinor - input.amountMinor);
      this.#reservations.set(input.idempotencyKey, result);
      this.#reservationsById.set(input.reservationId, result.reservation);
      return result;
    } finally {
      unlock();
    }
  }

  async transition(
    reservationId: string,
    state: Exclude<ReservationState, "HELD">,
  ): Promise<Reservation> {
    const reservation = this.#reservationsById.get(reservationId);
    if (!reservation) throw new Error("Reservation not found");
    if (reservation.state !== "HELD") throw new Error("Only held reservations can transition");
    if (state === "RELEASED" || state === "EXPIRED") {
      this.#budgets.set(
        reservation.budgetId,
        (this.#budgets.get(reservation.budgetId) ?? 0) + reservation.amountMinor,
      );
    }
    reservation.state = state;
    return reservation;
  }

  async expire(now: Date): Promise<Reservation[]> {
    const expired: Reservation[] = [];
    for (const reservation of this.#reservationsById.values()) {
      if (reservation.state === "HELD" && reservation.expiresAt <= now) {
        expired.push(await this.transition(reservation.id, "EXPIRED"));
      }
    }
    return expired;
  }
}

import { and, eq, gte, sql } from "drizzle-orm";
import type { Database } from "./index";
import { budget, budgetReservation } from "./schema";

export type DatabaseReservationInput = {
  id: string;
  organizationId: string;
  budgetId: string;
  idempotencyKey: string;
  requestHash: string;
  amountMinor: number;
  expiresAt: Date;
};

export type DatabaseReservationResult =
  | {
      outcome: "HELD" | "COMMITTED" | "RELEASED" | "EXPIRED";
      reservationId: string;
    }
  | { outcome: "INSUFFICIENT_BUDGET" | "BUDGET_NOT_FOUND" };

export async function reserveBudgetInDatabase(
  database: Database,
  input: DatabaseReservationInput,
): Promise<DatabaseReservationResult> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Reservation amount must use positive integer minor units");
  }
  if (
    !input.id.trim() ||
    !input.organizationId.trim() ||
    !input.budgetId.trim() ||
    !input.idempotencyKey.trim() ||
    !input.requestHash.trim()
  ) {
    throw new Error("Reservation identifiers and request hash are required");
  }
  if (Number.isNaN(input.expiresAt.getTime())) {
    throw new Error("Reservation expiry must be a valid date");
  }

  return database.transaction(async (tx) => {
    const idempotencyScope = `${input.organizationId}:${input.idempotencyKey}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${idempotencyScope}, 0))`);

    const [existing] = await tx
      .select({
        id: budgetReservation.id,
        budgetId: budgetReservation.budgetId,
        requestHash: budgetReservation.requestHash,
        amountMinor: budgetReservation.amountMinor,
        state: budgetReservation.state,
      })
      .from(budgetReservation)
      .where(
        and(
          eq(budgetReservation.organizationId, input.organizationId),
          eq(budgetReservation.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      if (
        existing.budgetId !== input.budgetId ||
        existing.requestHash !== input.requestHash ||
        existing.amountMinor !== input.amountMinor
      ) {
        throw new Error("Idempotency key reused with different request");
      }
      return { outcome: existing.state, reservationId: existing.id };
    }

    const [updated] = await tx
      .update(budget)
      .set({
        availableMinor: sql`${budget.availableMinor} - ${input.amountMinor}`,
        version: sql`${budget.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(budget.id, input.budgetId),
          eq(budget.organizationId, input.organizationId),
          gte(budget.availableMinor, input.amountMinor),
        ),
      )
      .returning({ id: budget.id });

    if (!updated) {
      const [found] = await tx
        .select({ id: budget.id })
        .from(budget)
        .where(and(eq(budget.id, input.budgetId), eq(budget.organizationId, input.organizationId)))
        .limit(1);
      return { outcome: found ? "INSUFFICIENT_BUDGET" : "BUDGET_NOT_FOUND" };
    }

    await tx.insert(budgetReservation).values({
      id: input.id,
      organizationId: input.organizationId,
      budgetId: input.budgetId,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      amountMinor: input.amountMinor,
      expiresAt: input.expiresAt,
    });
    return { outcome: "HELD", reservationId: input.id };
  });
}

async function transitionReservation(
  database: Database,
  organizationId: string,
  reservationId: string,
  state: "COMMITTED" | "RELEASED" | "EXPIRED",
) {
  return database.transaction(async (tx) => {
    const [transitioned] = await tx
      .update(budgetReservation)
      .set({ state, updatedAt: new Date() })
      .where(
        and(
          eq(budgetReservation.id, reservationId),
          eq(budgetReservation.organizationId, organizationId),
          eq(budgetReservation.state, "HELD"),
        ),
      )
      .returning({
        budgetId: budgetReservation.budgetId,
        amountMinor: budgetReservation.amountMinor,
      });
    if (!transitioned) throw new Error("Held reservation not found");
    if (state !== "COMMITTED") {
      await tx
        .update(budget)
        .set({
          availableMinor: sql`${budget.availableMinor} + ${transitioned.amountMinor}`,
          version: sql`${budget.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(budget.id, transitioned.budgetId));
    }
  });
}

export function commitBudgetReservationInDatabase(
  database: Database,
  organizationId: string,
  reservationId: string,
) {
  return transitionReservation(database, organizationId, reservationId, "COMMITTED");
}

export function releaseBudgetReservationInDatabase(
  database: Database,
  organizationId: string,
  reservationId: string,
) {
  return transitionReservation(database, organizationId, reservationId, "RELEASED");
}

export async function expireBudgetReservationsInDatabase(
  database: Database,
  organizationId: string,
  now: Date,
): Promise<number> {
  const expired = await database
    .select({ id: budgetReservation.id })
    .from(budgetReservation)
    .where(
      and(
        eq(budgetReservation.organizationId, organizationId),
        eq(budgetReservation.state, "HELD"),
        sql`${budgetReservation.expiresAt} <= ${now}`,
      ),
    );
  let count = 0;
  for (const reservation of expired) {
    try {
      await transitionReservation(database, organizationId, reservation.id, "EXPIRED");
      count += 1;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "Held reservation not found") throw error;
    }
  }
  return count;
}

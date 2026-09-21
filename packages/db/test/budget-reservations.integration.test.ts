import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  closeDatabase,
  commitBudgetReservationInDatabase,
  expireBudgetReservationsInDatabase,
  getDatabase,
  releaseBudgetReservationInDatabase,
  reserveBudgetInDatabase,
  schema,
} from "../src/index";
import { requireLocalTestDatabaseUrl } from "./database-target";

const databaseUrl = requireLocalTestDatabaseUrl(process.env.DATABASE_URL);

describe("PostgreSQL budget reservations", () => {
  afterAll(closeDatabase);

  it("allows exactly one of two parallel holds that would exceed the shared budget", async () => {
    const db = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const organizationId = `org-${suffix}`;
    const budgetId = `budget-${suffix}`;
    await db.insert(schema.organization).values({ id: organizationId, name: "Concurrency test" });
    await db.insert(schema.budget).values({
      id: budgetId,
      organizationId,
      name: "Q4 data",
      currency: "USD",
      limitMinor: 2_500_000,
      availableMinor: 2_500_000,
    });

    try {
      const results = await Promise.all([
        reserveBudgetInDatabase(db, {
          id: `reservation-a-${suffix}`,
          organizationId,
          budgetId,
          idempotencyKey: `request-a-${suffix}`,
          requestHash: "hash-a",
          amountMinor: 2_000_000,
          expiresAt: new Date("2030-01-01T00:00:00Z"),
        }),
        reserveBudgetInDatabase(db, {
          id: `reservation-b-${suffix}`,
          organizationId,
          budgetId,
          idempotencyKey: `request-b-${suffix}`,
          requestHash: "hash-b",
          amountMinor: 2_000_000,
          expiresAt: new Date("2030-01-01T00:00:00Z"),
        }),
      ]);

      expect(results.map((result) => result.outcome).sort()).toEqual([
        "HELD",
        "INSUFFICIENT_BUDGET",
      ]);
      const [remaining] = await db
        .select({ availableMinor: schema.budget.availableMinor })
        .from(schema.budget)
        .where(eq(schema.budget.id, budgetId));
      expect(remaining?.availableMinor).toBe(500_000);
    } finally {
      await db.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    }
  });

  it("restores released and expired holds while keeping committed funds consumed", async () => {
    const db = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const organizationId = `org-life-${suffix}`;
    const budgetId = `budget-life-${suffix}`;
    await db.insert(schema.organization).values({ id: organizationId, name: "Lifecycle test" });
    await db.insert(schema.budget).values({
      id: budgetId,
      organizationId,
      name: "Lifecycle budget",
      currency: "USD",
      limitMinor: 100_000,
      availableMinor: 100_000,
    });
    const reserve = (id: string, amountMinor: number, expiresAt: Date) =>
      reserveBudgetInDatabase(db, {
        id,
        organizationId,
        budgetId,
        idempotencyKey: `request-${id}`,
        requestHash: `hash-${id}`,
        amountMinor,
        expiresAt,
      });

    try {
      await reserve(`release-${suffix}`, 40_000, new Date("2030-01-01T00:00:00Z"));
      await releaseBudgetReservationInDatabase(db, organizationId, `release-${suffix}`);
      await reserve(`commit-${suffix}`, 30_000, new Date("2030-01-01T00:00:00Z"));
      await commitBudgetReservationInDatabase(db, organizationId, `commit-${suffix}`);
      await reserve(`expire-${suffix}`, 10_000, new Date("2026-01-01T00:00:00Z"));
      expect(
        await expireBudgetReservationsInDatabase(
          db,
          organizationId,
          new Date("2026-01-01T00:01:00Z"),
        ),
      ).toBe(1);

      const [remaining] = await db
        .select({ availableMinor: schema.budget.availableMinor })
        .from(schema.budget)
        .where(eq(schema.budget.id, budgetId));
      expect(remaining?.availableMinor).toBe(70_000);
    } finally {
      await db.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    }
  });

  it("returns the original reservation for a retry and rejects a mutated retry", async () => {
    const db = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const organizationId = `org-retry-${suffix}`;
    const otherOrganizationId = `org-other-${suffix}`;
    const budgetId = `budget-retry-${suffix}`;
    const input = {
      id: `reservation-${suffix}`,
      organizationId,
      budgetId,
      idempotencyKey: `request-${suffix}`,
      requestHash: "hash-original",
      amountMinor: 25_000,
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    };
    await db.insert(schema.organization).values({ id: organizationId, name: "Retry test" });
    await db
      .insert(schema.organization)
      .values({ id: otherOrganizationId, name: "Cross-tenant test" });
    await db.insert(schema.budget).values({
      id: budgetId,
      organizationId,
      name: "Retry budget",
      currency: "USD",
      limitMinor: 100_000,
      availableMinor: 100_000,
    });

    try {
      const first = await reserveBudgetInDatabase(db, input);
      const retry = await reserveBudgetInDatabase(db, { ...input, id: `retry-${suffix}` });

      expect(first).toEqual(retry);
      await expect(
        reserveBudgetInDatabase(db, {
          ...input,
          id: `mutated-${suffix}`,
          requestHash: "hash-mutated",
          amountMinor: 30_000,
        }),
      ).rejects.toThrow("Idempotency key reused with different request");
      const [remaining] = await db
        .select({ availableMinor: schema.budget.availableMinor })
        .from(schema.budget)
        .where(eq(schema.budget.id, budgetId));
      expect(remaining?.availableMinor).toBe(75_000);
      await expect(
        db.insert(schema.budgetReservation).values({
          id: `cross-tenant-${suffix}`,
          organizationId: otherOrganizationId,
          budgetId,
          idempotencyKey: `cross-tenant-${suffix}`,
          requestHash: "cross-tenant-hash",
          amountMinor: 1_000,
          expiresAt: new Date("2030-01-01T00:00:00Z"),
        }),
      ).rejects.toThrow();
    } finally {
      await db.delete(schema.organization).where(eq(schema.organization.id, otherOrganizationId));
      await db.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    }
  });
});

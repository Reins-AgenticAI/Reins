import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { schema } from "../src/index";

describe("budget reservation schema", () => {
  it("exports durable budget and reservation tables with integer-minor-unit fields", () => {
    expect(getTableName(schema.budget)).toBe("budget");
    expect(getTableName(schema.budgetReservation)).toBe("budget_reservation");
    expect(schema.budget.availableMinor.name).toBe("available_minor");
    expect(schema.budgetReservation.idempotencyKey.name).toBe("idempotency_key");
    expect(schema.budgetReservation.amountMinor.name).toBe("amount_minor");
  });
});

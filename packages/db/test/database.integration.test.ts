import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { checkDatabase, closeDatabase, getDatabase, schema } from "../src/index";
import { requireLocalTestDatabaseUrl } from "./database-target";

const databaseUrl = requireLocalTestDatabaseUrl(process.env.DATABASE_URL);

describe("PostgreSQL integration", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("connects through the configured database URL", async () => {
    await expect(checkDatabase(databaseUrl)).resolves.toBeUndefined();
  });

  it("enforces Better Auth user deletion cascades from the committed migration", async () => {
    const database = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const userId = `integration-user-${suffix}`;
    const sessionId = `integration-session-${suffix}`;
    const accountId = `integration-account-${suffix}`;

    try {
      await database.insert(schema.user).values({
        id: userId,
        name: "Integration Test User",
        email: `${suffix}@example.invalid`,
      });
      await database.insert(schema.session).values({
        id: sessionId,
        token: `token-${suffix}`,
        userId,
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      });
      await database.insert(schema.account).values({
        id: accountId,
        accountId: `provider-account-${suffix}`,
        providerId: "integration-provider",
        userId,
      });

      await database.delete(schema.user).where(eq(schema.user.id, userId));

      const remainingSessions = await database
        .select({ id: schema.session.id })
        .from(schema.session)
        .where(eq(schema.session.id, sessionId));
      const remainingAccounts = await database
        .select({ id: schema.account.id })
        .from(schema.account)
        .where(eq(schema.account.id, accountId));

      expect(remainingSessions).toEqual([]);
      expect(remainingAccounts).toEqual([]);
    } finally {
      await database.delete(schema.user).where(eq(schema.user.id, userId));
    }
  });
});

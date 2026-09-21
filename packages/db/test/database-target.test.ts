import { describe, expect, it } from "vitest";
import { requireLocalTestDatabaseUrl } from "./database-target";

describe("isolated PostgreSQL test target", () => {
  it("accepts only explicit loopback reins_test targets without rewriting credentials", () => {
    const targets = [
      "postgresql://reins:local@127.0.0.1:5433/reins_test",
      "postgres://reins:local@localhost:5432/reins_test",
      "postgresql://reins:local@[::1]:5433/reins_test",
    ];

    for (const target of targets) {
      expect(requireLocalTestDatabaseUrl(target)).toBe(target);
    }
  });

  it("rejects missing, unsafe, and overridden targets without exposing credentials", () => {
    const targets = [
      undefined,
      "",
      "not a database URL",
      "https://reins:do-not-print@localhost/reins_test",
      "postgresql://reins:do-not-print@remote.invalid/reins_test",
      "postgresql://reins:do-not-print@127.0.0.1/reins",
      "postgresql://reins:do-not-print@localhost/postgres",
      "postgresql://reins:do-not-print@localhost/reins_test?host=remote.invalid",
      "postgresql://reins:do-not-print@localhost/reins_test?dbname=production",
      "postgresql://reins:do-not-print@localhost/reins_test#fragment",
      "postgresql://reins:do-not-print@localhost/reins%5Ftest",
    ];

    for (const target of targets) {
      expect(() => requireLocalTestDatabaseUrl(target)).toThrow(
        "DATABASE_URL must target the local reins_test database without query parameters or fragments",
      );
    }
  });
});

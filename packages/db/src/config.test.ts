import { describe, expect, it } from "vitest";
import { readDatabaseUrl } from "./config";

describe("readDatabaseUrl", () => {
  it("accepts a PostgreSQL URL", () => {
    const value = "postgresql://reins:secret@127.0.0.1:5432/reins";
    expect(readDatabaseUrl({ DATABASE_URL: value })).toBe(value);
  });

  it("rejects missing or non-PostgreSQL URLs", () => {
    expect(() => readDatabaseUrl({})).toThrow(/DATABASE_URL is required/);
    expect(() => readDatabaseUrl({ DATABASE_URL: "https://example.com" })).toThrow(
      /postgresql or postgres/,
    );
  });
});

import { describe, expect, it } from "vitest";
import { readServerEnvironment } from "./server-env";

const validEnvironment = {
  DATABASE_URL: "postgresql://reins:secret@127.0.0.1:5432/reins",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "01234567890123456789012345678901",
};

describe("readServerEnvironment", () => {
  it("returns validated server configuration", () => {
    expect(readServerEnvironment(validEnvironment)).toEqual({
      databaseUrl: validEnvironment.DATABASE_URL,
      authUrl: validEnvironment.BETTER_AUTH_URL,
      authSecret: validEnvironment.BETTER_AUTH_SECRET,
    });
  });

  it("rejects a short authentication secret", () => {
    expect(() =>
      readServerEnvironment({ ...validEnvironment, BETTER_AUTH_SECRET: "too-short" }),
    ).toThrow(/at least 32/);
  });

  it("rejects a non-PostgreSQL database URL before authentication starts", () => {
    expect(() =>
      readServerEnvironment({
        ...validEnvironment,
        DATABASE_URL: "https://database.example.com/reins",
      }),
    ).toThrow(/DATABASE_URL must use the postgresql or postgres protocol/);
  });

  it("rejects a non-HTTP authentication URL", () => {
    expect(() =>
      readServerEnvironment({
        ...validEnvironment,
        BETTER_AUTH_URL: "ftp://auth.example.com",
      }),
    ).toThrow(/BETTER_AUTH_URL must use the http or https protocol/);
  });

  it.each(["DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET"])(
    "rejects a missing %s",
    (missingKey) => {
      const environment: Record<string, string | undefined> = { ...validEnvironment };
      delete environment[missingKey];

      expect(() => readServerEnvironment(environment)).toThrow(new RegExp(missingKey));
    },
  );
});

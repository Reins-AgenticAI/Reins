import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const databaseBoundary = vi.hoisted(() => {
  const databases: Array<{ execute: ReturnType<typeof vi.fn> }> = [];
  const pools: Array<{ end: ReturnType<typeof vi.fn> }> = [];

  return {
    databases,
    drizzle: vi.fn(() => {
      const database = { execute: vi.fn() };
      databases.push(database);
      return database;
    }),
    pools,
    poolConstructor: vi.fn(),
  };
});

vi.mock("pg", () => ({
  Pool: class MockPool {
    readonly end = vi.fn();

    constructor(configuration: unknown) {
      databaseBoundary.poolConstructor(configuration);
      databaseBoundary.pools.push(this);
    }
  },
}));

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: databaseBoundary.drizzle,
}));

import { checkDatabase, closeDatabase, getDatabase } from "../src/index";

const firstUrl = "postgresql://reins:first@127.0.0.1:5432/reins";
const secondUrl = "postgresql://reins:second@127.0.0.1:5432/reins";

beforeEach(async () => {
  await closeDatabase();
  vi.clearAllMocks();
  databaseBoundary.databases.splice(0);
  databaseBoundary.pools.splice(0);
});

afterEach(async () => {
  await closeDatabase();
});

describe("database lifecycle", () => {
  it("reuses one pool for the same connection URL", () => {
    const first = getDatabase(firstUrl);
    const second = getDatabase(firstUrl);

    expect(first).toBe(second);
    expect(databaseBoundary.poolConstructor).toHaveBeenCalledOnce();
  });

  it("rejects a connection URL change after initialization", () => {
    getDatabase(firstUrl);

    expect(() => getDatabase(secondUrl)).toThrow(/changed after initialization/);
  });

  it("rejects a non-PostgreSQL URL passed directly by a caller", () => {
    expect(() => getDatabase("https://database.example.com/reins")).toThrow(
      /postgresql or postgres protocol/,
    );
    expect(databaseBoundary.poolConstructor).not.toHaveBeenCalled();
  });

  it("checks connectivity through the database boundary", async () => {
    await checkDatabase(firstUrl);

    expect(databaseBoundary.databases[0]?.execute).toHaveBeenCalledOnce();
  });

  it("closes the pool and allows a clean reinitialization", async () => {
    const first = getDatabase(firstUrl);
    await closeDatabase();
    const second = getDatabase(secondUrl);

    expect(databaseBoundary.pools[0]?.end).toHaveBeenCalledOnce();
    expect(first).not.toBe(second);
    expect(databaseBoundary.poolConstructor).toHaveBeenCalledTimes(2);
  });
});

import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { readDatabaseUrl, validateDatabaseUrl } from "./config";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

type DatabaseState = {
  connectionString: string;
  database: Database;
  pool: Pool;
};

const processState = globalThis as typeof globalThis & {
  __reinsDatabaseState?: DatabaseState;
};

export function getDatabase(connectionString = readDatabaseUrl()): Database {
  const validatedConnectionString = validateDatabaseUrl(connectionString);
  const current = processState.__reinsDatabaseState;
  if (current) {
    if (current.connectionString !== validatedConnectionString) {
      throw new Error("The database connection URL changed after initialization");
    }
    return current.database;
  }

  const pool = new Pool({
    connectionString: validatedConnectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const database = drizzle({ client: pool, schema });

  processState.__reinsDatabaseState = {
    connectionString: validatedConnectionString,
    database,
    pool,
  };
  return database;
}

export async function checkDatabase(connectionString = readDatabaseUrl()): Promise<void> {
  await getDatabase(connectionString).execute(sql`select 1`);
}

export async function closeDatabase(): Promise<void> {
  const current = processState.__reinsDatabaseState;
  if (!current) {
    return;
  }

  delete processState.__reinsDatabaseState;
  await current.pool.end();
}

export type { DatabaseReservationInput, DatabaseReservationResult } from "./budget-reservations";
export {
  commitBudgetReservationInDatabase,
  expireBudgetReservationsInDatabase,
  releaseBudgetReservationInDatabase,
  reserveBudgetInDatabase,
} from "./budget-reservations";
export { PostgresDecisionStore } from "./decision-store";
export type { Investigation } from "./evidence-store";
export { PostgresEvidenceStore } from "./evidence-store";
export type {
  StripeExecution,
  StripeExecutionBinding,
  StripeExecutionInput,
} from "./stripe-execution-store";
export { PostgresStripeExecutionStore } from "./stripe-execution-store";
export { PostgresWorkflowStore } from "./workflow-store";
export { readDatabaseUrl, schema };

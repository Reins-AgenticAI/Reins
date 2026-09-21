import { sql } from "drizzle-orm";
import { getDatabase, readDatabaseUrl } from "./index";

export async function resetTestDatabase(): Promise<void> {
  const url = new URL(readDatabaseUrl());
  if (url.hostname !== "127.0.0.1" || url.port !== "5432" || url.pathname !== "/reins_test") {
    throw new Error("Refusing reset: only 127.0.0.1:5432/reins_test is allowed");
  }
  await getDatabase().execute(
    sql.raw(
      'TRUNCATE TABLE "user", account, session, verification, evidence_manifest, scenario_run, coverage_assessment, assurance_policy_version, assurance_policy, organization_member, organization CASCADE',
    ),
  );
}

resetTestDatabase()
  .then(() => console.log("Local reins_test database reset."))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });

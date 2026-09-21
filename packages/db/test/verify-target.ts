import { requireLocalTestDatabaseUrl } from "./database-target";

try {
  requireLocalTestDatabaseUrl(process.env.DATABASE_URL);
  console.info("Isolated local test database target validated.");
} catch {
  console.error(
    "Test database configuration is missing or unsafe. Set DATABASE_URL to the local reins_test database without query parameters or fragments.",
  );
  process.exitCode = 1;
}

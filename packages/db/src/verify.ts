import { checkDatabase, closeDatabase } from "./index";

try {
  await checkDatabase();
  process.stdout.write("PostgreSQL connection verified.\n");
} finally {
  await closeDatabase();
}

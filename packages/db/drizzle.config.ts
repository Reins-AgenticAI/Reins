import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://reins:reins_local_only@127.0.0.1:5432/reins",
  },
  strict: true,
  verbose: true,
});

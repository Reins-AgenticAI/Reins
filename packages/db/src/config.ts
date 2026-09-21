type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export function validateDatabaseUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql or postgres protocol");
  }

  return value;
}

export function readDatabaseUrl(environment: EnvironmentSource = process.env): string {
  const value = environment.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required before database access");
  }

  return validateDatabaseUrl(value);
}

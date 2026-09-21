import { readDatabaseUrl } from "@reins/db";

export type ServerEnvironment = Readonly<{
  databaseUrl: string;
  authUrl: string;
  authSecret: string;
}>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function requireValue(environment: EnvironmentSource, key: string): string {
  const value = environment[key];
  if (!value) {
    throw new Error(`${key} is required before authentication starts`);
  }
  return value;
}

export function readServerEnvironment(
  environment: EnvironmentSource = process.env,
): ServerEnvironment {
  const databaseUrl = readDatabaseUrl(environment);
  const authUrl = requireValue(environment, "BETTER_AUTH_URL");
  const authSecret = requireValue(environment, "BETTER_AUTH_SECRET");

  const parsedAuthUrl = new URL(authUrl);
  if (parsedAuthUrl.protocol !== "http:" && parsedAuthUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use the http or https protocol");
  }
  if (authSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  return { databaseUrl, authUrl, authSecret };
}

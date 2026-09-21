import { getDatabase } from "@reins/db";
import * as schema from "@reins/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { readServerEnvironment } from "./server-env";

function createAuth() {
  const environment = readServerEnvironment();
  return betterAuth({
    appName: "Reins",
    baseURL: environment.authUrl,
    secret: environment.authSecret,
    trustedOrigins: [environment.authUrl],
    database: drizzleAdapter(getDatabase(environment.databaseUrl), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
    },
    advanced: {
      database: {
        joins: true,
      },
    },
  });
}

type Auth = ReturnType<typeof createAuth>;

let authInstance: Auth | undefined;

export function getAuth(): Auth {
  authInstance ??= createAuth();
  return authInstance;
}

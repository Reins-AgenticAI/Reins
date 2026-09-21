const targetError =
  "DATABASE_URL must target the local reins_test database without query parameters or fragments";

export function requireLocalTestDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error(targetError);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(targetError);
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/reins_test" ||
    url.search ||
    url.hash
  ) {
    throw new Error(targetError);
  }

  return value;
}

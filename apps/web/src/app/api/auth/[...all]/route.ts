import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

type AuthHandler = ReturnType<typeof toNextJsHandler>;

let authHandler: AuthHandler | undefined;

function getAuthHandler(): AuthHandler {
  authHandler ??= toNextJsHandler(getAuth());
  return authHandler;
}

export async function GET(request: Request) {
  return getAuthHandler().GET(request);
}

export async function POST(request: Request) {
  return getAuthHandler().POST(request);
}

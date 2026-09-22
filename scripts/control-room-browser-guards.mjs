export function isLoopbackUrl(value) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const isRedirect = (response) => response.status() >= 300 && response.status() < 400;

export async function getLoopback(request, url) {
  if (!isLoopbackUrl(url)) throw new Error("LOOPBACK_RESPONSE_REQUIRED");
  const response = await request.get(url, { maxRedirects: 0 });
  if (!isLoopbackUrl(response.url()) || isRedirect(response)) {
    throw new Error("LOOPBACK_RESPONSE_REQUIRED");
  }
  return response;
}

export async function installBrowserGuards(context) {
  const errors = { browserErrors: 0, blockedRequests: 0, guardErrors: 0 };
  context.on("page", (page) => {
    page.on("pageerror", () => errors.browserErrors++);
    page.on("console", (message) => {
      if (message.type() === "error") errors.browserErrors++;
    });
    page.on("framenavigated", (frame) => {
      // New pages and empty child frames start at about:blank without network I/O.
      if (frame.url() !== "about:blank" && !isLoopbackUrl(frame.url())) errors.blockedRequests++;
    });
  });
  await context.route("**/*", async (route) => {
    try {
      if (!isLoopbackUrl(route.request().url())) {
        errors.blockedRequests++;
        await route.abort();
        return;
      }
      // Playwright routing covers only the first URL in a redirect chain. Fetch
      // with redirects disabled and reject every 3xx before the browser sees it.
      const response = await route.fetch({ maxRedirects: 0 });
      if (!isLoopbackUrl(response.url()) || isRedirect(response)) {
        errors.blockedRequests++;
        await route.abort();
        return;
      }
      await route.fulfill({ response });
    } catch {
      errors.guardErrors++;
      await route.abort().catch(() => undefined);
    }
  });
  await context.routeWebSocket("**/*", async (route) => {
    try {
      const url = new URL(route.url());
      url.protocol = url.protocol === "wss:" ? "https:" : "http:";
      if (!isLoopbackUrl(url)) {
        errors.blockedRequests++;
        await route.close();
        return;
      }
      // WebSocket handshakes use redirect mode "error"; browsers do not follow them.
      route.connectToServer();
    } catch {
      errors.guardErrors++;
      await route.close().catch(() => undefined);
    }
  });
  return errors;
}

export async function clickAndWaitForResponse(page, predicate, button) {
  // Promise.all attaches handlers to both operations immediately, including the
  // pending waiter when a failed click leads to browser cleanup.
  const [response] = await Promise.all([
    page.waitForResponse(predicate, { timeout: 120_000 }),
    Promise.resolve().then(() => button.click()),
  ]);
  return response;
}

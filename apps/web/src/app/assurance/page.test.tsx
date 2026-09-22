import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AssurancePage from "./page";

describe("assurance workspace", () => {
  it("renders the persisted-investigation Control Room", () => {
    const markup = renderToStaticMarkup(<AssurancePage />);
    expect(markup).toContain("Agentic spend, governed by design.");
    expect(markup).toContain("Run scenario");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("Reins Evidence Atlas landing page", () => {
  it("presents the approved evidence-first product story using synthetic data", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("Every agent action leaves a trail.");
    expect(markup).toContain("Synthetic demonstration");
    expect(markup).toContain("Evidence atlas");
    expect(markup).toContain("ALLOW");
    expect(markup).toContain("ESCALATE");
    expect(markup).toContain("DENY");
    expect(markup).toContain("Synthetic records only");
    expect(markup).not.toContain("live payments");
  });

  it("connects every landing-page navigation link to content and the sandbox", () => {
    const markup = renderToStaticMarkup(<HomePage />);
    const targets = ["main-content", "product", "how-it-works", "evidence", "security"];

    expect(targets.every((target) => markup.includes(`id="${target}"`))).toBe(true);
    expect(markup).toContain('href="/assurance"');
  });

  it("keeps decorative terrain separate from the accessible evidence path", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('aria-label="Evidence path"');
    expect(markup).toContain("Policy version");
    expect(markup).toContain("Evidence bundle");
  });
});

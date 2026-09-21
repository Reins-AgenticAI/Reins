import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "./layout";

describe("root layout", () => {
  it("publishes the Reins metadata and English document language", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Test content</main>
      </RootLayout>,
    );

    expect(metadata.title).toBe("Reins");
    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain("Test content");
  });
});

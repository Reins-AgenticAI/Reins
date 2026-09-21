import { describe, expect, it } from "vitest";
import { normalizePolicy, reconcile } from "./index";
import { edgeCaseDrafts, syntheticLifecycleCases } from "./synthetic-fixtures";

describe("realistic synthetic edge cases", () => {
  it("classifies lifecycle anomalies", () => {
    for (const fixture of syntheticLifecycleCases) {
      const codes = reconcile(fixture.events).map((finding) => finding.code);
      expect(codes.includes(fixture.expectedFinding) || fixture.expectedFinding === "NONE").toBe(
        true,
      );
    }
  });

  it("rejects unsafe policy drafts", () => {
    for (const draft of edgeCaseDrafts) expect(() => normalizePolicy(draft)).toThrow();
  });
});

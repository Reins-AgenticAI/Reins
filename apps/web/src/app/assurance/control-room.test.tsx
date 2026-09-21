import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ControlRoom,
  requestComposerDescription,
  sourceLabel,
  stripeSandboxAvailability,
} from "./control-room";

describe("ControlRoom", () => {
  it("renders the persisted-investigation Control Room without legacy consumer demo UI", () => {
    const markup = renderToStaticMarkup(<ControlRoom />);
    expect(markup).toContain("Agentic spend, governed by design.");
    expect(markup).toContain("New synthetic request");
    expect(markup).toContain("Evidence");
    expect(markup).toContain("Synthetic environment");
    expect(markup).not.toContain("Buy milk");
    expect(markup).not.toContain("Agent pool");
    expect(markup).not.toContain("Evidence relationship graph");
  });

  it("uses provider-neutral copy in the request composer", () => {
    expect(requestComposerDescription).toBe(
      "Select a realistic finance case. Configured advisory source provides context; policy remains deterministic.",
    );
  });

  it("labels simulation traces without implying local Ollama executed", () => {
    expect(sourceLabel("simulation")).toBe("Synthetic advisory output");
    expect(sourceLabel("live_local_model")).toBe("Local Ollama advisory output");
    expect(sourceLabel("hosted_model")).toBe("Hosted advisory output");
  });

  it("offers the Stripe Sandbox action only for a persisted ALLOW receipt", () => {
    expect(
      stripeSandboxAvailability({
        decision: "ALLOW",
        reason: "Within policy",
        receiptId: "receipt-1",
        traces: [],
        workflowId: "workflow-1",
      }),
    ).toBe(true);
    expect(
      stripeSandboxAvailability({
        decision: "ESCALATE",
        reason: "Approval required",
        receiptId: "receipt-2",
        traces: [],
        workflowId: "workflow-2",
      }),
    ).toBe(false);
  });
});

"use client";

import { useState } from "react";

export function PolicyDraftPanel() {
  const [instruction, setInstruction] = useState(
    "Keep groceries under $50 per purchase and $200 monthly",
  );
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);
  async function draft() {
    setBusy(true);
    const response = await fetch("/api/policy-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instruction }),
    });
    const body = (await response.json()) as {
      source?: string;
      policy?: { digest: string };
      error?: string;
    };
    setResult(
      body.error ?? `${body.source} draft validated · ${body.policy?.digest.slice(0, 12)}…`,
    );
    setBusy(false);
  }
  return (
    <section className="assuranceCard" aria-labelledby="agent-title">
      <p className="eyebrow">Optional local AI assistant</p>
      <h2 id="agent-title">Draft a policy from plain language</h2>
      <p className="muted">
        The model drafts only. Deterministic validation remains authoritative.
      </p>
      <div className="agentDraft">
        <label htmlFor="policy-instruction">Policy instruction</label>
        <textarea
          id="policy-instruction"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
        />
        <button type="button" onClick={draft} disabled={busy}>
          {busy ? "Drafting…" : "Draft and validate"}
        </button>
      </div>
      {result && <p role="status">{result}</p>}
    </section>
  );
}

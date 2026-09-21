import type { PolicyDraft } from "./index";

export type PolicyAgent = {
  draft(input: string): Promise<{ draft: PolicyDraft; source: "ollama" | "fallback" }>;
};

function isDraft(value: unknown): value is PolicyDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<PolicyDraft>;
  return (
    typeof draft.name === "string" &&
    draft.name.trim().length > 0 &&
    typeof draft.currency === "string" &&
    /^[A-Za-z]{3}$/.test(draft.currency) &&
    [draft.perTransactionLimitMinor, draft.monthlyBudgetMinor, draft.approvalThresholdMinor].every(
      (amount) => amount !== undefined && Number.isSafeInteger(amount) && amount > 0,
    ) &&
    Array.isArray(draft.allowedMerchants) &&
    draft.allowedMerchants.every(
      (merchant: unknown) => typeof merchant === "string" && merchant.trim().length > 0,
    )
  );
}

const fallback: PolicyAgent = {
  async draft(input) {
    const text = input.toLowerCase();
    const dollars = [...text.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]) * 100);
    const merchants = ["datacore", "buildkit", "logline", "travel"].filter((value) =>
      text.includes(value),
    );
    const limit = dollars[0] ?? 5000;
    const monthly = dollars[1] ?? limit * 4;
    return {
      source: "fallback",
      draft: {
        name: "Draft policy",
        currency: "USD",
        perTransactionLimitMinor: limit,
        monthlyBudgetMinor: monthly,
        approvalThresholdMinor: Math.floor(limit / 2),
        allowedMerchants: merchants.length ? merchants : ["general"],
      },
    };
  },
};

export function createPolicyAgent(): PolicyAgent {
  const endpoint = process.env.OLLAMA_URL;
  if (!endpoint) return fallback;
  return {
    async draft(input) {
      try {
        const response = await fetch(`${endpoint}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL ?? "qwen3:4b",
            prompt: input,
            stream: false,
            format: "json",
          }),
        });
        if (!response.ok) return fallback.draft(input);
        const payload = (await response.json()) as { response?: string };
        if (!payload.response) return fallback.draft(input);
        const parsed: unknown = JSON.parse(payload.response);
        return isDraft(parsed) ? { source: "ollama", draft: parsed } : fallback.draft(input);
      } catch {
        return fallback.draft(input);
      }
    },
  };
}

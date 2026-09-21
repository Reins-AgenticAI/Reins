import {
  analyzeCoverage,
  normalizePolicy,
  runScenarios,
  syntheticProfiles,
} from "@reins/assurance";

export function GET() {
  const policy = normalizePolicy({
    name: "Grocery operating policy",
    currency: "USD",
    perTransactionLimitMinor: 10000,
    monthlyBudgetMinor: 50000,
    approvalThresholdMinor: 5000,
    allowedMerchants: ["fresh-market", "city-grocer"],
  });
  return Response.json({
    policy,
    profiles: syntheticProfiles.map((profile) => ({
      ...profile,
      assessment: analyzeCoverage(policy, profile),
    })),
    scenarios: runScenarios(policy),
    synthetic: true,
  });
}

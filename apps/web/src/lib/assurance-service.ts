import {
  analyzeCoverage,
  createEvidenceManifest,
  normalizePolicy,
  type PolicyDraft,
  runScenarios,
  syntheticProfiles,
} from "@reins/assurance";
import { getDatabase, schema } from "@reins/db";
import { and, desc, eq } from "drizzle-orm";
import { getAuth } from "./auth";

type RequestLike = { headers: Headers };

async function sessionUser(request: RequestLike) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error("AUTH_REQUIRED");
  return session.user;
}

async function organizationFor(userId: string) {
  const db = getDatabase();
  const existing = await db
    .select({ id: schema.organization.id, name: schema.organization.name })
    .from(schema.organizationMember)
    .innerJoin(
      schema.organization,
      eq(schema.organizationMember.organizationId, schema.organization.id),
    )
    .where(eq(schema.organizationMember.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  const id = crypto.randomUUID();
  const organization = { id, name: "Personal assurance workspace" };
  await db.transaction(async (tx) => {
    await tx.insert(schema.organization).values(organization);
    await tx
      .insert(schema.organizationMember)
      .values({ organizationId: id, userId, role: "owner" });
  });
  return organization;
}

export async function createAssessment(request: RequestLike, draft: PolicyDraft) {
  const user = await sessionUser(request);
  const organization = await organizationFor(user.id);
  const policy = normalizePolicy(draft);
  const db = getDatabase();
  const policyId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const assessments = syntheticProfiles.map((profile) => analyzeCoverage(policy, profile));
  const scenarios = runScenarios(policy);
  const evidenceId = crypto.randomUUID();
  const events = [
    {
      id: crypto.randomUUID(),
      kind: "AUTHORIZATION" as const,
      amountMinor: Math.min(policy.perTransactionLimitMinor, policy.approvalThresholdMinor - 1),
      currency: policy.currency,
      source: "POLICY" as const,
      occurredAt: new Date().toISOString(),
    },
  ];
  const evidence = createEvidenceManifest(policy, assessments, scenarios, events);
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.assurancePolicy)
      .values({ id: policyId, organizationId: organization.id, name: policy.name });
    await tx.insert(schema.assurancePolicyVersion).values({
      id: versionId,
      policyId,
      version: 1,
      canonical: policy,
      digest: policy.digest,
      createdBy: user.id,
    });
    await tx.insert(schema.coverageAssessment).values(
      assessments.map((result) => ({
        id: crypto.randomUUID(),
        organizationId: organization.id,
        policyVersionId: versionId,
        providerKey: result.providerKey,
        providerDigest: result.providerDigest,
        result,
        createdBy: user.id,
      })),
    );
    await tx.insert(schema.scenarioRun).values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      policyVersionId: versionId,
      result: scenarios,
      createdBy: user.id,
    });
    await tx.insert(schema.evidenceManifest).values({
      id: evidenceId,
      organizationId: organization.id,
      policyVersionId: versionId,
      manifest: evidence,
      digest: evidence.manifestDigest,
      createdBy: user.id,
    });
  });
  return { organization, policy, assessments, scenarios, evidence, evidenceId };
}

export async function listAssessments(request: RequestLike) {
  const user = await sessionUser(request);
  const organization = await organizationFor(user.id);
  const rows = await getDatabase()
    .select({
      id: schema.assurancePolicyVersion.id,
      canonical: schema.assurancePolicyVersion.canonical,
      digest: schema.assurancePolicyVersion.digest,
      createdAt: schema.assurancePolicyVersion.createdAt,
    })
    .from(schema.assurancePolicyVersion)
    .innerJoin(
      schema.assurancePolicy,
      eq(schema.assurancePolicyVersion.policyId, schema.assurancePolicy.id),
    )
    .where(eq(schema.assurancePolicy.organizationId, organization.id))
    .orderBy(desc(schema.assurancePolicyVersion.createdAt));
  return { organization, assessments: rows };
}

export async function getEvidence(request: RequestLike, id: string) {
  const user = await sessionUser(request);
  const organization = await organizationFor(user.id);
  const row = await getDatabase()
    .select({ manifest: schema.evidenceManifest.manifest, digest: schema.evidenceManifest.digest })
    .from(schema.evidenceManifest)
    .where(
      and(
        eq(schema.evidenceManifest.id, id),
        eq(schema.evidenceManifest.organizationId, organization.id),
      ),
    )
    .limit(1);
  if (!row[0]) throw new Error("NOT_FOUND");
  return row[0];
}

export function errorStatus(error: unknown) {
  if (error instanceof Error && error.message === "AUTH_REQUIRED") return 401;
  if (error instanceof Error && error.message === "NOT_FOUND") return 404;
  return 400;
}

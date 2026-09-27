import { createHash } from "node:crypto";
import type { CanonicalJob } from "@/core/connectors/types";
import { stableStringify } from "@/core/matching/hash";
import {
  dedupKey,
  normalizeApplyUrl,
  normalizeCompanyName,
  normalizeDomain,
  normalizeText,
} from "@/core/pipeline/normalize";
import { normalizeSalary } from "@/core/pipeline/salary";
import { detectLanguage } from "@/core/pipeline/language";
import type { EmbeddingProvider } from "@/core/providers/embedding";
import type { ParserProvider } from "@/core/providers/parser";
import type { EscoIndex } from "@/core/esco";
import type { AdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { toVectorLiteral } from "../matching/mappers";

/** Hosts of ATS/aggregators: their domain says nothing about the employer (dedup layer 2). */
const PLATFORM_DOMAINS =
  /(^|\.)(adzuna\.[a-z.]+|greenhouse\.io|lever\.co|recruitee\.com|personio\.(de|com)|workable\.com|smartrecruiters\.com|indeed\.[a-z.]+|linkedin\.com)$/;

export const NEAR_DUPLICATE_THRESHOLD = 0.9;
export const REVIEW_CONFIDENCE = 0.6;

export type IngestOutcome = "new" | "updated" | "unchanged" | "duplicate";

export interface IngestContext {
  admin: AdminClient;
  connector: { id: string | null; sourcePriority: number };
  parser: ParserProvider;
  embedder: EmbeddingProvider;
  esco: EscoIndex;
  now: Date;
  createdBy?: string | null;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function contentHash(job: CanonicalJob): string {
  const { externalId: _id, ...content } = job;
  return sha(stableStringify(content));
}

/** Layer 2: resolve (or create) the company by domain, then by normalised name. */
export async function resolveCompany(
  admin: AdminClient,
  job: CanonicalJob,
): Promise<{ id: string; name: string } | null> {
  if (!job.companyName && !job.companyDomain) return null;
  const domainCandidate = normalizeDomain(job.companyDomain ?? job.applyUrl ?? null);
  const domain =
    domainCandidate && !PLATFORM_DOMAINS.test(domainCandidate) ? domainCandidate : null;
  if (domain) {
    const { data } = await admin
      .from("companies")
      .select("id, name")
      .eq("domain", domain)
      .maybeSingle();
    if (data) return data;
  }
  if (job.companyName) {
    const norm = normalizeCompanyName(job.companyName);
    const { data: candidates } = await admin
      .from("companies")
      .select("id, name, domain")
      .ilike("name", `%${job.companyName.split(/\s+/)[0]}%`)
      .limit(20);
    const hit = candidates?.find((c) => normalizeCompanyName(c.name) === norm);
    if (hit) {
      if (!hit.domain && domain) await admin.from("companies").update({ domain }).eq("id", hit.id);
      return { id: hit.id, name: hit.name };
    }
  }
  const name = job.companyName ?? domain!;
  const { data, error } = await admin
    .from("companies")
    .insert({ name, domain, website: domain ? `https://${domain}` : null })
    .select("id, name")
    .single();
  if (error) {
    // Race on the unique domain: fetch the winner.
    const { data: again } = await admin
      .from("companies")
      .select("id, name")
      .eq("domain", domain ?? "")
      .maybeSingle();
    return again ?? null;
  }
  return data;
}

async function geocode(
  admin: AdminClient,
  city: string | null | undefined,
): Promise<{ lat: number; lng: number; region: string | null } | null> {
  if (!city) return null;
  const { data } = await admin
    .from("city_locations")
    .select("lat, lng, province")
    .eq("name_normalized", normalizeText(city))
    .maybeSingle();
  return data ? { lat: data.lat, lng: data.lng, region: data.province } : null;
}

/**
 * Golden record: within a dedup group the job from the highest-priority source wins
 * (manual/seed = 100, connectors 0-100); ties go to the most recently seen posting.
 */
export async function electGolden(admin: AdminClient, groupId: string): Promise<string | null> {
  const { data: members } = await admin
    .from("jobs")
    .select("id, source_priority, last_seen, status")
    .eq("dedup_group_id", groupId)
    .in("status", ["published", "pending_review", "draft"]);
  if (!members?.length) return null;
  const winner = [...members].sort(
    (a, b) => b.source_priority - a.source_priority || b.last_seen.localeCompare(a.last_seen),
  )[0]!;
  await admin
    .from("jobs")
    .update({ is_golden: false })
    .eq("dedup_group_id", groupId)
    .neq("id", winner.id);
  await admin.from("jobs").update({ is_golden: true }).eq("id", winner.id);
  await admin.from("dedup_groups").update({ golden_job_id: winner.id }).eq("id", groupId);
  return winner.id;
}

async function joinGroup(admin: AdminClient, jobId: string, otherId: string): Promise<string> {
  const { data: other } = await admin
    .from("jobs")
    .select("dedup_group_id")
    .eq("id", otherId)
    .single();
  let groupId = other?.dedup_group_id ?? null;
  if (!groupId) {
    const { data: g } = await admin.from("dedup_groups").insert({}).select("id").single();
    groupId = g!.id;
    await admin.from("jobs").update({ dedup_group_id: groupId }).eq("id", otherId);
  }
  await admin.from("jobs").update({ dedup_group_id: groupId }).eq("id", jobId);
  await electGolden(admin, groupId);
  return groupId;
}

/**
 * Layers 1, 3 and 4 of de-duplication (layer 2 = company resolution above).
 * Returns the id of the job this one duplicates, if any.
 */
export async function findDuplicate(
  admin: AdminClient,
  job: {
    id: string;
    applyUrlNormalized: string | null;
    dedupKey: string;
    companyId: string | null;
  },
): Promise<{ otherId: string; layer: 1 | 3 | 4 } | null> {
  if (job.applyUrlNormalized) {
    const { data } = await admin
      .from("jobs")
      .select("id")
      .eq("apply_url_normalized", job.applyUrlNormalized)
      .neq("id", job.id)
      .in("status", ["published", "pending_review"])
      .limit(1);
    if (data?.[0]) return { otherId: data[0].id, layer: 1 };
  }
  const { data: byKey } = await admin
    .from("jobs")
    .select("id")
    .eq("dedup_key", job.dedupKey)
    .neq("id", job.id)
    .in("status", ["published", "pending_review"])
    .limit(1);
  if (byKey?.[0]) return { otherId: byKey[0].id, layer: 3 };
  const { data: near } = await admin.rpc("similar_jobs", {
    p_job_id: job.id,
    p_min_similarity: NEAR_DUPLICATE_THRESHOLD,
    p_limit: 5,
  });
  if (near?.length && job.companyId) {
    // Near-duplicates only count within the same company (avoid merging similar roles elsewhere).
    const { data: sameCompany } = await admin
      .from("jobs")
      .select("id")
      .in(
        "id",
        near.map((n) => n.job_id),
      )
      .eq("company_id", job.companyId)
      .limit(1);
    if (sameCompany?.[0]) return { otherId: sameCompany[0].id, layer: 4 };
  }
  return null;
}

/**
 * Ingest one canonical job: upsert raw → enrich (classification, salary, language, geo,
 * company) → dedup → embedding. Jobs with low classification confidence go to the review queue.
 */
export async function ingestJob(
  ctx: IngestContext,
  job: CanonicalJob,
): Promise<{ outcome: IngestOutcome; jobId: string; duplicateLayer?: 1 | 3 | 4 }> {
  const { admin, now } = ctx;
  const hash = contentHash(job);
  const nowIso = now.toISOString();

  const { data: existing } = ctx.connector.id
    ? await admin
        .from("jobs")
        .select("id, content_hash, status, is_golden")
        .eq("source_id", ctx.connector.id)
        .eq("external_id", job.externalId)
        .maybeSingle()
    : { data: null };
  if (existing && existing.content_hash === hash) {
    await admin
      .from("jobs")
      .update({
        last_seen: nowIso,
        missed_runs: 0,
        ...(existing.status === "expired" ? { status: "published" as const } : {}),
      })
      .eq("id", existing.id);
    return { outcome: existing.is_golden ? "unchanged" : "duplicate", jobId: existing.id };
  }

  // Enrichment
  const text = `${job.title}\n${job.description}`;
  const cls = await ctx.parser.classifyJob(
    { title: job.title, description: job.description, companyName: job.companyName },
    { esco: ctx.esco },
  );
  const company = await resolveCompany(admin, job);
  const geo =
    (job.lat != null && job.lng != null
      ? { lat: job.lat, lng: job.lng, region: job.region ?? null }
      : null) ?? (await geocode(admin, job.city));
  const hours = job.hoursMin ?? cls.hoursMin;
  const salary = normalizeSalary(job.salary, hours ?? job.hoursMax ?? cls.hoursMax ?? null);
  const language = job.language ?? detectLanguage(text);
  const reviewReasons = [
    cls.confidence < REVIEW_CONFIDENCE ? "low_confidence" : null,
    cls.skills.length === 0 ? "no_skills" : null,
    !cls.iscoCode ? "no_occupation" : null,
    cls.unmappedSkills.length > 3 ? "unmapped_skills" : null,
  ].filter((r): r is string => !!r);
  const needsReview =
    reviewReasons.includes("low_confidence") ||
    reviewReasons.includes("no_occupation") ||
    reviewReasons.includes("no_skills");
  const applyNorm = normalizeApplyUrl(job.applyUrl);
  const key = dedupKey(job.title, company?.name ?? job.companyName, job.city);
  const [vector] = await ctx.embedder.embed([text.slice(0, 8000)], "passage");

  const row = {
    source_id: ctx.connector.id,
    external_id: job.externalId,
    source_priority: ctx.connector.sourcePriority,
    source_url: job.sourceUrl ?? null,
    title: job.title.slice(0, 300),
    description: job.description.slice(0, 20000),
    company_id: company?.id ?? null,
    hiring_organization_name: job.companyName,
    employment_types: (job.employmentTypes.length
      ? job.employmentTypes
      : cls.employmentTypes) as never,
    date_posted: job.datePosted ?? nowIso.slice(0, 10),
    valid_through: job.validThrough ?? null,
    apply_url: job.applyUrl ?? null,
    apply_url_normalized: applyNorm,
    city: job.city ?? null,
    region: geo?.region ?? job.region ?? null,
    postal_code: job.postalCode ?? null,
    country: (job.country ?? "NL").slice(0, 2),
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    remote_policy: job.remotePolicy ?? cls.remotePolicy,
    hours_min: job.hoursMin ?? cls.hoursMin,
    hours_max: job.hoursMax ?? cls.hoursMax,
    salary_min_month: salary.minMonth,
    salary_max_month: salary.maxMonth,
    salary_raw: job.salary ? asJson(job.salary) : null,
    language,
    language_requirements: asJson(cls.languageRequirements),
    visa_sponsorship: cls.visaSponsorship,
    esco_occupation_uri: cls.escoOccupationUri,
    isco_code: cls.iscoCode,
    seniority: cls.seniority,
    esco_skills: asJson(cls.skills),
    education_requirement: cls.educationRequirement
      ? asJson({ min_eqf: cls.educationRequirement.minEqf, explicit: true })
      : null,
    work_values: cls.workValues ? asJson(cls.workValues) : null,
    classification_confidence: Math.round(cls.confidence * 100) / 100,
    needs_review: reviewReasons.length > 0,
    review_reasons: reviewReasons,
    status: needsReview ? ("pending_review" as const) : ("published" as const),
    last_seen: nowIso,
    missed_runs: 0,
    dedup_key: key,
    content_hash: hash,
    embedding: toVectorLiteral(vector!),
    created_by: ctx.createdBy ?? null,
  };

  let jobId: string;
  if (existing) {
    // Keep moderation decisions (rejected/archived) sticky across syncs.
    const keepStatus = existing.status === "rejected" || existing.status === "archived";
    const { error } = await admin
      .from("jobs")
      .update(keepStatus ? { ...row, status: existing.status } : row)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    jobId = existing.id;
  } else {
    const { data, error } = await admin
      .from("jobs")
      .insert({ ...row, first_seen: nowIso })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    jobId = data.id;
  }

  const dup = await findDuplicate(admin, {
    id: jobId,
    applyUrlNormalized: applyNorm,
    dedupKey: key,
    companyId: company?.id ?? null,
  });
  if (dup) {
    await joinGroup(admin, jobId, dup.otherId);
    const { data: me } = await admin.from("jobs").select("is_golden").eq("id", jobId).single();
    if (!me?.is_golden) return { outcome: "duplicate", jobId, duplicateLayer: dup.layer };
  }
  return { outcome: existing ? "updated" : "new", jobId };
}

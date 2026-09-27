"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { requireAdmin } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { enqueue, QUEUES } from "@/server/queue";
import { loadEscoIndex } from "@/server/esco";
import { recomputeMatchesForJobs } from "@/server/matching/service";
import { ingestJob } from "@/server/pipeline/ingest";
import { createParserProvider } from "@/core/providers/parser";
import { createEmbeddingProvider } from "@/core/providers/embedding";
import { employmentFromText, remoteFromText } from "@/core/connectors/util";
import { CEFR_LEVELS, SENIORITY_LEVELS } from "@/core/matching/types";

async function recompute(jobIds: string[]) {
  const queued = await enqueue(QUEUES.jobsRecompute, { jobIds });
  if (!queued) await recomputeMatchesForJobs(createAdminClient(), jobIds);
}

const moderateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["published", "rejected", "archived", "pending_review"]),
  note: z.string().max(1000).optional(),
});

export async function moderateJob(input: z.input<typeof moderateSchema>) {
  const admin = await requireAdmin();
  const { id, status, note } = moderateSchema.parse(input);
  const db = createAdminClient();
  const { error } = await db
    .from("jobs")
    .update({
      status,
      moderation_note: note ?? null,
      ...(status === "published" ? { needs_review: false } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: `job.${status}`,
    entityType: "job",
    entityId: id,
    metadata: { note },
  });
  await recompute([id]);
  revalidatePath("/[locale]/admin/jobs", "layout");
}

const classificationSchema = z.object({
  id: z.uuid(),
  escoOccupationUri: z.string().nullable(),
  seniority: z.enum(SENIORITY_LEVELS).nullable(),
  skills: z
    .array(z.object({ uri: z.string(), label: z.string(), importance: z.enum(["must", "nice"]) }))
    .max(60),
  languageRequirements: z
    .array(
      z.object({
        language: z.string().length(2),
        level: z.enum(CEFR_LEVELS),
        required: z.boolean(),
      }),
    )
    .max(8),
  publish: z.boolean(),
});

/** Fix a (badly) classified job from the review queue. */
export async function updateJobClassification(input: z.input<typeof classificationSchema>) {
  const admin = await requireAdmin();
  const d = classificationSchema.parse(input);
  const db = createAdminClient();
  const esco = await loadEscoIndex(db);
  const occ = d.escoOccupationUri ? esco.occupations.get(d.escoOccupationUri) : null;
  const { error } = await db
    .from("jobs")
    .update({
      esco_occupation_uri: occ?.uri ?? null,
      isco_code: occ?.iscoCode ?? null,
      seniority: d.seniority,
      esco_skills: asJson(d.skills),
      language_requirements: asJson(d.languageRequirements),
      classification_confidence: 1,
      needs_review: false,
      review_reasons: [],
      ...(d.publish ? { status: "published" as const } : {}),
    })
    .eq("id", d.id);
  if (error) throw new Error(error.message);
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "job.reclassify",
    entityType: "job",
    entityId: d.id,
    metadata: { occupation: occ?.uri, skills: d.skills.length, publish: d.publish },
  });
  await recompute([d.id]);
  revalidatePath("/[locale]/admin/jobs", "layout");
}

const manualSchema = z.object({
  title: z.string().trim().min(2).max(300),
  companyName: z.string().trim().min(1).max(200),
  companyDomain: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  description: z.string().trim().min(20).max(20000),
  applyUrl: z.url().optional().or(z.literal("")),
  salaryText: z.string().max(200).optional(),
  remote: z.string().optional(),
  employment: z.string().optional(),
  validThrough: z.string().optional(),
});

export type ManualState = { status: "idle" | "error"; message?: string };

/** Manually add a job: same enrichment/dedup pipeline as connectors, source priority 100. */
export async function createManualJob(
  _prev: ManualState,
  formData: FormData,
): Promise<ManualState> {
  const admin = await requireAdmin();
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  const d = parsed.data;
  const db = createAdminClient();
  let jobId: string;
  try {
    const r = await ingestJob(
      {
        admin: db,
        connector: { id: null, sourcePriority: 100 },
        parser: createParserProvider(),
        embedder: createEmbeddingProvider(),
        esco: await loadEscoIndex(db),
        now: new Date(),
        createdBy: admin.id,
      },
      {
        externalId: `manual:${crypto.randomUUID()}`,
        title: d.title,
        description: d.description,
        companyName: d.companyName,
        companyDomain: d.companyDomain || null,
        applyUrl: d.applyUrl || null,
        city: d.city || null,
        country: "NL",
        remotePolicy: remoteFromText(d.remote),
        employmentTypes: employmentFromText(d.employment),
        salary: d.salaryText ? { text: d.salaryText, currency: "EUR" } : null,
        validThrough: d.validThrough ? new Date(d.validThrough).toISOString() : null,
      },
    );
    jobId = r.jobId;
    await writeAudit(db, {
      actorId: admin.id,
      actorRole: "admin",
      action: "job.create_manual",
      entityType: "job",
      entityId: jobId,
      metadata: { outcome: r.outcome },
    });
    await recompute([jobId]);
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  redirect({ href: `/admin/jobs/${jobId}`, locale: await getLocale() });
  return { status: "idle" };
}

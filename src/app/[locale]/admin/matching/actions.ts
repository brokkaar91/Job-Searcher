"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { requireAdmin } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { enqueue, QUEUES } from "@/server/queue";
import { getActiveModel } from "@/server/model";
import { loadEscoIndex } from "@/server/esco";
import {
  experienceSimilarity,
  loadCandidate,
  loadMatchableJobs,
  recomputeMatchesForUser,
} from "@/server/matching/service";
import { modelConfigSchema, type ModelConfig } from "@/core/matching/config";
import { matchJob } from "@/core/matching/engine";

/** Model versions are immutable: every edit is a NEW version (inactive until activated). */
export async function createModelVersion(input: {
  name: string;
  notes: string;
  config: ModelConfig;
}) {
  const admin = await requireAdmin();
  const config = modelConfigSchema.safeParse(input.config);
  if (!config.success)
    return {
      ok: false as const,
      errors: config.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  const name = z.string().trim().min(2).max(100).parse(input.name);
  const db = createAdminClient();
  const { data: last } = await db
    .from("matching_model_versions")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { data, error } = await db
    .from("matching_model_versions")
    .insert({
      version,
      name,
      notes: input.notes.slice(0, 2000) || null,
      config: asJson(config.data),
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, errors: [error.message] };
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "model.create",
    entityType: "matching_model_version",
    entityId: data.id,
    modelVersionId: data.id,
    metadata: { version, name, weights: config.data.weights },
  });
  revalidatePath("/[locale]/admin/matching", "page");
  return { ok: true as const, id: data.id, version };
}

/** Activate a version and recompute all matches (queued; inline when no worker runs). */
export async function activateModelVersion(id: string) {
  const admin = await requireAdmin();
  z.uuid().parse(id);
  const db = createAdminClient();
  const previous = await getActiveModel(db).catch(() => null);
  await db.from("matching_model_versions").update({ is_active: false }).eq("is_active", true);
  const { error } = await db
    .from("matching_model_versions")
    .update({ is_active: true, activated_at: new Date().toISOString(), activated_by: admin.id })
    .eq("id", id);
  if (error) {
    if (previous)
      await db.from("matching_model_versions").update({ is_active: true }).eq("id", previous.id);
    throw new Error(error.message);
  }
  await writeAudit(db, {
    actorId: admin.id,
    actorRole: "admin",
    action: "model.activate",
    entityType: "matching_model_version",
    entityId: id,
    modelVersionId: id,
    metadata: { previous: previous?.id ?? null },
  });
  const queued = await enqueue(
    QUEUES.matchesRecomputeAll,
    { modelVersionId: id },
    { singletonKey: "recompute-all" },
  );
  if (!queued) {
    const { data } = await db
      .from("candidate_profiles")
      .select("user_id")
      .not("onboarding_completed_at", "is", null);
    for (const u of data ?? []) await recomputeMatchesForUser(db, u.user_id);
  }
  revalidatePath("/[locale]/admin/matching", "page");
  return { queued: !!queued };
}

export interface TestRow {
  jobId: string;
  title: string;
  company: string | null;
  current: { score: number; label: string; knockedOut: boolean };
  draft: { score: number; label: string; knockedOut: boolean };
}

/**
 * Dry run: compare the active model with a draft config for one demo profile.
 * Nothing is stored (no matches, no audit of computations) – it is a what-if view.
 */
export async function testModel(
  draftInput: ModelConfig,
  userId: string,
): Promise<{ ok: true; rows: TestRow[] } | { ok: false; errors: string[] }> {
  await requireAdmin();
  const draft = modelConfigSchema.safeParse(draftInput);
  if (!draft.success)
    return {
      ok: false,
      errors: draft.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  const db = createAdminClient();
  // Only demo profiles may be used for testing (no real candidates in admin what-if views).
  const { data: profile } = await db
    .from("profiles")
    .select("email")
    .eq("id", z.uuid().parse(userId))
    .single();
  if (!profile?.email?.endsWith("@jobmatch.local"))
    return { ok: false, errors: ["only demo profiles can be used for testing"] };
  const [active, { candidate, embeddings }, jobs, esco] = await Promise.all([
    getActiveModel(db),
    loadCandidate(db, userId),
    loadMatchableJobs(db),
    loadEscoIndex(db),
  ]);
  const { data: meta } = await db
    .from("jobs")
    .select("id, hiring_organization_name")
    .in(
      "id",
      jobs.map((j) => j.job.id),
    );
  const now = new Date();
  const rows = jobs.map(({ job, embedding }) => {
    const ctx = {
      experienceSimilarity: experienceSimilarity(embeddings, embedding),
      skillBroader: esco.broaderMap(),
      now,
    };
    const a = matchJob(candidate, job, active.config, ctx);
    const b = matchJob(candidate, job, draft.data, ctx);
    return {
      jobId: job.id,
      title: job.title,
      company: meta?.find((m) => m.id === job.id)?.hiring_organization_name ?? null,
      current: { score: a.totalScore, label: a.label, knockedOut: a.knockedOut },
      draft: { score: b.totalScore, label: b.label, knockedOut: b.knockedOut },
    };
  });
  rows.sort(
    (x, y) =>
      Number(x.draft.knockedOut) - Number(y.draft.knockedOut) || y.draft.score - x.draft.score,
  );
  return { ok: true, rows: rows.slice(0, 12) };
}

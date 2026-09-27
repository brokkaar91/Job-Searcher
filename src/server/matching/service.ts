import { matchJob } from "@/core/matching/engine";
import { computeInputHash } from "@/core/matching/hash";
import { sanitizeCandidate } from "@/core/matching/sanitize";
import type { MatchJob, MatchResult } from "@/core/matching/types";
import { cosine } from "@/core/providers/embedding";
import type { AdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { writeAudit, type AuditEntry } from "../audit";
import { loadEscoIndex } from "../esco";
import { getActiveModel, type ActiveModel } from "../model";
import { parseVector, toMatchCandidate, toMatchJob } from "./mappers";

const JOB_COLUMNS =
  "id, title, language, esco_skills, language_requirements, lat, lng, city, remote_policy, salary_min_month, salary_max_month, hours_min, hours_max, employment_types, isco_code, seniority, work_values, education_requirement, embedding, companies(name, size, type), esco_occupations(riasec, work_values)";

export interface LoadedJob {
  job: MatchJob;
  embedding: number[] | null;
}

export async function loadMatchableJobs(
  admin: AdminClient,
  jobIds?: string[],
): Promise<LoadedJob[]> {
  const out: LoadedJob[] = [];
  for (let from = 0; ; from += 500) {
    let q = admin.from("jobs").select(JOB_COLUMNS).eq("status", "published").eq("is_golden", true);
    if (jobIds) q = q.in("id", jobIds);
    const { data, error } = await q.order("id").range(from, from + 499);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const { companies, esco_occupations, embedding, ...job } = row;
      out.push({
        job: toMatchJob({ job, company: companies, occupation: esco_occupations }),
        embedding: parseVector(embedding),
      });
    }
    if (!data || data.length < 500) return out;
  }
}

export async function loadCandidate(admin: AdminClient, userId: string) {
  const [profile, skills, experiences, languages] = await Promise.all([
    admin
      .from("candidate_profiles")
      .select(
        "seniority, education_level, preferences, riasec, work_values, onboarding_completed_at, embedding",
      )
      .eq("user_id", userId)
      .single(),
    admin
      .from("candidate_skills")
      .select("esco_uri, label, last_used_year, confirmed")
      .eq("user_id", userId),
    admin.from("candidate_experiences").select("isco_code, embedding").eq("user_id", userId),
    admin.from("candidate_languages").select("language, level").eq("user_id", userId),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  const candidate = toMatchCandidate({
    profile: profile.data,
    skills: skills.data ?? [],
    experiences: experiences.data ?? [],
    languages: languages.data ?? [],
  });
  const embeddings = [
    ...(experiences.data ?? []).map((e) => parseVector(e.embedding)),
    parseVector(profile.data.embedding),
  ].filter((v): v is number[] => !!v);
  return { candidate, embeddings, onboardingCompleted: !!profile.data.onboarding_completed_at };
}

/** Semantic relevance of previous roles: best cosine between any experience/profile vector and the job. */
export function experienceSimilarity(
  candidateVectors: number[][],
  jobVector: number[] | null,
): number | null {
  if (!jobVector || candidateVectors.length === 0) return null;
  return Math.max(...candidateVectors.map((v) => cosine(v, jobVector)));
}

export interface ComputeOptions {
  model?: ActiveModel;
  jobs?: LoadedJob[];
  /** Also store weak (below "possible") matches – used by the admin test view. */
  keepWeak?: boolean;
  now?: Date;
}

/**
 * Recompute and store matches for one user. Every computation is written to the audit log with the
 * input hash and model version. Returns the (sorted) results.
 */
export async function recomputeMatchesForUser(
  admin: AdminClient,
  userId: string,
  opts: ComputeOptions = {},
): Promise<MatchResult[]> {
  const model = opts.model ?? (await getActiveModel(admin));
  const { candidate, embeddings, onboardingCompleted } = await loadCandidate(admin, userId);
  if (!onboardingCompleted) return [];
  const jobs = opts.jobs ?? (await loadMatchableJobs(admin));
  const esco = await loadEscoIndex(admin);
  const skillBroader = esco.broaderMap();
  const now = opts.now ?? new Date();
  const safeCandidate = sanitizeCandidate(candidate);

  const results: MatchResult[] = [];
  const rows = [];
  const audit: AuditEntry[] = [];
  for (const { job, embedding } of jobs) {
    const sim = experienceSimilarity(embeddings, embedding);
    const ctx = {
      experienceSimilarity: sim == null ? null : Math.round(sim * 10000) / 10000,
      skillBroader,
      now,
    };
    const result = matchJob(safeCandidate, job, model.config, ctx);
    const inputHash = computeInputHash({
      candidate: safeCandidate,
      job,
      experienceSimilarity: ctx.experienceSimilarity,
      modelVersionId: model.id,
      // Skill recency depends on the current year.
      year: now.getFullYear(),
    });
    audit.push({
      actorRole: "system",
      action: "match.compute",
      entityType: "match",
      entityId: `${userId}:${job.id}`,
      modelVersionId: model.id,
      inputHash,
      metadata: { score: result.totalScore, label: result.label, knockedOut: result.knockedOut },
    });
    results.push(result);
    if (!opts.keepWeak && result.totalScore < model.config.thresholds.possible) continue;
    rows.push({
      user_id: userId,
      job_id: job.id,
      model_version_id: model.id,
      total_score: result.totalScore,
      label: result.label,
      component_scores: asJson(result.components),
      explanation: asJson({
        reasons: result.reasons,
        gaps: result.gaps,
        languageGaps: result.languageGaps,
        notes: result.notes,
      }),
      knockouts: asJson(result.knockouts),
      knocked_out: result.knockedOut,
      limited_data: result.limitedData,
      input_hash: inputHash,
    });
  }

  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await admin
      .from("matches")
      .upsert(rows.slice(i, i + 200), { onConflict: "user_id,job_id" });
    if (error) throw new Error(`storing matches failed: ${error.message}`);
  }
  // Remove matches that no longer qualify (within the evaluated job set).
  const keep = new Set(rows.map((r) => r.job_id));
  if (!opts.jobs) {
    let del = admin.from("matches").delete().eq("user_id", userId);
    if (keep.size) del = del.not("job_id", "in", `(${[...keep].join(",")})`);
    const { error } = await del;
    if (error) throw new Error(error.message);
  } else {
    const drop = jobs.map((j) => j.job.id).filter((id) => !keep.has(id));
    if (drop.length) {
      const { error } = await admin
        .from("matches")
        .delete()
        .eq("user_id", userId)
        .in("job_id", drop);
      if (error) throw new Error(error.message);
    }
  }
  await writeAudit(admin, audit);
  return results.sort(
    (a, b) => Number(a.knockedOut) - Number(b.knockedOut) || b.totalScore - a.totalScore,
  );
}

/** Recompute matches for all users who completed onboarding against specific jobs (e.g. after ingest). */
export async function recomputeMatchesForJobs(
  admin: AdminClient,
  jobIds: string[],
): Promise<number> {
  if (jobIds.length === 0) return 0;
  const model = await getActiveModel(admin);
  const jobs = await loadMatchableJobs(admin, jobIds);
  const { data: users, error } = await admin
    .from("candidate_profiles")
    .select("user_id")
    .not("onboarding_completed_at", "is", null);
  if (error) throw new Error(error.message);
  for (const u of users ?? []) await recomputeMatchesForUser(admin, u.user_id, { model, jobs });
  // Jobs that were unpublished/expired: drop their matches.
  const live = new Set(jobs.map((j) => j.job.id));
  const gone = jobIds.filter((id) => !live.has(id));
  if (gone.length) await admin.from("matches").delete().in("job_id", gone);
  return users?.length ?? 0;
}

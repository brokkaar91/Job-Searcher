import "server-only";
import { z } from "zod";
import type {
  ComponentKey,
  ComponentScore,
  KnockoutResult,
  MatchLabel,
  Message,
  SkillGap,
} from "@/core/matching/types";
import { createClient } from "@/lib/supabase/server";

export const feedFiltersSchema = z.object({
  label: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s.split(",").filter((x): x is MatchLabel => ["strong", "good", "possible"].includes(x))
        : [],
    ),
  remote: z.enum(["onsite", "hybrid", "remote"]).optional(),
  hidden: z.literal("1").optional(),
  view: z.enum(["all", "saved", "dismissed"]).catch("all").default("all"),
  sort: z.enum(["score", "new", "salary"]).catch("score").default("score"),
});
export type FeedFilters = z.infer<typeof feedFiltersSchema>;

export interface Explanation {
  reasons: Message[];
  gaps: SkillGap[];
  languageGaps: { language: string; required: string; actual: string | null }[];
  notes: Message[];
}

export interface FeedItem {
  matchId: string;
  jobId: string;
  score: number;
  label: MatchLabel;
  knockedOut: boolean;
  limitedData: boolean;
  isNew: boolean;
  createdAt: string;
  explanation: Explanation;
  feedback: "saved" | "dismissed" | "applied" | null;
  job: {
    title: string;
    city: string | null;
    remotePolicy: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    language: string | null;
    datePosted: string | null;
    companyName: string | null;
  };
}

const MATCH_SELECT =
  "id, job_id, total_score, label, explanation, knocked_out, limited_data, seen_at, created_at, jobs!inner(title, city, remote_policy, salary_min_month, salary_max_month, language, date_posted, status, hiring_organization_name, companies(name))";

/** Latest feedback per job for the current user. */
async function latestFeedback(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("match_feedback")
    .select("job_id, type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const map = new Map<string, FeedItem["feedback"]>();
  for (const f of data ?? []) {
    if (map.has(f.job_id)) continue;
    map.set(f.job_id, f.type === "unsaved" ? null : f.type);
  }
  return map;
}

export async function loadFeed(userId: string, filters: FeedFilters) {
  const supabase = await createClient();
  const [{ data, error }, feedback] = await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("user_id", userId)
      .eq("jobs.status", "published"),
    latestFeedback(supabase, userId),
  ]);
  if (error) throw new Error(error.message);

  const all: FeedItem[] = (data ?? []).map((m) => ({
    matchId: m.id,
    jobId: m.job_id,
    score: Number(m.total_score),
    label: m.label as MatchLabel,
    knockedOut: m.knocked_out,
    limitedData: m.limited_data,
    isNew: !m.seen_at,
    createdAt: m.created_at,
    explanation: m.explanation as unknown as Explanation,
    feedback: feedback.get(m.job_id) ?? null,
    job: {
      title: m.jobs.title,
      city: m.jobs.city,
      remotePolicy: m.jobs.remote_policy,
      salaryMin: m.jobs.salary_min_month,
      salaryMax: m.jobs.salary_max_month,
      language: m.jobs.language,
      datePosted: m.jobs.date_posted,
      companyName: m.jobs.companies?.name ?? m.jobs.hiring_organization_name,
    },
  }));

  const byView = all.filter((i) =>
    filters.view === "saved"
      ? i.feedback === "saved" || i.feedback === "applied"
      : filters.view === "dismissed"
        ? i.feedback === "dismissed"
        : i.feedback !== "dismissed",
  );
  const hiddenCount = byView.filter((i) => i.knockedOut).length;
  let items = byView.filter((i) => (filters.hidden ? true : !i.knockedOut));
  if (filters.label.length) items = items.filter((i) => filters.label.includes(i.label));
  if (filters.remote) items = items.filter((i) => i.job.remotePolicy === filters.remote);

  items.sort((a, b) => {
    if (a.knockedOut !== b.knockedOut) return a.knockedOut ? 1 : -1;
    if (filters.sort === "new")
      return (b.job.datePosted ?? "").localeCompare(a.job.datePosted ?? "");
    if (filters.sort === "salary")
      return (b.job.salaryMax ?? b.job.salaryMin ?? 0) - (a.job.salaryMax ?? a.job.salaryMin ?? 0);
    return b.score - a.score;
  });

  return {
    items,
    hiddenCount,
    total: all.length,
    newCount: all.filter((i) => i.isNew && !i.knockedOut).length,
  };
}

export async function loadMatchDetail(userId: string, jobId: string) {
  const supabase = await createClient();
  const [{ data: match }, { data: job }, { data: application }, feedback] = await Promise.all([
    supabase.from("matches").select("*").eq("user_id", userId).eq("job_id", jobId).maybeSingle(),
    supabase
      .from("jobs")
      .select("*, companies(name, domain, website, size, type, description)")
      .eq("id", jobId)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("id, status")
      .eq("user_id", userId)
      .eq("job_id", jobId)
      .maybeSingle(),
    latestFeedback(supabase, userId),
  ]);
  if (!job) return null;
  if (match && !match.seen_at)
    await supabase.from("matches").update({ seen_at: new Date().toISOString() }).eq("id", match.id);
  return {
    job,
    match: match
      ? {
          id: match.id,
          score: Number(match.total_score),
          label: match.label as MatchLabel,
          knockedOut: match.knocked_out,
          limitedData: match.limited_data,
          components: match.component_scores as unknown as Record<ComponentKey, ComponentScore>,
          knockouts: match.knockouts as unknown as KnockoutResult[],
          explanation: match.explanation as unknown as Explanation,
          modelVersionId: match.model_version_id,
          updatedAt: match.updated_at,
        }
      : null,
    application,
    feedback: feedback.get(jobId) ?? null,
  };
}

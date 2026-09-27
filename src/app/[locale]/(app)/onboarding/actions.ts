"use server";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asJson } from "@/lib/json";
import { getUser } from "@/server/auth";
import { MAX_CV_BYTES, processCvUpload, requestCandidateRefresh } from "@/server/candidate";
import { CV_MIME_TYPES } from "@/core/providers/parser/extract";
import { candidatePreferencesSchema } from "@/server/matching/mappers";
import {
  CEFR_LEVELS,
  PERMIT_TYPES,
  SALARY_NORM_CATEGORIES,
  WORK_VALUES,
} from "@/core/matching/types";
import { MINI_IP_ITEMS, scoreInterests } from "@/core/assessments/mini-ip";
import { ONBOARDING_STEPS, nextStep, type OnboardingStep } from "./steps";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** After onboarding, profile edits trigger a match refresh (inline + queued embeddings). */
async function refreshIfOnboarded(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", userId)
    .single();
  if (data?.onboarding_completed_at) await requestCandidateRefresh(createAdminClient(), userId);
}

async function authed() {
  const user = await getUser();
  if (!user) throw new Error("not authenticated");
  return { user, supabase: await createClient() };
}

/** Mark a step as done (progress never goes backwards) and go to the next screen. */
async function advance(step: OnboardingStep) {
  const { user, supabase } = await authed();
  const idx = ONBOARDING_STEPS.indexOf(step) + 1;
  const { data } = await supabase
    .from("candidate_profiles")
    .select("onboarding_step")
    .eq("user_id", user.id)
    .single();
  if ((data?.onboarding_step ?? 0) < idx) {
    await supabase
      .from("candidate_profiles")
      .update({ onboarding_step: idx })
      .eq("user_id", user.id);
  }
  const next = nextStep(step);
  redirect({ href: next ? `/onboarding/${next}` : "/matches", locale: await getLocale() });
}

// ─── Step 1a: CV upload ──────────────────────────────────────────────────────

export type UploadState = {
  status: "idle" | "error";
  error?: "type" | "size" | "parse" | "empty" | "failed";
};

export async function uploadCv(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const { user } = await authed();
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) return { status: "error", error: "empty" };
  if (!Object.values(CV_MIME_TYPES).includes(file.type as never))
    return { status: "error", error: "type" };
  if (file.size > MAX_CV_BYTES) return { status: "error", error: "size" };
  const knownNames = [user.user_metadata?.full_name, user.user_metadata?.name].filter(
    (n): n is string => typeof n === "string",
  );
  try {
    const result = await processCvUpload(
      createAdminClient(),
      user.id,
      {
        name: file.name,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
      { knownNames },
    );
    if (!result.parsed) return { status: "error", error: "parse" };
  } catch (e) {
    console.error("cv upload failed", e);
    return { status: "error", error: "failed" };
  }
  await advance("cv");
  return { status: "idle" };
}

export async function skipCv() {
  await advance("cv");
}

// ─── Step 1b: review skills, experience, education ───────────────────────────

const reviewSchema = z.object({
  skills: z
    .array(
      z.object({
        escoUri: z.string().nullable(),
        label: z.string().min(1).max(200),
        lastUsedYear: z.number().int().min(1950).max(2100).nullable(),
      }),
    )
    .max(80),
  experiences: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        organisation: z.string().max(200).nullable(),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .nullable(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .nullable(),
        isCurrent: z.boolean(),
        description: z.string().max(2000),
        escoOccupationUri: z.string().nullable(),
        iscoCode: z
          .string()
          .regex(/^\d{4}$/)
          .nullable(),
      }),
    )
    .max(15),
  educationLevel: z.number().int().min(1).max(8).nullable(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

/** Replaces skills/experiences with the reviewed version. Shared by onboarding and profile editing. */
export async function saveReviewData(input: ReviewInput): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { user, supabase } = await authed();
  const { skills, experiences, educationLevel } = parsed.data;
  const dedup = [...new Map(skills.map((s) => [s.escoUri ?? s.label.toLowerCase(), s])).values()];
  await supabase.from("candidate_skills").delete().eq("user_id", user.id);
  if (dedup.length) {
    const { error } = await supabase.from("candidate_skills").insert(
      dedup.map((s) => ({
        user_id: user.id,
        esco_uri: s.escoUri,
        label: s.label,
        last_used_year: s.lastUsedYear,
        source: "user",
        confirmed: true,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }
  await supabase.from("candidate_experiences").delete().eq("user_id", user.id);
  if (experiences.length) {
    const { error } = await supabase.from("candidate_experiences").insert(
      experiences.map((e, i) => ({
        user_id: user.id,
        title: e.title,
        organisation: e.organisation,
        start_date: e.startDate ? `${e.startDate}-01` : null,
        end_date: e.isCurrent || !e.endDate ? null : `${e.endDate}-01`,
        is_current: e.isCurrent,
        description: e.description,
        esco_occupation_uri: e.escoOccupationUri,
        isco_code: e.iscoCode,
        sort_order: i,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }
  await supabase
    .from("candidate_profiles")
    .update({ education_level: educationLevel })
    .eq("user_id", user.id);
  await refreshIfOnboarded(user.id);
  return { ok: true };
}

export async function saveReview(input: ReviewInput): Promise<ActionResult> {
  const r = await saveReviewData(input);
  if (!r.ok) return r;
  await advance("review");
  return r;
}

// ─── Step 2: work status + languages ─────────────────────────────────────────

const statusSchema = z.object({
  needsSponsorship: z.boolean(),
  permitType: z.enum(PERMIT_TYPES).nullable(),
  salaryNormCategory: z.enum(SALARY_NORM_CATEGORIES).nullable(),
  languages: z
    .array(z.object({ language: z.string().regex(/^[a-z]{2}$/), level: z.enum(CEFR_LEVELS) }))
    .max(12),
});
export type StatusInput = z.infer<typeof statusSchema>;

export async function saveStatusData(input: StatusInput): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { user, supabase } = await authed();
  const d = parsed.data;
  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      needs_sponsorship: d.needsSponsorship,
      permit_type: d.permitType,
      salary_norm_category: d.needsSponsorship ? d.salaryNormCategory : null,
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("candidate_languages").delete().eq("user_id", user.id);
  const langs = [...new Map(d.languages.map((l) => [l.language, l])).values()];
  if (langs.length)
    await supabase
      .from("candidate_languages")
      .insert(langs.map((l) => ({ user_id: user.id, ...l })));
  await refreshIfOnboarded(user.id);
  return { ok: true };
}

export async function saveStatus(input: StatusInput): Promise<ActionResult> {
  const r = await saveStatusData(input);
  if (!r.ok) return r;
  await advance("status");
  return r;
}

// ─── Step 3: preferences ─────────────────────────────────────────────────────

export type PreferencesInput = z.input<typeof candidatePreferencesSchema>;

export async function savePreferencesData(input: PreferencesInput): Promise<ActionResult> {
  const parsed = candidatePreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const p = parsed.data;
  if (p.hoursMin != null && p.hoursMax != null && p.hoursMin > p.hoursMax)
    return { ok: false, error: "hours" };
  const { user, supabase } = await authed();
  const { error } = await supabase
    .from("candidate_profiles")
    .update({ preferences: asJson(p) })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  await refreshIfOnboarded(user.id);
  return { ok: true };
}

export async function savePreferences(input: PreferencesInput): Promise<ActionResult> {
  const r = await savePreferencesData(input);
  if (!r.ok) return r;
  await advance("preferences");
  return r;
}

// ─── Step 4: interests (Mini-IP → RIASEC) ────────────────────────────────────

const answersSchema = z.record(z.string(), z.number().int().min(1).max(5));

/** Saves (partial) answers and the derived RIASEC profile without leaving the step. */
export async function saveInterestAnswers(answers: Record<string, number>): Promise<ActionResult> {
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const valid = Object.fromEntries(
    Object.entries(parsed.data).filter(([id]) => MINI_IP_ITEMS.some((i) => i.id === id)),
  ) as Record<string, 1 | 2 | 3 | 4 | 5>;
  const { user, supabase } = await authed();
  const { error } = await supabase
    .from("candidate_profiles")
    .update({ riasec_answers: asJson(valid), riasec: asJson(scoreInterests(valid)) })
    .eq("user_id", user.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveInterests(answers: Record<string, number>): Promise<ActionResult> {
  const r = await saveInterestAnswers(answers);
  if (!r.ok) return r;
  await advance("interests");
  return r;
}

// ─── Step 5: work values → complete ──────────────────────────────────────────

const rankingSchema = z
  .array(z.enum(WORK_VALUES))
  .length(WORK_VALUES.length)
  .refine((r) => new Set(r).size === r.length);

export async function saveValuesData(ranking: string[]): Promise<ActionResult> {
  const parsed = rankingSchema.safeParse(ranking);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { user, supabase } = await authed();
  const { error } = await supabase
    .from("candidate_profiles")
    .update({ work_values: asJson(parsed.data) })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  await refreshIfOnboarded(user.id);
  return { ok: true };
}

export async function completeOnboarding(ranking: string[]): Promise<ActionResult> {
  const r = await saveValuesData(ranking);
  if (!r.ok) return r;
  const { user, supabase } = await authed();
  await supabase
    .from("candidate_profiles")
    .update({
      onboarding_step: ONBOARDING_STEPS.length,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  await requestCandidateRefresh(createAdminClient(), user.id);
  redirect({ href: { pathname: "/matches", query: { welcome: "1" } }, locale: await getLocale() });
  return { ok: true };
}

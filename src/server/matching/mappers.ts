/**
 * Pure mappers from database rows to matching-engine input types.
 * COMPLIANCE: only allow-listed fields are copied; profile rows (email etc.) are never passed in.
 */
import { z } from "zod";
import {
  CEFR_LEVELS,
  COMPANY_SIZES,
  COMPANY_TYPES,
  EMPLOYMENT_TYPES,
  REMOTE_POLICIES,
  RIASEC_KEYS,
  SENIORITY_LEVELS,
  TRAVEL_MODES,
  WORK_VALUES,
  type CandidatePreferences,
  type MatchCandidate,
  type MatchJob,
  type RiasecProfile,
  type WorkValue,
  type WorkValueProfile,
} from "@/core/matching/types";
import type { Tables } from "@/lib/supabase/database.types";

export const candidatePreferencesSchema = z.object({
  desiredOccupations: z
    .array(z.object({ uri: z.string(), iscoCode: z.string(), label: z.string().nullish() }))
    .default([]),
  location: z.object({ lat: z.number(), lng: z.number(), city: z.string().nullish() }).nullish(),
  maxTravelMinutes: z.number().int().min(5).max(240).nullish(),
  travelMode: z.enum(TRAVEL_MODES).nullish(),
  remote: z.enum([...REMOTE_POLICIES, "any"]).nullish(),
  minSalaryMonth: z.number().min(0).max(50000).nullish(),
  hoursMin: z.number().min(0).max(60).nullish(),
  hoursMax: z.number().min(0).max(60).nullish(),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).default([]),
  companySizes: z.array(z.enum(COMPANY_SIZES)).default([]),
  companyTypes: z.array(z.enum(COMPANY_TYPES)).default([]),
});
export type StoredPreferences = z.infer<typeof candidatePreferencesSchema>;

const riasecSchema = z.object(
  Object.fromEntries(RIASEC_KEYS.map((k) => [k, z.number()])) as Record<string, z.ZodNumber>,
);
const valuesProfileSchema = z.object(
  Object.fromEntries(WORK_VALUES.map((k) => [k, z.number()])) as Record<string, z.ZodNumber>,
);

export function parseRiasec(value: unknown): RiasecProfile | null {
  const r = riasecSchema.safeParse(value);
  return r.success ? (r.data as RiasecProfile) : null;
}

export function parseWorkValueProfile(value: unknown): WorkValueProfile | null {
  const r = valuesProfileSchema.safeParse(value);
  return r.success ? (r.data as WorkValueProfile) : null;
}

export function parseWorkValueRanking(value: unknown): WorkValue[] | null {
  const r = z.array(z.enum(WORK_VALUES)).length(WORK_VALUES.length).safeParse(value);
  return r.success ? r.data : null;
}

/** pgvector values arrive as "[0.1,0.2,…]" strings via PostgREST. */
export function parseVector(value: unknown): number[] | null {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value !== "string" || !value.startsWith("[")) return null;
  return value.slice(1, -1).split(",").map(Number);
}

export function toVectorLiteral(v: number[]): string {
  return `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : "0")).join(",")}]`;
}

export interface CandidateRows {
  profile: Pick<
    Tables<"candidate_profiles">,
    | "seniority"
    | "education_level"
    | "needs_sponsorship"
    | "permit_type"
    | "salary_norm_category"
    | "preferences"
    | "riasec"
    | "work_values"
  >;
  skills: Pick<Tables<"candidate_skills">, "esco_uri" | "label" | "last_used_year" | "confirmed">[];
  experiences: Pick<Tables<"candidate_experiences">, "isco_code">[];
  languages: Pick<Tables<"candidate_languages">, "language" | "level">[];
}

export function toMatchCandidate(rows: CandidateRows): MatchCandidate {
  const prefs = candidatePreferencesSchema.safeParse(rows.profile.preferences ?? {});
  const p: CandidatePreferences = prefs.success ? prefs.data : {};
  return {
    skills: rows.skills
      .filter((s) => s.esco_uri)
      .map((s) => ({ uri: s.esco_uri!, label: s.label, lastUsedYear: s.last_used_year })),
    languages: rows.languages
      .filter((l) => (CEFR_LEVELS as readonly string[]).includes(l.level))
      .map((l) => ({ language: l.language, level: l.level })),
    workStatus: {
      needsSponsorship: rows.profile.needs_sponsorship,
      permitType: rows.profile.permit_type,
      salaryNormCategory: rows.profile.salary_norm_category,
    },
    preferences: p,
    seniority: rows.profile.seniority,
    educationLevel: rows.profile.education_level,
    experienceIscoCodes: [
      ...new Set(rows.experiences.map((e) => e.isco_code).filter((c): c is string => !!c)),
    ],
    riasec: parseRiasec(rows.profile.riasec),
    workValues: parseWorkValueRanking(rows.profile.work_values),
  };
}

const jobSkillSchema = z.object({
  uri: z.string(),
  label: z.string().nullish(),
  importance: z.enum(["must", "nice"]),
});
const languageReqSchema = z.object({
  language: z.string(),
  level: z.enum(CEFR_LEVELS),
  required: z.boolean(),
});

/** Parse a JSON array element-wise, dropping invalid elements instead of the whole array. */
function parseEach<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    const r = schema.safeParse(v);
    return r.success ? [r.data] : [];
  });
}

export interface JobRows {
  job: Pick<
    Tables<"jobs">,
    | "id"
    | "title"
    | "language"
    | "esco_skills"
    | "language_requirements"
    | "visa_sponsorship"
    | "lat"
    | "lng"
    | "city"
    | "remote_policy"
    | "salary_min_month"
    | "salary_max_month"
    | "hours_min"
    | "hours_max"
    | "employment_types"
    | "isco_code"
    | "seniority"
    | "work_values"
    | "education_requirement"
  >;
  company: Pick<Tables<"companies">, "name" | "is_recognised_sponsor" | "size" | "type"> | null;
  occupation: Pick<Tables<"esco_occupations">, "riasec" | "work_values"> | null;
}

export function toMatchJob({ job, company, occupation }: JobRows): MatchJob {
  const edu = z
    .object({ min_eqf: z.number().int().min(1).max(8) })
    .safeParse(job.education_requirement);
  return {
    id: job.id,
    title: job.title,
    language: job.language,
    skills: parseEach(jobSkillSchema, job.esco_skills),
    languageRequirements: parseEach(languageReqSchema, job.language_requirements),
    visaSponsorship: job.visa_sponsorship,
    company: company
      ? {
          name: company.name,
          isRecognisedSponsor: company.is_recognised_sponsor,
          size: company.size,
          type: company.type,
        }
      : null,
    location:
      job.lat != null && job.lng != null ? { lat: job.lat, lng: job.lng, city: job.city } : null,
    remotePolicy: job.remote_policy,
    salaryMinMonth: job.salary_min_month,
    salaryMaxMonth: job.salary_max_month,
    hoursMin: job.hours_min,
    hoursMax: job.hours_max,
    employmentTypes: job.employment_types,
    iscoCode: job.isco_code,
    seniority:
      job.seniority && (SENIORITY_LEVELS as readonly string[]).includes(job.seniority)
        ? job.seniority
        : null,
    riasec: parseRiasec(occupation?.riasec),
    workValues:
      parseWorkValueProfile(job.work_values) ?? parseWorkValueProfile(occupation?.work_values),
    educationRequirement: edu.success ? { minEqf: edu.data.min_eqf } : null,
  };
}

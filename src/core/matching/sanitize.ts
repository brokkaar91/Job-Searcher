import { z } from "zod";
import {
  CEFR_LEVELS,
  COMPANY_SIZES,
  COMPANY_TYPES,
  EMPLOYMENT_TYPES,
  PERMIT_TYPES,
  REMOTE_POLICIES,
  SALARY_NORM_CATEGORIES,
  SENIORITY_LEVELS,
  TRAVEL_MODES,
  WORK_VALUES,
  type MatchCandidate,
} from "./types";

/**
 * ALLOW-LIST schema for matching input. zod objects strip unknown keys, so anything not listed
 * here (name, birth date, gender, photo, nationality, address, e-mail, …) can never reach the
 * engine – even if a caller passes a full profile row by mistake.
 */
const geo = z.object({ lat: z.number(), lng: z.number(), city: z.string().nullish() });
const riasec = z.object({
  R: z.number(),
  I: z.number(),
  A: z.number(),
  S: z.number(),
  E: z.number(),
  C: z.number(),
});

export const matchCandidateSchema = z.object({
  skills: z.array(
    z.object({
      uri: z.string(),
      label: z.string().nullish(),
      lastUsedYear: z.number().int().nullish(),
    }),
  ),
  languages: z.array(z.object({ language: z.string().length(2), level: z.enum(CEFR_LEVELS) })),
  workStatus: z.object({
    needsSponsorship: z.boolean().nullable(),
    permitType: z.enum(PERMIT_TYPES).nullable(),
    salaryNormCategory: z.enum(SALARY_NORM_CATEGORIES).nullable(),
  }),
  preferences: z.object({
    desiredOccupations: z
      .array(z.object({ uri: z.string(), iscoCode: z.string(), label: z.string().nullish() }))
      .optional(),
    location: geo.nullish(),
    maxTravelMinutes: z.number().nullish(),
    travelMode: z.enum(TRAVEL_MODES).nullish(),
    remote: z.enum([...REMOTE_POLICIES, "any"]).nullish(),
    minSalaryMonth: z.number().nullish(),
    hoursMin: z.number().nullish(),
    hoursMax: z.number().nullish(),
    employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).optional(),
    companySizes: z.array(z.enum(COMPANY_SIZES)).optional(),
    companyTypes: z.array(z.enum(COMPANY_TYPES)).optional(),
  }),
  seniority: z.enum(SENIORITY_LEVELS).nullable(),
  educationLevel: z.number().int().min(1).max(8).nullable(),
  experienceIscoCodes: z.array(z.string()),
  riasec: riasec.nullable(),
  workValues: z.array(z.enum(WORK_VALUES)).nullable(),
});

/** Field names that must never appear anywhere in the matching input schema. */
export const PROTECTED_ATTRIBUTES = [
  "name",
  "firstName",
  "lastName",
  "fullName",
  "age",
  "birthDate",
  "dateOfBirth",
  "gender",
  "sex",
  "photo",
  "photoUrl",
  "avatar",
  "nationality",
  "citizenship",
  "ethnicity",
  "religion",
  "address",
  "email",
  "phone",
  "maritalStatus",
] as const;

export function sanitizeCandidate(input: unknown): MatchCandidate {
  return matchCandidateSchema.parse(input) as MatchCandidate;
}

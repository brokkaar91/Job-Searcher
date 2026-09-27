import { z } from "zod";
import {
  CEFR_LEVELS,
  EMPLOYMENT_TYPES,
  REMOTE_POLICIES,
  SENIORITY_LEVELS,
} from "../../matching/types";

/** Structured output of CV parsing. Kept flat & simple so it maps 1:1 to a JSON schema. */
export const parsedCvSchema = z.object({
  summary: z.string().describe("2-3 sentence neutral professional summary, no personal details"),
  seniority: z.enum(SENIORITY_LEVELS).nullable(),
  educationLevelEqf: z
    .number()
    .int()
    .nullable()
    .describe("Highest completed education as EQF level 1-8, null if unknown"),
  skills: z.array(
    z.object({
      label: z.string().describe("Skill name, preferably the ESCO preferred label"),
      lastUsedYear: z.number().int().nullable(),
      evidence: z.string().describe("Short quote/paraphrase from the CV showing the skill"),
    }),
  ),
  experiences: z.array(
    z.object({
      title: z.string(),
      organisation: z.string().nullable(),
      startDate: z.string().nullable().describe("YYYY-MM or YYYY"),
      endDate: z.string().nullable().describe("YYYY-MM or YYYY; null if current"),
      isCurrent: z.boolean(),
      description: z.string().describe("Tasks and responsibilities, max ~80 words"),
      occupationLabel: z.string().nullable().describe("Closest ESCO occupation label"),
      iscoCode: z.string().nullable().describe("ISCO-08 4-digit unit group"),
    }),
  ),
  languages: z.array(
    z.object({
      language: z.string().describe("ISO 639-1 code, e.g. nl, en"),
      level: z.enum(CEFR_LEVELS),
    }),
  ),
});
export type ParsedCvRaw = z.infer<typeof parsedCvSchema>;

export const jobClassificationSchema = z.object({
  occupationLabel: z.string().nullable(),
  iscoCode: z.string().nullable(),
  seniority: z.enum(SENIORITY_LEVELS).nullable(),
  skills: z.array(
    z.object({
      label: z.string(),
      importance: z.enum(["must", "nice"]),
    }),
  ),
  languageRequirements: z.array(
    z.object({ language: z.string(), level: z.enum(CEFR_LEVELS), required: z.boolean() }),
  ),
  remotePolicy: z.enum(REMOTE_POLICIES).nullable(),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)),
  hoursMin: z.number().nullable(),
  hoursMax: z.number().nullable(),
  explicitMinEducationEqf: z
    .number()
    .int()
    .nullable()
    .describe("ONLY if the ad explicitly requires a minimum education level; otherwise null"),
  workValues: z.object({
    achievement: z.number(),
    independence: z.number(),
    recognition: z.number(),
    relationships: z.number(),
    support: z.number(),
    working_conditions: z.number(),
  }),
  confidence: z.number().describe("0-1 confidence in the occupation and skills classification"),
});
export type JobClassificationRaw = z.infer<typeof jobClassificationSchema>;

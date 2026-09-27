import { z } from "zod";
import { COMPONENTS, type ComponentKey } from "./types";

/**
 * Matching model configuration. Stored (immutable, versioned) in `matching_model_versions.config`.
 * Weights are in percent and must sum to 100.
 */
export const modelConfigSchema = z
  .object({
    weights: z.object({
      skills: z.number().min(0).max(100),
      experience: z.number().min(0).max(100),
      occupation: z.number().min(0).max(100),
      interests: z.number().min(0).max(100),
      values: z.number().min(0).max(100),
      practical: z.number().min(0).max(100),
    }),
    knockouts: z.object({
      sponsorship: z.object({
        enabled: z.boolean(),
        /** Also require the offered salary to reach the IND knowledge-migrant norm (when known). */
        requireSalaryNorm: z.boolean(),
      }),
      language: z.object({
        enabled: z.boolean(),
        /** Accept this many CEFR levels below the requirement (0 = strict). */
        toleranceLevels: z.number().int().min(0).max(2),
      }),
      location: z.object({
        enabled: z.boolean(),
        graceMinutes: z.number().min(0).max(60),
        /** Hybrid jobs: commute is less frequent, allow max travel × factor. */
        hybridTravelFactor: z.number().min(1).max(3),
      }),
      salary: z.object({
        enabled: z.boolean(),
        /** Accept offers up to this % below the user's minimum. */
        tolerancePct: z.number().min(0).max(30),
      }),
      contract: z.object({ enabled: z.boolean() }),
      education: z.object({ enabled: z.boolean() }),
    }),
    thresholds: z
      .object({
        strong: z.number().min(0).max(100),
        good: z.number().min(0).max(100),
        possible: z.number().min(0).max(100),
      })
      .refine(
        (t) => t.strong > t.good && t.good > t.possible,
        "thresholds must be strong > good > possible",
      ),
    /** IND knowledge-migrant gross monthly salary norms (excl. 8% holiday allowance). */
    salaryNorms: z.object({
      year: z.number().int(),
      standard: z.number().positive(),
      reduced: z.number().positive(),
      graduate: z.number().positive(),
    }),
    skills: z.object({
      mustWeight: z.number().positive(),
      niceWeight: z.number().positive(),
      /** Credit for a related (broader/narrower/sibling) ESCO skill instead of the exact one. */
      relatedCredit: z.number().min(0).max(1),
      /** Recency factors by years since last use (ascending maxYears; null = open-ended). */
      recency: z
        .array(z.object({ maxYears: z.number().nullable(), factor: z.number().min(0).max(1) }))
        .min(1),
      unknownRecencyFactor: z.number().min(0).max(1),
    }),
    experience: z
      .object({
        /** Cosine similarity mapped linearly: floor → 0, ceil → 1 (model-specific calibration). */
        similarityFloor: z.number().min(-1).max(1),
        similarityCeil: z.number().min(-1).max(1),
      })
      .refine(
        (e) => e.similarityCeil > e.similarityFloor,
        "similarityCeil must exceed similarityFloor",
      ),
    /** Share of total weight that may be missing before a match is flagged `limitedData`. */
    limitedDataThreshold: z.number().min(0).max(1),
  })
  .refine((c) => Math.abs(COMPONENTS.reduce((s, k) => s + c.weights[k], 0) - 100) < 0.001, {
    message: "weights must sum to 100",
    path: ["weights"],
  });

export type ModelConfig = z.infer<typeof modelConfigSchema>;

export const DEFAULT_WEIGHTS: Record<ComponentKey, number> = {
  skills: 35,
  experience: 20,
  occupation: 15,
  interests: 10,
  values: 10,
  practical: 10,
};

/**
 * Default model (version 1).
 * Salary norms: IND kennismigrant thresholds for 2026 — INDICATIVE, verify on ind.nl each January
 * and publish a new model version with the updated amounts.
 */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  weights: DEFAULT_WEIGHTS,
  knockouts: {
    sponsorship: { enabled: true, requireSalaryNorm: true },
    language: { enabled: true, toleranceLevels: 0 },
    location: { enabled: true, graceMinutes: 10, hybridTravelFactor: 1.25 },
    salary: { enabled: true, tolerancePct: 5 },
    contract: { enabled: true },
    education: { enabled: true },
  },
  thresholds: { strong: 75, good: 60, possible: 45 },
  salaryNorms: { year: 2026, standard: 5942, reduced: 4357, graduate: 3122 },
  skills: {
    mustWeight: 2,
    niceWeight: 1,
    relatedCredit: 0.5,
    recency: [
      { maxYears: 2, factor: 1 },
      { maxYears: 5, factor: 0.8 },
      { maxYears: null, factor: 0.6 },
    ],
    unknownRecencyFactor: 0.85,
  },
  // Calibrated for multilingual-e5 (cosines cluster in ~0.7–0.95).
  experience: { similarityFloor: 0.72, similarityCeil: 0.9 },
  limitedDataThreshold: 0.35,
};

export function parseModelConfig(input: unknown): ModelConfig {
  return modelConfigSchema.parse(input);
}
